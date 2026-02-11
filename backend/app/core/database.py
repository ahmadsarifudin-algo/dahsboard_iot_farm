"""
Database connection and session management.
Supports both SQLite (local dev) and PostgreSQL (production).
Supports hot-swap: change database URL at runtime via Settings page.
"""
import sqlalchemy
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import get_settings


class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


class DatabaseManager:
    """Manages database engine and session factory with hot-swap support."""

    def __init__(self):
        self._engine = None
        self._session_factory = None
        self._current_url: str = ""

    def _build_engine_kwargs(self, url: str) -> dict:
        """Build engine kwargs based on database type."""
        kwargs = {"echo": get_settings().debug}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
        else:
            kwargs["pool_pre_ping"] = True
            kwargs["pool_size"] = 10
            kwargs["max_overflow"] = 20
        return kwargs

    def _create(self, url: str):
        """Create engine and session factory for a given URL."""
        kwargs = self._build_engine_kwargs(url)
        self._engine = create_async_engine(url, **kwargs)
        self._session_factory = async_sessionmaker(
            self._engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
        self._current_url = url

    @property
    def engine(self):
        """Current async engine (lazy-initialized)."""
        if self._engine is None:
            self._create(get_settings().database_url)
        return self._engine

    @property
    def session_factory(self):
        """Current async session factory (lazy-initialized)."""
        if self._session_factory is None:
            self._create(get_settings().database_url)
        return self._session_factory

    @property
    def current_url(self) -> str:
        """Currently active database URL."""
        return self._current_url or get_settings().database_url

    async def swap(self, new_url: str) -> dict:
        """
        Hot-swap to a new database URL.
        Tests connection first, then creates tables, then disposes old engine.
        On failure, reverts to the previous engine.

        Returns {"success": True/False, "message": str, "database_type": str}
        """
        if new_url == self._current_url:
            return {
                "success": True,
                "message": "Already using this database",
                "database_type": self._detect_type(new_url),
            }

        old_engine = self._engine
        old_factory = self._session_factory
        old_url = self._current_url

        try:
            # 1. Create new engine
            self._create(new_url)

            # 2. Test connection
            async with self._engine.connect() as conn:
                await conn.execute(sqlalchemy.text("SELECT 1"))

            # 3. Initialize tables on new DB
            async with self._engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            # 4. Dispose old engine
            if old_engine is not None:
                await old_engine.dispose()

            db_type = self._detect_type(new_url)
            return {
                "success": True,
                "message": f"Switched to {db_type} database successfully. Tables initialized.",
                "database_type": db_type,
            }

        except Exception as e:
            # Revert to old engine on failure
            if self._engine is not None and self._engine is not old_engine:
                try:
                    await self._engine.dispose()
                except Exception:
                    pass
            self._engine = old_engine
            self._session_factory = old_factory
            self._current_url = old_url
            return {
                "success": False,
                "message": f"Connection failed: {str(e)}",
                "database_type": "unknown",
            }

    @staticmethod
    def _detect_type(url: str) -> str:
        if "sqlite" in url:
            return "sqlite"
        elif "postgresql" in url or "postgres" in url:
            return "postgresql"
        elif "mysql" in url:
            return "mysql"
        return "unknown"


# Global singleton
db_manager = DatabaseManager()


async def get_db() -> AsyncSession:
    """Dependency for getting database session."""
    async with db_manager.session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    async with db_manager.engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

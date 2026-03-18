"""
External integration registry endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import ExternalEndpoint
from app.schemas import (
    ExternalEndpointCreate,
    ExternalEndpointUpdate,
    ExternalEndpointResponse,
)

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/external-endpoints", response_model=list[ExternalEndpointResponse])
async def list_external_endpoints(
    service_type: str | None = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
):
    """List configured external/internal integration endpoints."""
    query = select(ExternalEndpoint).order_by(ExternalEndpoint.name)

    if service_type:
        query = query.where(ExternalEndpoint.service_type == service_type)
    if active_only:
        query = query.where(ExternalEndpoint.is_active.is_(True))

    result = await db.execute(query)
    return result.scalars().all()


@router.post("/external-endpoints", response_model=ExternalEndpointResponse, status_code=201)
async def create_external_endpoint(body: ExternalEndpointCreate, db: AsyncSession = Depends(get_db)):
    """Register a new integration endpoint."""
    existing = await db.execute(select(ExternalEndpoint).where(ExternalEndpoint.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Endpoint name already exists")

    endpoint = ExternalEndpoint(**body.model_dump())
    db.add(endpoint)
    await db.flush()
    await db.refresh(endpoint)
    return endpoint


@router.patch("/external-endpoints/{endpoint_id}", response_model=ExternalEndpointResponse)
async def update_external_endpoint(
    endpoint_id: str,
    body: ExternalEndpointUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an integration endpoint."""
    result = await db.execute(select(ExternalEndpoint).where(ExternalEndpoint.id == endpoint_id))
    endpoint = result.scalar_one_or_none()

    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(endpoint, key, value)

    await db.flush()
    await db.refresh(endpoint)
    return endpoint


@router.delete("/external-endpoints/{endpoint_id}", status_code=204)
async def delete_external_endpoint(endpoint_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an integration endpoint."""
    result = await db.execute(select(ExternalEndpoint).where(ExternalEndpoint.id == endpoint_id))
    endpoint = result.scalar_one_or_none()

    if not endpoint:
        raise HTTPException(status_code=404, detail="Endpoint not found")

    await db.delete(endpoint)

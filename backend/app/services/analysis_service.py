"""
AI Analysis Service — Multi-role Gemini-powered Farm Expert System.

Roles:
- Data Analyst: NL→SQL, data visualization, telemetry analysis
- Farm Management: SOP, environment control, production optimization
- Disease Expert: Diagnosis, vaccination, biosecurity

Capabilities:
- Role-based expert system with auto-detection
- Text-to-SQL with smart schema awareness
- Conversation memory (multi-turn context)
- Follow-up question suggestions
- AI-generated data insights & anomaly detection
- Bilingual (Bahasa Indonesia & English)
"""
import json
import re
import statistics
from collections import defaultdict
from datetime import datetime
from typing import Optional
from app.core.app_settings import app_settings
from app.services.ai_roles import detect_role, get_role_prompt, get_role_info, get_all_roles


# SQL keywords that are NOT allowed (DML/DDL protection)
BLOCKED_SQL = re.compile(
    r'\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC|EXECUTE)\b',
    re.IGNORECASE
)

BASE_SYSTEM_PROMPT = """You are **FarmAI**, a multi-role poultry farm expert assistant.
You help farmers and managers with data analysis, farm management, and health monitoring.

YOUR PERSONALITY:
- Friendly, professional, speaks in Bahasa Indonesia by default
- Proactive: always suggest follow-up actions
- Safety-conscious: flag anomalies and potential issues immediately

CURRENT ACTIVE ROLE: {role_name}
{role_prompt}

DATABASE SCHEMA (available for data queries):
- sites (id TEXT PK, name TEXT, latitude REAL, longitude REAL, region TEXT, address TEXT, created_at DATETIME)
- devices (id TEXT PK, device_key TEXT UNIQUE, name TEXT, type TEXT, site_id TEXT FK→sites.id, firmware TEXT, status TEXT ['online','offline'], last_seen DATETIME, shadow_desired TEXT/JSON, shadow_reported TEXT/JSON, meta_data TEXT/JSON, created_at DATETIME, updated_at DATETIME)
- telemetry (time DATETIME PK, device_id TEXT PK FK→devices.id, metric TEXT PK, value REAL)
- alarms (id TEXT PK, device_id TEXT FK→devices.id, severity TEXT ['critical','warning','info'], message TEXT, ts_open DATETIME, ts_close DATETIME, acknowledged BOOLEAN, acknowledged_by TEXT)
- commands (id TEXT PK, device_id TEXT FK→devices.id, command_type TEXT, payload TEXT/JSON, status TEXT, ts_sent DATETIME, ts_ack DATETIME, response TEXT/JSON)

DEVICE TYPES: temperature, humidity, pressure, power
TELEMETRY METRICS: temperature, humidity, pressure, power_watts, ammonia, wind_speed
ALARM SEVERITIES: critical, warning, info

DATABASE TYPE: {db_type}
{db_specific_notes}

{conversation_context}

RESPONSE FORMAT — Return ONLY valid JSON:
{{
    "sql": "SELECT ... (SQL query if data is needed, empty string if pure knowledge answer)",
    "explanation": "Penjelasan/jawaban utama dalam Bahasa Indonesia",
    "analysis": "Analisis mendalam, rekomendasi, atau penjelasan detail",
    "chart_type": "bar|line|area|table|none",
    "x_key": "column for X axis (empty if no chart)",
    "y_keys": ["columns for Y axis"],
    "colors": ["#hex colors"],
    "insight_titles": ["max 4 insight card titles"],
    "insight_values": ["corresponding values"],
    "insight_descriptions": ["short descriptions"],
    "anomalies": ["list of detected anomalies/warnings, empty if none"],
    "follow_up_questions": ["3 suggested follow-up questions"],
    "severity": "normal|warning|critical"
}}

RULES:
1. If the question needs data from database, generate a SELECT query in "sql".
2. If the question is about knowledge/advice (SOP, penyakit, manajemen), leave "sql" as empty string and provide a thorough answer in "explanation" and "analysis".
3. ONLY generate SELECT queries. Never INSERT/UPDATE/DELETE/DROP.
4. Always add LIMIT 500 for SQL queries unless user specifies different.
5. Speak Bahasa Indonesia for all explanations and analysis.
6. Be proactive: detect anomalies, suggest improvements, give actionable advice.
7. Always suggest 3 relevant follow-up questions.
8. If previous conversation exists, reference and build on it.
9. For anomalies: flag temperatures >33°C, humidity <50% or >85%, ammonia >25ppm.
10. When answering as Farm Management or Disease Expert, provide DETAILED domain-specific advice.
"""

SQLITE_NOTES = """For SQLite:
- Use strftime('%Y-%m-%d', time) for date formatting
- Use strftime('%H', time) for hour extraction
- Use date('now', '-7 days') for date math
- No time_bucket, use strftime for grouping
- CAST(value AS REAL) for numeric operations
- Use GROUP BY strftime('%Y-%m-%d %H:00', time) for hourly grouping"""

POSTGRES_NOTES = """For PostgreSQL/TimescaleDB:
- Use time_bucket('1 hour', time) for time aggregation
- Use NOW() - INTERVAL '7 days' for date math
- Use JSONB operators for JSON fields
- Use TO_CHAR(time, 'YYYY-MM-DD') for formatting"""


class ConversationMemory:
    """Manages multi-turn conversation context."""

    def __init__(self, max_turns: int = 10):
        self.max_turns = max_turns
        # session_id → list of {role, content, sql, timestamp}
        self._sessions: dict[str, list[dict]] = defaultdict(list)

    def add_turn(self, session_id: str, role: str, content: str, sql: str = ""):
        """Add a conversation turn."""
        turns = self._sessions[session_id]
        turns.append({
            "role": role,
            "content": content,
            "sql": sql,
            "timestamp": datetime.utcnow().isoformat(),
        })
        # Keep only last N turns
        if len(turns) > self.max_turns * 2:
            self._sessions[session_id] = turns[-self.max_turns * 2:]

    def get_context(self, session_id: str) -> str:
        """Build conversation context string for the prompt."""
        turns = self._sessions.get(session_id, [])
        if not turns:
            return ""

        lines = ["PREVIOUS CONVERSATION (use this for context):"]
        for turn in turns[-6:]:  # Last 3 exchanges
            role = "User" if turn["role"] == "user" else "Assistant"
            lines.append(f"- {role}: {turn['content'][:200]}")
            if turn.get("sql"):
                lines.append(f"  SQL used: {turn['sql'][:200]}")
        return "\n".join(lines)

    def clear(self, session_id: str):
        """Clear a session's history."""
        self._sessions.pop(session_id, None)

    def get_sessions(self) -> list[str]:
        """List active session IDs."""
        return list(self._sessions.keys())


class DataAnalyzer:
    """Analyzes query results to detect anomalies and generate insights."""

    THRESHOLDS = {
        "temperature": {"warning": 33, "critical": 36, "low_warning": 22, "unit": "°C"},
        "humidity": {"warning": 85, "critical": 90, "low_warning": 50, "unit": "%"},
        "ammonia": {"warning": 25, "critical": 40, "low_warning": 0, "unit": "ppm"},
        "power_watts": {"warning": 450, "critical": 500, "low_warning": 50, "unit": "W"},
        "wind_speed": {"warning": 4.5, "critical": 6, "low_warning": 0.2, "unit": "m/s"},
    }

    @staticmethod
    def detect_anomalies(data: list[dict], sql: str = "") -> list[str]:
        """Scan data for anomalies based on domain thresholds."""
        anomalies = []
        if not data:
            return anomalies

        columns = list(data[0].keys())

        for col in columns:
            values = []
            for row in data:
                v = row.get(col)
                if isinstance(v, (int, float)):
                    values.append(v)

            if not values:
                continue

            col_lower = col.lower().replace("avg_", "").replace("max_", "").replace("min_", "")

            # Check against known thresholds
            for metric, limits in DataAnalyzer.THRESHOLDS.items():
                if metric in col_lower or col_lower in metric:
                    max_val = max(values)
                    min_val = min(values)
                    avg_val = statistics.mean(values)

                    if max_val >= limits["critical"]:
                        anomalies.append(
                            f"🚨 KRITIS: {col} mencapai {max_val}{limits['unit']} "
                            f"(batas kritis: {limits['critical']}{limits['unit']})"
                        )
                    elif max_val >= limits["warning"]:
                        anomalies.append(
                            f"⚠️ PERINGATAN: {col} mencapai {max_val}{limits['unit']} "
                            f"(batas peringatan: {limits['warning']}{limits['unit']})"
                        )
                    if min_val <= limits["low_warning"] and limits["low_warning"] > 0:
                        anomalies.append(
                            f"⚠️ RENDAH: {col} turun ke {min_val}{limits['unit']} "
                            f"(minimal: {limits['low_warning']}{limits['unit']})"
                        )
                    break

            # Statistical outlier detection (Z-score > 2)
            if len(values) >= 5:
                try:
                    mean = statistics.mean(values)
                    stdev = statistics.stdev(values)
                    if stdev > 0:
                        outliers = [v for v in values if abs(v - mean) > 2 * stdev]
                        if outliers:
                            anomalies.append(
                                f"📊 Outlier terdeteksi di '{col}': {len(outliers)} nilai "
                                f"menyimpang jauh dari rata-rata ({mean:.1f})"
                            )
                except statistics.StatisticsError:
                    pass

        return anomalies[:5]  # Max 5 anomalies

    @staticmethod
    def compute_stats(data: list[dict]) -> dict:
        """Compute summary statistics for numeric columns."""
        if not data:
            return {}

        stats = {}
        columns = list(data[0].keys())

        for col in columns:
            values = [row[col] for row in data if isinstance(row.get(col), (int, float))]
            if values:
                stats[col] = {
                    "count": len(values),
                    "min": round(min(values), 2),
                    "max": round(max(values), 2),
                    "avg": round(statistics.mean(values), 2),
                    "total": round(sum(values), 2),
                }
                if len(values) >= 2:
                    stats[col]["stdev"] = round(statistics.stdev(values), 2)

        return stats

    @staticmethod
    def assess_severity(anomalies: list[str]) -> str:
        """Determine overall severity from anomalies."""
        if any("KRITIS" in a for a in anomalies):
            return "critical"
        elif any("PERINGATAN" in a or "RENDAH" in a for a in anomalies):
            return "warning"
        return "normal"


class AnalysisService:
    """Expanded AI-powered data analysis with memory and insights."""

    def __init__(self):
        self._model = None
        self.memory = ConversationMemory()
        self.analyzer = DataAnalyzer()

    def _get_model(self):
        """Get or create Gemini model instance."""
        import google.generativeai as genai

        api_key = app_settings.get("gemini_api_key")
        if not api_key:
            raise ValueError("Gemini API key not configured. Go to Settings to add your key.")

        model_name = app_settings.get("gemini_model", "gemini-2.0-flash")
        genai.configure(api_key=api_key)
        return genai.GenerativeModel(model_name)

    async def _generate_with_search(self, prompt: str) -> tuple:
        """Generate content using the new google.genai SDK with Google Search grounding.
        Returns (text, grounding_sources).
        """
        from google import genai
        from google.genai import types

        api_key = app_settings.get("gemini_api_key")
        if not api_key:
            raise ValueError("Gemini API key not configured. Go to Settings to add your key.")

        model_name = app_settings.get("gemini_model", "gemini-2.0-flash")
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        text = response.text.strip() if response.text else ""

        # Extract grounding sources from response
        grounding_sources = []
        if response.candidates:
            candidate = response.candidates[0]
            gm = getattr(candidate, 'grounding_metadata', None)
            if gm:
                chunks = getattr(gm, 'grounding_chunks', None) or []
                for chunk in chunks:
                    web = getattr(chunk, 'web', None)
                    if web:
                        grounding_sources.append({
                            "title": getattr(web, 'title', '') or '',
                            "uri": getattr(web, 'uri', '') or '',
                        })

        return text, grounding_sources

    def _get_system_prompt(self, role_id: str = "data_analyst", session_id: str = "") -> str:
        """Build system prompt with role and context."""
        db_type = app_settings.get_database_type()
        db_notes = SQLITE_NOTES if db_type == "sqlite" else POSTGRES_NOTES
        conv_context = self.memory.get_context(session_id) if session_id else ""
        role_info = get_role_info(role_id)
        role_prompt = get_role_prompt(role_id)
        return BASE_SYSTEM_PROMPT.format(
            role_name=f"{role_info['icon']} {role_info['name']}",
            role_prompt=role_prompt,
            db_type=db_type,
            db_specific_notes=db_notes,
            conversation_context=conv_context,
        )

    async def generate_response(self, question: str, role_id: str = "data_analyst", session_id: str = "") -> dict:
        """Generate AI response using Gemini with the appropriate role. Retries on 429."""
        import asyncio
        from app.services.ai_roles import ROLES

        # Check if this role needs web search grounding
        role_config = ROLES.get(role_id, {})
        uses_search = role_config.get("uses_search", False)

        prompt = f"{self._get_system_prompt(role_id, session_id)}\n\nUser question: {question}"

        # Retry with backoff for rate limit errors
        last_error = None
        grounding_sources = []
        for attempt in range(3):
            try:
                if uses_search:
                    # Use the new google.genai SDK for search grounding
                    text, grounding_sources = await self._generate_with_search(prompt)
                else:
                    # Use the standard google.generativeai SDK
                    model = self._get_model()
                    response = model.generate_content(prompt)
                    text = response.text.strip()
                break
            except Exception as e:
                last_error = e
                if "429" in str(e) or "Resource exhausted" in str(e):
                    wait_time = 2 ** (attempt + 1)  # 2s, 4s, 8s
                    await asyncio.sleep(wait_time)
                    continue
                raise
        else:
            raise last_error

        # Extract JSON from response (handle markdown code blocks)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        try:
            result = json.loads(text)
        except json.JSONDecodeError:
            # For non-data roles, treat plain text as a knowledge answer
            result = {
                "sql": "",
                "explanation": text,
                "analysis": "",
                "chart_type": "none",
                "x_key": "",
                "y_keys": [],
                "colors": [],
                "anomalies": [],
                "follow_up_questions": [],
                "severity": "normal",
            }

        # Attach grounding sources if search was used
        if grounding_sources:
            result["grounding_sources"] = grounding_sources

        return result

    def validate_sql(self, sql: str) -> tuple[bool, str]:
        """Validate that SQL is safe (read-only, has LIMIT)."""
        if not sql or not sql.strip():
            return False, "Empty SQL query"

        if BLOCKED_SQL.search(sql):
            return False, "Query contains blocked SQL operations (only SELECT is allowed)"

        if not sql.strip().upper().startswith("SELECT"):
            return False, "Query must be a SELECT statement"

        if "LIMIT" not in sql.upper():
            sql = sql.rstrip(";") + " LIMIT 500;"

        return True, sql

    async def execute_query(self, sql: str) -> list[dict]:
        """Execute a read-only SQL query against the database."""
        from sqlalchemy import text
        from app.core.database import AsyncSessionLocal

        is_valid, result = self.validate_sql(sql)
        if not is_valid:
            raise ValueError(result)

        sql = result

        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(text(sql))
                columns = list(result.keys())
                rows = result.fetchall()
                return [dict(zip(columns, row)) for row in rows]
            except Exception as e:
                raise ValueError(f"Query execution failed: {str(e)}")

    async def ask(self, question: str, session_id: str = "", role_id: str = "") -> dict:
        """Full expanded pipeline: question → role detect → AI response → execute → analyze."""

        # Step 0: Detect or validate role
        if not role_id or role_id == "auto":
            role_id = detect_role(question)
        role_info = get_role_info(role_id)

        # Save user turn to memory
        if session_id:
            self.memory.add_turn(session_id, "user", question)

        # Step 1: Generate response via Gemini with role context
        gemini_result = await self.generate_response(question, role_id, session_id)
        sql = gemini_result.get("sql", "").strip()

        # Step 1.5: If no SQL (knowledge answer or search-grounded data)
        if not sql:
            answer = gemini_result.get("explanation", "")
            analysis = gemini_result.get("analysis", "")
            follow_ups = gemini_result.get("follow_up_questions", [])
            if not follow_ups:
                follow_ups = self._generate_default_followups(question, [])

            # Build insight cards from knowledge response
            insight_cards = []
            titles = gemini_result.get("insight_titles", [])
            values = gemini_result.get("insight_values", [])
            descriptions = gemini_result.get("insight_descriptions", [])
            icons = ["trend", "temp", "alert", "check"]
            for i in range(min(len(titles), 4)):
                insight_cards.append({
                    "title": titles[i],
                    "value": str(values[i]) if i < len(values) else "",
                    "change": descriptions[i] if i < len(descriptions) else "",
                    "icon": icons[i % len(icons)],
                })

            # Check if Gemini returned structured data from search (e.g., market prices)
            search_data = gemini_result.get("data", [])
            chart_config = None
            clean_search_data = []

            if isinstance(search_data, list) and len(search_data) > 0:
                # Clean and validate data rows
                for row in search_data:
                    if isinstance(row, dict):
                        clean_row = {}
                        for k, v in row.items():
                            if isinstance(v, (int, float, str, bool, type(None))):
                                clean_row[k] = v
                            else:
                                clean_row[k] = str(v)
                        clean_search_data.append(clean_row)

                # Build chart_config from search data
                if clean_search_data and gemini_result.get("chart_type") not in ("table", "none", None):
                    x_key = gemini_result.get("x_key", "")
                    y_keys = gemini_result.get("y_keys", [])
                    colors = gemini_result.get("colors", ["#f59e0b", "#22c55e", "#ef4444", "#8b5cf6"])

                    # Auto-detect keys if not provided by Gemini
                    if not x_key and clean_search_data:
                        columns = list(clean_search_data[0].keys())
                        x_key = columns[0] if columns else ""
                        y_keys = [c for c in columns[1:] if isinstance(clean_search_data[0].get(c), (int, float))]

                    if x_key and y_keys:
                        chart_config = {
                            "type": gemini_result.get("chart_type", "line"),
                            "xKey": x_key,
                            "yKeys": y_keys,
                            "colors": colors[:len(y_keys)],
                        }

                # Compute stats for search data
                data_stats = self.analyzer.compute_stats(clean_search_data) if clean_search_data else {}
            else:
                data_stats = {}

            if session_id:
                self.memory.add_turn(session_id, "assistant", answer)

            return {
                "answer": answer,
                "analysis": analysis,
                "sql": "",
                "data": clean_search_data,
                "chart_config": chart_config,
                "insight_cards": insight_cards,
                "anomalies": gemini_result.get("anomalies", []),
                "follow_up_questions": follow_ups[:3],
                "severity": gemini_result.get("severity", "normal"),
                "stats": data_stats,
                "role": role_info,
                "grounding_sources": gemini_result.get("grounding_sources", []),
            }

        # Step 2: Validate SQL
        is_valid, validated_sql = self.validate_sql(sql)
        if not is_valid:
            return {
                "answer": f"Maaf, query yang dihasilkan tidak valid: {validated_sql}",
                "analysis": "",
                "sql": sql,
                "data": [],
                "chart_config": None,
                "insight_cards": [],
                "anomalies": [],
                "follow_up_questions": gemini_result.get("follow_up_questions", [
                    "Tampilkan semua data suhu",
                    "Berapa jumlah device online?",
                    "Alarm kritis aktif apa saja?",
                ]),
                "severity": "normal",
                "stats": {},
                "role": role_info,
            }

        # Step 3: Execute query
        try:
            data = await self.execute_query(validated_sql)
        except ValueError as e:
            return {
                "answer": f"Error menjalankan query: {str(e)}",
                "analysis": "",
                "sql": validated_sql,
                "data": [],
                "chart_config": None,
                "insight_cards": [],
                "anomalies": [],
                "follow_up_questions": ["Coba tanyakan dengan cara berbeda"],
                "severity": "normal",
                "stats": {},
                "role": role_info,
            }

        # Step 4: Analyze data (anomalies + stats)
        anomalies_from_data = self.analyzer.detect_anomalies(data, validated_sql)
        anomalies_from_gemini = gemini_result.get("anomalies", [])
        all_anomalies = list(set(anomalies_from_data + anomalies_from_gemini))[:5]
        severity = self.analyzer.assess_severity(all_anomalies)
        data_stats = self.analyzer.compute_stats(data)

        # Override Gemini severity if our analyzer found something worse
        gemini_severity = gemini_result.get("severity", "normal")
        if severity == "critical" or gemini_severity == "critical":
            severity = "critical"
        elif severity == "warning" or gemini_severity == "warning":
            severity = "warning"

        # Step 5: Build chart config
        chart_config = None
        if data and gemini_result.get("chart_type") != "table":
            x_key = gemini_result.get("x_key", "")
            y_keys = gemini_result.get("y_keys", [])
            colors = gemini_result.get("colors", ["#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"])

            if not x_key and data:
                columns = list(data[0].keys())
                x_key = columns[0] if columns else ""
                y_keys = [c for c in columns[1:] if isinstance(data[0].get(c), (int, float))]

            if x_key and y_keys:
                chart_config = {
                    "type": gemini_result.get("chart_type", "bar"),
                    "xKey": x_key,
                    "yKeys": y_keys,
                    "colors": colors[:len(y_keys)],
                }

        # Step 6: Build insight cards
        insight_cards = []
        titles = gemini_result.get("insight_titles", [])
        values = gemini_result.get("insight_values", [])
        descriptions = gemini_result.get("insight_descriptions", [])
        icons = ["trend", "temp", "alert", "check"]
        for i in range(min(len(titles), 4)):
            insight_cards.append({
                "title": titles[i],
                "value": str(values[i]) if i < len(values) else "",
                "change": descriptions[i] if i < len(descriptions) else "",
                "icon": icons[i % len(icons)],
            })

        # Step 7: Follow-up suggestions
        follow_ups = gemini_result.get("follow_up_questions", [])
        if not follow_ups:
            follow_ups = self._generate_default_followups(question, data)

        # Step 8: Build analysis text
        analysis = gemini_result.get("analysis", "")
        if all_anomalies and not analysis:
            analysis = "⚠️ Anomali terdeteksi:\n" + "\n".join(f"• {a}" for a in all_anomalies)

        # Serialize clean data
        clean_data = []
        for row in data:
            clean_row = {}
            for k, v in row.items():
                if isinstance(v, (int, float, str, bool, type(None))):
                    clean_row[k] = v
                else:
                    clean_row[k] = str(v)
            clean_data.append(clean_row)

        # Save assistant turn to memory
        answer = gemini_result.get("explanation", "Data berhasil diambil.")
        if session_id:
            self.memory.add_turn(session_id, "assistant", answer, validated_sql)

        return {
            "answer": answer,
            "analysis": analysis,
            "sql": validated_sql,
            "data": clean_data,
            "chart_config": chart_config,
            "insight_cards": insight_cards,
            "role": role_info,
            "anomalies": all_anomalies,
            "follow_up_questions": follow_ups[:3],
            "severity": severity,
            "stats": data_stats,
            "grounding_sources": gemini_result.get("grounding_sources", []),
        }

    def _generate_default_followups(self, question: str, data: list[dict]) -> list[str]:
        """Generate default follow-up suggestions based on context."""
        lower = question.lower()
        followups = []

        if "suhu" in lower or "temp" in lower:
            followups = [
                "Kandang mana yang suhu tertinggi?",
                "Tren suhu selama 7 hari terakhir",
                "Korelasi suhu dengan kelembaban",
            ]
        elif "alarm" in lower:
            followups = [
                "Alarm kritis yang belum ditangani",
                "Device mana yang paling banyak alarm?",
                "Statistik alarm per minggu",
            ]
        elif "device" in lower or "sensor" in lower:
            followups = [
                "Device mana yang offline?",
                "Firmware version per device",
                "Kapan terakhir masing-masing device mengirim data?",
            ]
        elif "kelembab" in lower or "humid" in lower:
            followups = [
                "Kandang dengan kelembaban diluar range optimal",
                "Tren kelembaban harian",
                "Perbandingan kelembaban antar kandang",
            ]
        else:
            followups = [
                "Tampilkan ringkasan semua kandang",
                "Alarm kritis aktif apa saja?",
                "Tren suhu 7 hari terakhir",
            ]

        return followups

    async def get_summary(self) -> dict:
        """Get a quick farm summary without needing a question."""
        from sqlalchemy import text
        from app.core.database import AsyncSessionLocal

        summary = {}
        async with AsyncSessionLocal() as session:
            try:
                # Device counts
                r = await session.execute(text(
                    "SELECT status, COUNT(*) as cnt FROM devices GROUP BY status"
                ))
                for row in r.fetchall():
                    summary[f"devices_{row[0]}"] = row[1]

                # Active alarms
                r = await session.execute(text(
                    "SELECT severity, COUNT(*) as cnt FROM alarms "
                    "WHERE ts_close IS NULL GROUP BY severity"
                ))
                for row in r.fetchall():
                    summary[f"alarms_{row[0]}"] = row[1]

                # Latest telemetry stats
                r = await session.execute(text(
                    "SELECT metric, ROUND(AVG(value), 2) as avg_val, "
                    "ROUND(MAX(value), 2) as max_val, ROUND(MIN(value), 2) as min_val "
                    "FROM telemetry WHERE time > datetime('now', '-1 day') "
                    "GROUP BY metric"
                ))
                summary["latest_metrics"] = {}
                for row in r.fetchall():
                    summary["latest_metrics"][row[0]] = {
                        "avg": row[1], "max": row[2], "min": row[3]
                    }
            except Exception as e:
                summary["error"] = str(e)

        return summary


# Global instance
analysis_service = AnalysisService()

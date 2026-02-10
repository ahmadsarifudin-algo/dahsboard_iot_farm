# Farm Data Analysis Playground (Concept & Design)

## 1. Overview
The **Farm Data Analysis Playground** is an interactive, AI-powered workspace where users can explore IoT and production data using natural language. It combines the flexibility of a spreadsheet interface with the power of generative AI to democratize data access.

**Key Value Proposition:**
- **Zero-code Analysis**: Ask questions in plain Indonesian/English ("Tampilkan rata-rata bobot ayam di Farm A minggu lalu").
- **Deep Insights**: Correlation analysis between environmental factors (temperature, ammonia) and production metrics (IP, mortality).
- **Secure**: Strict multi-tenant data isolation.

---

## 2. User Experience (Wireframe)

### Layout Structure
```
+----------------+-------------------------------------------------------------+-------------------------+
|  SIDEBAR (L)   |                     MAIN WORKSPACE (Center)                 |      AI PANEL (R)       |
+----------------+-------------------------------------------------------------+-------------------------+
| [New Analysis] |  [ Toolbar: Filter | Pivot | Chart Type | Export ]          |                         |
|                |                                                             |  [ Chat History ]       |
| RECENT         |  +-------------------------------------------------------+  |                         |
| - Performance  |  |  GRID VIEW (Excel-like)                               |  |  User: "Show daily    |
|   Q1 2024      |  |  [Date] [Kandang] [Avg Temp] [Mortality] [FCR]        |  |  mortality vs temp"   |
| - Temp Audit   |  |  2024-01-01  A1       28.5        12         1.4      |  |                         |
|                |  |  2024-01-01  A2       29.1        15         1.5      |  |  AI: "Here is the     |
| SAVED          |  |  ...                                                  |  |  data. I noticed a    |
| - Monthly IP   |  +-------------------------------------------------------+  |  spike in mortality   |
|                |                                                             |  when temp > 30C."    |
| DATASETS       |  +-------------------------------------------------------+  |                         |
| - Telemetry    |  |  VISUALIZATION (Split View)                           |  |  [ Suggested Actions ]|
| - Harvests     |  |  [ Line Chart: Temp vs Mortality ]                    |  |  - "Add trendline"    |
|                |  |                                                       |  |  - "Compare with B1"  |
|                |  +-------------------------------------------------------+  |                         |
+----------------+-------------------------------------------------------------+  [ Input Box ]          |
+----------------+-------------------------------------------------------------+-------------------------+
```

### User Flow
1. **Ask**: User types "Kenapa IP kandang B turun bulan ini?" in the AI Panel.
2. **Process**: AI generates a SQL query focusing on `sites` and `performance_metrics` tables, filtered by User's permitted permissions.
3. **Visualize**: System executes query (Read-Only) and renders a data grid + auto-selected chart (e.g., trend line).
4. **Refine**: User clicks "Sort by Date" on grid or types "Breakdown daily" to pivot the data.
5. **Save**: User saves the view as "Analisis Penurunan IP - Feb 2026".

---

## 3. Architecture

### Tech Stack
- **Frontend**: Next.js 14, `ag-grid-react` (or `tanstack-table`), `recharts`, `framer-motion`.
- **Backend API**: FastAPI (Python) - handling SQL generation and execution.
- **Database**: TimescaleDB (Postgres extension) for high-performance time-series queries.
- **AI Engine**: Google Gemini Pro (via Vertex AI or AI Studio) - strong at SQL generation and reasoning.

### Data Flow
1. **NL Request** -> **Backend Analysis Service** -> **Gemini (Prompt + Schema)** -> **SQL Query**.
2. **SQL Query** -> **Security Middleware (SQL Guardrails + RLS)** -> **Read-Only DB Connection**.
3. **Result Set** -> **Backend** -> **Frontend (Grid/Chart)**.

---

## 4. Database Schema (Additions)

Existing tables (`telemetry`, `devices`, `sites`) will be queried. New tables needed for the Playground features:

```sql
-- Workspaces for organizing analysis
CREATE TABLE analysis_workspaces (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Saved Analysis/Queries
CREATE TABLE saved_analysis (
    id UUID PRIMARY KEY,
    workspace_id UUID REFERENCES analysis_workspaces(id),
    title VARCHAR(255),
    description TEXT,
    
    -- AI Context
    natural_language_query TEXT,
    
    -- Technical Context
    generated_sql TEXT,
    visualization_config JSONB, -- { type: 'line', x: 'time', y: 'value' }
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- RBAC / Access Control (Mock concept for now if User table missing)
CREATE TABLE user_site_access (
    user_id UUID,
    site_id UUID REFERENCES sites(id),
    role VARCHAR(50), -- 'viewer', 'editor'
    PRIMARY KEY (user_id, site_id)
);
```

---

## 5. Security & RBAC (Critical)

### 1. Row Level Security (RLS) or Query Injection
Since we generate SQL, we must ensure users don't query data they don't own.
*   **Approach**: Before executing the generated SQL, the backend parses the AST (using `sqlglot` or similar) and enforces a `WHERE site_id IN (...)` clause matches the user's token claims.

### 2. Read-Only Database User
The connection used by the Analysis Service must be a **Postgres Read-Only User**.
*   `GRANT SELECT ON ALL TABLES IN SCHEMA public TO analysis_user;`
*   Block `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`.

### 3. AI Guardrails
System prompt must explicitly forbid:
*   Queries about system tables (`pg_shadow`, `information_schema`).
*   Aggregations that might DOS the DB (enforce `LIMIT 1000`).

---

## 6. API Routes (Draft)

### Analysis Endpoints
*   `POST /api/v1/analysis/ask`:
    *   Input: `{ message: "Show me temperature history", context_id: "..." }`
    *   Output: `{ answer: "Here is the data...", sql: "SELECT...", data: [...], chart_config: {...} }`
*   `POST /api/v1/analysis/execute`:
    *   Execute a specific SQL (only if validated).
*   `GET /api/v1/analysis/history`: Get chat history.

### Workspace Endpoints
*   `GET /api/v1/workspaces`: List user workspaces.
*   `POST /api/v1/workspaces/{id}/save`: Save current analysis.

---

## 7. AI & Gemini Integration

### System Prompt Strategy
```text
You are an expert data analyst for a Poultry Farm IoT platform.
Your goal is to convert natural language questions into efficient PostgreSQL/TimescaleDB queries.
You have access to these tables:
- sites (id, name, region)
- devices (id, site_id, type, status)
- telemetry (time, device_id, metric, value)

RULES:
1. ALWAYS allow filtering by 'site_id'.
2. Return JSON with 'sql', 'explanation', and 'suggested_chart_type'.
3. Use time_bucket('1 hour', time) for aggregations over long periods.
4. If the user asks clearly hazardous things (DROP TABLE), refuse.
```

---

## 8. Implementation Milestones

### Phase 1: MVP (Proof of Concept)
*   **UI**: Simple chat interface + Read-only Data Table.
*   **Backend**: Basic Text-to-SQL for `telemetry` table only.
*   **Security**: Hardcoded `LIMIT 100` on all queries. No saved workspaces yet.
*   **Goal**: Demonstrate "Ask -> Get Data" flow.

### Phase 2: Visualization & Refinement
*   **UI**: Add Charts (Recharts) customized by AI response.
*   **Backend**: Robust SQL injection guard (sqlglot).
*   **Feature**: "Explain this data" (AI analyzes the result set row-by-row).

### Phase 3: The "Playground"
*   **UI**: Excel-like features (Pivot, Filter in UI).
*   **Feature**: Saved Workspaces & Sharing.
*   **Data**: Join with production data (feed, harvest, mortality).

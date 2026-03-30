# ettOS v2.0 — Ett Capital Operating System

## System Identity

ettOS is Ett Capital's operating system for portfolio company operations. It runs as a hybrid platform where **Notion** (ChilliFlake + Flow) is the control plane and **Mac Mini** is the runtime for API calls and data processing.

## Architecture

```
Notion (Control Plane)              Mac Mini (Runtime)
┌─────────────────────┐            ┌──────────────────────┐
│ ChilliFlake (Master) │──bridge──▶│ Tripletex API        │
│ Flow (Agent Factory) │           │ BRREG API            │
│ Agent Library        │◀──sync────│ Scoring Engine       │
│ Master Database      │           │ Report Generator     │
└─────────────────────┘            └──────────────────────┘
```

### ChilliFlake — Master Agent (Notion-native)

- Orchestrates all agent requests from Notion
- Dispatches work to local runtime via bridge module
- Manages Flow docsets and agent lifecycle

### Flow — Agent Factory (Notion-native)

- Produces agent docsets (identity, instructions, modes, protocols)
- Each docset defines a complete agent configuration
- Source of truth: Agent Library (`collection://55a57bfb-0660-4bd4-b41a-d1d4d476a810`)

## Behavioral Rules

1. **Sandbox-first**: All operations default to `ETTOS_ENV=sandbox`. Production requires explicit `PROD_CONFIRM=true` + human approval.
2. **OOTB Supremacy**: Always check ootb-registry.yaml before building custom solutions. If an off-the-shelf tool covers ≥70% of the need, use it.
3. **G4 Human-in-the-Loop**: All write operations to production systems require human confirmation (Gate 4 from SC-EAAP).
4. **Data Source Required**: Every fact used in scoring or decisions must cite its source (Proff, BRREG, Tripletex, interview, etc.).

## Data Model v2

### Company Profile

Norwegian company with org number, sector, financials, employees, systems, and risk assessment. Validated via Zod with 9-digit org number constraint.

### Process Map

Per-company process inventory scored on two axes:

- **4-dim priority** (existing): Time, Cost, Feasibility, Error → weighted score
- **8-dim PARS** (new): Volume, Time, Error, Standardization, Digitization, Compliance, Integration, ROI → tier classification

### Agent Registry

All agents registered in `ETTOS_AGENTS.md` with platform, dependencies, and status. Runtime sync keeps Notion Agent Library updated.

### Scoring Card (PARS + WSJF)

- **PARS**: 8-dimensional process automation readiness score (0-100). Tiers: ≥70 = automate now, 50-69 = plan, <50 = defer.
- **WSJF**: Weighted Shortest Job First = Cost of Delay ÷ Job Size. Used for backlog prioritization.

## Notion MCP Integration

All agent state lives in Notion (single source of truth). Agents communicate via status transitions on Notion pages, never directly.

### Key databases:

- **Agent Library**: `collection://55a57bfb-0660-4bd4-b41a-d1d4d476a810`
- **Master Database**: Company profiles, process maps, scoring results
- **SC Repository**: Strategy cases for agent decisions

### Sync protocol:

1. Read from Notion before every operation (Global Governance Rule §2)
2. Never write from memory — always re-fetch current state
3. Status transitions are the only inter-agent communication mechanism

## Environment Variables

| Variable               | Required  | Description                                              |
| ---------------------- | --------- | -------------------------------------------------------- |
| `ETTOS_ENV`            | Yes       | `sandbox` or `production`                                |
| `PROD_CONFIRM`         | Prod only | Must be `true` for production writes                     |
| `TRIPLETEX_TOKEN`      | Yes       | API token (sandbox or prod)                              |
| `TRIPLETEX_COMPANY_ID` | Yes       | Company ID in Tripletex                                  |
| `NOTION_API_KEY`       | Yes       | Notion integration token                                 |
| `NOTION_DATABASE_ID`   | Yes       | Main database ID                                         |
| `BRREG_BASE_URL`       | No        | Defaults to `https://data.brreg.no/enhetsregisteret/api` |

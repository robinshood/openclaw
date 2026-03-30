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

### Integration test variables (optional)

| Variable                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `NOTION_AGENT_LIBRARY_DB` | Database ID for the Agent Library (bridge E2E tests) |
| `NOTION_TEST_AGENT_PAGE`  | A specific agent page ID for docset parsing tests    |
| `NOTION_ROSTER_DB`        | Database ID for the Agent Roster (register tests)    |

## Setup: Running Integration Tests

Integration tests are opt-in and skip automatically when tokens are missing.

```bash
# Tripletex sandbox integration tests
ETTOS_ENV=sandbox \
  TRIPLETEX_TOKEN=your-sandbox-token \
  TRIPLETEX_COMPANY_ID=your-company-id \
  pnpm --filter @openclaw/hermes-paperclip test:integration

# Notion MCP bridge integration tests
NOTION_API_KEY=your-notion-token \
  NOTION_AGENT_LIBRARY_DB=your-db-id \
  pnpm --filter @openclaw/hermes-paperclip test:integration

# All integration tests at once
ETTOS_ENV=sandbox \
  TRIPLETEX_TOKEN=xxx TRIPLETEX_COMPANY_ID=yyy \
  NOTION_API_KEY=zzz NOTION_AGENT_LIBRARY_DB=www \
  pnpm --filter @openclaw/hermes-paperclip test:integration
```

Unit tests (no tokens needed): `npx vitest run --config vitest.extensions.config.ts extensions/hermes-paperclip`

## Assumption Validation Status

Tracks which SC assumptions are validated by code and tests.

| #   | Assumption                                    | Status              | Evidence                                                               | Gap                                                                         |
| --- | --------------------------------------------- | ------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| A1  | Flow docset parsing works                     | Validated           | `src/bridge/docset-parser.ts` + 6 unit tests in `tests/bridge.test.ts` | E2E with real Notion untested (integration test harness ready, needs token) |
| A2  | Proff data is available for profiling         | Not validated       | No Proff API client exists                                             | Need API client or CSV import path for Proff data                           |
| A3  | WSJF produces useful prioritization signal    | Partially validated | `src/shared/scoring/wsjf.ts` implements formula + 4 unit tests         | Not tested on real backlog data; needs real WSJF ranking session            |
| A4  | Agents can learn from feedback autonomously   | Not validated       | No learning or feedback loop code exists                               | Phase 3+ — requires scoring history + model fine-tuning                     |
| A5  | Mac Mini is sufficient runtime for all agents | Partially validated | 150+ tests pass locally in <2s                                         | No load testing, no concurrent agent execution testing                      |
| A6  | FH (Frogner House) can be fully profiled      | Not validated       | NACE 55.10x template exists in information-needs.ts (8 fields)         | No FH-specific data, no Proff integration, no process discovery             |
| A7  | Hybrid Notion+Mac approach is viable          | Partially validated | Architecture defined, bridge built, mode mapper works                  | Skills handoff untested, full E2E pipeline untested                         |
| A8  | Qualitative knowledge fits in pgvector        | Not validated       | No vector/embedding code exists                                        | Phase 3+ — requires embedding model + pgvector setup                        |

## Module Boundaries

Dependency graph — each module may only import from its own layer or lower layers.

```
Layer 0 (shared/config):   env.ts, sandbox-guard.ts
  ↑ No upward deps. Everything can import these.

Layer 1 (shared/clients):  tripletex-client.ts, tripletex-schemas.ts, brreg-client.ts
  ↑ Depends on Layer 0 only.

Layer 2 (shared/scoring):  pars.ts, wsjf.ts
  ↑ Depends on Layer 0 only. No client deps.

Layer 3 (hermes):          information-needs.ts, (future: map-target.ts, process-audit.ts)
  ↑ Depends on Layer 0 + Layer 1 (BRREG) + Layer 2 (PARS).

Layer 4 (bridge):          docset-parser.ts, mode-mapper.ts, sync-back.ts
  ↑ Depends on Layer 0 only. Uses NotionClient interface.

Layer 5 (agents):          bilagsansen/, portalklar/, velkomst/, tidsvokter/, renvasken/
  ↑ Can depend on any lower layer.
  ↑ Agents must NOT depend on each other directly.
  ↑ Inter-agent communication goes through Notion status transitions (Layer 4).

Layer 6 (mission-control): dashboard.ts, reporter.ts, widgets/
  ↑ Can depend on any lower layer. Read-only aggregation.
```

### Rules

- Each file's top JSDoc comment should declare its layer: `@layer 0` through `@layer 6`
- Agents (Layer 5) must never import from other agents
- Bridge (Layer 4) must never import from agents or hermes
- Split threshold: if any single layer exceeds 1,500 LOC or 8 files, extract to `@openclaw/ettos-{layer-name}`

### Current LOC by layer

| Layer               | Files | ~LOC | Status            |
| ------------------- | ----- | ---- | ----------------- |
| 0 (config)          | 3     | ~170 | OK                |
| 1 (clients)         | 3     | ~500 | OK                |
| 2 (scoring)         | 2     | ~250 | OK                |
| 3 (hermes)          | 1     | ~350 | OK                |
| 4 (bridge)          | 3     | ~510 | OK                |
| 5 (agents)          | 1     | ~450 | OK                |
| 6 (mission-control) | 4     | ~300 | OK (pre-existing) |

## Test Summary

- **Unit tests:** 159 passing
- **Integration tests:** 10 (skip when tokens not set)
- **Total test files:** 14 (12 unit + 2 integration)
- **Coverage:** Not yet measured (run `pnpm test:coverage`)

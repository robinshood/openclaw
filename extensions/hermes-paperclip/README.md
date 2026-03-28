# Hermes × Paperclip — Systemregnskap Automation Platform

**POC for Ett Capital AS** — AI-powered accounting automation for Norwegian regnskapsbyrå (accounting firms).

## What This Is

A multi-agent system that automates the repetitive parts of Norwegian accounting operations. Two parent systems work together:

- **Hermes** — Client-facing intelligence (reports, expense automation)
- **Paperclip** — Internal infrastructure (data quality, onboarding, time tracking)

Every piece of data passes through a **data quality gate** (Renvasken) before any agent touches it. Every write operation requires **human approval** (G4 gate). Every action is logged to an **audit trail**.

## Architecture

```
Source → Renvasken (validate) → Supabase (clean) → Agent → G4 Gate → Tripletex
                                                              ↓
                                                        Audit Trail
```

**Data flow rule**: Source → Renvasken → Supabase → Agent → Output. Never Source → Agent directly.

## The 5 Agents

| Priority | Agent           | Parent    | What It Does                                    |
| -------- | --------------- | --------- | ----------------------------------------------- |
| 4.8      | **Renvasken**   | Paperclip | Data quality gate — 4-layer validation pipeline |
| 4.1      | **Bilagsansen** | Hermes    | Credit card expense → voucher automation        |
| 3.7      | **Portalklar**  | Hermes    | Monthly client report generation                |
| 3.6      | **Velkomst**    | Paperclip | New client onboarding (BRREG → Tripletex)       |
| 3.5      | **Tidsvokter**  | Paperclip | Timesheet sync & per-client profitability       |

### Renvasken — Data Quality Gate

Every record entering the system passes through 4 validation layers:

1. **Layer 1: Schema** — Zod validation against record type (voucher, customer, transaction, employee, BRREG)
2. **Layer 2: Statistical** — Outlier detection (z-score >3σ), temporal consistency, duplicate detection, staleness check
3. **Layer 3: Semantic** — LLM validation (planned, not yet implemented)
4. **Layer 4: Compliance** — Bokføringsloven §5 required fields, §7 sequential numbering, MVA rate validation

Confidence score formula: `(schema × 0.3) + (stats × 0.25) + (compliance × 0.3) + (semantic × 0.15)`

Dataset threshold: **85% CLEAN** required to proceed.

### Bilagsansen — Credit Card Automation

Covers the gap that Propell.ai does NOT handle: credit card expenses. Propell handles bank/invoice vouchers — we don't rebuild that.

Flow: Fetch CC statements → Renvasken → Classify merchant (regex rules) → Build voucher → G4 gate → POST to Tripletex

Classification confidence:

- **GREEN** — Known pattern match → auto-queue for G4 approval
- **YELLOW** — Fallback → flag for manual review
- **RED** — Ambiguous → escalate to accountant

### Portalklar — Monthly Reports

Generates Norwegian-language monthly client reports with:

- Revenue vs. prior year comparison
- EBITDA and margin calculation
- Industry-specific KPIs (hotel, eiendom, SMB standard)
- Deviation detection (>10% change flagged)
- Cached in Supabase for portal delivery

### Velkomst — Client Onboarding

Automates new client setup:

1. Fetch company data from BRREG (Brønnøysundregistrene)
2. Validate through Renvasken
3. Map NACE code → industry template
4. Generate onboarding checklist
5. Create customer in Tripletex (G4 gate)
6. Persist profile to Supabase

Checks for bankruptcy/liquidation before proceeding.

### Tidsvokter — Time Tracking Bridge

Daily sync of timesheet entries from Tripletex:

- Maps entries to clients via project mapping
- Validates through Renvasken
- Calculates per-client profitability (fixed, hourly, mixed pricing)
- Flags unprofitable clients (margin < 10%)
- Prepares invoices with Norwegian line items

## Key Principles

- **OOTB Supremacy**: Use Propell.ai for voucher automation. Don't rebuild what works.
- **Sandbox First**: All Tripletex calls go to `api-test.tripletex.tech`. Production requires `PROD_CONFIRM=true`.
- **G4 Gate**: Every Tripletex write operation blocked until human approves. Auto-approves in sandbox.
- **Confidence on Everything**: Every output tagged H/M/L with reasoning.
- **Audit Everything**: Every agent action → `audit_trail` table.
- **Bokføringsloven Compliance**: Norwegian accounting law built into Layer 4 validation.

## Tech Stack

- **Runtime**: TypeScript (ESM), Node 22+
- **API**: Tripletex API v2 (session token auth, exponential backoff)
- **Database**: Supabase (PostgreSQL + pgvector for agent memory)
- **Validation**: Zod v4 schemas
- **Testing**: Vitest

## Project Structure

```
extensions/hermes-paperclip/
├── src/
│   ├── index.ts                          # Main entry point
│   ├── agents/
│   │   ├── renvasken/                    # Data quality gate (4.8)
│   │   │   ├── index.ts                  # Orchestrator
│   │   │   ├── schema-validator.ts       # Layer 1
│   │   │   ├── statistical-checks.ts     # Layer 2
│   │   │   ├── compliance-checker.ts     # Layer 4
│   │   │   ├── confidence-scorer.ts      # Scoring formula
│   │   │   ├── quality-reporter.ts       # Report generation
│   │   │   └── schemas/                  # Zod schemas per type
│   │   ├── bilagsansen/                  # CC expense automation (4.1)
│   │   │   ├── index.ts                  # Batch + single processing
│   │   │   ├── classifier.ts             # Merchant → account mapping
│   │   │   ├── voucher-builder.ts        # Tripletex voucher payloads
│   │   │   └── rules.json                # Classification rules
│   │   ├── portalklar/                   # Monthly reports (3.7)
│   │   │   ├── index.ts
│   │   │   ├── kpi-engine.ts             # KPI calculations
│   │   │   ├── report-generator.ts       # Report formatting
│   │   │   └── templates/                # Industry templates
│   │   ├── velkomst/                     # Client onboarding (3.6)
│   │   │   ├── index.ts
│   │   │   ├── brreg-fetcher.ts          # BRREG API client
│   │   │   ├── industry-mapper.ts        # NACE → template
│   │   │   └── checklist-engine.ts       # Onboarding checklist
│   │   └── tidsvokter/                   # Time tracking (3.5)
│   │       ├── index.ts
│   │       ├── timesheet-sync.ts         # Tripletex timesheet fetch
│   │       ├── profitability.ts          # Per-client P&L
│   │       └── invoice-prep.ts           # Invoice line items
│   ├── config/                           # Agent + API configs
│   ├── lib/                              # Tripletex client, Supabase, priority scorer
│   └── shared/                           # Types, audit logger, G4 gate, confidence
├── supabase/migrations/                  # 9 SQL migration files
├── tests/                                # Vitest test suites + fixtures
├── .env.example                          # Required environment variables
└── package.json
```

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env and fill in your tokens
cp extensions/hermes-paperclip/.env.example extensions/hermes-paperclip/.env

# 3. Run Supabase migrations
# (Apply SQL files in supabase/migrations/ in order)

# 4. Run tests
cd extensions/hermes-paperclip
pnpm test

# 5. Run in dev
pnpm dev
```

### Environment Variables

| Variable                   | Description                                |
| -------------------------- | ------------------------------------------ |
| `TRIPLETEX_CONSUMER_TOKEN` | Tripletex API consumer token               |
| `TRIPLETEX_EMPLOYEE_TOKEN` | Tripletex API employee token               |
| `TRIPLETEX_ENV`            | `test` (default) or `prod`                 |
| `SUPABASE_URL`             | Supabase project URL                       |
| `SUPABASE_SERVICE_KEY`     | Supabase service role key                  |
| `PROD_CONFIRM`             | Must be `true` to use production Tripletex |

## Database Schema

9 tables with RLS enabled:

1. `agent_state` — Agent status and config
2. `audit_trail` — Every agent action logged
3. `client_profiles` — One per accounting client
4. `data_quality_log` — Renvasken validation results
5. `data_quality_rules` — Configurable validation rules
6. `data_quality_metrics` — Aggregate quality scores
7. `time_entries` — Synced timesheet data
8. `report_cache` — Generated client reports
9. `agent_memory` — pgvector embeddings for agent learning

## MVA Rates (Norwegian VAT)

| Rate | Usage                                                             |
| ---- | ----------------------------------------------------------------- |
| 0%   | Flights, postal services, insurance                               |
| 12%  | Hotels, accommodation                                             |
| 15%  | Food (not applicable in current rules)                            |
| 25%  | Standard rate (restaurants, taxi, fuel, office supplies, telecom) |

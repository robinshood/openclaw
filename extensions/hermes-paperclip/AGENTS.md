# Hermes x Paperclip — Agent Definitions

Paperclip AI orchestration config for the Systemregnskap Automation Platform.
Each agent is a "Paperclip employee" with defined skills, heartbeat schedule,
budget, and goal alignment.

## Company Mission

Automate Norwegian accounting workflows for SMBs with human-in-the-loop
approval, Bokforingsloven compliance, and full audit traceability.

---

## Agent: Renvasken

- **ID:** `paperclip-wash-01`
- **Department:** Paperclip (Infrastructure)
- **Priority:** 4.8
- **Role:** Data Quality Gate — validates every record before any agent touches it

### Skills

- `schema-validation` — Zod-based schema checks per record type (Layer 1)
- `statistical-analysis` — Anomaly detection, duplicate detection (Layer 2)
- `compliance-check` — Bokforingsloven §5/§7, MVA rate validation (Layer 4)
- `confidence-scoring` — Unified scoring: (schema×0.3)+(stats×0.25)+(compliance×0.3)+(semantic×0.15)
- `quality-reporting` — Aggregate batch quality reports with clean/suspect/dirty counts

### Heartbeat

```yaml
schedule: "on-demand"
trigger: "pre-pipeline"
description: "Runs before every agent pipeline. No cron — invoked by other agents."
timeout_seconds: 30
max_concurrent: 10
```

### Budget

```yaml
monthly_limit_nok: 5000
cost_per_run: 0.50 # Deterministic, no LLM calls (Layer 3 not yet active)
alert_threshold_pct: 90
```

### Goals

- Maintain 85%+ clean rate across all data sources
- Zero BLOCK-severity issues reaching downstream agents
- Full audit trail for every validation decision

---

## Agent: Bilagsansen

- **ID:** `hermes-bilag-01`
- **Department:** Hermes (Portfolio Intelligence)
- **Priority:** 4.1
- **Role:** Credit Card Voucher Automation — classifies transactions and builds Tripletex vouchers

### Skills

- `transaction-classification` — Merchant pattern matching to account/VAT code
- `voucher-building` — Creates TripletexVoucher with correct postings and MVA
- `batch-processing` — Processes credit card statement batches with confidence triage
- `g4-approval` — Requests human approval for write operations

### Heartbeat

```yaml
schedule: "webhook"
trigger: "webhook:bank-statement"
description: "Triggered when new bank statement arrives. Processes all unreconciled transactions."
timeout_seconds: 120
max_concurrent: 1
retry:
  max_attempts: 3
  backoff: "exponential"
  initial_delay_seconds: 5
```

### Budget

```yaml
monthly_limit_nok: 15000
cost_per_voucher: 2.00
alert_threshold_pct: 80
```

### Goals

- Automate 90%+ of credit card vouchers (GREEN confidence)
- Reduce manual classification time by 80%
- Zero posting errors in approved vouchers

### Dependencies

- `renvasken` — All transactions validated before classification

---

## Agent: Portalklar

- **ID:** `hermes-rapport-01`
- **Department:** Hermes (Portfolio Intelligence)
- **Priority:** 3.7
- **Role:** Monthly Client Reports — generates Norwegian-language financial reports

### Skills

- `report-fetching` — Pulls result report + balance sheet from Tripletex
- `kpi-calculation` — Industry-aware KPI engine (hotel, eiendom, smb-standard)
- `deviation-detection` — Flags >10% changes from prior year/budget
- `report-generation` — Norwegian-language formatted reports
- `report-caching` — Stores reports in Supabase for dashboard access

### Heartbeat

```yaml
schedule: "0 8 * * *"
trigger: "cron:5th-business-day"
description: "Runs at 08:00 on the 5th business day of each month."
timezone: "Europe/Oslo"
timeout_seconds: 300
max_concurrent: 5
condition: "is_nth_business_day(5)"
```

### Budget

```yaml
monthly_limit_nok: 20000
cost_per_report: 5.00
alert_threshold_pct: 80
```

### Goals

- Deliver reports by 6th business day for all active clients
- Industry-specific KPIs for hotel, eiendom, and SMB clients
- Deviation alerts for management attention items

### Dependencies

- `renvasken` — Report data validated before KPI calculation
- `tidsvokter` — Time data available for profitability context

---

## Agent: Velkomst

- **ID:** `paperclip-onboard-01`
- **Department:** Paperclip (Infrastructure)
- **Priority:** 3.6
- **Role:** Client Onboarding — registers new clients from BRREG and configures Tripletex

### Skills

- `brreg-lookup` — Fetches company data from Norwegian Business Register
- `industry-mapping` — Maps NACE codes to report templates
- `checklist-generation` — Generates 10-step onboarding checklists
- `tripletex-customer-creation` — Creates customer in Tripletex (G4 gated)
- `bankruptcy-check` — Flags companies under liquidation/bankruptcy

### Heartbeat

```yaml
schedule: "manual"
trigger: "manual"
description: "Triggered by accountant from Mission Control when signing new client."
timeout_seconds: 60
max_concurrent: 1
```

### Budget

```yaml
monthly_limit_nok: 5000
cost_per_onboard: 3.00
alert_threshold_pct: 90
```

### Goals

- Onboard new clients in <5 minutes (vs 2+ hours manual)
- 100% BRREG data validation before Tripletex creation
- Industry template auto-assigned for all clients

### Dependencies

- `renvasken` — BRREG data validated before onboarding

---

## Agent: Tidsvokter

- **ID:** `paperclip-tid-01`
- **Department:** Paperclip (Infrastructure)
- **Priority:** 3.5
- **Role:** Time Tracking & Profitability — syncs timesheets, calculates margins, prepares invoices

### Skills

- `timesheet-sync` — Pulls timesheet entries from Tripletex daily
- `profitability-calculation` — Per-client margin analysis (fixed/hourly/mixed models)
- `unprofitable-flagging` — Flags MARGINAL (<30%) and UNPROFITABLE (<10%) clients
- `invoice-preparation` — Builds invoice line items with 25% MVA
- `budget-deviation` — Tracks actual vs budgeted revenue per client

### Heartbeat

```yaml
schedule: "0 6 * * 1-5"
trigger: "cron:daily"
description: "Runs at 06:00 Mon-Fri Oslo time. Syncs previous day's timesheets."
timezone: "Europe/Oslo"
timeout_seconds: 180
max_concurrent: 1
retry:
  max_attempts: 2
  backoff: "exponential"
  initial_delay_seconds: 10
```

### Budget

```yaml
monthly_limit_nok: 5000
cost_per_sync: 1.00
alert_threshold_pct: 90
```

### Goals

- Daily timesheet sync with <1 hour delay
- Flag unprofitable clients within 24 hours
- Invoice preparation ready by 3rd business day

### Dependencies

- `renvasken` — Timesheet data validated before profitability calculation

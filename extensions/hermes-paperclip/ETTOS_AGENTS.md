# ettOS Agent Registry

All agents in the ettOS platform, their roles, runtime requirements, and current status.

## Meta-Agents

### Hermes — Chief Intelligence Officer

- **Role**: Company profiling, process discovery, PARS scoring, information needs analysis
- **Platform**: Hybrid (Notion-native for scoring, Mac Mini for API data fetching)
- **Modules**: `map-target`, `process-audit`, `information-needs`
- **Dependencies**: BRREG API, Proff data, PARS scoring engine
- **Status**: sandbox
- **Notion docset**: Agent Library → Hermes

### Paperclip — Chief Operating Officer

- **Role**: Agent lifecycle management, health monitoring, sprint planning, budget tracking
- **Platform**: Notion-native (ChilliFlake Mode 8)
- **Modules**: `agent-roster`, `health-check`, `sprint-planner`
- **Dependencies**: Agent Library, Notion MCP
- **Status**: sandbox
- **Notion docset**: Agent Library → Paperclip

## Domain Agents

### Bilagsansen — Voucher Classifier

- **Role**: Credit card and expense classification, account coding, VAT determination
- **Platform**: Mac Mini (API calls to Tripletex)
- **Package**: Standard (Flow docset)
- **Dependencies**: `tripletex_api` (POST /ledger/voucher), `konteringsregler`
- **Status**: sandbox
- **Flow built**: false
- **Success criteria**: ≥90% classification accuracy on 50 test transactions

### Portalklar — Report Generator

- **Role**: Monthly client reports with industry-specific KPIs
- **Platform**: Mac Mini (API calls to Tripletex)
- **Package**: Standard (Flow docset)
- **Dependencies**: `tripletex_api` (GET /resultReport, /balanceSheet), `kpi-engine`
- **Status**: sandbox
- **Flow built**: false
- **Success criteria**: Complete report with KPIs within 2 minutes

### Velkomst — Client Onboarding

- **Role**: New client setup from BRREG data into Tripletex
- **Platform**: Mac Mini (API calls to BRREG + Tripletex)
- **Package**: Standard (Flow docset)
- **Dependencies**: `brreg_api`, `tripletex_api` (POST /customer), `nace-templates`
- **Status**: sandbox
- **Flow built**: false
- **Success criteria**: Correct account plan generated from NACE code

### Tidsvokter — Timesheet Profitability

- **Role**: Timesheet analysis and profitability tracking per client/employee
- **Platform**: Mac Mini (API calls to Tripletex)
- **Package**: Standard (Flow docset)
- **Dependencies**: `tripletex_api` (GET /timesheet, /employee)
- **Status**: sandbox
- **Flow built**: false

### Renvasken — 4-Layer Validation

- **Role**: Multi-layer validation of accounting entries (format, rules, cross-reference, anomaly)
- **Platform**: Mac Mini (API calls to Tripletex)
- **Package**: Standard (Flow docset)
- **Dependencies**: `tripletex_api`, `validation-rules`
- **Status**: sandbox
- **Flow built**: false

## Utility Agents

### Process Scorer

- **Role**: PARS + WSJF scoring of processes for prioritization
- **Platform**: Notion-native (ChilliFlake/Claude)
- **Dependencies**: PARS scoring engine, process data
- **Status**: sandbox

### Voice Agent (Frogner House)

- **Role**: Voice-activated lock and RMS operations
- **Platform**: Mac Mini (Lock API + RMS API)
- **Dependencies**: lock_api, rms_api
- **Status**: planned

## Agent Lifecycle

```
Flow docset created → Validated in Agent Library → Sandbox testing → Production (with G4 gate)
```

Each agent follows:

1. **Build**: Flow produces docset (identity, instructions, modes, protocol)
2. **Register**: Bridge module parses docset → registers in Agent Roster
3. **Test**: Run in sandbox with test data; measure against success criteria
4. **Promote**: Human approval (G4) → production status
5. **Monitor**: Paperclip health-checks via heartbeat schedule

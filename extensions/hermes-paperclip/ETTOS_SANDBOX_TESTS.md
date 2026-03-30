# ettOS Sandbox Test Plan

Maps SC §5.3 sandbox tests to concrete executable requirements.

## Sandbox Test #1: Bilagsansen kredittkort-klassifisering

- **SC Reference:** §5.3 item 1
- **What it proves:** A1 (rule-based classification) — that konteringsregler + LLM fallback can classify Norwegian credit card transactions at ≥90% accuracy
- **Components required:**
  - `src/agents/bilagsansen/konteringsregler.ts` (matching engine)
  - `src/shared/tripletex-client.ts` (GET/POST voucher)
  - `src/shared/config/sandbox-guard.ts` (write gating)
  - `data/konteringsregler.yaml` (rules)
- **Environment variables:** `ETTOS_ENV=sandbox`, `TRIPLETEX_TOKEN`, `TRIPLETEX_COMPANY_ID`
- **Test data needed:** 50 credit card transactions with known correct classification (account number + VAT code). Source: real anonymized transactions from a test accounting firm.
- **Blocking dependencies:**
  - Domain expert review of konteringsregler (17 rules exist, need validation)
  - 50 labeled test transactions (not yet created)
  - LLM fallback classifier for ambiguous transactions (not yet built)
- **Status:** NOT READY
- **How to run:** `npx vitest run tests/sandbox-bilagsansen.test.ts` (test file not yet created)

## Sandbox Test #2: Portalklar månedlig resultatrapport

- **SC Reference:** §5.3 item 2
- **What it proves:** That Portalklar can generate a complete monthly client report with industry KPIs from Tripletex data within 2 minutes
- **Components required:**
  - `src/shared/tripletex-client.ts` (GET resultReport, balanceSheet)
  - `src/shared/tripletex-schemas.ts` (typed responses)
  - `src/agents/portalklar/report-gen.ts` (NOT YET BUILT)
  - `src/agents/portalklar/kpi-engine.ts` (NOT YET BUILT)
- **Environment variables:** `ETTOS_ENV=sandbox`, `TRIPLETEX_TOKEN`, `TRIPLETEX_COMPANY_ID`
- **Test data needed:** 3 test companies in different industries (hotell, eiendom, generell) with populated Tripletex data
- **Blocking dependencies:**
  - Portalklar report generator (not yet built — Phase 1)
  - KPI engine with industry templates (not yet built — Phase 1)
  - Report templates per industry (not yet built)
  - Cash flow / liquidity estimate module (AX2)
- **Status:** NOT READY
- **How to run:** TBD

## Sandbox Test #3: Velkomst ny kundeopprettelse fra BRREG

- **SC Reference:** §5.3 item 3
- **What it proves:** That Velkomst can take a BRREG org number, fetch company data, determine NACE code, generate appropriate account plan, and create the customer in Tripletex
- **Components required:**
  - `src/shared/brreg-client.ts` (getEnhet, getPrimaryNace)
  - `src/shared/tripletex-client.ts` (POST customer)
  - `src/agents/velkomst/onboard.ts` (NOT YET BUILT)
  - `src/agents/velkomst/nace-templates/` (NOT YET BUILT)
- **Environment variables:** `ETTOS_ENV=sandbox`, `TRIPLETEX_TOKEN`, `TRIPLETEX_COMPANY_ID`
- **Test data needed:** 1 real Norwegian org number (e.g. from BRREG test environment)
- **Blocking dependencies:**
  - Velkomst onboarding logic (not yet built — Phase 1)
  - NACE-based account plan templates (not yet built)
- **Status:** NOT READY
- **How to run:** TBD

## Sandbox Test #4: Tidsvokter timeregistrering-audit

- **SC Reference:** §5.3 item 4
- **What it proves:** That Tidsvokter can fetch timesheet data from Tripletex and produce profitability analysis per client/employee
- **Components required:**
  - `src/shared/tripletex-client.ts` (GET timesheet/entry, GET employee)
  - `src/agents/tidsvokter/timesheet.ts` (NOT YET BUILT)
- **Environment variables:** `ETTOS_ENV=sandbox`, `TRIPLETEX_TOKEN`, `TRIPLETEX_COMPANY_ID`
- **Test data needed:** Timesheet entries for at least 3 employees across 2+ clients
- **Blocking dependencies:**
  - Tidsvokter analysis module (not yet built — Phase 1)
  - Profitability calculation logic (hourly rate vs cost)
- **Status:** NOT READY
- **How to run:** TBD

## Sandbox Test #5: BRREG → Information Needs → PARS scoring E2E

- **SC Reference:** §5.3 item 5
- **What it proves:** A7 (hybrid approach viable) — that Hermes can take a company org number, fetch BRREG data, generate information needs from NACE code, and produce PARS scores for discovered processes
- **Components required:**
  - `src/shared/brreg-client.ts` (getEnhet, getAllNaceCodes)
  - `src/hermes/information-needs.ts` (createInformationNeeds, collectDataPoint)
  - `src/shared/scoring/pars.ts` (buildParsResult)
  - `src/hermes/process-audit.ts` (NOT YET BUILT)
- **Environment variables:** `BRREG_BASE_URL` (optional, defaults to live API)
- **Test data needed:** SC-3 data (28 systems) + D20 (15 processes in 4 tiers) for Frogner House
- **Blocking dependencies:**
  - Hermes process-audit module (not yet built — Phase 2)
  - Proff data integration or CSV import (not yet built)
  - FH-specific test data population
- **Status:** NOT READY
- **How to run:** TBD

## Sandbox Test #6: Full bridge — Notion docset → runtime config → execute → sync back

- **SC Reference:** §5.3 item 6
- **What it proves:** A1 (Flow docset parsing) + A7 (hybrid viable) — that the complete pipeline from Notion Agent Library to runtime execution and back works end-to-end
- **Components required:**
  - `src/bridge/docset-parser.ts` (parseAgentDocset)
  - `src/bridge/mode-mapper.ts` (mapFlowToRuntime)
  - `src/bridge/sync-back.ts` (registerInRoster, syncAgentStatus, syncSandboxResults)
  - `src/shared/notion/client.ts` (NotionClient)
- **Environment variables:** `NOTION_API_KEY`, `NOTION_AGENT_LIBRARY_DB`, `NOTION_ROSTER_DB`
- **Test data needed:** A Flow-generated agent docset in the real Agent Library (at least the Att Finance Controller docset with all 6 sub-pages)
- **Blocking dependencies:**
  - Real Notion Agent Library database populated with at least 1 complete docset
  - Integration test infrastructure (created in §2/§3 but not yet run against real Notion)
- **Status:** NOT READY
- **How to run:** See `ETTOS.md` §Setup: Running Integration Tests

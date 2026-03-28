# GitHub Copilot Improvement Prompt — ettOS Mission Control

Use this prompt in GitHub Copilot Chat (or Copilot Workspace) to improve the Mission Control React app at `extensions/hermes-paperclip/app/`.

---

## Prompt

```
You are improving a React + Vite + TypeScript app for "ettOS Mission Control" — a PE portfolio
intelligence dashboard for Ett Capital. The app lives at extensions/hermes-paperclip/app/.

The backend logic is at extensions/hermes-paperclip/src/ with Zod models, decision principles,
and a Notion MCP client. The React app is currently a static prototype with mock data.

### Architecture Context

Two AI agents operate portfolio companies:
- HERMES: Intelligence agent — profiles companies, maps processes, monitors KPIs
- PAPERCLIP: Integration agent — gap analysis, sprint planning, builds automations

They communicate via Notion (single source of truth), never directly.
Every decision uses three mandatory principles: First Principles decomposition,
Inversion (8 failure modes), and Weighted Decision Matrix.

Sprint methodology: WORKSHOP → POC (Go/No-Go gate) → MVP → SCALE

### What to improve (in priority order):

1. **Make it live — connect to real data**
   - Import types from ../../src/shared/models/ (Company, Process, Gap, Sprint)
   - Import types from ../../src/mission-control/types.ts (DashboardState, CompanyCard, KpiCard)
   - Add a simple REST API layer or direct Notion MCP calls to fetch real data
   - Replace all hardcoded mock data with API-driven state using React hooks

2. **Add the Sprint Board module**
   - Kanban-style columns: WORKSHOP | POC | MVP | SCALE
   - Each card: company name, priority score (T×0.4 + C×0.3 + F×0.2 + E×0.1), agent badge
   - POC column has a Go/No-Go toggle button
   - Cards are draggable between columns
   - Color: Hermes = gold (#D4A843), Paperclip = charcoal (#57534E)

3. **Add the Intelligence Pipeline module**
   - Horizontal pipeline: Target Acquired → Scanning → Profiling → System Map → Process Audit → Handoff
   - Each stage shows: company name, confidence score, data sources used, time elapsed
   - Active stage pulses with subtle animation
   - Completed stages show green checkmark

4. **Add real-time KPI dashboard**
   - Import KpiCard type from mission-control/types.ts
   - Show: Process Mapping Rate (%), Gap Closure Rate (%), Total Gaps Open, Revenue/Employee
   - Each KPI has trend indicator (UP/DOWN/STABLE) and threshold status (OK/WARNING/CRITICAL)
   - Use the computePortfolioKpis() function from dashboard.ts

5. **Add the Decision Log viewer**
   - List of ADR entries with: ID (ADR-0001), title, status badge, category, date
   - Click to expand: shows options considered, rationale, consequences
   - Filter by category: ARCHITECTURE, INTEGRATION, PROCESS, SECURITY
   - Import ADR types from ../../src/shared/principles/adr.ts

6. **Improve iOS mobile experience**
   - Add pull-to-refresh gesture
   - Smooth scroll with momentum (-webkit-overflow-scrolling: touch)
   - Haptic feedback simulation on button taps (subtle scale transform)
   - Skeleton loading states for async data
   - Bottom sheet pattern for expanded module cards instead of inline expand

7. **Add dark mode**
   - Toggle in header
   - Dark tokens: bg #1C1917, card #292524, text #F5F5F4, accent stays #D4A843
   - Persist preference in localStorage
   - Respect prefers-color-scheme media query

### Design system (must follow):

- Background: #F5F0E8 (light) / #1C1917 (dark)
- Cards: #FFFDF7 (light) / #292524 (dark)
- Accent: #D4A843 (gold, never changes)
- Text: #292524 (light) / #F5F5F4 (dark)
- Muted: #78716C
- Border: #E7E1D5 (light) / #3D3835 (dark)
- Success: #86A38B
- Critical: #DC2626
- Serif headings: Playfair Display
- Body: DM Sans
- Mono: DM Mono
- Border radius: 16px cards, 10px buttons
- Touch targets: minimum 44px
- Safe areas: env(safe-area-inset-*)

### Constraints:

- Inline styles only (no Tailwind, no CSS modules)
- No external state management (useState/useReducer only)
- Self-contained — no imports from main openclaw src/
- TypeScript strict mode
- Deploy target: Vercel (already has vercel.json)
- Keep the warm, editorial aesthetic from the screenshots — Playfair Display serif headings,
  cream backgrounds, subtle shadows, generous whitespace
```

---

## How to use

1. Open the repo in VS Code with GitHub Copilot enabled
2. Open Copilot Chat (Ctrl+Shift+I / Cmd+Shift+I)
3. Type `@workspace` then paste the prompt above
4. Copilot will have full context of the codebase and can implement each improvement
5. Work through improvements one at a time — start with #1 (live data) or #6 (iOS polish)

For Copilot Workspace (github.com): create a new task with this prompt and let it plan + implement.

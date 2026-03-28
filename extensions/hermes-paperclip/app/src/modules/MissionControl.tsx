import { useState } from "react";

// --- Design Tokens (iOS-optimized, warm cream palette from screenshots) ---
const T = {
  bg: "#F5F0E8",
  bgCard: "#FFFDF7",
  bgDark: "#1C1917",
  text: "#292524",
  textMuted: "#78716C",
  accent: "#D4A843",
  accentHover: "#C29535",
  hermes: "#D4A843",
  paperclip: "#57534E",
  critical: "#DC2626",
  high: "#D97706",
  medium: "#6B7280",
  success: "#86A38B",
  border: "#E7E1D5",
  cardShadow: "0 2px 8px rgba(0,0,0,0.03)",
  cardShadowHover: "0 8px 32px rgba(0,0,0,0.06)",
  radius: 16,
  radiusSm: 10,
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'DM Mono', 'SF Mono', 'Fira Code', monospace",
};

// --- Module Data ---
interface Module {
  id: string;
  name: string;
  agent: string;
  icon: string;
  status: "ready" | "planned";
  description: string;
  prompt: string;
  keyInsight: string;
  priority: "critical" | "high" | "medium";
}

const MODULES: Module[] = [
  {
    id: "sprint-board",
    name: "Sprint Board",
    agent: "Paperclip",
    icon: "/icons/sprint.svg",
    status: "ready",
    description:
      "Track Agile AI sprints S1-S4 across all portfolio companies. PE-native workflow: Workshop, PoC, MVP, Scale.",
    prompt:
      "Build a Sprint Board for ettOS Mission Control tracking 4-sprint Agile AI methodology: S1 Workshop, S2 PoC (Go/No-Go gate), S3 MVP, S4 Scale. Each card shows Company Name, Sprint Stage, Priority Score, Assigned Agent, Confidence badge.",
    keyInsight:
      "Dashboards without persistence are useless. Notion IS the persistence layer — the board reads/writes directly to the Master Database.",
    priority: "critical",
  },
  {
    id: "intelligence-pipeline",
    name: "Intelligence Pipeline",
    agent: "Hermes",
    icon: "/icons/intel.svg",
    status: "ready",
    description:
      "PE intelligence flow. Hermes gathers, analyzes, builds Company Profile, and feeds Gap Analysis to Paperclip.",
    prompt:
      "Build an Intelligence Pipeline for ettOS. Stages: Target Acquired, Scanning, Profiling, System Map, Process Audit, Handoff. Each card shows company name, current stage, data sources, confidence score, time elapsed.",
    keyInsight:
      "This isn't content creation — it's intelligence gathering. The pipeline needs to show data provenance for traceability compliance.",
    priority: "critical",
  },
  {
    id: "calendar",
    name: "Operations Calendar",
    agent: "Both",
    icon: "/icons/calendar.svg",
    status: "ready",
    description:
      "Scheduled agent tasks, sprint deadlines, G4 QA gates, and SLA milestones. The proactivity enabler.",
    prompt:
      "Build an Operations Calendar for ettOS. Track Hermes intelligence runs, Paperclip sprint milestones, G4 QA Gate reviews, SLA deadlines. Color-code by agent. Include circuit-breaker indicators for stuck tasks.",
    keyInsight:
      "The #1 failure: agents retrying broken tasks indefinitely. The calendar must surface stuck/looping tasks before they burn API credits.",
    priority: "high",
  },
  {
    id: "decision-log",
    name: "Decision Log",
    agent: "Both",
    icon: "/icons/decision.svg",
    status: "ready",
    description:
      "Every decision with rationale. Every Notion write with G4 approval trail. The institutional memory of ettOS.",
    prompt:
      "Build a Decision Log for ettOS. Each entry: Decision ID, Timestamp, Agent, Decision type, Rationale (mandatory), Confidence Score, G4 Approval status, Related Company link. Full-text search and reasoning chain drill-down.",
    keyInsight:
      "The real value isn't the UI — it's the persistent context. The Decision Log IS how Hermes and Paperclip maintain institutional knowledge.",
    priority: "critical",
  },
  {
    id: "agent-team",
    name: "Agent Roster",
    agent: "System",
    icon: "/icons/agents.svg",
    status: "planned",
    description:
      "Hermes, Paperclip, and all sub-agents. Roles, active tasks, health status, and capability routing.",
    prompt:
      "Build an Agent Roster for ettOS. Primary agents: Hermes (Intelligence) and Paperclip (Integration). Sub-agents spawned on-demand. Each card shows Name, Role, Task, Health, Token usage. Include OOTB overlap detection.",
    keyInsight:
      "Only two primaries (Hermes + Paperclip), with sub-agents spawned on-demand and tracked here. No 4am hacking sessions.",
    priority: "medium",
  },
  {
    id: "system-landscape",
    name: "System Landscape",
    agent: "Hermes",
    icon: "/icons/landscape.svg",
    status: "planned",
    description:
      "Live visualization of each portfolio company's IT architecture. The System Map rendered beautifully.",
    prompt:
      "Build a System Landscape viewer for ettOS. Render Hermes' System Map outputs as interactive diagrams. Dropdown to select company, click nodes for details, Gap Overlay toggle with Priority Scores.",
    keyInsight:
      "Where Hermes' intelligence becomes actionable. The landscape shows exactly where Paperclip should build vs. where OOTB tools cover.",
    priority: "medium",
  },
];

const priorityConfig = {
  critical: { label: "Critical Path", color: T.critical, bg: "rgba(220,38,38,0.06)" },
  high: { label: "High Priority", color: T.high, bg: "rgba(217,119,6,0.06)" },
  medium: { label: "Planned", color: T.medium, bg: "rgba(107,114,128,0.06)" },
};

const statusConfig = {
  ready: { label: "Ready to Build", dot: T.success },
  planned: { label: "In Design", dot: T.accent },
};

// --- Components ---

function Header({ activeCount }: { activeCount: number }) {
  return (
    <div
      style={{
        paddingTop: "env(safe-area-inset-top, 20px)",
        paddingBottom: 24,
        borderBottom: `1px solid ${T.border}`,
        marginBottom: 28,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 24, color: T.accent, fontWeight: 300 }}>&#10022;</span>
        <span
          style={{
            fontFamily: T.sans,
            fontSize: 12,
            letterSpacing: "0.15em",
            textTransform: "uppercase" as const,
            color: T.textMuted,
            fontWeight: 500,
          }}
        >
          ettOS
        </span>
      </div>
      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 32,
          fontWeight: 400,
          color: T.text,
          margin: "10px 0 4px",
          lineHeight: 1.15,
        }}
      >
        Mission Control
      </h1>
      <p
        style={{
          fontFamily: T.sans,
          fontSize: 15,
          color: T.textMuted,
          lineHeight: 1.5,
          maxWidth: 480,
        }}
      >
        Hermes & Paperclip orchestration layer.{" "}
        <span style={{ color: T.accent, fontWeight: 500 }}>{activeCount} modules</span> ready to
        deploy.
      </p>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div
      style={{
        background: T.bgDark,
        borderRadius: T.radius,
        padding: "24px 20px",
        marginBottom: 28,
      }}
    >
      <div
        style={{
          fontFamily: T.sans,
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
          color: T.accent,
          fontWeight: 600,
          marginBottom: 18,
        }}
      >
        Architecture Overview
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        {/* Hermes */}
        <div
          style={{
            border: "1px solid rgba(212,168,67,0.3)",
            borderRadius: T.radiusSm,
            padding: 14,
            textAlign: "center" as const,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>&#9672;</div>
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 15,
              color: T.accent,
              marginBottom: 4,
            }}
          >
            Hermes
          </div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: "#A8A29E",
              lineHeight: 1.6,
            }}
          >
            Intelligence
            <br />
            BRREG &middot; Web &middot; Docs
            <br />
            &ldquo;The Truth&rdquo;
          </div>
        </div>

        {/* Flow arrow */}
        <div
          style={{
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 9,
              color: "#78716C",
              letterSpacing: "0.1em",
            }}
          >
            NOTION MCP
          </div>
          <div style={{ color: T.accent, fontSize: 18 }}>&#10231;</div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 9,
              color: "#78716C",
              letterSpacing: "0.1em",
            }}
          >
            G4 GATE
          </div>
        </div>

        {/* Paperclip */}
        <div
          style={{
            border: "1px solid rgba(87,83,78,0.4)",
            borderRadius: T.radiusSm,
            padding: 14,
            textAlign: "center" as const,
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 6, lineHeight: 1 }}>&#11041;</div>
          <div
            style={{
              fontFamily: T.serif,
              fontSize: 15,
              color: "#D6D3D1",
              marginBottom: 4,
            }}
          >
            Paperclip
          </div>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 10,
              color: "#A8A29E",
              lineHeight: 1.6,
            }}
          >
            Integration
            <br />
            Propell &middot; TripleTex &middot; n8n
            <br />
            &ldquo;The Bridge&rdquo;
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          marginTop: 16,
          padding: "8px 14px",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap" as const,
          gap: 8,
        }}
      >
        <span style={{ fontFamily: T.mono, fontSize: 9, color: "#78716C" }}>
          UPSTREAM: Solution Canvas
        </span>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: "#78716C" }}>
          DOWNSTREAM: Notion Master DB
        </span>
      </div>
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      num: "1",
      title: "Add your company",
      desc: "Enter an org number. Hermes conducts thorough research on financials, board, processes, and risks.",
    },
    {
      num: "2",
      title: "Analysis and intelligence",
      desc: "We map your entire tech stack, score processes, and identify automation gaps against OOTB coverage.",
    },
    {
      num: "3",
      title: "Sprint execution",
      desc: "Paperclip fills gaps through 2-week Agile AI sprints. Human approves every deployment.",
    },
  ];

  return (
    <div style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: T.serif,
          fontStyle: "italic",
          fontSize: 26,
          fontWeight: 400,
          color: T.text,
          textAlign: "center" as const,
          marginBottom: 24,
        }}
      >
        How it works:
      </h2>
      {steps.map((s) => (
        <div
          key={s.num}
          style={{
            textAlign: "center" as const,
            marginBottom: 28,
          }}
        >
          <h3
            style={{
              fontFamily: T.serif,
              fontSize: 20,
              fontWeight: 500,
              color: T.text,
              marginBottom: 8,
            }}
          >
            {s.num}. {s.title}
          </h3>
          <p
            style={{
              fontFamily: T.sans,
              fontSize: 14,
              color: T.textMuted,
              lineHeight: 1.6,
              maxWidth: 360,
              margin: "0 auto",
            }}
          >
            {s.desc}
          </p>
        </div>
      ))}

      {/* CTA card */}
      <div
        style={{
          background: T.bgCard,
          border: `1px solid ${T.border}`,
          borderRadius: T.radius,
          padding: "20px",
          maxWidth: 400,
          margin: "0 auto",
          boxShadow: T.cardShadow,
        }}
      >
        <input
          type="text"
          placeholder="912 345 678"
          style={{
            width: "100%",
            padding: "14px 16px",
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusSm,
            fontFamily: T.sans,
            fontSize: 15,
            color: T.textMuted,
            background: "transparent",
            outline: "none",
            marginBottom: 12,
            WebkitAppearance: "none" as const,
          }}
        />
        <button
          style={{
            width: "100%",
            padding: "14px",
            background: T.bgDark,
            color: "#fff",
            border: "none",
            borderRadius: T.radiusSm,
            fontFamily: T.sans,
            fontSize: 15,
            fontWeight: 500,
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          Get started &rarr;
        </button>
      </div>
    </div>
  );
}

function CriticalLessons() {
  const lessons = [
    {
      title: "Persistence > Dashboards",
      detail:
        "Notion IS the state layer. No custom DB needed. Every agent reads and writes to the same workspace.",
    },
    {
      title: "Circuit Breakers Required",
      detail:
        "Every scheduled task needs fail-3x-then-halt logic. The Calendar module surfaces stuck agents.",
    },
    {
      title: "OOTB Supremacy Guard",
      detail:
        "The #1 risk: building what Propell.ai or TripleTex already does. Agent Roster includes overlap detection.",
    },
    {
      title: "Human-in-the-loop",
      detail:
        "G4 QA Gate approval before any production write. The Decision Log makes this traceable and auditable.",
    },
  ];

  return (
    <div style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 22,
          fontWeight: 400,
          color: T.text,
          marginBottom: 16,
        }}
      >
        Critical Design Principles
      </h2>
      <div style={{ display: "grid", gap: 10 }}>
        {lessons.map((l, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 14,
              padding: "14px 16px",
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: T.radiusSm,
              boxShadow: T.cardShadow,
            }}
          >
            <span
              style={{
                fontFamily: T.mono,
                fontSize: 12,
                color: T.accent,
                fontWeight: 600,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              0{i + 1}
            </span>
            <div>
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: T.text,
                  marginBottom: 2,
                }}
              >
                {l.title}
              </div>
              <div
                style={{
                  fontFamily: T.sans,
                  fontSize: 12.5,
                  color: T.textMuted,
                  lineHeight: 1.55,
                }}
              >
                {l.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModuleCard({
  module,
  isExpanded,
  onToggle,
}: {
  module: Module;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pCfg = priorityConfig[module.priority];
  const sCfg = statusConfig[module.status];
  const agentColor =
    module.agent === "Hermes" ? T.hermes : module.agent === "Paperclip" ? T.paperclip : T.textMuted;

  return (
    <div
      style={{
        background: T.bgCard,
        border: `1px solid ${isExpanded ? T.accent : T.border}`,
        borderRadius: T.radius,
        overflow: "hidden",
        transition: "all 0.25s ease",
        boxShadow: isExpanded ? T.cardShadowHover : T.cardShadow,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "18px 20px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left" as const,
          display: "flex",
          flexDirection: "column" as const,
          gap: 10,
          WebkitTapHighlightColor: "transparent",
          minHeight: 44, // iOS touch target
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `${agentColor}12`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                color: agentColor,
                flexShrink: 0,
              }}
            >
              {module.id === "sprint-board"
                ? "\u25A1"
                : module.id === "intelligence-pipeline"
                  ? "\u25C8"
                  : module.id === "calendar"
                    ? "\u25D1"
                    : module.id === "decision-log"
                      ? "\u25C9"
                      : module.id === "agent-team"
                        ? "\u2B22"
                        : "\u25C7"}
            </div>
            <div>
              <h3
                style={{
                  fontFamily: T.serif,
                  fontSize: 17,
                  fontWeight: 500,
                  color: T.text,
                  margin: 0,
                }}
              >
                {module.name}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span
                  style={{
                    fontFamily: T.mono,
                    fontSize: 10,
                    color: agentColor,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase" as const,
                    fontWeight: 500,
                  }}
                >
                  {module.agent}
                </span>
                <span style={{ color: T.border }}>&middot;</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 10,
                    color: T.textMuted,
                    fontFamily: T.sans,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: sCfg.dot,
                      display: "inline-block",
                    }}
                  />
                  {sCfg.label}
                </span>
              </div>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex",
              padding: "3px 10px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 600,
              fontFamily: T.sans,
              color: pCfg.color,
              background: pCfg.bg,
              letterSpacing: "0.02em",
              flexShrink: 0,
            }}
          >
            {pCfg.label}
          </span>
        </div>
        <p
          style={{
            fontFamily: T.sans,
            fontSize: 13,
            color: T.textMuted,
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {module.description}
        </p>
      </button>

      {isExpanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "0 20px 20px" }}>
          {/* Key Insight */}
          <div
            style={{
              margin: "18px 0",
              padding: "14px 16px",
              background: "rgba(212,168,67,0.06)",
              borderLeft: `3px solid ${T.accent}`,
              borderRadius: "0 8px 8px 0",
            }}
          >
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: T.accent,
                fontWeight: 600,
                marginBottom: 5,
              }}
            >
              Design Insight
            </div>
            <p
              style={{
                fontFamily: T.sans,
                fontSize: 13,
                color: T.text,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {module.keyInsight}
            </p>
          </div>

          {/* Build Prompt */}
          <div>
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase" as const,
                color: T.textMuted,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Build Prompt
            </div>
            <div
              style={{
                background: T.bgDark,
                borderRadius: T.radiusSm,
                padding: 16,
                fontFamily: T.mono,
                fontSize: 12,
                color: "#E7E5E4",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap" as const,
                overflowX: "auto" as const,
                maxHeight: 300,
                overflowY: "auto" as const,
                WebkitOverflowScrolling: "touch" as const,
              }}
            >
              {module.prompt}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(module.prompt);
              }}
              style={{
                marginTop: 10,
                padding: "10px 20px",
                background: T.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                minHeight: 44,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Copy Prompt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Component ---

export default function MissionControl() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? MODULES
      : filter === "critical"
        ? MODULES.filter((m) => m.priority === "critical")
        : MODULES.filter((m) => m.agent === filter);

  const readyCount = MODULES.filter((m) => m.status === "ready").length;

  return (
    <div
      style={{
        background: T.bg,
        minHeight: "100vh",
        fontFamily: T.sans,
        WebkitTextSizeAdjust: "100%",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "0 20px",
          paddingBottom: "env(safe-area-inset-bottom, 40px)",
        }}
      >
        <Header activeCount={readyCount} />
        <HowItWorks />
        <ArchitectureDiagram />
        <CriticalLessons />

        {/* Filter bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 18,
            overflowX: "auto" as const,
            WebkitOverflowScrolling: "touch" as const,
            paddingBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase" as const,
              color: T.textMuted,
              fontWeight: 600,
              marginRight: 4,
              flexShrink: 0,
            }}
          >
            Filter
          </span>
          {[
            { key: "all", label: "All" },
            { key: "critical", label: "Critical" },
            { key: "Hermes", label: "Hermes" },
            { key: "Paperclip", label: "Paperclip" },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${filter === f.key ? T.accent : T.border}`,
                background: filter === f.key ? "rgba(212,168,67,0.1)" : "transparent",
                color: filter === f.key ? T.accent : T.textMuted,
                fontFamily: T.sans,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s",
                minHeight: 36,
                WebkitTapHighlightColor: "transparent",
                flexShrink: 0,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Module Cards */}
        <div style={{ display: "grid", gap: 14, paddingBottom: 40 }}>
          {filtered.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              isExpanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
            />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${T.border}`,
            padding: "20px 0 32px",
            textAlign: "center" as const,
          }}
        >
          <p
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              color: T.textMuted,
              lineHeight: 1.6,
            }}
          >
            ettOS Mission Control &middot; Hermes &times; Paperclip
            <br />
            Environment: <span style={{ color: T.accent }}>sandbox</span> &middot; Schema: v1.4.0
          </p>
        </div>
      </div>
    </div>
  );
}

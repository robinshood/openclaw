import { mockAgents } from "../mock-data";
import { colors, font, spacing } from "../theme";
import { Badge } from "./Badge";
import { Card } from "./Card";

const statusColors: Record<string, { bg: string; dot: string; label: string }> = {
  active: { bg: "#E8F5E9", dot: colors.green, label: "Active" },
  idle: { bg: "#F5F5F5", dot: colors.textTertiary, label: "Idle" },
  error: { bg: "#FFEBEE", dot: colors.red, label: "Error" },
  standby: { bg: "#FFF8E1", dot: colors.yellow, label: "Standby" },
};

export function AgentPanel() {
  return (
    <Card title="Agenter" subtitle="5 agenter — sortert etter prioritet">
      <div style={{ display: "flex", flexDirection: "column" }}>
        {mockAgents.map((agent, i) => {
          const sc = statusColors[agent.status] ?? statusColors.idle;
          return (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom:
                  i < mockAgents.length - 1 ? `0.5px solid ${colors.border}` : undefined,
              }}
            >
              {/* Priority badge */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: agent.parent === "hermes" ? "#E3F2FD" : "#F3E5F5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: font.sm,
                  fontWeight: font.weight.bold,
                  color: agent.parent === "hermes" ? "#1565C0" : "#7B1FA2",
                  flexShrink: 0,
                }}
              >
                {agent.priority}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <span style={{ fontSize: font.lg, fontWeight: font.weight.semibold }}>
                    {agent.name}
                  </span>
                  <Badge
                    label={agent.parent}
                    variant={agent.parent === "hermes" ? "blue" : "purple"}
                  />
                </div>
                {agent.lastResult && (
                  <p
                    style={{
                      margin: `2px 0 0`,
                      fontSize: font.sm,
                      color: colors.textSecondary,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {agent.lastResult}
                  </p>
                )}
              </div>

              {/* Status */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: `4px 10px`,
                  borderRadius: 9999,
                  background: sc.bg,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: sc.dot,
                  }}
                />
                <span
                  style={{
                    fontSize: font.xs,
                    fontWeight: font.weight.medium,
                    color: colors.textSecondary,
                  }}
                >
                  {sc.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

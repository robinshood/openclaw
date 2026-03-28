import { mockBudgets, mockGoals, mockDispatches } from "../mock-data";
import { colors, font, spacing, radius } from "../theme";
import { Badge } from "./Badge";
import { Card } from "./Card";

const budgetStatusColors: Record<string, { bg: string; text: string }> = {
  OK: { bg: "#E8F5E9", text: "#2E7D32" },
  WARNING: { bg: "#FFF8E1", text: "#F57F17" },
  SOFT_STOP: { bg: "#FFF3E0", text: "#E65100" },
  HARD_STOP: { bg: "#FFEBEE", text: "#C62828" },
};

const dispatchStatusBadge: Record<string, "green" | "yellow" | "red" | "blue"> = {
  completed: "green",
  running: "blue",
  failed: "red",
  pending: "yellow",
};

function BudgetBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = Math.min((spent / limit) * 100, 100);
  const barColor = pct >= 95 ? colors.red : pct >= 80 ? colors.yellow : colors.green;
  return (
    <div style={{ flex: 1, height: 6, background: "#F0F0F0", borderRadius: 3, overflow: "hidden" }}>
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: barColor,
          borderRadius: 3,
          transition: "width 0.3s ease",
        }}
      />
    </div>
  );
}

export function OrchestrationPanel() {
  const totalBudget = mockBudgets.reduce((s, b) => s + b.monthlyLimitNOK, 0);
  const totalSpent = mockBudgets.reduce((s, b) => s + b.spentNOK, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
      {/* Budget Overview */}
      <Card
        title="Budsjett"
        subtitle={`kr ${totalSpent.toLocaleString("nb-NO")} / ${totalBudget.toLocaleString("nb-NO")} brukt denne mnd`}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mockBudgets.map((b, i) => {
            const sc = budgetStatusColors[b.status] ?? budgetStatusColors.OK;
            return (
              <div
                key={b.agentId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.md,
                  padding: `${spacing.md}px ${spacing.lg}px`,
                  borderBottom:
                    i < mockBudgets.length - 1 ? `0.5px solid ${colors.border}` : undefined,
                }}
              >
                <span style={{ width: 100, fontSize: font.sm, fontWeight: font.weight.semibold }}>
                  {b.agentName}
                </span>
                <BudgetBar spent={b.spentNOK} limit={b.monthlyLimitNOK} />
                <span
                  style={{
                    fontSize: font.xs,
                    color: colors.textSecondary,
                    width: 80,
                    textAlign: "right",
                  }}
                >
                  kr {b.spentNOK.toLocaleString("nb-NO")}
                </span>
                <span
                  style={{
                    fontSize: font.xs,
                    fontWeight: font.weight.medium,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: sc.bg,
                    color: sc.text,
                    flexShrink: 0,
                  }}
                >
                  {b.status}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Goal Alignment */}
      <Card title="Mål" subtitle="Sporbarhet fra agent-handling til selskapsmål">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mockGoals.map((g, i) => (
            <div
              key={g.id}
              style={{
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom: i < mockGoals.length - 1 ? `0.5px solid ${colors.border}` : undefined,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: spacing.sm,
                  marginBottom: spacing.xs,
                }}
              >
                <span style={{ fontSize: font.md, fontWeight: font.weight.semibold }}>
                  {g.description}
                </span>
                <Badge
                  label={g.department}
                  variant={
                    g.department === "hermes"
                      ? "blue"
                      : g.department === "paperclip"
                        ? "purple"
                        : "gray"
                  }
                />
              </div>
              <div style={{ display: "flex", gap: spacing.lg }}>
                {g.metrics.map((m) => {
                  const pct = (m.current / m.target) * 100;
                  const metricColor =
                    pct >= 100 ? colors.green : pct >= 80 ? colors.yellow : colors.red;
                  return (
                    <div
                      key={m.name}
                      style={{ display: "flex", alignItems: "center", gap: spacing.xs }}
                    >
                      <span style={{ fontSize: font.xs, color: colors.textSecondary }}>
                        {m.name}:
                      </span>
                      <span
                        style={{
                          fontSize: font.sm,
                          fontWeight: font.weight.semibold,
                          color: metricColor,
                        }}
                      >
                        {m.current}
                        {m.unit}
                      </span>
                      <span style={{ fontSize: font.xs, color: colors.textTertiary }}>
                        / {m.target}
                        {m.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Dispatches */}
      <Card title="Dispatch-logg" subtitle="Siste agent-kjøringer med kostnad og resultat">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mockDispatches.map((d, i) => (
            <div
              key={d.taskId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom:
                  i < mockDispatches.length - 1 ? `0.5px solid ${colors.border}` : undefined,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <span style={{ fontSize: font.sm, fontWeight: font.weight.semibold }}>
                    {d.agentName}
                  </span>
                  <Badge label={d.trigger} variant="gray" />
                  <Badge label={d.status} variant={dispatchStatusBadge[d.status] ?? "gray"} />
                </div>
                <div style={{ fontSize: font.xs, color: colors.textSecondary, marginTop: 2 }}>
                  {d.itemsProcessed > 0 && `${d.itemsProcessed} items · `}
                  {d.costNOK > 0 && `kr ${d.costNOK} · `}
                  {new Date(d.startedAt).toLocaleTimeString("nb-NO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {d.completedAt &&
                    ` — ${new Date(d.completedAt).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

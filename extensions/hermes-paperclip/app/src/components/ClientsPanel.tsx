import { mockClients } from "../mock-data";
import { colors, font, radius, spacing } from "../theme";
import { Badge } from "./Badge";
import { Card } from "./Card";

const profitVariant = {
  PROFITABLE: "green" as const,
  MARGINAL: "yellow" as const,
  UNPROFITABLE: "red" as const,
};

const templateLabels: Record<string, string> = {
  "smb-standard": "SMB",
  eiendom: "Eiendom",
  hotel: "Hotell",
};

export function ClientsPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: spacing.md,
        }}
      >
        <SummaryCard label="Total klienter" value={mockClients.length} color={colors.accent} />
        <SummaryCard
          label="Lønnsomme"
          value={mockClients.filter((c) => c.profitability === "PROFITABLE").length}
          color={colors.green}
        />
        <SummaryCard
          label="Marginale"
          value={mockClients.filter((c) => c.profitability === "MARGINAL").length}
          color={colors.yellow}
        />
        <SummaryCard
          label="Ulønnsomme"
          value={mockClients.filter((c) => c.profitability === "UNPROFITABLE").length}
          color={colors.red}
        />
      </div>

      <Card title="Klientoversikt" subtitle="Per-klient lønnsomhet og status">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {mockClients.map((client, i) => (
            <div
              key={client.orgNr}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spacing.md,
                padding: `${spacing.md}px ${spacing.lg}px`,
                borderBottom:
                  i < mockClients.length - 1 ? `0.5px solid ${colors.border}` : undefined,
              }}
            >
              {/* Template icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: colors.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: font.xs,
                  fontWeight: font.weight.semibold,
                  color: colors.textSecondary,
                  flexShrink: 0,
                }}
              >
                {templateLabels[client.template] ?? client.template}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                  <span style={{ fontSize: font.lg, fontWeight: font.weight.semibold }}>
                    {client.name}
                  </span>
                  <Badge
                    label={client.onboardingStatus === "complete" ? "Aktiv" : "Onboarding"}
                    variant={client.onboardingStatus === "complete" ? "green" : "orange"}
                  />
                </div>
                <p style={{ margin: `2px 0 0`, fontSize: font.sm, color: colors.textSecondary }}>
                  {client.orgNr} — {client.hoursThisPeriod}t denne perioden
                </p>
              </div>

              {/* Revenue */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div
                  style={{
                    fontSize: font.lg,
                    fontWeight: font.weight.semibold,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  kr {client.revenue.toLocaleString("nb-NO")}
                </div>
                <div
                  style={{
                    fontSize: font.sm,
                    color: client.margin >= 0 ? colors.green : colors.red,
                    fontWeight: font.weight.medium,
                  }}
                >
                  {client.margin >= 0 ? "+" : ""}
                  {client.margin}% margin
                </div>
              </div>

              {/* Profitability badge */}
              <Badge label={client.profitability} variant={profitVariant[client.profitability]} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: font.xxxl, fontWeight: font.weight.bold, color }}>{value}</div>
      <div style={{ fontSize: font.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
        {label}
      </div>
    </div>
  );
}

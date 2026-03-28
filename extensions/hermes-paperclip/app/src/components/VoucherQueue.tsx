import { mockVoucherQueue } from "../mock-data";
import { colors, font, spacing } from "../theme";
import { Badge } from "./Badge";
import { Card } from "./Card";

const confidenceVariant = {
  GREEN: "green" as const,
  YELLOW: "yellow" as const,
  RED: "red" as const,
};

export function VoucherQueue() {
  const green = mockVoucherQueue.filter((v) => v.confidence === "GREEN");
  const yellow = mockVoucherQueue.filter((v) => v.confidence === "YELLOW");
  const red = mockVoucherQueue.filter((v) => v.confidence === "RED");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing.lg }}>
      <Card
        title="Auto-godkjent"
        subtitle={`${green.length} bilag — GREEN confidence`}
        action={<Badge label={`${green.length}`} variant="green" />}
      >
        <VoucherTable items={green} />
      </Card>

      <Card
        title="Manuell gjennomgang"
        subtitle={`${yellow.length} bilag — YELLOW confidence`}
        action={<Badge label={`${yellow.length}`} variant="yellow" />}
      >
        <VoucherTable items={yellow} showActions />
      </Card>

      {red.length > 0 && (
        <Card
          title="Eskalert til regnskapsfører"
          subtitle={`${red.length} bilag — RED confidence`}
          action={<Badge label={`${red.length}`} variant="red" />}
        >
          <VoucherTable items={red} showActions />
        </Card>
      )}
    </div>
  );
}

function VoucherTable({
  items,
  showActions,
}: {
  items: typeof mockVoucherQueue;
  showActions?: boolean;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: font.sm }}>
        <thead>
          <tr style={{ borderBottom: `0.5px solid ${colors.border}` }}>
            <th style={thStyle}>Dato</th>
            <th style={thStyle}>Merchant</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Beløp</th>
            <th style={thStyle}>Konto</th>
            <th style={{ ...thStyle, textAlign: "right" }}>MVA</th>
            <th style={thStyle}>Confidence</th>
            {showActions && <th style={thStyle}>Handling</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: `0.5px solid ${colors.border}` }}>
              <td style={tdStyle}>{item.date}</td>
              <td style={{ ...tdStyle, fontWeight: font.weight.medium }}>{item.merchant}</td>
              <td style={{ ...tdStyle, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                kr {item.amount.toLocaleString("nb-NO")}
              </td>
              <td style={tdStyle}>
                <span style={{ color: colors.textSecondary }}>{item.account}</span>{" "}
                {item.accountName}
              </td>
              <td style={{ ...tdStyle, textAlign: "right" }}>{item.mvaRate}%</td>
              <td style={tdStyle}>
                <Badge label={item.confidence} variant={confidenceVariant[item.confidence]} />
              </td>
              {showActions && (
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <ActionButton label="Godkjenn" color={colors.green} />
                    <ActionButton label="Avvis" color={colors.red} />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActionButton({ label, color }: { label: string; color: string }) {
  return (
    <button
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        border: `1px solid ${color}`,
        background: "transparent",
        color,
        fontSize: font.xs,
        fontWeight: font.weight.medium,
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 16px",
  textAlign: "left",
  fontWeight: "600",
  fontSize: "11px",
  color: "#8E8E93",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
};

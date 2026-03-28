import { mockDataQuality } from "../mock-data";
import { colors, font, radius, spacing } from "../theme";
import { Card } from "./Card";

export function DataQualityPanel() {
  const latest = mockDataQuality[mockDataQuality.length - 1];
  const cleanPct = latest ? Math.round((latest.clean / latest.total) * 1000) / 10 : 0;
  const threshold = 85;
  const passing = cleanPct >= threshold;

  return (
    <Card title="Renvasken — Datakvalitet" subtitle="Siste 7 dager">
      <div style={{ padding: `${spacing.md}px ${spacing.lg}px` }}>
        {/* Summary stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: spacing.md,
            marginBottom: spacing.lg,
          }}
        >
          <StatBox label="Total" value={latest?.total ?? 0} color={colors.text} />
          <StatBox label="Clean" value={latest?.clean ?? 0} color={colors.green} />
          <StatBox label="Suspect" value={latest?.suspect ?? 0} color={colors.yellow} />
          <StatBox label="Dirty" value={latest?.dirty ?? 0} color={colors.red} />
        </div>

        {/* Clean rate bar */}
        <div style={{ marginBottom: spacing.lg }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", marginBottom: spacing.xs }}
          >
            <span style={{ fontSize: font.sm, color: colors.textSecondary }}>Clean Rate</span>
            <span
              style={{
                fontSize: font.sm,
                fontWeight: font.weight.semibold,
                color: passing ? colors.green : colors.red,
              }}
            >
              {cleanPct}% {passing ? "PASS" : "FAIL"}
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: radius.full,
              background: colors.bg,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${cleanPct}%`,
                borderRadius: radius.full,
                background: passing ? colors.green : colors.red,
                transition: "width 0.6s ease",
              }}
            />
            {/* Threshold marker */}
            <div
              style={{
                position: "absolute",
                left: `${threshold}%`,
                top: -2,
                bottom: -2,
                width: 2,
                background: colors.textTertiary,
                borderRadius: 1,
              }}
            />
          </div>
          <p style={{ fontSize: font.xs, color: colors.textTertiary, marginTop: spacing.xs }}>
            Threshold: {threshold}% clean required
          </p>
        </div>

        {/* Mini chart */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
          {mockDataQuality.map((day) => {
            const pct = day.total > 0 ? day.clean / day.total : 0;
            return (
              <div
                key={day.date}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: Math.max(4, pct * 48),
                    borderRadius: `${radius.sm}px ${radius.sm}px 2px 2px`,
                    background: pct >= 0.85 ? colors.green : colors.yellow,
                    opacity: 0.8,
                    transition: "height 0.3s ease",
                  }}
                />
                <span style={{ fontSize: "9px", color: colors.textTertiary }}>
                  {day.date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: `${spacing.sm}px`,
        borderRadius: radius.md,
        background: colors.bg,
      }}
    >
      <div style={{ fontSize: font.xxl, fontWeight: font.weight.bold, color }}>{value}</div>
      <div style={{ fontSize: font.xs, color: colors.textSecondary, marginTop: 2 }}>{label}</div>
    </div>
  );
}

import { mockAuditTrail } from "../mock-data";
import { colors, font, spacing } from "../theme";
import { Badge } from "./Badge";
import { Card } from "./Card";

const confidenceVariant = {
  H: "green" as const,
  M: "yellow" as const,
  L: "red" as const,
};

const g4Variant = {
  approved: "green" as const,
  pending: "yellow" as const,
  rejected: "red" as const,
};

const agentNames: Record<string, string> = {
  "hermes-bilag-01": "Bilagsansen",
  "paperclip-wash-01": "Renvasken",
  "hermes-rapport-01": "Portalklar",
  "paperclip-onboard-01": "Velkomst",
  "paperclip-tid-01": "Tidsvokter",
};

export function AuditTrail() {
  return (
    <Card title="Audit Trail" subtitle={`${mockAuditTrail.length} siste handlinger`}>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {mockAuditTrail.map((entry, i) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              gap: spacing.md,
              padding: `${spacing.md}px ${spacing.lg}px`,
              borderBottom:
                i < mockAuditTrail.length - 1 ? `0.5px solid ${colors.border}` : undefined,
            }}
          >
            {/* Timeline dot */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: 4,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background:
                    entry.g4Status === "approved"
                      ? colors.green
                      : entry.g4Status === "pending"
                        ? colors.yellow
                        : colors.red,
                }}
              />
              {i < mockAuditTrail.length - 1 && (
                <div
                  style={{
                    width: 1,
                    flex: 1,
                    background: colors.border,
                    marginTop: 4,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: spacing.sm }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" }}
              >
                <span style={{ fontSize: font.md, fontWeight: font.weight.semibold }}>
                  {agentNames[entry.agentId] ?? entry.agentId}
                </span>
                <Badge label={entry.action.replace(/_/g, " ")} variant="gray" />
                <Badge
                  label={`Conf: ${entry.confidence}`}
                  variant={confidenceVariant[entry.confidence]}
                />
                <Badge label={`G4: ${entry.g4Status}`} variant={g4Variant[entry.g4Status]} />
              </div>
              <p
                style={{
                  margin: `${spacing.xs}px 0 0`,
                  fontSize: font.sm,
                  color: colors.textSecondary,
                  lineHeight: "1.4",
                }}
              >
                {entry.rationale}
              </p>
              <time
                style={{
                  fontSize: font.xs,
                  color: colors.textTertiary,
                  marginTop: 4,
                  display: "block",
                }}
              >
                {new Date(entry.createdAt).toLocaleString("nb-NO", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

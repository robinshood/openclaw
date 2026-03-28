import { colors, font, spacing, shadow } from "../theme";

export function Header() {
  return (
    <header
      style={{
        background: colors.card,
        padding: `${spacing.lg}px ${spacing.lg}px`,
        marginBottom: spacing.lg,
        borderBottom: `0.5px solid ${colors.border}`,
        boxShadow: shadow.sm,
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1
              style={{
                fontSize: font.xxxl,
                fontWeight: font.weight.bold,
                margin: 0,
                letterSpacing: "-0.5px",
              }}
            >
              Mission Control
            </h1>
            <p
              style={{
                fontSize: font.md,
                color: colors.textSecondary,
                margin: `${spacing.xs}px 0 0`,
              }}
            >
              Hermes x Paperclip — Systemregnskap Automation
            </p>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.sm,
              padding: `${spacing.sm}px ${spacing.md}px`,
              background: colors.bg,
              borderRadius: 9999,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: colors.green,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: font.sm, color: colors.textSecondary }}>Sandbox</span>
          </div>
        </div>
      </div>
    </header>
  );
}

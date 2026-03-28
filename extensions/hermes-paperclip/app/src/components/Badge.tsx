import type { CSSProperties } from "react";
import { colors, font, radius, spacing } from "../theme";

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "gray" | "purple" | "orange";

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  green: { bg: "#E8F5E9", text: "#2E7D32" },
  yellow: { bg: "#FFF8E1", text: "#F57F17" },
  red: { bg: "#FFEBEE", text: "#C62828" },
  blue: { bg: "#E3F2FD", text: "#1565C0" },
  gray: { bg: "#F5F5F5", text: "#616161" },
  purple: { bg: "#F3E5F5", text: "#7B1FA2" },
  orange: { bg: "#FFF3E0", text: "#E65100" },
};

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  style?: CSSProperties;
}

export function Badge({ label, variant, style }: BadgeProps) {
  const c = variantColors[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `2px ${spacing.sm}px`,
        borderRadius: radius.sm,
        background: c.bg,
        color: c.text,
        fontSize: font.xs,
        fontWeight: font.weight.semibold,
        letterSpacing: "0.3px",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { colors, radius, shadow, spacing } from "../theme";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, style, title, subtitle, action }: CardProps) {
  return (
    <div
      style={{
        background: colors.card,
        borderRadius: radius.lg,
        boxShadow: shadow.sm,
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || action) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${spacing.md}px ${spacing.lg}px`,
            borderBottom: `0.5px solid ${colors.border}`,
          }}
        >
          <div>
            {title && <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "600" }}>{title}</h2>}
            {subtitle && (
              <p style={{ margin: `2px 0 0`, fontSize: "13px", color: colors.textSecondary }}>
                {subtitle}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Design tokens — iOS-inspired clean aesthetic.
 */
export const colors = {
  bg: "#F2F2F7",
  card: "#FFFFFF",
  cardHover: "#FAFAFA",
  text: "#1C1C1E",
  textSecondary: "#8E8E93",
  textTertiary: "#AEAEB2",
  border: "#E5E5EA",
  accent: "#007AFF",
  green: "#34C759",
  yellow: "#FF9500",
  red: "#FF3B30",
  orange: "#FF9F0A",
  purple: "#AF52DE",
  teal: "#5AC8FA",
  separator: "#C6C6C8",
  groupedBg: "#F2F2F7",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const font = {
  xs: "11px",
  sm: "13px",
  md: "15px",
  lg: "17px",
  xl: "20px",
  xxl: "28px",
  xxxl: "34px",
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  family: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif',
} as const;

export const shadow = {
  sm: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
  md: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
  lg: "0 10px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
} as const;

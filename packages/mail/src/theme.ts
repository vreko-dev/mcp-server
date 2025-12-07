/**
 * SnapBack Email Theme
 * Brand-aligned design tokens for all email templates.
 */

export const theme = {
  colors: {
    // Primary brand - ALIGNED WITH TAILWIND CONFIG (apps/web/tailwind.config.ts)
    green: "#00FF41",           // SnapBack brand green (neon)
    greenDark: "#00CC34",       // Darker green variant
    greenLight: "#4DFF70",      // Lighter green variant
    greenSubtle: "rgba(0, 255, 65, 0.1)",
    greenBorder: "rgba(0, 255, 65, 0.3)",

    // Secondary brand
    orange: "#FF9500",          // SnapBack brand orange
    orangeDark: "#CC7700",
    orangeLight: "#FFB84D",
    orangeSubtle: "rgba(255, 149, 0, 0.1)",

    // Status colors
    danger: "#EF4444",
    dangerSubtle: "rgba(239, 68, 68, 0.1)",
    warning: "#FF6B35",
    warningSubtle: "rgba(255, 107, 53, 0.1)",
    info: "#3B82F6",
    infoSubtle: "rgba(59, 130, 246, 0.1)",

    // Backgrounds
    bgDark: "#0A0A0A",
    bgSurface: "#111111",
    bgElevated: "#1A1A1A",
    bgMuted: "#262626",

    // Borders
    border: "#27272A",
    borderLight: "#3F3F46",

    // Text
    textPrimary: "#FAFAFA",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    textInverse: "#0A0A0A",
  },

  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },

  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px",
  },
} as const;

export const styles = {
  body: {
    backgroundColor: theme.colors.bgDark,
    fontFamily: theme.fonts.sans,
    margin: "0",
    padding: "0",
  },

  container: {
    backgroundColor: theme.colors.bgDark,
    margin: "0 auto",
    padding: "40px 20px",
    maxWidth: "600px",
  },

  heading1: {
    color: theme.colors.green,  // Use brand green for emphasis
    fontSize: "28px",
    fontWeight: "700",
    lineHeight: "1.3",
    margin: "0 0 16px 0",
    padding: "0",
  },

  heading2: {
    color: theme.colors.textPrimary,
    fontSize: "22px",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0 0 12px 0",
    padding: "0",
  },

  heading3: {
    color: theme.colors.textPrimary,
    fontSize: "18px",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0 0 8px 0",
    padding: "0",
  },

  text: {
    color: theme.colors.textSecondary,
    fontSize: "16px",
    lineHeight: "1.6",
    margin: "0 0 16px 0",
  },

  textSmall: {
    color: theme.colors.textMuted,
    fontSize: "14px",
    lineHeight: "1.5",
    margin: "0 0 12px 0",
  },

  link: {
    color: theme.colors.green,  // Brand green for CTAs
    textDecoration: "none",
    fontWeight: "500",
  },

  divider: {
    borderTop: `1px solid ${theme.colors.border}`,
    margin: `${theme.spacing.lg} 0`,
  },
} as const;

export type Theme = typeof theme;
export type Styles = typeof styles;

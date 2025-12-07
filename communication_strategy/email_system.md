# SnapBack Email System - Complete Code

All files needed for the email system, ready to copy into your codebase.

---

## Table of Contents

1. [Package Configuration](#1-package-configuration)
2. [Theme & Brand Tokens](#2-theme--brand-tokens)
3. [Shared Components](#3-shared-components)
4. [Layouts](#4-layouts)
5. [Email Templates](#5-email-templates)
6. [Services](#6-services)
7. [API Routes](#7-api-routes)
8. [Database Schema](#8-database-schema)
9. [Tests](#9-tests)
10. [Turbo Generator](#10-turbo-generator)

---

## 1. Package Configuration

### packages/mail/package.json

```json
{
  "name": "@snapback/mail",
  "version": "0.1.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "scripts": {
    "dev": "email dev --port 3001",
    "build": "tsc",
    "preview": "email export --outDir ./out",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run __tests__/components.test.tsx",
    "test:integration": "vitest run __tests__/templates.test.tsx",
    "test:e2e": "vitest run __tests__/e2e.test.tsx",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@react-email/components": "^0.0.22",
    "@react-email/render": "^0.0.15",
    "react": "^18.3.1",
    "react-email": "^2.1.6",
    "resend": "^3.2.0",
    "nodemailer": "^6.9.13",
    "hono": "^4.4.0",
    "zod": "^3.23.8",
    "@hubspot/api-client": "^11.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/nodemailer": "^6.4.15",
    "typescript": "^5.5.4",
    "vitest": "^1.6.0",
    "@vitest/coverage-v8": "^1.6.0"
  },
  "exports": {
    ".": "./index.ts",
    "./theme": "./theme.ts",
    "./components": "./components/index.ts",
    "./templates": "./templates/index.ts",
    "./templates/*": "./templates/*/index.ts",
    "./services": "./services/index.ts",
    "./routes": "./routes/index.ts"
  }
}
```

### packages/mail/index.ts

```typescript
// SnapBack Email System
export * from './theme';
export * from './components';
export * from './templates';
export { BaseEmail } from './layouts/BaseEmail';
```

### packages/mail/vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['components/**', 'templates/**', 'services/**'],
      exclude: ['__tests__/**', 'node_modules/**'],
    },
    testTimeout: 10000,
  },
});
```

---

## 2. Theme & Brand Tokens

### packages/mail/theme.ts

```typescript
/**
 * SnapBack Email Theme
 * Brand-aligned design tokens for all email templates.
 */

export const theme = {
  colors: {
    // Primary brand
    green: '#10B981',
    greenDark: '#059669',
    greenLight: '#34D399',
    greenSubtle: 'rgba(16, 185, 129, 0.1)',
    greenBorder: 'rgba(16, 185, 129, 0.3)',

    // Status colors
    danger: '#EF4444',
    dangerSubtle: 'rgba(239, 68, 68, 0.1)',
    warning: '#FF6B35',
    warningSubtle: 'rgba(255, 107, 53, 0.1)',
    info: '#3B82F6',
    infoSubtle: 'rgba(59, 130, 246, 0.1)',

    // Backgrounds
    bgDark: '#0A0A0A',
    bgSurface: '#111111',
    bgElevated: '#1A1A1A',
    bgMuted: '#262626',

    // Borders
    border: '#27272A',
    borderLight: '#3F3F46',

    // Text
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    textMuted: '#71717A',
    textInverse: '#0A0A0A',
  },

  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
} as const;

export const styles = {
  body: {
    backgroundColor: theme.colors.bgDark,
    fontFamily: theme.fonts.sans,
    margin: '0',
    padding: '0',
  },

  container: {
    backgroundColor: theme.colors.bgDark,
    margin: '0 auto',
    padding: '40px 20px',
    maxWidth: '600px',
  },

  heading1: {
    color: theme.colors.textPrimary,
    fontSize: '28px',
    fontWeight: '700',
    lineHeight: '1.3',
    margin: '0 0 16px 0',
    padding: '0',
  },

  heading2: {
    color: theme.colors.textPrimary,
    fontSize: '22px',
    fontWeight: '600',
    lineHeight: '1.4',
    margin: '0 0 12px 0',
    padding: '0',
  },

  heading3: {
    color: theme.colors.textPrimary,
    fontSize: '18px',
    fontWeight: '600',
    lineHeight: '1.4',
    margin: '0 0 8px 0',
    padding: '0',
  },

  text: {
    color: theme.colors.textSecondary,
    fontSize: '16px',
    lineHeight: '1.6',
    margin: '0 0 16px 0',
  },

  textSmall: {
    color: theme.colors.textMuted,
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 12px 0',
  },

  link: {
    color: theme.colors.green,
    textDecoration: 'none',
  },

  divider: {
    borderTop: `1px solid ${theme.colors.border}`,
    margin: `${theme.spacing.lg} 0`,
  },
} as const;

export type Theme = typeof theme;
export type Styles = typeof styles;
```

---

## 3. Shared Components

### packages/mail/components/index.ts

```typescript
export { Header } from './Header';
export { Footer } from './Footer';
export { Button, PrimaryButton, SecondaryButton } from './Button';
export { CodeBlock, InlineCode } from './CodeBlock';
export { Card, AlertCard } from './Card';
export { StatsRow, SingleStat } from './Stats';
export { Checklist, Steps } from './Checklist';
```

### packages/mail/components/Header.tsx

```tsx
import { Section, Text, Link } from '@react-email/components';
import { theme } from '../theme';

interface HeaderProps {
  showStatus?: boolean;
  statusType?: 'protected' | 'warning' | 'alert';
}

export function Header({ showStatus = false, statusType = 'protected' }: HeaderProps) {
  const statusConfig = {
    protected: { emoji: '🛡️', text: 'Protected', color: theme.colors.green },
    warning: { emoji: '⚠️', text: 'Warning', color: theme.colors.warning },
    alert: { emoji: '🚨', text: 'Alert', color: theme.colors.danger },
  };

  const status = statusConfig[statusType];

  return (
    <Section style={headerContainer}>
      <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
        <tr>
          <td>
            <Link href="https://snapback.dev" style={{ textDecoration: 'none' }}>
              <table cellPadding="0" cellSpacing="0" role="presentation">
                <tr>
                  <td style={logoCell}>
                    <Text style={logoEmoji}>🧢</Text>
                  </td>
                  <td style={logoTextCell}>
                    <Text style={logoText}>SnapBack</Text>
                  </td>
                </tr>
              </table>
            </Link>
          </td>
          {showStatus && (
            <td style={statusCell}>
              <span style={{ ...statusBadge, borderColor: status.color }}>
                <span style={statusEmojiStyle}>{status.emoji}</span>
                <span style={{ ...statusTextStyle, color: status.color }}>{status.text}</span>
              </span>
            </td>
          )}
        </tr>
      </table>
      <div style={divider} />
    </Section>
  );
}

const headerContainer: React.CSSProperties = {
  paddingBottom: '24px',
};

const logoCell: React.CSSProperties = {
  verticalAlign: 'middle',
  paddingRight: '8px',
};

const logoEmoji: React.CSSProperties = {
  fontSize: '28px',
  margin: '0',
  lineHeight: '1',
};

const logoTextCell: React.CSSProperties = {
  verticalAlign: 'middle',
};

const logoText: React.CSSProperties = {
  color: theme.colors.textPrimary,
  fontSize: '22px',
  fontWeight: '700',
  margin: '0',
  letterSpacing: '-0.5px',
};

const statusCell: React.CSSProperties = {
  textAlign: 'right',
  verticalAlign: 'middle',
};

const statusBadge: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '9999px',
  border: '1px solid',
};

const statusEmojiStyle: React.CSSProperties = {
  fontSize: '14px',
};

const statusTextStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '500',
};

const divider: React.CSSProperties = {
  borderTop: `1px solid ${theme.colors.border}`,
  marginTop: '24px',
};
```

### packages/mail/components/Footer.tsx

```tsx
import { Section, Text, Link, Hr } from '@react-email/components';
import { theme } from '../theme';

interface FooterProps {
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
  message?: string;
}

export function Footer({ showUnsubscribe = false, unsubscribeUrl, message }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Section style={footerContainer}>
      <Hr style={divider} />

      {message && <Text style={messageStyle}>{message}</Text>}

      <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
        <tr>
          <td style={linksContainer}>
            <Link href="https://snapback.dev" style={footerLink}>Website</Link>
            <span style={linkSeparator}>•</span>
            <Link href="https://docs.snapback.dev" style={footerLink}>Docs</Link>
            <span style={linkSeparator}>•</span>
            <Link href="https://snapback.dev/dashboard" style={footerLink}>Dashboard</Link>
            <span style={linkSeparator}>•</span>
            <Link href="https://discord.gg/snapback" style={footerLink}>Discord</Link>
          </td>
        </tr>
      </table>

      <Text style={companyInfo}>
        Marcelle Labs, Inc.
        <br />
        Building tools for the AI coding era.
      </Text>

      <Text style={legalText}>
        © {currentYear} SnapBack. All rights reserved.
        <br />
        <Link href="https://snapback.dev/privacy" style={legalLink}>Privacy Policy</Link>
        {' · '}
        <Link href="https://snapback.dev/terms" style={legalLink}>Terms of Service</Link>
        {showUnsubscribe && unsubscribeUrl && (
          <>
            {' · '}
            <Link href={unsubscribeUrl} style={legalLink}>Unsubscribe</Link>
          </>
        )}
      </Text>

      <Text style={tagline}>🧢 Never lose code to AI again.</Text>
    </Section>
  );
}

const footerContainer: React.CSSProperties = {
  marginTop: '32px',
  paddingTop: '24px',
};

const divider: React.CSSProperties = {
  borderTop: `1px solid ${theme.colors.border}`,
  margin: '0 0 24px 0',
};

const messageStyle: React.CSSProperties = {
  color: theme.colors.textSecondary,
  fontSize: '14px',
  lineHeight: '1.5',
  textAlign: 'center',
  marginBottom: '20px',
};

const linksContainer: React.CSSProperties = {
  textAlign: 'center',
};

const footerLink: React.CSSProperties = {
  color: theme.colors.textSecondary,
  fontSize: '13px',
  textDecoration: 'none',
};

const linkSeparator: React.CSSProperties = {
  color: theme.colors.textMuted,
  margin: '0 10px',
  fontSize: '13px',
};

const companyInfo: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '13px',
  lineHeight: '1.5',
  textAlign: 'center',
  margin: '20px 0 12px 0',
};

const legalText: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '12px',
  lineHeight: '1.6',
  textAlign: 'center',
  margin: '0 0 16px 0',
};

const legalLink: React.CSSProperties = {
  color: theme.colors.textMuted,
  textDecoration: 'underline',
};

const tagline: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '13px',
  textAlign: 'center',
  margin: '0',
  fontStyle: 'italic',
};
```

### packages/mail/components/Button.tsx

```tsx
import { Button as EmailButton } from '@react-email/components';
import { theme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export function Button({
  children,
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonProps) {
  const variantStyles = {
    primary: {
      backgroundColor: theme.colors.green,
      color: theme.colors.textInverse,
      border: 'none',
    },
    secondary: {
      backgroundColor: 'transparent',
      color: theme.colors.textPrimary,
      border: `1px solid ${theme.colors.border}`,
    },
    danger: {
      backgroundColor: theme.colors.danger,
      color: theme.colors.textPrimary,
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: theme.colors.green,
      border: 'none',
    },
  };

  const sizeStyles = {
    sm: { padding: '10px 18px', fontSize: '14px' },
    md: { padding: '14px 28px', fontSize: '16px' },
    lg: { padding: '18px 36px', fontSize: '18px' },
  };

  const style: React.CSSProperties = {
    ...variantStyles[variant],
    ...sizeStyles[size],
    borderRadius: theme.borderRadius.md,
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center',
    display: fullWidth ? 'block' : 'inline-block',
    width: fullWidth ? '100%' : 'auto',
    boxSizing: 'border-box',
  };

  return (
    <EmailButton href={href} style={style}>
      {children}
    </EmailButton>
  );
}

export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button {...props} variant="secondary" />;
}
```

### packages/mail/components/Card.tsx

```tsx
import { Section, Text } from '@react-email/components';
import { theme } from '../theme';

type CardVariant = 'default' | 'highlight' | 'warning' | 'danger' | 'info';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  title?: string;
  icon?: string;
}

export function Card({ children, variant = 'default', title, icon }: CardProps) {
  const variantStyles: Record<CardVariant, React.CSSProperties> = {
    default: {
      backgroundColor: theme.colors.bgSurface,
      borderColor: theme.colors.border,
    },
    highlight: {
      backgroundColor: theme.colors.greenSubtle,
      borderColor: theme.colors.greenBorder,
    },
    warning: {
      backgroundColor: theme.colors.warningSubtle,
      borderColor: theme.colors.warning,
    },
    danger: {
      backgroundColor: theme.colors.dangerSubtle,
      borderColor: theme.colors.danger,
    },
    info: {
      backgroundColor: theme.colors.infoSubtle,
      borderColor: theme.colors.info,
    },
  };

  const style: React.CSSProperties = {
    ...cardBase,
    ...variantStyles[variant],
  };

  return (
    <Section style={style}>
      {(title || icon) && (
        <Text style={headerStyle}>
          {icon && <span style={iconStyle}>{icon}</span>}
          {title}
        </Text>
      )}
      {children}
    </Section>
  );
}

export function AlertCard({ children, type, title }: {
  children: React.ReactNode;
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
}) {
  const config = {
    success: { icon: '✅', variant: 'highlight' as const },
    warning: { icon: '⚠️', variant: 'warning' as const },
    error: { icon: '🚨', variant: 'danger' as const },
    info: { icon: 'ℹ️', variant: 'info' as const },
  };

  return (
    <Card variant={config[type].variant} icon={config[type].icon} title={title}>
      {children}
    </Card>
  );
}

const cardBase: React.CSSProperties = {
  border: '1px solid',
  borderRadius: theme.borderRadius.lg,
  padding: '20px',
  marginBottom: '16px',
};

const headerStyle: React.CSSProperties = {
  color: theme.colors.textPrimary,
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const iconStyle: React.CSSProperties = {
  fontSize: '18px',
};
```

### packages/mail/components/Stats.tsx

```tsx
import { Section, Text } from '@react-email/components';
import { theme } from '../theme';

interface Stat {
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface StatsRowProps {
  stats: Stat[];
}

export function StatsRow({ stats }: StatsRowProps) {
  const trendColors = {
    up: theme.colors.green,
    down: theme.colors.danger,
    neutral: theme.colors.textMuted,
  };

  const trendIcons = { up: '↑', down: '↓', neutral: '→' };

  return (
    <Section style={container}>
      <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
        <tr>
          {stats.map((stat, index) => (
            <td key={index} style={statCell} width={`${100 / stats.length}%`}>
              <Text style={valueStyle}>{stat.value}</Text>
              <Text style={labelStyle}>{stat.label}</Text>
              {stat.trend && stat.trendValue && (
                <Text style={{ ...trendStyle, color: trendColors[stat.trend] }}>
                  {trendIcons[stat.trend]} {stat.trendValue}
                </Text>
              )}
            </td>
          ))}
        </tr>
      </table>
    </Section>
  );
}

export function SingleStat({ value, label, size = 'md' }: Stat & { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { value: '24px', label: '12px' },
    md: { value: '32px', label: '14px' },
    lg: { value: '48px', label: '16px' },
  };

  return (
    <div style={singleStatContainer}>
      <Text style={{ ...valueStyle, fontSize: sizes[size].value }}>{value}</Text>
      <Text style={{ ...labelStyle, fontSize: sizes[size].label }}>{label}</Text>
    </div>
  );
}

const container: React.CSSProperties = {
  backgroundColor: theme.colors.bgSurface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.lg,
  padding: '20px',
  marginBottom: '16px',
};

const statCell: React.CSSProperties = {
  textAlign: 'center',
  verticalAlign: 'top',
};

const singleStatContainer: React.CSSProperties = {
  textAlign: 'center',
  padding: '16px',
};

const valueStyle: React.CSSProperties = {
  color: theme.colors.green,
  fontSize: '32px',
  fontWeight: '700',
  fontFamily: theme.fonts.mono,
  margin: '0',
  lineHeight: '1.2',
};

const labelStyle: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '14px',
  margin: '4px 0 0 0',
};

const trendStyle: React.CSSProperties = {
  fontSize: '12px',
  margin: '4px 0 0 0',
};
```

### packages/mail/components/CodeBlock.tsx

```tsx
import { Section, Text } from '@react-email/components';
import { theme } from '../theme';

interface CodeBlockProps {
  children: string;
  language?: string;
  filename?: string;
}

export function CodeBlock({ children, language, filename }: CodeBlockProps) {
  return (
    <Section style={container}>
      {(filename || language) && (
        <div style={header}>
          {filename && <Text style={filenameStyle}>{filename}</Text>}
          {language && <Text style={languageStyle}>{language}</Text>}
        </div>
      )}
      <pre style={codeContainer}>
        <code style={codeStyle}>{children}</code>
      </pre>
    </Section>
  );
}

export function InlineCode({ children }: { children: string }) {
  return <code style={inlineCodeStyle}>{children}</code>;
}

const container: React.CSSProperties = {
  marginBottom: '16px',
};

const header: React.CSSProperties = {
  backgroundColor: theme.colors.bgElevated,
  borderTopLeftRadius: theme.borderRadius.md,
  borderTopRightRadius: theme.borderRadius.md,
  border: `1px solid ${theme.colors.border}`,
  borderBottom: 'none',
  padding: '8px 16px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const filenameStyle: React.CSSProperties = {
  color: theme.colors.textSecondary,
  fontSize: '13px',
  fontFamily: theme.fonts.mono,
  margin: '0',
};

const languageStyle: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '12px',
  margin: '0',
  textTransform: 'uppercase',
};

const codeContainer: React.CSSProperties = {
  backgroundColor: theme.colors.bgSurface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadius.md,
  padding: '16px',
  margin: '0',
  overflowX: 'auto',
};

const codeStyle: React.CSSProperties = {
  color: theme.colors.green,
  fontFamily: theme.fonts.mono,
  fontSize: '14px',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const inlineCodeStyle: React.CSSProperties = {
  backgroundColor: theme.colors.bgElevated,
  borderRadius: theme.borderRadius.sm,
  padding: '2px 6px',
  fontFamily: theme.fonts.mono,
  fontSize: '14px',
  color: theme.colors.green,
};
```

### packages/mail/components/Checklist.tsx

```tsx
import { Section, Text } from '@react-email/components';
import { theme } from '../theme';

interface StepsProps {
  steps: Array<{
    title: string;
    description?: string;
  }>;
}

export function Steps({ steps }: StepsProps) {
  return (
    <Section style={stepsContainer}>
      {steps.map((step, index) => (
        <div key={index} style={stepItem}>
          <span style={stepNumber}>{index + 1}</span>
          <div style={stepContent}>
            <Text style={stepTitle}>{step.title}</Text>
            {step.description && (
              <Text style={stepDescription}>{step.description}</Text>
            )}
          </div>
        </div>
      ))}
    </Section>
  );
}

interface ChecklistItem {
  text: string;
  completed?: boolean;
  subtext?: string;
}

export function Checklist({ items, title }: { items: ChecklistItem[]; title?: string }) {
  return (
    <Section style={container}>
      {title && <Text style={titleStyle}>{title}</Text>}
      {items.map((item, index) => (
        <div key={index} style={itemContainer}>
          <span style={item.completed ? checkboxCompleted : checkboxEmpty}>
            {item.completed ? '✓' : index + 1}
          </span>
          <div style={contentContainer}>
            <Text style={item.completed ? textCompleted : textStyle}>{item.text}</Text>
            {item.subtext && <Text style={subtextStyle}>{item.subtext}</Text>}
          </div>
        </div>
      ))}
    </Section>
  );
}

const container: React.CSSProperties = { marginBottom: '16px' };
const stepsContainer: React.CSSProperties = { marginBottom: '16px' };

const titleStyle: React.CSSProperties = {
  color: theme.colors.textPrimary,
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
};

const stepItem: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '20px',
};

const stepNumber: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  backgroundColor: theme.colors.greenSubtle,
  border: `1px solid ${theme.colors.greenBorder}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '14px',
  fontWeight: '600',
  color: theme.colors.green,
  flexShrink: 0,
  marginRight: '14px',
};

const stepContent: React.CSSProperties = { flex: 1, paddingTop: '2px' };

const stepTitle: React.CSSProperties = {
  color: theme.colors.textPrimary,
  fontSize: '15px',
  fontWeight: '500',
  margin: '0',
};

const stepDescription: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '14px',
  margin: '4px 0 0 0',
  lineHeight: '1.5',
};

const itemContainer: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const checkboxEmpty: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  border: `2px solid ${theme.colors.border}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  color: theme.colors.textMuted,
  flexShrink: 0,
  marginRight: '12px',
};

const checkboxCompleted: React.CSSProperties = {
  ...checkboxEmpty,
  backgroundColor: theme.colors.green,
  borderColor: theme.colors.green,
  color: theme.colors.textInverse,
};

const contentContainer: React.CSSProperties = { flex: 1 };

const textStyle: React.CSSProperties = {
  color: theme.colors.textSecondary,
  fontSize: '15px',
  margin: '0',
  lineHeight: '24px',
};

const textCompleted: React.CSSProperties = {
  ...textStyle,
  textDecoration: 'line-through',
  color: theme.colors.textMuted,
};

const subtextStyle: React.CSSProperties = {
  color: theme.colors.textMuted,
  fontSize: '13px',
  margin: '4px 0 0 0',
};
```

---

## 4. Layouts

### packages/mail/layouts/BaseEmail.tsx

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Font,
} from '@react-email/components';
import { Header, Footer } from '../components';
import { theme, styles } from '../theme';

interface BaseEmailProps {
  children: React.ReactNode;
  preview: string;
  showHeader?: boolean;
  showFooter?: boolean;
  headerStatus?: 'protected' | 'warning' | 'alert';
  showUnsubscribe?: boolean;
  unsubscribeUrl?: string;
  footerMessage?: string;
}

export function BaseEmail({
  children,
  preview,
  showHeader = true,
  showFooter = true,
  headerStatus,
  showUnsubscribe = false,
  unsubscribeUrl,
  footerMessage,
}: BaseEmailProps) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {showHeader && (
            <Header showStatus={!!headerStatus} statusType={headerStatus} />
          )}
          {children}
          {showFooter && (
            <Footer
              showUnsubscribe={showUnsubscribe}
              unsubscribeUrl={unsubscribeUrl}
              message={footerMessage}
            />
          )}
        </Container>
      </Body>
    </Html>
  );
}
```

---

## 5. Email Templates

### packages/mail/templates/index.ts

```typescript
export * from './transactional';
export * from './achievement';
export * from './nurture';
export { BaseEmail } from '../layouts/BaseEmail';
```

### packages/mail/templates/transactional/index.ts

```typescript
export { Welcome } from './Welcome';
export { ApiKeyCreated } from './ApiKeyCreated';
```

### packages/mail/templates/transactional/Welcome.tsx

```tsx
import { Text, Link, Section, Hr } from '@react-email/components';
import { BaseEmail } from '../../layouts/BaseEmail';
import { Button, Card, Steps, CodeBlock } from '../../components';
import { theme, styles } from '../../theme';

interface WelcomeProps {
  userName: string;
  apiKey?: string;
}

export function Welcome({ userName, apiKey }: WelcomeProps) {
  return (
    <BaseEmail
      preview={`Welcome to SnapBack, ${userName}! Your code is now protected.`}
      headerStatus="protected"
    >
      <Section style={heroSection}>
        <Text style={heroEmoji}>🧢</Text>
        <Text style={styles.heading1}>Welcome to SnapBack, {userName}!</Text>
        <Text style={styles.text}>
          You've joined thousands of developers who refuse to lose code to AI mistakes.
          Your safety net is ready — let's get you protected.
        </Text>
      </Section>

      {apiKey && (
        <Card variant="highlight" icon="🔑" title="Your API Key">
          <Text style={styles.textSmall}>
            Save this key securely. You'll need it to authenticate the VS Code extension and CLI.
          </Text>
          <CodeBlock>{apiKey}</CodeBlock>
          <Text style={warningText}>⚠️ This key is only shown once. Store it somewhere safe.</Text>
        </Card>
      )}

      <Section>
        <Text style={styles.heading2}>Get Protected in 3 Steps</Text>
        <Steps
          steps={[
            { title: 'Install the VS Code Extension', description: 'Search "SnapBack" in the marketplace or click below.' },
            { title: 'Add Your API Key', description: 'Open Command Palette → "SnapBack: Configure" → Paste your key.' },
            { title: 'Code Fearlessly', description: 'SnapBack automatically creates checkpoints before AI changes.' },
          ]}
        />
      </Section>

      <Section style={ctaSection}>
        <Button href="https://marketplace.visualstudio.com/items?itemName=snapback.snapback" size="lg">
          Install VS Code Extension →
        </Button>
      </Section>

      <Hr style={styles.divider} />

      <Section>
        <Text style={styles.heading3}>What Happens Next?</Text>
        <Text style={styles.text}>
          Once installed, SnapBack runs silently in the background. When you (or an AI assistant)
          make changes to your code:
        </Text>
        <Text style={styles.text}>
          • <strong style={strongText}>🔍 AI Detection</strong> — We recognize patterns from Cursor, Copilot, Windsurf<br />
          • <strong style={strongText}>📸 Automatic Checkpoints</strong> — Your code is snapshotted before risky changes<br />
          • <strong style={strongText}>⚡ Instant Recovery</strong> — One click to restore any checkpoint
        </Text>
      </Section>

      <Card>
        <Text style={styles.heading3}>Resources</Text>
        <Text style={styles.textSmall}>
          <Link href="https://docs.snapback.dev/getting-started" style={linkStyle}>📚 Getting Started Guide</Link><br />
          <Link href="https://snapback.dev/blog/why-we-built-snapback" style={linkStyle}>📖 Why We Built SnapBack</Link><br />
          <Link href="https://discord.gg/snapback" style={linkStyle}>💬 Join Our Discord Community</Link>
        </Text>
      </Card>

      <Section style={signOffSection}>
        <Text style={styles.text}>Questions? Just reply to this email — it goes straight to our team.</Text>
        <Text style={signOff}>Happy coding,<br /><strong>The SnapBack Team</strong></Text>
      </Section>
    </BaseEmail>
  );
}

Welcome.PreviewProps = {
  userName: 'Alex',
  apiKey: 'sb_k1_a7b3c9d4e5f6g7h8i9j0k1l2m3n4o5p6',
} as WelcomeProps;

export default Welcome;

const heroSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '24px' };
const heroEmoji: React.CSSProperties = { fontSize: '48px', margin: '0 0 16px 0' };
const warningText: React.CSSProperties = { color: theme.colors.warning, fontSize: '13px', margin: '8px 0 0 0' };
const ctaSection: React.CSSProperties = { textAlign: 'center', padding: '24px 0' };
const strongText: React.CSSProperties = { color: theme.colors.textPrimary };
const linkStyle: React.CSSProperties = { color: theme.colors.green, textDecoration: 'none', display: 'block', marginBottom: '8px' };
const signOffSection: React.CSSProperties = { marginTop: '24px' };
const signOff: React.CSSProperties = { color: theme.colors.textSecondary, fontSize: '15px', margin: '16px 0 0 0' };
```

### packages/mail/templates/transactional/ApiKeyCreated.tsx

```tsx
import { Text, Section } from '@react-email/components';
import { BaseEmail } from '../../layouts/BaseEmail';
import { Button, Card, AlertCard } from '../../components';
import { theme, styles } from '../../theme';

interface ApiKeyCreatedProps {
  userName: string;
  keyName: string;
  keyPreview: string;
  createdAt: string;
  ipAddress?: string;
  location?: string;
}

export function ApiKeyCreated({ userName, keyName, keyPreview, createdAt, ipAddress, location }: ApiKeyCreatedProps) {
  return (
    <BaseEmail preview={`New API key "${keyName}" created for your SnapBack account`}>
      <Section>
        <Text style={styles.heading1}>🔑 New API Key Created</Text>
        <Text style={styles.text}>Hi {userName}, a new API key was just created for your account.</Text>
      </Section>

      <Card>
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
          <tr><td style={labelCell}>Key Name</td><td style={valueCell}>{keyName}</td></tr>
          <tr><td style={labelCell}>Key Preview</td><td style={valueCell}><code style={codeStyle}>{keyPreview}...</code></td></tr>
          <tr><td style={labelCell}>Created</td><td style={valueCell}>{createdAt}</td></tr>
          {ipAddress && <tr><td style={labelCell}>IP Address</td><td style={valueCell}>{ipAddress}</td></tr>}
          {location && <tr><td style={labelCell}>Location</td><td style={valueCell}>{location}</td></tr>}
        </table>
      </Card>

      <AlertCard type="warning" title="Wasn't you?">
        <Text style={styles.textSmall}>
          If you didn't create this key, someone may have access to your account. Revoke this key immediately and change your password.
        </Text>
        <Button href="https://snapback.dev/dashboard/api-keys" variant="danger" size="sm">Revoke Key Now</Button>
      </AlertCard>

      <Section style={ctaSection}>
        <Button href="https://snapback.dev/dashboard/api-keys" variant="secondary">Manage API Keys</Button>
      </Section>
    </BaseEmail>
  );
}

ApiKeyCreated.PreviewProps = {
  userName: 'Alex',
  keyName: 'Production Server',
  keyPreview: 'sb_k1_a7b3c9d4',
  createdAt: 'December 7, 2025 at 2:34 PM PST',
  ipAddress: '192.168.1.1',
  location: 'San Francisco, CA',
} as ApiKeyCreatedProps;

export default ApiKeyCreated;

const labelCell: React.CSSProperties = { color: theme.colors.textMuted, fontSize: '14px', padding: '8px 16px 8px 0', verticalAlign: 'top', width: '120px' };
const valueCell: React.CSSProperties = { color: theme.colors.textPrimary, fontSize: '14px', padding: '8px 0' };
const codeStyle: React.CSSProperties = { backgroundColor: theme.colors.bgElevated, borderRadius: '4px', padding: '2px 6px', fontFamily: theme.fonts.mono, fontSize: '13px', color: theme.colors.green };
const ctaSection: React.CSSProperties = { textAlign: 'center', paddingTop: '16px' };
```

### packages/mail/templates/achievement/index.ts

```typescript
export { FirstCheckpoint } from './FirstCheckpoint';
export { FirstRecovery } from './FirstRecovery';
```

### packages/mail/templates/achievement/FirstCheckpoint.tsx

```tsx
import { Text, Section, Hr } from '@react-email/components';
import { BaseEmail } from '../../layouts/BaseEmail';
import { Button, Card, SingleStat } from '../../components';
import { theme, styles } from '../../theme';

interface FirstCheckpointProps {
  userName: string;
  fileName: string;
  timestamp: string;
  detectedTool?: string;
}

export function FirstCheckpoint({ userName, fileName, timestamp, detectedTool }: FirstCheckpointProps) {
  return (
    <BaseEmail preview={`🎉 ${userName}, your first checkpoint is live!`} headerStatus="protected">
      <Section style={heroSection}>
        <Text style={celebration}>🎉</Text>
        <Text style={styles.heading1}>Your First Checkpoint!</Text>
        <Text style={styles.text}>{userName}, you're officially protected. SnapBack just created your first checkpoint.</Text>
      </Section>

      <Card variant="highlight">
        <table width="100%" cellPadding="0" cellSpacing="0" role="presentation">
          <tr><td style={labelCell}>File</td><td style={valueCell}><code style={codeStyle}>{fileName}</code></td></tr>
          <tr><td style={labelCell}>Time</td><td style={valueCell}>{timestamp}</td></tr>
          {detectedTool && <tr><td style={labelCell}>Detected</td><td style={valueCell}>🤖 {detectedTool} activity</td></tr>}
        </table>
      </Card>

      <Section style={statSection}>
        <SingleStat value="1" label="checkpoint created" size="lg" />
      </Section>

      <Hr style={styles.divider} />

      <Section>
        <Text style={styles.heading3}>What Just Happened?</Text>
        <Text style={styles.text}>
          SnapBack detected changes to your code and automatically preserved its state.
          If anything goes wrong, you can restore to this exact moment with one click.
        </Text>
      </Section>

      <Section style={ctaSection}>
        <Button href="https://snapback.dev/dashboard">View Your Checkpoints →</Button>
      </Section>

      <Card>
        <Text style={styles.heading3}>💡 Pro Tip</Text>
        <Text style={styles.textSmall}>
          Create manual checkpoints with <code style={inlineCode}>Cmd+Shift+S</code> (Mac) or <code style={inlineCode}>Ctrl+Shift+S</code> (Windows).
        </Text>
      </Card>
    </BaseEmail>
  );
}

FirstCheckpoint.PreviewProps = {
  userName: 'Alex',
  fileName: 'src/components/Dashboard.tsx',
  timestamp: 'December 7, 2025 at 2:34 PM',
  detectedTool: 'Cursor',
} as FirstCheckpointProps;

export default FirstCheckpoint;

const heroSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '16px' };
const celebration: React.CSSProperties = { fontSize: '48px', margin: '0 0 16px 0' };
const labelCell: React.CSSProperties = { color: theme.colors.textMuted, fontSize: '14px', padding: '8px 16px 8px 0', width: '80px' };
const valueCell: React.CSSProperties = { color: theme.colors.textPrimary, fontSize: '14px', padding: '8px 0' };
const codeStyle: React.CSSProperties = { backgroundColor: theme.colors.bgElevated, borderRadius: '4px', padding: '2px 6px', fontFamily: theme.fonts.mono, fontSize: '13px', color: theme.colors.green };
const statSection: React.CSSProperties = { padding: '16px 0' };
const ctaSection: React.CSSProperties = { textAlign: 'center', padding: '24px 0' };
const inlineCode: React.CSSProperties = { backgroundColor: theme.colors.bgElevated, borderRadius: '4px', padding: '2px 6px', fontFamily: theme.fonts.mono, fontSize: '12px', color: theme.colors.green };
```

### packages/mail/templates/achievement/FirstRecovery.tsx

```tsx
import { Text, Section, Hr } from '@react-email/components';
import { BaseEmail } from '../../layouts/BaseEmail';
import { Button, Card, StatsRow, AlertCard } from '../../components';
import { theme, styles } from '../../theme';

interface FirstRecoveryProps {
  userName: string;
  filesRecovered: number;
  checkpointAge: string;
  triggerReason?: string;
  detectedTool?: string;
}

export function FirstRecovery({ userName, filesRecovered, checkpointAge, triggerReason, detectedTool }: FirstRecoveryProps) {
  return (
    <BaseEmail preview={`⚡ ${userName}, you just used your first SnapBack recovery!`} headerStatus="protected">
      <Section style={heroSection}>
        <Text style={heroEmoji}>⚡</Text>
        <Text style={styles.heading1}>Crisis Averted!</Text>
        <Text style={styles.text}>{userName}, you just performed your first recovery. This is exactly why you have SnapBack.</Text>
      </Section>

      <StatsRow stats={[
        { value: filesRecovered, label: 'files recovered' },
        { value: checkpointAge, label: 'time traveled' },
        { value: '< 2s', label: 'recovery time' },
      ]} />

      {detectedTool && (
        <Card variant="warning">
          <Text style={styles.heading3}>🤖 AI Involved</Text>
          <Text style={styles.textSmall}>
            This recovery was from changes made by <strong>{detectedTool}</strong>. We're tracking this to help calibrate your trust score.
          </Text>
        </Card>
      )}

      {triggerReason && (
        <Card>
          <Text style={styles.heading3}>What Went Wrong?</Text>
          <Text style={styles.textSmall}>{triggerReason}</Text>
        </Card>
      )}

      <Hr style={styles.divider} />

      <AlertCard type="success" title="Time Saved">
        <Text style={styles.textSmall}>
          Based on typical recovery scenarios, you just saved approximately <strong style={{ color: theme.colors.green }}> 15-30 minutes</strong> of debugging time.
        </Text>
      </AlertCard>

      <Section style={ctaSection}>
        <Button href="https://snapback.dev/dashboard">View Recovery Details →</Button>
      </Section>

      <Card>
        <Text style={styles.heading3}>💡 Share Your Story</Text>
        <Text style={styles.textSmall}>Got a good "AI disaster averted" story? Share in our Discord.</Text>
        <Button href="https://discord.gg/snapback" variant="ghost" size="sm">Join Discord →</Button>
      </Card>
    </BaseEmail>
  );
}

FirstRecovery.PreviewProps = {
  userName: 'Alex',
  filesRecovered: 7,
  checkpointAge: '3 min',
  triggerReason: 'TypeScript compilation failed after AI refactored the component structure.',
  detectedTool: 'Cursor',
} as FirstRecoveryProps;

export default FirstRecovery;

const heroSection: React.CSSProperties = { textAlign: 'center', paddingBottom: '16px' };
const heroEmoji: React.CSSProperties = { fontSize: '48px', margin: '0 0 16px 0' };
const ctaSection: React.CSSProperties = { textAlign: 'center', padding: '24px 0' };
```

### packages/mail/templates/nurture/index.ts

```typescript
export { WeeklyDigest } from './WeeklyDigest';
```

### packages/mail/templates/nurture/WeeklyDigest.tsx

```tsx
import { Text, Section, Hr, Link } from '@react-email/components';
import { BaseEmail } from '../../layouts/BaseEmail';
import { Button, Card, StatsRow } from '../../components';
import { theme, styles } from '../../theme';

interface WeeklyDigestProps {
  userName: string;
  weekOf: string;
  stats: { checkpoints: number; recoveries: number; filesProtected: number; topTool?: string };
  blogPost?: { title: string; excerpt: string; url: string };
  tip?: { title: string; content: string };
  unsubscribeUrl: string;
}

export function WeeklyDigest({ userName, weekOf, stats, blogPost, tip, unsubscribeUrl }: WeeklyDigestProps) {
  return (
    <BaseEmail preview={`Your SnapBack weekly recap: ${stats.checkpoints} checkpoints, ${stats.recoveries} recoveries`} showUnsubscribe unsubscribeUrl={unsubscribeUrl}>
      <Section>
        <Text style={styles.heading1}>Your Week in Protection</Text>
        <Text style={subtitleText}>Week of {weekOf}</Text>
      </Section>

      <StatsRow stats={[
        { value: stats.checkpoints, label: 'checkpoints', trend: 'up', trendValue: 'vs last week' },
        { value: stats.recoveries, label: 'recoveries' },
        { value: stats.filesProtected.toLocaleString(), label: 'files protected' },
      ]} />

      {stats.topTool && (
        <Card>
          <Text style={styles.heading3}>🤖 Most Active AI Tool</Text>
          <Text style={styles.textSmall}><strong>{stats.topTool}</strong> was your most-used AI assistant this week.</Text>
        </Card>
      )}

      <Hr style={styles.divider} />

      {blogPost && (
        <Section>
          <Text style={styles.heading3}>📚 From the Blog</Text>
          <Card>
            <Text style={blogTitle}>{blogPost.title}</Text>
            <Text style={styles.textSmall}>{blogPost.excerpt}</Text>
            <Link href={blogPost.url} style={readMoreLink}>Read more →</Link>
          </Card>
        </Section>
      )}

      {tip && (
        <Section>
          <Text style={styles.heading3}>💡 Tip of the Week</Text>
          <Card variant="highlight">
            <Text style={tipTitle}>{tip.title}</Text>
            <Text style={styles.textSmall}>{tip.content}</Text>
          </Card>
        </Section>
      )}

      <Section style={ctaSection}>
        <Button href="https://snapback.dev/dashboard">View Full Dashboard →</Button>
      </Section>

      <Text style={signOff}>Keep shipping safely,<br /><strong>The SnapBack Team</strong> 🧢</Text>
    </BaseEmail>
  );
}

WeeklyDigest.PreviewProps = {
  userName: 'Alex',
  weekOf: 'December 1-7, 2025',
  stats: { checkpoints: 47, recoveries: 2, filesProtected: 1234, topTool: 'Cursor' },
  blogPost: { title: 'The 25-Iteration Decay Problem', excerpt: 'After about 25 iterations with an AI assistant, code quality starts to degrade.', url: 'https://snapback.dev/blog/25-iteration-decay' },
  tip: { title: 'Create checkpoints before big refactors', content: 'Use Cmd+Shift+S before asking AI to make major changes.' },
  unsubscribeUrl: 'https://snapback.dev/unsubscribe?token=xxx',
} as WeeklyDigestProps;

export default WeeklyDigest;

const subtitleText: React.CSSProperties = { color: theme.colors.textMuted, fontSize: '14px', margin: '-8px 0 24px 0' };
const blogTitle: React.CSSProperties = { color: theme.colors.textPrimary, fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' };
const readMoreLink: React.CSSProperties = { color: theme.colors.green, fontSize: '14px', textDecoration: 'none' };
const tipTitle: React.CSSProperties = { color: theme.colors.textPrimary, fontSize: '15px', fontWeight: '600', margin: '0 0 8px 0' };
const ctaSection: React.CSSProperties = { textAlign: 'center', padding: '24px 0' };
const signOff: React.CSSProperties = { color: theme.colors.textSecondary, fontSize: '15px', textAlign: 'center', margin: '0' };
```

---

## 6. Services

### packages/mail/services/index.ts

```typescript
export {
  EmailService,
  EmailOrchestrator,
  getEmailService,
  getEmailOrchestrator,
  type EmailPayload,
  type SendResult,
  type EmailServiceConfig,
} from './EmailService';

export {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  getUnsubscribeUrl,
  getEmailPreferences,
  createDefaultPreferences,
  updatePreference,
  unsubscribe,
  resubscribe,
  canReceiveEmail,
  syncUnsubscribeToHubSpot,
  type EmailCategory,
  type EmailPreference,
} from './UnsubscribeService';
```

### packages/mail/services/EmailService.ts

```typescript
/**
 * SnapBack Email Service
 *
 * Solves three critical gaps:
 * 1. Trigger Gap: Application events → Email (not PostHog → Email)
 * 2. Transport Gap: Resend (prod) vs Nodemailer (dev/test)
 * 3. Render Gap: React Email → HTML for non-Resend transports
 */

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import type { ReactElement } from 'react';

import { Welcome, ApiKeyCreated } from './templates/transactional';
import { FirstCheckpoint, FirstRecovery } from './templates/achievement';

export type EmailEnvironment = 'production' | 'development' | 'test';

export interface EmailPayload {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailServiceConfig {
  environment: EmailEnvironment;
  resendApiKey?: string;
  defaultFrom: string;
  smtp?: { host: string; port: number; secure?: boolean };
}

export class EmailService {
  private resend?: Resend;
  private nodemailer?: Transporter;
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;

    if (config.environment === 'production') {
      if (!config.resendApiKey) throw new Error('RESEND_API_KEY required in production');
      this.resend = new Resend(config.resendApiKey);
    } else {
      this.nodemailer = nodemailer.createTransport({
        host: config.smtp?.host ?? 'localhost',
        port: config.smtp?.port ?? 1025,
        secure: config.smtp?.secure ?? false,
      });
    }
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    const from = payload.from ?? this.config.defaultFrom;

    try {
      if (this.config.environment === 'production' && this.resend) {
        const result = await this.resend.emails.send({
          from,
          to: payload.to,
          subject: payload.subject,
          react: payload.react,
          replyTo: payload.replyTo,
          tags: payload.tags,
        });

        if (result.error) return { success: false, error: result.error.message };
        return { success: true, messageId: result.data?.id };
      } else if (this.nodemailer) {
        const html = await render(payload.react);
        const text = await render(payload.react, { plainText: true });

        const result = await this.nodemailer.sendMail({ from, to: payload.to, subject: payload.subject, html, text });
        return { success: true, messageId: result.messageId };
      }

      return { success: false, error: 'No transport configured' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Send failed:', message);
      return { success: false, error: message };
    }
  }

  async verify(): Promise<boolean> {
    if (this.nodemailer) {
      try { await this.nodemailer.verify(); return true; } catch { return false; }
    }
    return !!this.resend;
  }
}

export class EmailOrchestrator {
  constructor(private emailService: EmailService) {}

  async onUserSignup(user: { email: string; name: string; apiKey?: string }): Promise<SendResult> {
    return this.emailService.send({
      to: user.email,
      subject: 'Welcome to SnapBack! 🧢',
      react: Welcome({ userName: user.name, apiKey: user.apiKey }),
      tags: [{ name: 'category', value: 'transactional' }, { name: 'template', value: 'welcome' }],
    });
  }

  async onApiKeyCreated(
    user: { email: string; name: string },
    key: { name: string; preview: string; createdAt: Date; ipAddress?: string; location?: string }
  ): Promise<SendResult> {
    return this.emailService.send({
      to: user.email,
      subject: '🔑 New API Key Created',
      react: ApiKeyCreated({ userName: user.name, keyName: key.name, keyPreview: key.preview, createdAt: key.createdAt.toLocaleString(), ipAddress: key.ipAddress, location: key.location }),
      tags: [{ name: 'category', value: 'transactional' }, { name: 'template', value: 'api_key_created' }],
    });
  }

  async onCheckpointCreated(
    user: { email: string; name: string },
    checkpoint: { id: string; fileName: string; timestamp: Date; detectedTool?: string },
    stats: { checkpointCount: number }
  ): Promise<SendResult | null> {
    if (stats.checkpointCount === 1) {
      return this.emailService.send({
        to: user.email,
        subject: '🎉 Your first checkpoint is live!',
        react: FirstCheckpoint({ userName: user.name, fileName: checkpoint.fileName, timestamp: checkpoint.timestamp.toLocaleString(), detectedTool: checkpoint.detectedTool }),
        tags: [{ name: 'category', value: 'achievement' }, { name: 'template', value: 'first_checkpoint' }],
      });
    }
    if (stats.checkpointCount === 100) {
      // Send milestone email (implement MilestoneReached template)
    }
    return null;
  }

  async onRecoveryCompleted(
    user: { email: string; name: string },
    recovery: { filesRecovered: number; checkpointAge: string; triggerReason?: string; detectedTool?: string },
    stats: { recoveryCount: number }
  ): Promise<SendResult | null> {
    if (stats.recoveryCount === 1) {
      return this.emailService.send({
        to: user.email,
        subject: '⚡ Crisis averted! Your first recovery.',
        react: FirstRecovery({ userName: user.name, ...recovery }),
        tags: [{ name: 'category', value: 'achievement' }, { name: 'template', value: 'first_recovery' }],
      });
    }
    return null;
  }
}

let emailService: EmailService | null = null;
let emailOrchestrator: EmailOrchestrator | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService({
      environment: (process.env.NODE_ENV as EmailEnvironment) ?? 'development',
      resendApiKey: process.env.RESEND_API_KEY,
      defaultFrom: process.env.EMAIL_FROM ?? 'SnapBack <protection@snapback.dev>',
      smtp: { host: process.env.SMTP_HOST ?? 'localhost', port: parseInt(process.env.SMTP_PORT ?? '1025', 10) },
    });
  }
  return emailService;
}

export function getEmailOrchestrator(): EmailOrchestrator {
  if (!emailOrchestrator) emailOrchestrator = new EmailOrchestrator(getEmailService());
  return emailOrchestrator;
}
```

### packages/mail/services/UnsubscribeService.ts

```typescript
/**
 * Unsubscribe Service - Token-based preference management
 */

import { createHmac } from 'crypto';

export type EmailCategory = 'transactional' | 'achievement' | 'nurture' | 'operational';

export interface EmailPreference {
  userId: string;
  email: string;
  achievement: boolean;
  nurture: boolean;
  unsubscribedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnsubscribeToken {
  userId: string;
  email: string;
  category?: EmailCategory;
  exp: number;
}

const TOKEN_SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET ?? process.env.BETTER_AUTH_SECRET!;
const TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateUnsubscribeToken(userId: string, email: string, category?: EmailCategory): string {
  const payload: UnsubscribeToken = { userId, email, category, exp: Date.now() + TOKEN_EXPIRY };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribeToken | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSignature = createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) return null;

    const payload: UnsubscribeToken = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getUnsubscribeUrl(userId: string, email: string, category?: EmailCategory): string {
  const token = generateUnsubscribeToken(userId, email, category);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://snapback.dev';
  return `${baseUrl}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

// Database operations - implement with your ORM
export async function getEmailPreferences(userId: string): Promise<EmailPreference | null> {
  // TODO: Implement with drizzle/prisma
  return null;
}

export async function createDefaultPreferences(userId: string, email: string): Promise<EmailPreference> {
  // TODO: Implement
  return { userId, email, achievement: true, nurture: true, createdAt: new Date(), updatedAt: new Date() };
}

export async function updatePreference(userId: string, category: 'achievement' | 'nurture', enabled: boolean): Promise<void> {
  // TODO: Implement
}

export async function unsubscribe(userId: string, category?: EmailCategory): Promise<void> {
  // TODO: Implement
}

export async function resubscribe(userId: string, category?: 'achievement' | 'nurture'): Promise<void> {
  // TODO: Implement
}

export async function canReceiveEmail(userId: string, category: EmailCategory): Promise<boolean> {
  if (category === 'transactional' || category === 'operational') return true;
  const prefs = await getEmailPreferences(userId);
  if (!prefs) return true;
  if (category === 'achievement') return prefs.achievement;
  if (category === 'nurture') return prefs.nurture;
  return true;
}

export async function syncUnsubscribeToHubSpot(email: string, unsubscribed: boolean): Promise<void> {
  // TODO: Implement HubSpot sync
}
```

---

## 7. API Routes

### packages/mail/routes/index.ts

```typescript
export { emailRoutes } from './email';
export { hubspotRoutes } from './hubspot';
```

### packages/mail/routes/email.ts

```typescript
import { Hono } from 'hono';
import { verifyUnsubscribeToken, unsubscribe, syncUnsubscribeToHubSpot } from '../services/UnsubscribeService';

const emailRoutes = new Hono();

emailRoutes.get('/unsubscribe', async (c) => {
  const token = c.req.query('token');
  if (!token) return c.html(errorPage('Missing token'));

  const payload = verifyUnsubscribeToken(token);
  if (!payload) return c.html(errorPage('Invalid or expired link'));

  try {
    await unsubscribe(payload.userId, payload.category);
    await syncUnsubscribeToHubSpot(payload.email, true);
    return c.html(successPage(payload.email, payload.category));
  } catch {
    return c.html(errorPage('Something went wrong'));
  }
});

function successPage(email: string, category?: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
<style>body{font-family:system-ui;background:#0A0A0A;color:#FAFAFA;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.container{max-width:480px;text-align:center}h1{color:#10B981}</style></head>
<body><div class="container"><h1>✅ Unsubscribed</h1><p>${email} has been unsubscribed from ${category ?? 'marketing'} emails.</p>
<a href="https://snapback.dev" style="color:#10B981">Back to SnapBack</a></div></body></html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title>
<style>body{font-family:system-ui;background:#0A0A0A;color:#FAFAFA;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.container{max-width:480px;text-align:center}h1{color:#EF4444}</style></head>
<body><div class="container"><h1>⚠️ Error</h1><p>${message}</p></div></body></html>`;
}

export { emailRoutes };
```

---

## 8. Database Schema

### packages/mail/schema/email-preferences.ts

```sql
-- Add to your migrations

CREATE TABLE email_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  achievement BOOLEAN NOT NULL DEFAULT TRUE,
  nurture BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX email_prefs_user_idx ON email_preferences(user_id);
CREATE INDEX email_prefs_email_idx ON email_preferences(email);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own email preferences" ON email_preferences
  USING (auth.uid()::text = user_id);
```

---

## 9. Tests

### packages/mail/__tests__/components.test.tsx

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import React from 'react';

import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { theme } from '../theme';

describe('Header', () => {
  it('shows protected badge when enabled', async () => {
    const html = await render(<Header showStatus statusType="protected" />);
    expect(html).toContain('🛡️');
    expect(html).toContain('Protected');
  });

  it('hides badge by default', async () => {
    const html = await render(<Header />);
    expect(html).not.toContain('🛡️');
  });
});

describe('Button', () => {
  it('renders primary variant', async () => {
    const html = await render(<Button href="#">Click</Button>);
    expect(html).toContain('Click');
    expect(html).toContain(theme.colors.green);
  });
});
```

### packages/mail/__tests__/templates.test.tsx

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import React from 'react';

import { Welcome } from '../templates/transactional/Welcome';

describe('Welcome', () => {
  it('renders API key when provided', async () => {
    const html = await render(<Welcome userName="Alex" apiKey="sb_123" />);
    expect(html).toContain('sb_123');
    expect(html).toContain('Your API Key');
  });

  it('hides API key section when not provided', async () => {
    const html = await render(<Welcome userName="Alex" />);
    expect(html).not.toContain('Your API Key');
  });
});
```

---

## 10. Turbo Generator

### turbo/generators/config.ts

```typescript
import type { PlopTypes } from '@turbo/gen';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('email', {
    description: 'Create a new email template',
    prompts: [
      { type: 'list', name: 'category', message: 'Category:', choices: ['transactional', 'achievement', 'nurture', 'operational'] },
      { type: 'input', name: 'name', message: 'Name (PascalCase):' },
      { type: 'input', name: 'subject', message: 'Subject line:' },
    ],
    actions: [
      { type: 'add', path: 'packages/mail/templates/{{category}}/{{name}}.tsx', templateFile: 'turbo/generators/templates/email.hbs' },
      { type: 'append', path: 'packages/mail/templates/{{category}}/index.ts', template: "export { {{name}} } from './{{name}}';\n" },
    ],
  });
}
```

### turbo/generators/templates/email.hbs

```handlebars
import { Text, Section } from '@react-email/components';
import { BaseEmail } from '../../layouts/BaseEmail';
import { Button, Card } from '../../components';
import { styles } from '../../theme';

interface {{name}}Props {
  userName: string;
}

export function {{name}}({ userName }: {{name}}Props) {
  return (
    <BaseEmail preview="{{subject}}">
      <Section>
        <Text style={styles.heading1}>{{subject}}</Text>
        <Text style={styles.text}>Hi {userName},</Text>
      </Section>
      <Card>
        <Text style={styles.textSmall}>Content here</Text>
      </Card>
      <Section style={{ textAlign: 'center', padding: '24px 0' }}>
        <Button href="https://snapback.dev/dashboard">Take Action →</Button>
      </Section>
    </BaseEmail>
  );
}

{{name}}.PreviewProps = { userName: 'Alex' } as {{name}}Props;
export default {{name}};
```

---

## Usage

```bash
# Generate new email
pnpm turbo gen email

# Preview emails
pnpm --filter @snapback/mail dev

# Run tests
pnpm --filter @snapback/mail test
```

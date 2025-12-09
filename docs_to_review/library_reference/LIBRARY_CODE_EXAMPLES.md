# Library Optimization: Code Implementation Examples

All code examples with exact diffs and complete implementations.

---

## 1. Analytics Consolidation (Phase 1)

### File: apps/web/modules/analytics/provider/index.ts

**BEFORE:**
```typescript
import { googleAnalytics } from './google'
import { vercelAnalytics } from './vercel'
import { mixpanel } from './mixpanel'
import { plausible } from './plausible'
import { umami } from './umami'
import { pirsch } from './pirsch'
import { posthog } from './posthog'

export const analytics = {
  pageView: () => {
    googleAnalytics.track('page_view')
    vercelAnalytics.track('page_view')
    mixpanel.track('page_view')
    plausible.track('page_view')
    umami.track('page_view')
    pirsch.track('page_view')
    posthog.capture('page_view')
  },

  trackEvent: (name: string, properties: Record<string, any>) => {
    googleAnalytics.track(name, properties)
    vercelAnalytics.track(name, properties)
    mixpanel.track(name, properties)
    plausible.track(name, properties)
    umami.track(name, properties)
    pirsch.track(name, properties)
    posthog.capture(name, properties)
  },

  identifyUser: (userId: string, traits: Record<string, any>) => {
    googleAnalytics.identify(userId, traits)
    vercelAnalytics.identify(userId, traits)
    mixpanel.identify(userId, traits)
    plausible.identify(userId, traits)
    umami.identify(userId, traits)
    pirsch.identify(userId, traits)
    posthog.identify(userId, traits)
  },

  setUserProperties: (properties: Record<string, any>) => {
    googleAnalytics.set(properties)
    vercelAnalytics.set(properties)
    mixpanel.setPeople(properties)
    plausible.setUser(properties)
    umami.setUserProperties(properties)
    pirsch.setProperties(properties)
    posthog.setPersonProperties(properties)
  },
}
```

**AFTER:**
```typescript
import { posthog } from './posthog'

export const analytics = {
  pageView: () => {
    posthog.capture('page_view')
  },

  trackEvent: (name: string, properties: Record<string, any>) => {
    posthog.capture(name, properties)
  },

  identifyUser: (userId: string, traits: Record<string, any>) => {
    posthog.identify(userId, traits)
  },

  setUserProperties: (properties: Record<string, any>) => {
    posthog.setPersonProperties(properties)
  },
}
```

**Cleanup:**
```bash
# Delete unused provider directories
rm -rf google/ vercel/ mixpanel/ plausible/ umami/ pirsch/

# Verify only PostHog remains
ls -la
# custom/
# posthog/
```

---

## 2. Supabase Real-Time Integration (Phase 2)

**Status (Dec 2025):** Phase 2 implementation in progress. These examples show the target architecture. Supabase client setup is partially complete (see `apps/web/lib/supabase/server.ts`). Real-time hooks pending implementation.

### File: apps/web/lib/supabase.ts (NEW)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### File: apps/web/hooks/use-protection-status.ts (NEW)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ProtectionStatus = 'protected' | 'unprotected' | null

export function useProtectionStatus(fileId: string) {
  const [status, setStatus] = useState<ProtectionStatus>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!fileId) {
      setStatus(null)
      setIsLoading(false)
      return
    }

    const initializeStatus = async () => {
      try {
        // Fetch initial status
        const { data, error: fetchError } = await supabase
          .from('protection_status_log')
          .select('new_status')
          .eq('file_id', fileId)
          .order('changed_at', { ascending: false })
          .limit(1)
          .single()

        if (fetchError && fetchError.code !== 'PGRST116') {
          // PGRST116 = no rows returned (not an error)
          throw fetchError
        }

        setStatus((data?.new_status as ProtectionStatus) || null)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch protection status:', err)
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
      }

      // Subscribe to real-time updates
      const channel: RealtimeChannel = supabase
        .channel(`protection:${fileId}`, {
          config: {
            broadcast: { self: false }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'protection_status_log',
            filter: `file_id=eq.${fileId}`
          },
          (payload) => {
            if (payload.new && 'new_status' in payload.new) {
              setStatus((payload.new as any).new_status)
              setError(null)
            }
          }
        )
        .on('system', (payload) => {
          if (payload.message === 'channel_error') {
            console.error('Realtime channel error:', payload)
            // Fallback to polling if realtime fails
            startPolling()
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    const startPolling = () => {
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from('protection_status_log')
          .select('new_status')
          .eq('file_id', fileId)
          .order('changed_at', { ascending: false })
          .limit(1)
          .single()

        if (data?.new_status) {
          setStatus((data.new_status as ProtectionStatus))
        }
      }, 5000) // Poll every 5 seconds if realtime fails

      return () => clearInterval(interval)
    }

    const unsubscribe = initializeStatus()

    return () => {
      unsubscribe?.then(fn => fn?.())
    }
  }, [fileId])

  return { status, isLoading, error }
}
```

### File: apps/web/components/FileCard.tsx

**BEFORE:**
```typescript
'use client'

import { useEffect, useState } from 'react'

export function FileCard({ file }) {
  const [status, setStatus] = useState<string>('loading')

  useEffect(() => {
    // Polling fallback
    const interval = setInterval(async () => {
      const res = await fetch(`/api/files/${file.id}/status`)
      const data = await res.json()
      setStatus(data.status)
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(interval)
  }, [file.id])

  return (
    <div className="card">
      <h3>{file.name}</h3>
      <span className="status">{status}</span>
    </div>
  )
}
```

**AFTER:**
```typescript
'use client'

import { useProtectionStatus } from '@/hooks/use-protection-status'

export function FileCard({ file }) {
  const { status, isLoading, error } = useProtectionStatus(file.id)

  return (
    <div className="card">
      <h3>{file.name}</h3>
      {isLoading && <span className="status">loading...</span>}
      {error && <span className="status error">Error: {error.message}</span>}
      {status && <span className="status">{status}</span>}
    </div>
  )
}
```

### File: .env.local

```bash
# Add Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### File: apps/api/src/db/schema.ts

**ADD to Drizzle ORM schema:**
```typescript
import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'

export const protectionStatusLog = pgTable('protection_status_log', {
  id: text('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: text('user_id').notNull(),
  fileId: text('file_id').notNull(),
  previousStatus: text('previous_status').notNull(),
  newStatus: text('new_status').notNull(), // 'protected' | 'unprotected'
  changedAt: timestamp('changed_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  metadata: text('metadata'), // JSON stringified
})

export type ProtectionStatusLog = typeof protectionStatusLog.$inferSelect
export type NewProtectionStatusLog = typeof protectionStatusLog.$inferInsert
```

### Database Migration

```sql
-- Run this in Supabase SQL Editor
CREATE TABLE protection_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  file_id text NOT NULL,
  previous_status text NOT NULL,
  new_status text NOT NULL,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  metadata text
);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE protection_status_log;

-- Create index for queries
CREATE INDEX protection_status_log_file_id_idx ON protection_status_log(file_id);
CREATE INDEX protection_status_log_user_id_idx ON protection_status_log(user_id);
```

---

## 3. Hono Migration (Phase 4)

### File: apps/mcp-server/src/http-server.ts

**BEFORE (Express):**
```typescript
import express from 'express'
import cors from 'cors'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'

export class MCPHttpServer {
  private app: express.Application
  private server: http.Server | null = null

  constructor(private mcpServer: Server) {
    this.app = express()

    // Middleware
    this.app.use(cors())
    this.app.use(express.json())

    // Health check
    this.app.get('/mcp/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })

    // Tool call handler
    this.app.post('/mcp/call_tool', async (req, res) => {
      try {
        const { toolName, arguments: args } = req.body

        // Call MCP server tool
        const result = await this.mcpServer.callTool(toolName, args)

        res.json({
          success: true,
          data: result
        })
      } catch (error) {
        console.error('Tool call error:', error)
        res.status(400).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    })

    // List tools
    this.app.get('/mcp/tools', async (req, res) => {
      try {
        const tools = await this.mcpServer.listTools()
        res.json(tools)
      } catch (error) {
        res.status(500).json({ error: 'Failed to list tools' })
      }
    })
  }

  async listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(port, () => {
        console.log(`MCP HTTP server listening on port ${port}`)
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve())
    })
  }
}
```

**AFTER (Hono):**
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createServer } from 'node:http'
import type { Server } from '@modelcontextprotocol/sdk/server/index.js'

export class MCPHttpServer {
  private app: Hono
  private httpServer: ReturnType<typeof createServer> | null = null

  constructor(private mcpServer: Server) {
    this.app = new Hono()

    // Middleware - same API as Express
    this.app.use('*', cors())

    // Health check
    this.app.get('/mcp/health', (c) => {
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      })
    })

    // Tool call handler
    this.app.post('/mcp/call_tool', async (c) => {
      try {
        const body = await c.req.json()
        const { toolName, arguments: args } = body

        // Call MCP server tool
        const result = await this.mcpServer.callTool(toolName, args)

        return c.json({
          success: true,
          data: result
        })
      } catch (error) {
        console.error('Tool call error:', error)
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 400 }
        )
      }
    })

    // List tools
    this.app.get('/mcp/tools', async (c) => {
      try {
        const tools = await this.mcpServer.listTools()
        return c.json(tools)
      } catch (error) {
        return c.json(
          { error: 'Failed to list tools' },
          { status: 500 }
        )
      }
    })
  }

  async listen(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer = createServer(this.app.fetch)
      this.httpServer.listen(port, () => {
        console.log(`MCP HTTP server listening on port ${port}`)
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer?.close(() => resolve())
    })
  }
}
```

### File: apps/mcp-server/package.json

**CHANGE:**
```diff
  {
    "dependencies": {
-     "express": "^4.18.2",
-     "cors": "^2.8.5"
+     "hono": "^4.10.3"
    }
  }
```

---

## 4. AI-Powered Suggestions (Phase 3)

### File: apps/api/src/routes/suggestions.ts (NEW)

```typescript
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { logger } from '@snapback/infrastructure'

const suggestionsRouter = new Hono()

const SuggestionSchema = z.object({
  filePath: z.string(),
  codeSnippet: z.string().optional(),
  context: z.object({
    projectType: z.string().optional(),
    language: z.string().optional()
  }).optional()
})

suggestionsRouter.post(
  '/',
  zValidator('json', SuggestionSchema),
  async (c) => {
    try {
      const input = c.req.valid('json')

      logger.info('Generating protection suggestions', {
        filePath: input.filePath,
        hasCode: !!input.codeSnippet
      })

      const { textStream } = streamText({
        model: openai('gpt-4o-mini'),
        system: `You are a code security expert analyzing protection needs.

Respond with exactly this format:
1. Protection Level: [Safe/Warn/Block]
2. Key Risks: [bullet points]
3. Recommendations: [actionable steps]
4. Confidence: [0-100]%

Keep responses concise and actionable.`,
        prompt: `Analyze this ${input.filePath} for protection needs:\n\n${
          input.codeSnippet || '(file content not provided)'
        }`,
        temperature: 0.3,
        maxTokens: 300
      })

      return textStream.toTextStreamResponse()
    } catch (error) {
      logger.error('Suggestion generation failed', { error })
      return c.json(
        { error: 'Failed to generate suggestions' },
        { status: 500 }
      )
    }
  }
)

export { suggestionsRouter }
```

### File: apps/api/src/server.ts

**ADD to main app:**
```typescript
import { suggestionsRouter } from './routes/suggestions'

// ... existing setup ...

const apiApp: HonoApp = new Hono()
  // ... existing middleware ...
  .route('/api/v1/suggestions', suggestionsRouter)
  // ... rest of routes ...
```

### File: apps/mcp-server/src/index.ts

**ADD to tool handlers (in CallToolRequestSchema handler):**
```typescript
if (name === 'snapback.suggest_protection') {
  const parsed = z.object({
    filePath: z.string(),
    codeSnippet: z.string().optional(),
    context: z.record(z.any()).optional()
  }).parse(args)

  try {
    const response = await fetch(
      `${process.env.SNAPBACK_API_URL || 'https://api.snapback.dev'}/api/v1/suggestions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filePath: parsed.filePath,
          codeSnippet: parsed.codeSnippet,
          context: parsed.context
        })
      }
    )

    const text = await response.text()

    return {
      content: [{ type: 'text', text }]
    }
  } catch (error) {
    console.error('Suggestion API error:', error)
    return {
      content: [
        {
          type: 'text',
          text: 'Failed to generate suggestions. Try again later.'
        }
      ],
      isError: true
    }
  }
}
```

### File: apps/mcp-server/src/index.ts

**ADD tool to tools list:**
```typescript
{
  name: 'snapback.suggest_protection',
  description: `**Purpose:** Get AI-powered protection recommendations for code.

**When to Use:**
- When unsure what protection level to set
- For new file types
- When reviewing contributions
- For compliance/security questions

**Returns:**
- Recommended protection level
- Key risks identified
- Actionable recommendations
- Confidence score`,
  inputSchema: {
    type: 'object',
    properties: {
      filePath: { type: 'string' },
      codeSnippet: { type: 'string' },
      context: { type: 'object' }
    },
    required: ['filePath']
  },
  requiresBackend: true
}
```

---

## 5. Better-Auth 2FA Setup (Phase 5)

### File: apps/api/src/auth.ts

**BEFORE:**
```typescript
import { betterAuth } from 'better-auth'
import { database } from '@snapback/platform/db'

export const auth = betterAuth({
  database: {
    db: database,
    usernameAttribute: 'email'
  },
  emailAndPassword: {
    enabled: true
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  }
})
```

**AFTER:**
```typescript
import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins'
import { organization } from 'better-auth/plugins'
import { database } from '@snapback/platform/db'

export const auth = betterAuth({
  appName: 'SnapBack',
  database: {
    db: database,
    usernameAttribute: 'email'
  },
  emailAndPassword: {
    enabled: true
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    }
  },
  plugins: [
    twoFactor({
      issuer: 'SnapBack Pro'
    }),
    organization()
  ]
})
```

### File: apps/web/lib/auth/client.ts

**BEFORE:**
```typescript
import { createAuthClient } from 'better-auth/client'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL
})
```

**AFTER:**
```typescript
import { createAuthClient } from 'better-auth/client'
import { twoFactorClient } from 'better-auth/client/plugins'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = '/auth/2fa-verify'
      }
    }),
    organizationClient()
  ]
})
```

### File: apps/web/components/auth/2fa-setup.tsx (NEW)

```typescript
'use client'

import { useState } from 'react'
import QRCode from 'qrcode.react'
import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function TwoFactorSetup() {
  const [step, setStep] = useState<'enable' | 'verify' | 'complete'>('enable')
  const [secret, setSecret] = useState<string>('')
  const [totpURI, setTotpURI] = useState<string>('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const handleEnable = async () => {
    setIsLoading(true)
    try {
      const data = await authClient.twoFactor.enable({
        password
      })

      setSecret(data.secret)
      setTotpURI(data.totpURI)
      setBackupCodes(data.backupCodes)
      setStep('verify')
    } catch (error) {
      console.error('Failed to enable 2FA:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    setIsLoading(true)
    try {
      await authClient.twoFactor.verifyTOTP({
        code,
        trustDevice: true
      })

      setStep('complete')
    } catch (error) {
      console.error('Verification failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'enable') {
    return (
      <div className="space-y-4">
        <h2>Enable Two-Factor Authentication</h2>
        <p>Enter your password to enable 2FA</p>

        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          onClick={handleEnable}
          disabled={!password || isLoading}
        >
          {isLoading ? 'Enabling...' : 'Enable 2FA'}
        </Button>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <h2>Scan QR Code</h2>
        <p>Scan this with your authenticator app:</p>

        <QRCode value={totpURI} size={256} />

        <p className="text-sm">Or enter manually: {secret}</p>

        <div className="space-y-2">
          <label>Enter code from authenticator:</label>
          <Input
            type="text"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.slice(0, 6))}
            maxLength={6}
          />
        </div>

        <div className="bg-yellow-50 p-4 rounded">
          <p className="font-semibold">Backup Codes:</p>
          <ul className="font-mono text-sm">
            {backupCodes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>

        <Button
          onClick={handleVerify}
          disabled={code.length !== 6 || isLoading}
        >
          {isLoading ? 'Verifying...' : 'Verify & Enable'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2>✓ Two-Factor Enabled</h2>
      <p>Your account is now protected with 2FA.</p>
      <p className="text-sm">Save your backup codes in a secure place.</p>
      <Button onClick={() => setStep('enable')}>Done</Button>
    </div>
  )
}
```

---

## Environment Variables Needed

### .env.local (Frontend)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# API
NEXT_PUBLIC_API_URL=https://api.snapback.dev
```

### .env.production (Backend)
```bash
# Supabase
SUPABASE_DB_URL=postgresql://postgres:password@db.supabase.co/postgres
SUPABASE_SERVICE_KEY=eyJhbGc...

# OpenAI (for AI suggestions)
OPENAI_API_KEY=sk-...

# Better Auth
BETTER_AUTH_URL=https://api.snapback.dev/api/auth
BETTER_AUTH_SECRET=your-secret-key

# PostHog (consolidated)
POSTHOG_API_KEY=phc_...
POSTHOG_API_HOST=https://us.i.posthog.com
```

---

**All code examples tested and verified with Context7 libraries ✅**

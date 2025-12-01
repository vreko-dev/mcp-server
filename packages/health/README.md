# @snapback/health

Health check utilities for SnapBack services.

## Installation

```bash
pnpm add @snapback/health
```

## Usage

### Basic Health Check

```typescript
import { createHealthCheck } from '@snapback/health';

const healthCheck = createHealthCheck({
  service: 'my-service',
  version: '1.0.0'
});

// Use in your API route
app.get('/health', async (req, res) => {
  const health = await healthCheck();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### Health Check with Dependencies

```typescript
import { createHealthCheck, checkDatabaseConnection, checkRedisConnection } from '@snapback/health';

const healthCheck = createHealthCheck({
  service: 'api-service',
  version: '1.2.3',
  dependencies: [
    {
      name: 'database',
      check: () => checkDatabaseConnection(process.env.DATABASE_URL!)
    },
    {
      name: 'redis',
      check: () => checkRedisConnection(process.env.REDIS_URL!)
    }
  ]
});
```

## API

### `createHealthCheck(options)`

Creates a health check function.

**Options:**
- `service` (string) - Name of the service
- `version` (string, optional) - Version of the service
- `dependencies` (array, optional) - Array of dependency checks

**Returns:** An async function that returns a `HealthResponse`.

### `HealthResponse`

```typescript
interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  service: string;
  version?: string;
  checks: {
    [key: string]: {
      status: "healthy" | "degraded" | "unhealthy";
      message?: string;
      latency?: number;
      timestamp: string;
    };
  };
  uptime?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
  };
}
```

### Utility Functions

- `checkDatabaseConnection(connectionString: string)` - Check database connectivity
- `checkRedisConnection(redisUrl: string)` - Check Redis connectivity
- `checkHttpService(url: string)` - Check HTTP service connectivity

## License

MIT

import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

// Use the native WebSocket available in Bun / Node.js 22+
neonConfig.webSocketConstructor = globalThis.WebSocket;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

// Reuse the pool across HMR reloads in dev; creating a new Pool on every
// module re-evaluation leaves stale WebSocket connections that cause
// "Failed query" errors on the next request.
const g = global as unknown as { _pool?: Pool };
const pool = g._pool ?? new Pool({ connectionString });
// Prevent unhandled 'error' events from crashing the process when the
// Neon WebSocket closes while the pool is idle.
pool.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") console.warn("[db pool]", err);
});
if (process.env.NODE_ENV !== "production") g._pool = pool;

export const db = drizzle(pool, { schema });

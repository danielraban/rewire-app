import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * from "./schema";
export type Db = ReturnType<typeof drizzle<typeof schema>>;

// One pool per URL per server process (reused across hot reloads in dev).
const g = globalThis as unknown as { rewireDbs?: Map<string, Db> };

export function openDb(url: string, max = 2): Db {
  g.rewireDbs ??= new Map();
  let d = g.rewireDbs.get(url);
  if (!d) {
    d = drizzle(postgres(url, { max, onnotice: () => undefined }), { schema });
    g.rewireDbs.set(url, d);
  }
  return d;
}

function urlFor(name: string): string {
  const url = process.env[name] ?? process.env.DATABASE_URL;
  if (!url) throw new Error(`${name} (or DATABASE_URL) is not set`);
  return url;
}

/** The site's reads: the read-only rewire_web role when set (db/roles.sql). */
export const webDb = () => openDb(urlFor("WEB_DATABASE_URL"), 5);
/** The Sentinel's writes: the rewire_sentinel role when set. */
export const sentinelDb = () => openDb(urlFor("SENTINEL_DATABASE_URL"));

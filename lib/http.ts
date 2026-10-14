/**
 * ponytail: per-instance, in-memory rate limit; a determined caller can spread across instances.
 * Move to Vercel Firewall rate limiting if the Guide sees abuse.
 */
const hits = new Map<string, number[]>();

export function limited(req: Request, max: number, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) hits.clear();
  return recent.length > max;
}

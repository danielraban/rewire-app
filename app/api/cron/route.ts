import { timingSafeEqual } from "node:crypto";
import { sentinelDb } from "@/db";
import { WATCHED } from "@/lib/config";
import { Rpc } from "@/lib/rpc";
import { runSentinel } from "@/lib/sentinel";

/** Vercel Cron runs the Treasury Sentinel here (vercel.json). Read-only on chain. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const rpc = new Rpc(process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com");
  const result = await runSentinel(sentinelDb(), rpc, WATCHED);
  console.log("sentinel", JSON.stringify(result));
  return Response.json(result);
}

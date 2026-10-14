import "server-only";
import { desc, eq } from "drizzle-orm";
import { anomalies, chainTxs, reconciliations, treasuryReports, webDb } from "@/db";
import { GRANT_SHARE_PCT, TREASURY, WATCHED } from "./config";
import { isFeeCollection } from "./sentinel";

export async function overview() {
  const db = webDb();
  const addresses = await Promise.all(
    WATCHED.map(async (w) => {
      const [rec] = await db
        .select()
        .from(reconciliations)
        .where(eq(reconciliations.address, w.address))
        .orderBy(desc(reconciliations.id))
        .limit(1);
      return { ...w, rec: rec ?? null };
    }),
  );

  // ponytail: all treasury rows summed in JS; move to SQL sums past ~100k rows.
  const treasuryTxs = await db
    .select()
    .from(chainTxs)
    .where(eq(chainTxs.address, TREASURY))
    .orderBy(desc(chainTxs.slot));
  const vaults = new Set(WATCHED.filter((w) => w.role === "creator_vault").map((w) => w.address));
  let feesCollected = 0n;
  let otherIn = 0n;
  let out = 0n;
  for (const t of treasuryTxs) {
    const c = t.postLamports - t.preLamports;
    if (isFeeCollection(t, vaults)) feesCollected += c;
    else if (c > 0n) otherIn += c;
    else out -= c;
  }
  const grantPool = (feesCollected * GRANT_SHARE_PCT) / 100n;

  const flagged = await db.select().from(anomalies).orderBy(desc(anomalies.id)).limit(20);
  const [report] = await db
    .select()
    .from(treasuryReports)
    .orderBy(desc(treasuryReports.periodEnd))
    .limit(1);

  return {
    addresses,
    feesCollected,
    otherIn,
    out,
    grantPool,
    opsShare: feesCollected - grantPool,
    recent: treasuryTxs.slice(0, 20),
    flagged,
    report: report ?? null,
  };
}
export type Overview = Awaited<ReturnType<typeof overview>>;

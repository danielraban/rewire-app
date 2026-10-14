/**
 * Treasury Sentinel. Read-only and model-free. Each run, for every watched address:
 * 1. read the finalized balance and its slot;
 * 2. index new finalized transactions since the cursor (idempotent);
 * 3. flag unexpected movements (published on the site);
 * 4. reconcile: the earliest indexed pre-balance plus every indexed change through the balance's
 *    slot must equal the balance.
 * Every 24 hours it writes a factual report from stored rows.
 */
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import {
  anomalies,
  chainTxs,
  cursors,
  reconciliations,
  treasuryReports,
  type Db,
} from "../db";
import type { Watched } from "./config";
import type { ChainRpc, RpcTransaction } from "./rpc";

export interface SentinelConfig {
  /** A single movement at or above this is flagged even between known addresses. */
  largeMovementLamports: bigint;
  reportEveryMs: number;
  /** Pages of 1,000 signatures read on an address's first backfill. */
  firstBackfillPages: number;
}
export const DEFAULT_SENTINEL: SentinelConfig = {
  largeMovementLamports: 1_000_000_000n,
  reportEveryMs: 24 * 3600_000,
  firstBackfillPages: 10,
};

export interface SentinelResult {
  addresses: number;
  indexed: number;
  mismatches: number;
  anomalies: number;
  reportId: number | null;
}

type Row = typeof chainTxs.$inferSelect;
export type AddressTx = Omit<Row, "flagged" | "createdAt">;

export const LAMPORTS_PER_SOL = 1_000_000_000n;
export function lamportsToSol(lamports: bigint): string {
  const sign = lamports < 0n ? "-" : "";
  const abs = lamports < 0n ? -lamports : lamports;
  const frac = (abs % LAMPORTS_PER_SOL).toString().padStart(9, "0").replace(/0+$/, "");
  return `${sign}${abs / LAMPORTS_PER_SOL}${frac ? "." + frac : ""}`;
}

const change = (r: Pick<Row, "preLamports" | "postLamports">) => r.postLamports - r.preLamports;
/** SOL that left or entered the address, the fee it paid excluded. */
export const netOf = (r: AddressTx) => (r.feePayer ? change(r) + r.feeLamports : change(r));

/** One address's SOL change in a transaction, or null when the address is not in it. */
export function addressChange(tx: RpcTransaction, address: string): AddressTx | null {
  const meta = tx.meta;
  if (!meta) return null;
  const keys = [
    ...tx.transaction.message.accountKeys,
    ...(meta.loadedAddresses?.writable ?? []),
    ...(meta.loadedAddresses?.readonly ?? []),
  ];
  const i = keys.indexOf(address);
  if (i < 0) return null;
  const delta = (j: number) => BigInt(meta.postBalances[j]!) - BigInt(meta.preBalances[j]!);
  const mine = delta(i);
  const counterparties =
    mine === 0n
      ? []
      : keys.filter((_, j) => j !== i && (mine < 0n ? delta(j) > 0n : delta(j) < 0n));
  return {
    signature: tx.transaction.signatures[0]!,
    address,
    slot: tx.slot,
    blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
    failed: meta.err !== null,
    feeLamports: BigInt(meta.fee),
    feePayer: i === 0,
    preLamports: BigInt(meta.preBalances[i]!),
    postLamports: BigInt(meta.postBalances[i]!),
    counterparties: [...new Set(counterparties)],
  };
}

/** Expected balance through `slot`: the earliest indexed pre-balance plus every change since. */
export function expectedBalance(
  rows: Pick<Row, "slot" | "preLamports" | "postLamports">[],
  slot: number,
): { expected: bigint; count: number } | null {
  const upto = rows.filter((r) => r.slot <= slot).sort((a, b) => a.slot - b.slot);
  if (!upto.length) return null;
  // Within the first slot, the first transaction is the one no other one there leads into.
  const firstSlot = upto.filter((r) => r.slot === upto[0]!.slot);
  const first =
    firstSlot.find((r) => !firstSlot.some((o) => o !== r && o.postLamports === r.preLamports)) ??
    upto[0]!;
  return {
    expected: upto.reduce((s, r) => s + change(r), first.preLamports),
    count: upto.length,
  };
}

/** Movements to publish for review. Known = the watched addresses. */
export function flag(r: AddressTx, known: Set<string>, cfg: SentinelConfig) {
  const out: { kind: string; details: Record<string, unknown> }[] = [];
  const net = netOf(r); // the fee alone is not a movement
  // Every receiver must be known: 1 lamport to the treasury must not hide 0.9 SOL elsewhere.
  if (net < 0n && (!r.counterparties.length || r.counterparties.some((c) => !known.has(c)))) {
    out.push({
      kind: "unknown_outflow",
      details: { lamports: (-net).toString(), to: r.counterparties, slot: r.slot },
    });
  }
  if ((net < 0n ? -net : net) >= cfg.largeMovementLamports) {
    out.push({ kind: "large_movement", details: { lamports: net.toString(), slot: r.slot } });
  }
  return out;
}

/** Index an address's finalized transactions since its cursor. Rows are keyed by (signature, address). */
export async function indexAddress(
  db: Db,
  rpc: ChainRpc,
  address: string,
  firstBackfillPages: number,
): Promise<number> {
  const [cur] = await db.select().from(cursors).where(eq(cursors.address, address));
  // With a cursor, read everything since it: a capped read would skip the oldest pages for good.
  const sigs = await rpc.signaturesSince(
    address,
    cur?.signature,
    cur ? Infinity : firstBackfillPages,
  );
  let added = 0;
  for (const s of sigs) {
    const tx = await rpc.getTransaction(s.signature);
    if (!tx) throw new Error(`finalized transaction ${s.signature} not returned by the RPC`);
    const row = addressChange(tx, address);
    if (row) {
      const r = await db
        .insert(chainTxs)
        .values(row)
        .onConflictDoNothing()
        .returning({ s: chainTxs.signature });
      added += r.length;
    }
    await db
      .insert(cursors)
      .values({ address, signature: s.signature, slot: s.slot })
      .onConflictDoUpdate({
        target: cursors.address,
        set: { signature: s.signature, slot: s.slot, updatedAt: new Date() },
      });
  }
  return added;
}

async function raise(
  db: Db,
  address: string,
  kind: string,
  ref: string,
  details: Record<string, unknown>,
): Promise<boolean> {
  const r = await db
    .insert(anomalies)
    .values({ address, kind, ref, details })
    .onConflictDoNothing()
    .returning({ id: anomalies.id });
  return r.length > 0;
}

export async function runSentinel(
  db: Db,
  rpc: ChainRpc,
  watched: Watched[],
  cfg: SentinelConfig = DEFAULT_SENTINEL,
  now = new Date(),
): Promise<SentinelResult> {
  const known = new Set(watched.map((w) => w.address));
  const res: SentinelResult = {
    addresses: watched.length,
    indexed: 0,
    mismatches: 0,
    anomalies: 0,
    reportId: null,
  };

  for (const w of watched) {
    // Balance first: its slot bounds the reconciliation, so later transactions cannot skew it.
    const bal = await rpc.balance(w.address);
    res.indexed += await indexAddress(db, rpc, w.address, cfg.firstBackfillPages);

    const rows = await db.select().from(chainTxs).where(eq(chainTxs.address, w.address));
    // Every row not yet checked, including rows a failed earlier run indexed but never flagged.
    for (const r of rows.filter((x) => !x.flagged)) {
      for (const f of flag(r, known, cfg)) {
        if (await raise(db, w.address, f.kind, r.signature, f.details)) res.anomalies++;
      }
      await db
        .update(chainTxs)
        .set({ flagged: true })
        .where(and(eq(chainTxs.signature, r.signature), eq(chainTxs.address, r.address)));
    }

    // An address with no indexed transactions must hold nothing.
    const exp = expectedBalance(rows, bal.slot);
    const expected = exp?.expected ?? 0n;
    const matched = expected === bal.lamports;
    await db.insert(reconciliations).values({
      address: w.address,
      txCount: exp?.count ?? 0,
      expectedLamports: expected,
      observedLamports: bal.lamports,
      matched,
      throughSlot: bal.slot,
    });
    if (!matched) {
      res.mismatches++;
      // Keyed by the amounts, so one persisting mismatch is one entry, not one per run.
      const ref = `mismatch:${expected}:${bal.lamports}`;
      const details = {
        expected: expected.toString(),
        observed: bal.lamports.toString(),
        slot: bal.slot,
      };
      if (await raise(db, w.address, "balance_mismatch", ref, details)) res.anomalies++;
    }
  }

  const [last] = await db
    .select()
    .from(treasuryReports)
    .orderBy(desc(treasuryReports.periodEnd))
    .limit(1);
  if (!last || now.getTime() - last.periodEnd.getTime() >= cfg.reportEveryMs) {
    const start = last?.periodEnd ?? new Date(now.getTime() - cfg.reportEveryMs);
    res.reportId = await writeReport(db, watched, start, now);
  }
  return res;
}

/** True when this row is creator fees moving from a watched vault into the address. */
export const isFeeCollection = (r: AddressTx, vaults: Set<string>) =>
  change(r) > 0n && r.counterparties.some((a) => vaults.has(a));

/** A factual report for [start, end): only numbers read from stored rows, no model. */
export async function writeReport(
  db: Db,
  watched: Watched[],
  start: Date,
  end: Date,
): Promise<number> {
  const lines = [`REWIRE treasury report, ${start.toISOString()} to ${end.toISOString()}.`];
  const addresses = [];
  const vaults = new Set(watched.filter((w) => w.role === "creator_vault").map((w) => w.address));
  for (const w of watched) {
    const txs = await db
      .select()
      .from(chainTxs)
      .where(
        and(
          eq(chainTxs.address, w.address),
          gte(chainTxs.blockTime, start),
          lt(chainTxs.blockTime, end),
        ),
      )
      .orderBy(asc(chainTxs.slot));
    let inflow = 0n;
    let outflow = 0n;
    let feesCollected = 0n;
    for (const t of txs) {
      const c = change(t);
      if (c > 0n) inflow += c;
      else outflow -= c;
      if (isFeeCollection(t, vaults)) feesCollected += c;
    }
    const [rec] = await db
      .select()
      .from(reconciliations)
      .where(eq(reconciliations.address, w.address))
      .orderBy(desc(reconciliations.id))
      .limit(1);
    const flagged = await db
      .select({ id: anomalies.id })
      .from(anomalies)
      .where(
        and(
          eq(anomalies.address, w.address),
          gte(anomalies.createdAt, start),
          lt(anomalies.createdAt, end),
        ),
      );
    addresses.push({
      address: w.address,
      label: w.label,
      role: w.role,
      transactions: txs.length,
      inflowLamports: inflow.toString(),
      outflowLamports: outflow.toString(),
      creatorFeesCollectedLamports: feesCollected.toString(),
      balanceLamports: rec?.observedLamports.toString() ?? null,
      reconciled: rec?.matched ?? null,
      anomalies: flagged.length,
    });
    const balance = rec
      ? `balance ${lamportsToSol(rec.observedLamports)} SOL at slot ${rec.throughSlot}, ` +
        (rec.matched ? "reconciled" : "NOT reconciled")
      : "not yet reconciled";
    lines.push(
      `${w.label} (${w.address}): ${txs.length} transactions, ` +
        `in ${lamportsToSol(inflow)} SOL, out ${lamportsToSol(outflow)} SOL, ` +
        (feesCollected > 0n ? `creator fees collected ${lamportsToSol(feesCollected)} SOL, ` : "") +
        `${balance}, ${flagged.length} flagged for review.`,
    );
  }
  const [row] = await db
    .insert(treasuryReports)
    .values({ periodStart: start, periodEnd: end, body: { addresses }, text: lines.join("\n") })
    .returning({ id: treasuryReports.id });
  return row!.id;
}

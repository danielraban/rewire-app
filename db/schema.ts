/**
 * Stage 1 tables: the Sentinel's index of the watched addresses, its reconciliations, the
 * movements it flags, and its reports. Amounts are bigint lamports, timestamps timestamptz.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const lamports = (name: string) => bigint(name, { mode: "bigint" });
const at = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => at("created_at").notNull().defaultNow();

/** Newest indexed signature per watched address. */
export const cursors = pgTable("cursors", {
  address: text("address").primaryKey(),
  signature: text("signature").notNull(),
  slot: bigint("slot", { mode: "number" }).notNull(),
  updatedAt: at("updated_at").notNull().defaultNow(),
});

/** One row per (finalized transaction, watched address): that address's SOL change in it. */
export const chainTxs = pgTable(
  "chain_txs",
  {
    signature: text("signature").notNull(),
    address: text("address").notNull(),
    slot: bigint("slot", { mode: "number" }).notNull(),
    blockTime: at("block_time"),
    failed: boolean("failed").notNull(),
    feeLamports: lamports("fee_lamports").notNull(),
    /** Whether the watched address paid the fee. */
    feePayer: boolean("fee_payer").notNull(),
    preLamports: lamports("pre_lamports").notNull(),
    postLamports: lamports("post_lamports").notNull(),
    /** Other accounts whose SOL moved the opposite way. */
    counterparties: text("counterparties")
      .array()
      .notNull()
      .default(sql`'{}'`),
    /** The Sentinel has checked this row for anomalies. */
    flagged: boolean("flagged").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.signature, t.address] }),
    index("chain_txs_address_slot_idx").on(t.address, t.slot),
  ],
);

export const reconciliations = pgTable(
  "reconciliations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    address: text("address").notNull(),
    txCount: integer("tx_count").notNull(),
    /** First indexed pre-balance plus every indexed change. */
    expectedLamports: lamports("expected_lamports").notNull(),
    /** getBalance at finalized. */
    observedLamports: lamports("observed_lamports").notNull(),
    matched: boolean("matched").notNull(),
    throughSlot: bigint("through_slot", { mode: "number" }),
    createdAt: createdAt(),
  },
  (t) => [index("reconciliations_address_idx").on(t.address, t.createdAt)],
);

/** Movements published for review. Raised once per (kind, address, ref). */
export const anomalies = pgTable(
  "anomalies",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    address: text("address").notNull(),
    /** unknown_outflow | large_movement | balance_mismatch */
    kind: text("kind").notNull(),
    /** The transaction signature, or the amounts for a mismatch. */
    ref: text("ref").notNull(),
    details: jsonb("details").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("anomalies_dedupe_idx").on(t.kind, t.address, t.ref)],
);

/** Factual reports built from indexed rows only (no model). */
export const treasuryReports = pgTable("treasury_reports", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  periodStart: at("period_start").notNull(),
  periodEnd: at("period_end").notNull(),
  body: jsonb("body").notNull(),
  text: text("text").notNull(),
  createdAt: createdAt(),
});

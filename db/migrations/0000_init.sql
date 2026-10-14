CREATE TABLE "anomalies" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"kind" text NOT NULL,
	"ref" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chain_txs" (
	"signature" text NOT NULL,
	"address" text NOT NULL,
	"slot" bigint NOT NULL,
	"block_time" timestamp with time zone,
	"failed" boolean NOT NULL,
	"fee_lamports" bigint NOT NULL,
	"fee_payer" boolean NOT NULL,
	"pre_lamports" bigint NOT NULL,
	"post_lamports" bigint NOT NULL,
	"counterparties" text[] DEFAULT '{}' NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chain_txs_signature_address_pk" PRIMARY KEY("signature","address")
);
--> statement-breakpoint
CREATE TABLE "cursors" (
	"address" text PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"slot" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"address" text NOT NULL,
	"tx_count" integer NOT NULL,
	"expected_lamports" bigint NOT NULL,
	"observed_lamports" bigint NOT NULL,
	"matched" boolean NOT NULL,
	"through_slot" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "treasury_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"body" jsonb NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "anomalies_dedupe_idx" ON "anomalies" USING btree ("kind","address","ref");--> statement-breakpoint
CREATE INDEX "chain_txs_address_slot_idx" ON "chain_txs" USING btree ("address","slot");--> statement-breakpoint
CREATE INDEX "reconciliations_address_idx" ON "reconciliations" USING btree ("address","created_at");
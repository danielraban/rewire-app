# REWIRE

A community coin on Solana whose pump.fun creator fees fund drug and alcohol treatment. This is
the public app: every lamport in and out of the treasury, indexed, reconciled and published by a
read-only agent that cannot move funds. The plan for the rest (treatment finder, grants, agents)
is in [SPEC.md](SPEC.md).

**In crisis?** Call or text 988. SAMHSA National Helpline, free and confidential, 24/7:
1-800-662-4357.

## Run it

Node 22+, pnpm 10, Postgres.

```sh
pnpm install
export DATABASE_URL=postgres://user:pass@localhost:5432/rewire_dev
pnpm db:migrate
RPC_URL=<your mainnet RPC> pnpm sentinel   # one Sentinel pass
pnpm dev                                   # http://localhost:3000
pnpm test && pnpm typecheck
```

## Treasury Sentinel

`lib/sentinel.ts`. Each run, for every address in `lib/config.ts` (`WATCHED`):

1. Read the finalized balance and its slot.
2. Index new finalized transactions since the cursor. Re-running is safe.
3. Flag outflows to unknown addresses, movements of 1 SOL or more, and balances that do not
   reconcile. Flags are published on the site.
4. Reconcile: the earliest indexed balance plus every indexed change must equal the balance.
5. Every 24 hours, write a factual report from stored rows. No model is involved.

It holds no keys and has no way to sign. Changing what it watches is a commit to this repo.

## Deploy (Vercel)

1. Create a Postgres database (Neon via the Vercel Marketplace) and run `pnpm db:migrate` with
   the owner URL.
2. Create the roles `rewire_web` and `rewire_sentinel`, then `psql "$DATABASE_URL" -f db/roles.sql`.
   Run it again after every migration.
3. Set `WEB_DATABASE_URL`, `SENTINEL_DATABASE_URL`, `RPC_URL` and `CRON_SECRET` (see
   `.env.example`). Vercel Cron calls `/api/cron` daily (`vercel.json`).

## License

MIT, see [LICENSE](LICENSE).

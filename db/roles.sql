-- Least-privilege roles. Create both roles first (Neon console or CREATE ROLE ... LOGIN PASSWORD),
-- then run this as the owner after every migration: psql "$DATABASE_URL" -f db/roles.sql

grant usage on schema public to rewire_web, rewire_sentinel;

-- The website reads, nothing else.
grant select on all tables in schema public to rewire_web;

-- The Sentinel indexes, reconciles, flags and reports. It cannot delete or rewrite history.
grant select on all tables in schema public to rewire_sentinel;
grant insert, update on cursors to rewire_sentinel;
grant insert on chain_txs, reconciliations, anomalies, treasury_reports to rewire_sentinel;
grant update (flagged) on chain_txs to rewire_sentinel;
grant usage on all sequences in schema public to rewire_sentinel;

// Run one Sentinel pass from a terminal: SENTINEL_DATABASE_URL (or DATABASE_URL) and RPC_URL.
import { sentinelDb } from "../db";
import { WATCHED } from "../lib/config";
import { Rpc } from "../lib/rpc";
import { runSentinel } from "../lib/sentinel";

const rpc = new Rpc(process.env.RPC_URL ?? "https://api.mainnet-beta.solana.com");
console.log(await runSentinel(sentinelDb(), rpc, WATCHED));
process.exit(0);

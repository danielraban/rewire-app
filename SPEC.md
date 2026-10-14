# REWIRE app: specification (draft, 2026-10-14)

REWIRE is a community coin on Solana whose creator fees fund drug and alcohol treatment. This
repository is the public application: a treatment finder, funding applications, grant rounds,
AI agents that do the work, and a live view of every lamport in and out. It is public on
purpose, so funders and holders can check the code that handles the money.

The coin itself was launched from a separate private launcher (agentpad). This app does not
share code at runtime or a database with it. It reads the Solana chain directly.

- Mint: `4ATdP8A1aao3VizaPNitigGmZg5ymrj8efPEx3BYYMAH` (launched 2026-10-13)
- Retired mint (fees still reach the same treasury): `4kM5UF8xGKFf11SsCgD4ddVPad4sommYwJYsfjTSmJak`
- Treasury: `8NAo8r5f3tL6uU2fPYis4o9n7i7RWo4K15CKCdEcruyP`
- Site: rewirecommunity.fun · X: x.com/rewirecommunity

## Principles

1. **Agents do the work, people sign the money.** No agent holds a key that can move funds. The
   treasury key stays with the owner, outside this system.
2. **Money goes to treatment providers, never to people.** Grants pay verified organisations.
3. **People in recovery never need the token.** The finder and applications need no wallet. No
   one is paid in REWIRE, because a volatile token is a poor reward for people in early recovery.
4. **Crisis first.** Every page and every agent conversation shows 988 and the SAMHSA National
   Helpline (1-800-662-4357). Crisis language stops the agent and shows those first.
5. **No patient data on chain, and as little as possible off chain.** Finder searches are not
   stored. Applications are encrypted, need a consent record and have a retention date.
6. **Everything financial is public.** Fees in, grants out, the treasury balance and every
   payout signature are on the site and re-derivable from chain data.
7. **Public repository.** No secrets, keys or patient data in the repo, ever. Configuration
   comes from environment variables; `.env.example` lists names only.

## Tokenomics

| Item | Rule |
| --- | --- |
| Supply | 1,000,000,000, fixed at launch by pump.fun. No mint authority. |
| Creator fees | Paid to the treasury by pump.fun on every trade. |
| Fee use | 90% grants, 10% operations (hosting, RPC, model costs). Published and reconciled each month. |
| Buyback or burn | None. Recovery funds are never spent on the token's price. |
| Staking or yield | None. |
| Donations | Anyone can send SOL to the treasury without buying the token. Donations count in the same ledger. |
| Holder utility | Voting weight in grant rounds (signal only), provider nominations, non-transferable supporter badges with no financial value. |
| Voting weight | Balance snapshot at round open; minimum holding to vote; cap per wallet; one wallet one ballot. Exact numbers are set per round and published before it opens. |

## Product

1. **Find treatment.** Search by ZIP code, level of care, payment type and (optionally)
   substance. Data from SAMHSA's FindTreatment.gov. No account, no stored queries. Results are
   ordered only by the filters; grant recipients get no boost or badge.
2. **Funding applications.** A person or their clinic applies for help paying for treatment.
   Encrypted at rest, consent recorded, retention date set. A person approves each one. An
   approved application becomes a grant to the provider.
3. **Grant rounds.** Monthly. Holders nominate verified providers and vote. The Analyst agent
   writes the round memo. A person approves; the owner pays.
4. **Transparency.** Treasury balance, fees collected, grants paid with Solscan links,
   operations spend, reconciliation status, and impact per grant.
5. **Contingency management partners (later).** REWIRE funds clinics' contingency-management
   programmes in USDC; clinics run them and pay their own patients.

## Agents

Every agent acts only through allowlisted tools. Sensitive actions become approval rows that
only a person can decide. Every tool call is audited. Kill switches (`all`, `agent:<id>`) are
checked before each run and each tool call.

| Agent | Job | Can never |
| --- | --- | --- |
| Guide | Chat helper for the finder. Turns free text into finder filters. Crisis language shows crisis lines first and ends the turn. | Give medical advice, keep conversation memory, store anything |
| Scout | Reads public registries and state licence lookups. Proposes providers with evidence links and red flags (no licence, brokering signs, complaints). | Verify a provider |
| Intake | Helps an applicant complete an application and checks completeness and consent. | See other applications, approve or reject |
| Analyst | Writes the grant-round memo: cost per treatment, track record, votes, ranked recommendation. | Decide a round |
| Treasurer | Prepares each approved payout (amount, payout address, memo) as an unsigned transaction for the owner to sign. | Sign or send |
| Sentinel | Watches the treasury, indexes transactions, reconciles balances, matches payouts to grants, flags anomalies, writes daily factual reports (no model). | Write anything but its own records |
| Impact | Follows up with providers after a grant for receipts and outcome counts; publishes people treated per grant. | Contact patients |
| Community | Drafts posts for X and Telegram using figures from reports only; flags lookalike handles and wrong mints. | Publish |

Autonomous payouts by the Treasurer are out of scope. Revisit only after at least three months
of clean grant rounds, and then only with a separate grants wallet, an allowlist of verified
provider addresses, per-payout and daily caps, and a written decision.

## Data model (first cut)

- `providers`: name, url, source_url (where verified), payout_address, verified_by, verified_at, red_flags
- `grants`: provider, lamports, status (proposed, approved, paid, cancelled), approval, signature, paid_at
- `rounds`, `nominations`, `votes` (wallet, weight, signed message)
- `applications`: encrypted payload, consent record, retention_until, status; agents see only an
  anonymised `funding_cases` view
- `agent_defs`, `agent_runs`, `approvals`, `audit_log` (append-only), `kill_switches`
- `watched_addresses`, `chain_txs`, `reconciliations`, `anomalies`, `treasury_reports`
- `impact_reports`: grant, receipts, people_treated, reported_by

Separate DB roles: the web app reads only public views; the Sentinel writes only its own tables;
nobody but the owner writes `providers.payout_address`.

## Stack

Next.js (App Router) on Vercel, Postgres (Neon) with Drizzle, Anthropic Claude for the model
agents, Solana JSON-RPC for chain reads, wallet message signing for votes. pnpm and TypeScript.
The agent runtime (tool allowlist, approvals, audit, scheduler, Sentinel) is ported from the
launcher's REWIRE modules, which are already tested.

## Build order

| Stage | What | Done when |
| --- | --- | --- |
| 1 | Transparency: Sentinel port, treasury page, reports | Live figures match Solscan for the treasury and creator vault |
| 2 | Finder plus Guide agent | Search works without an account; crisis test prompts always show crisis lines first |
| 3 | Providers plus Scout, grants plus Treasurer, Sentinel matching | One real grant proposed, approved, signed by the owner and marked paid automatically |
| 4 | Grant rounds: nominations, voting, Analyst memo | One round run end to end with published memo and results |
| 5 | Applications plus Intake | Encryption, consent and retention checked; agents see only anonymised cases |
| 6 | Impact and Community agents | Every paid grant has an impact report or an open follow-up |
| 7 | Contingency management partners | First clinic partner signed |

## Open questions

- FindTreatment.gov data access: confirm whether there is a public API or a bulk export, and
  its terms, before building stage 2.
- Voting numbers for the first round (minimum holding, cap per wallet).
- Licence for the public repository.

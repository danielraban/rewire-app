import { EXPLAINED, MINT, TREASURY } from "@/lib/config";
import { overview, type Overview } from "@/lib/data";
import { lamportsToSol } from "@/lib/sentinel";

export const dynamic = "force-dynamic";

const sol = (l: bigint) => Number(lamportsToSol(l)).toFixed(4);
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const when = (d: Date | null) =>
  d ? d.toISOString().slice(0, 16).replace("T", " ") + " UTC" : "—";
const solscan = (kind: "tx" | "account", id: string) => `https://solscan.io/${kind}/${id}`;

export default async function Home() {
  let data: Overview | null = null;
  try {
    data = await overview();
  } catch (e) {
    console.error("overview", e);
  }

  return (
    <>
      <main className="wrap">
        <header>
          <h1>Trading fees that fund recovery.</h1>
          <p className="muted">
            REWIRE is a community coin. Every trade pays a creator fee to one public treasury. 90%
            of collected fees is reserved for grants to verified drug and alcohol treatment
            providers; 10% pays for running this. Every movement is indexed, reconciled and
            published below by a read-only agent that cannot move funds.
          </p>
          <p>
            <a href="/find">Looking for treatment? Search free, no account needed.</a>
          </p>

          {data ? (
            <div className="stats">
              {data.addresses.map((a) => (
                <div className="stat" key={a.address}>
                  <b>{a.rec ? sol(a.rec.observedLamports) : "—"}</b>
                  <span className="muted">
                    SOL in {a.role === "treasury" ? "the treasury" : "fees not yet collected"}
                  </span>
                </div>
              ))}
              <div className="stat">
                <b>{sol(data.feesCollected)}</b>
                <span className="muted">SOL creator fees collected</span>
              </div>
              <div className="stat">
                <b>{sol(data.grantPool)}</b>
                <span className="muted">SOL reserved for grants (90%)</span>
              </div>
            </div>
          ) : (
            <p className="muted">Treasury data is not available right now.</p>
          )}
        </header>

        {data && (
          <>
            <h2 id="treasury">Reconciliation</h2>
            <p className="muted">
              The earliest indexed balance plus every indexed change must equal the balance the
              chain reports. Anything else is published as a flag.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Balance</th>
                    <th>Transactions</th>
                    <th>Reconciled</th>
                    <th>Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.addresses.map((a) => (
                    <tr key={a.address}>
                      <td>
                        {a.label}{" "}
                        <a href={solscan("account", a.address)}>{short(a.address)}</a>
                      </td>
                      <td>{a.rec ? sol(a.rec.observedLamports) : "—"}</td>
                      <td>{a.rec?.txCount ?? "—"}</td>
                      <td>
                        {!a.rec ? (
                          "—"
                        ) : a.rec.matched ? (
                          <span className="ok">Yes</span>
                        ) : (
                          <span className="bad">No</span>
                        )}
                      </td>
                      <td>{when(a.rec?.createdAt ?? null)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2>Money in and out</h2>
            <div className="stats">
              <div className="stat">
                <b>{sol(data.feesCollected)}</b>
                <span className="muted">SOL creator fees in</span>
              </div>
              <div className="stat">
                <b>{sol(data.otherIn)}</b>
                <span className="muted">SOL other inflows (donations, owner funding)</span>
              </div>
              <div className="stat">
                <b>{sol(data.out)}</b>
                <span className="muted">SOL out (including network fees)</span>
              </div>
              <div className="stat">
                <b>{sol(data.opsShare)}</b>
                <span className="muted">SOL operations share (10%)</span>
              </div>
            </div>

            <h2>Recent treasury transactions</h2>
            {data.recent.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Change (SOL)</th>
                      <th>Counterparties</th>
                      <th>Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((t) => (
                      <tr key={t.signature}>
                        <td>{when(t.blockTime)}</td>
                        <td>{lamportsToSol(t.postLamports - t.preLamports)}</td>
                        <td>{t.counterparties.map(short).join(", ") || "—"}</td>
                        <td>
                          <a href={solscan("tx", t.signature)}>{short(t.signature)}</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">None indexed yet.</p>
            )}

            <h2>Flagged for review</h2>
            <p className="muted">
              Outflows to addresses the Sentinel does not know, movements of 1 SOL or more, and
              balances that do not reconcile. Published as they are raised.
            </p>
            {data.flagged.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Raised</th>
                      <th>Kind</th>
                      <th>Address</th>
                      <th>Reference</th>
                      <th>Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.flagged.map((f) => (
                      <tr key={f.id}>
                        <td>{when(f.createdAt)}</td>
                        <td>{f.kind.replace("_", " ")}</td>
                        <td>{short(f.address)}</td>
                        <td>
                          {f.kind === "balance_mismatch" ? (
                            f.ref
                          ) : (
                            <a href={solscan("tx", f.ref)}>{short(f.ref)}</a>
                          )}
                        </td>
                        <td style={{ whiteSpace: "normal", minWidth: 240 }}>
                          {EXPLAINED[f.ref] ?? "Not explained yet."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Nothing flagged.</p>
            )}

            <h2 id="reports">Latest report</h2>
            {data.report ? <pre>{data.report.text}</pre> : <p className="muted">No report yet.</p>}
          </>
        )}

        <footer className="muted">
          Official mint <code>{MINT}</code>. Other coins with the same name are not REWIRE.
          Treasury <code>{TREASURY}</code>. REWIRE is a community coin for a cause, not an
          investment, and it can go to zero. The code behind this page is open source (MIT).
        </footer>
      </main>
    </>
  );
}

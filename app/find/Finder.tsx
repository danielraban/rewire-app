"use client";

import { useState } from "react";
import { CARE, MILES, PAY, type Care, type Pay, type Result } from "@/lib/filters";
import { CRISIS } from "@/lib/config";

interface Filters {
  zip: string;
  care: Care;
  pay: Pay;
  miles: number;
}

async function post<T>(url: string, body: unknown): Promise<T & { error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function Finder() {
  const [text, setText] = useState("");
  const [f, setF] = useState<Filters>({ zip: "", care: "any", pay: "any", miles: 25 });
  const [reply, setReply] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch {
      setError("Something went wrong. Try again, or call 1-800-662-4357.");
    } finally {
      setBusy(false);
    }
  }

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const r = await post<{
        crisis?: boolean;
        reply?: string;
        filters?: Omit<Filters, "zip"> & { zip: string | null };
        results?: Result[] | null;
      }>("/api/guide", { text });
      setCrisis(!!r.crisis);
      if (r.crisis) return setResults(null);
      setReply(r.reply ?? null);
      if (r.filters) setF({ ...r.filters, zip: r.filters.zip ?? f.zip });
      if (r.results !== undefined) setResults(r.results);
      setError(r.error ?? null);
    });
  };

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    return run(async () => {
      const r = await post<{ results?: Result[] }>("/api/find", f);
      setResults(r.results ?? null);
      setError(r.error ?? null);
    });
  };

  return (
    <>
      {crisis && (
        <div className="crisis-panel" role="alert">
          <h2>You don&apos;t have to go through this alone.</h2>
          <p>
            If you or someone with you is in danger, call <a href="tel:911">911</a> now. For
            suicidal thoughts or emotional crisis, call or text{" "}
            <a href={`tel:${CRISIS.call}`}>{CRISIS.call}</a>, any time. For treatment referral,
            call <a href={`tel:${CRISIS.samhsa}`}>{CRISIS.samhsa}</a>, free and confidential, 24/7.
          </p>
          <p>Overdose? Call 911, give naloxone (Narcan) if you have it, and stay with them.</p>
        </div>
      )}

      <form onSubmit={ask} className="panel">
        <label htmlFor="guide">
          <b>Tell the Guide what you&apos;re looking for</b>
          <span className="muted">
            {" "}
            e.g. &ldquo;my brother needs help with alcohol, we have Medicaid, ZIP 20878&rdquo;
          </span>
        </label>
        <textarea
          id="guide"
          value={text}
          maxLength={600}
          rows={3}
          onChange={(e) => setText(e.target.value)}
        />
        <button disabled={busy || text.trim().length < 2}>Ask the Guide</button>
        {reply && <p className="reply">{reply}</p>}
      </form>

      <form onSubmit={find} className="panel filters">
        <label>
          ZIP code
          <input
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            required
            value={f.zip}
            onChange={(e) => setF({ ...f, zip: e.target.value.replace(/\D/g, "") })}
          />
        </label>
        <label>
          Type of care
          <select value={f.care} onChange={(e) => setF({ ...f, care: e.target.value as Care })}>
            {Object.entries(CARE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Payment
          <select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value as Pay })}>
            {Object.entries(PAY).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Within
          <select value={f.miles} onChange={(e) => setF({ ...f, miles: Number(e.target.value) })}>
            {MILES.map((m) => (
              <option key={m} value={m}>
                {m} miles
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy}>Search</button>
      </form>

      {error && <p className="bad">{error}</p>}
      {busy && <p className="muted">Searching…</p>}

      {results && (
        <section aria-live="polite">
          <h2>
            {results.length
              ? `${results.length} place${results.length === 1 ? "" : "s"} nearest first`
              : "No matches. Try a wider distance or fewer filters, or call 1-800-662-4357."}
          </h2>
          <ul className="results">
            {results.map((r) => (
              <li key={r.name + r.address} className="stat">
                <b className="name">{r.name}</b>
                <span className="muted">
                  {r.address} · {r.miles} mi
                </span>
                <span>
                  {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>{r.phone}</a>}
                  {r.phone && r.website && " · "}
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noopener noreferrer nofollow">
                      Website
                    </a>
                  )}
                </span>
                {r.settings.length > 0 && (
                  <span className="muted small">Care: {r.settings.join(", ")}</span>
                )}
                {r.payments.length > 0 && (
                  <span className="muted small">Payment: {r.payments.join(", ")}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

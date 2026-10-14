/**
 * Treatment search over SAMHSA's FindTreatment.gov locator API (public, no key; developer guide
 * v1.12, 2026-08-17). Nothing about a search is stored or logged: callers pass a ZIP code, get
 * results back, and that is the end of it. Results are ordered by distance only.
 */
import zips from "../data/zip-centroids.json";
import type { Care, Pay, Result } from "./filters";

export * from "./filters";

export interface Query {
  zip: string;
  care: Care;
  pay: Pay;
  miles: number;
}

interface Service {
  f2: string;
  f3: string | null;
}
export interface Facility {
  name1: string;
  name2: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  intake1: string | null;
  website: string | null;
  miles: number;
  services: Service[];
}

const values = (f: Facility, key: string) =>
  f.services.filter((s) => s.f2 === key).flatMap((s) => (s.f3 ?? "").split("; ").filter(Boolean));

/** Whether a facility offers the care type and accepts the payment, by the values SAMHSA returns. */
export function matches(f: Facility, care: Care, pay: Pay): boolean {
  const set = values(f, "SET");
  const careOk = {
    any: true,
    outpatient: set.includes("Outpatient"),
    intensive: set.includes("Intensive outpatient treatment"),
    residential: set.includes("Residential/24-hour residential"),
    detox: values(f, "TC").includes("Detoxification"),
    hospital: set.includes("Hospital inpatient/24-hour hospital inpatient"),
    medication: values(f, "OM").length > 0,
  }[care];
  const payments = values(f, "PAY");
  const payOk = {
    any: true,
    medicaid: payments.includes("Medicaid"),
    medicare: payments.includes("Medicare"),
    private: payments.includes("Private health insurance"),
    self: payments.includes("Cash or self-payment"),
    assistance: values(f, "PYAS").length > 0,
    military: payments.includes("Federal military insurance (e.g., TRICARE)"),
  }[pay];
  return careOk && payOk;
}

export function toResult(f: Facility): Result {
  const website = f.website?.trim() || null;
  return {
    name: [f.name1, f.name2].filter(Boolean).join(", "),
    address: [f.street1, f.street2, f.city, [f.state, f.zip].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", "),
    phone: f.intake1 || f.phone,
    website: website && (/^https?:\/\//i.test(website) ? website : `https://${website}`),
    miles: f.miles,
    settings: values(f, "SET").filter((v) => v !== "Outpatient"),
    payments: values(f, "PAY"),
  };
}

export const centroid = (zip: string) =>
  (zips as unknown as Record<string, [number, number]>)[zip] ?? null;

/** Facilities within `miles` of the ZIP's centre, nearest first. Null when the ZIP is unknown. */
export async function search(q: Query, limit = 30): Promise<Result[] | null> {
  const at = centroid(q.zip);
  if (!at) return null;
  const meters = Math.round(q.miles * 1609.34);
  const url =
    "https://findtreatment.gov/locator/exportsAsJson/v2" +
    `?sAddr=${encodeURIComponent(`"${at[0]},${at[1]}"`)}` +
    `&limitType=2&limitValue=${meters}&sType=sa&pageSize=500&page=1&sort=0`;
  // Facility data changes slowly; cache each area for a day so repeat searches stay off SAMHSA.
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`FindTreatment.gov ${res.status}`);
  const body = (await res.json()) as { rows?: Facility[] };
  return (body.rows ?? [])
    .filter((f) => matches(f, q.care, q.pay))
    .slice(0, limit)
    .map(toResult);
}

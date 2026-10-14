import { describe, expect, it } from "vitest";
import { isCrisis } from "./crisis";
import { centroid, matches, toResult, type Facility } from "./finder";

const facility = (services: [string, string][], extra: Partial<Facility> = {}): Facility => ({
  name1: "Hope Center",
  name2: null,
  street1: "1 Main St",
  street2: null,
  city: "Town",
  state: "MD",
  zip: "20878",
  phone: "301-555-0100",
  intake1: null,
  website: "www.example.org",
  miles: 1.2,
  services: services.map(([f2, f3]) => ({ f2, f3 })),
  ...extra,
});

describe("crisis check", () => {
  it.each([
    "I want to kill myself",
    "thinking about suicide",
    "my friend overdosed and is not breathing",
    "I don't want to wake up anymore",
    "he OD'd last night",
    "I want to end my life",
  ])("catches %s", (t) => expect(isCrisis(t)).toBe(true));

  it.each([
    "need detox for alcohol near 20878",
    "my brother drinks too much, we have medicaid",
    "looking for outpatient for opioids",
  ])("leaves %s alone", (t) => expect(isCrisis(t)).toBe(false));
});

describe("finder filters", () => {
  const f = facility([
    ["SET", "Outpatient; Intensive outpatient treatment; Residential/24-hour residential"],
    ["TC", "Substance use treatment; Detoxification"],
    ["PAY", "Medicaid; Cash or self-payment"],
  ]);

  it("matches care and payment by SAMHSA's values", () => {
    expect(matches(f, "residential", "medicaid")).toBe(true);
    expect(matches(f, "detox", "self")).toBe(true);
    expect(matches(f, "hospital", "any")).toBe(false);
    expect(matches(f, "any", "private")).toBe(false);
    expect(matches(f, "medication", "any")).toBe(false);
    expect(matches(f, "any", "assistance")).toBe(false);
  });

  it("builds a result with an https website and drops the bare Outpatient label", () => {
    const r = toResult(f);
    expect(r.website).toBe("https://www.example.org");
    expect(r.settings).toEqual(["Intensive outpatient treatment", "Residential/24-hour residential"]);
    expect(r.address).toBe("1 Main St, Town, MD 20878");
  });

  it("knows ZIP centroids", () => {
    expect(centroid("20878")).toEqual([39.1126, -77.2504]);
    expect(centroid("00000")).toBeNull();
  });
});

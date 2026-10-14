// Finder filter values, shared by the server and the browser (no ZIP data here).
export const CARE = {
  any: "Any",
  outpatient: "Outpatient",
  intensive: "Intensive outpatient",
  residential: "Residential",
  detox: "Detox",
  hospital: "Hospital inpatient",
  medication: "Medication for opioid use disorder",
} as const;
export const PAY = {
  any: "Any",
  medicaid: "Medicaid",
  medicare: "Medicare",
  private: "Private insurance",
  self: "Cash or self-pay",
  assistance: "Sliding scale or payment assistance",
  military: "Military insurance (TRICARE)",
} as const;
export type Care = keyof typeof CARE;
export type Pay = keyof typeof PAY;
export const MILES = [10, 25, 50, 100] as const;

export interface Result {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  miles: number;
  settings: string[];
  payments: string[];
}

import type { Metadata } from "next";
import { CRISIS } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: "REWIRE",
  description:
    "A community coin whose creator fees fund drug and alcohol treatment. Every lamport in and out, in public.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="crisis" role="region" aria-label="Crisis help">
          <div className="wrap">
            In crisis? Call or text <a href={`tel:${CRISIS.call}`}>{CRISIS.call}</a>. Free,
            confidential treatment referral, 24/7:{" "}
            <a href={`tel:${CRISIS.samhsa}`}>{CRISIS.samhsa}</a> (SAMHSA).
          </div>
        </div>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Finder } from "./Finder";

export const metadata: Metadata = {
  title: "Find treatment · REWIRE",
  description: "Free search for drug and alcohol treatment near you. No account, nothing stored.",
};

export default function FindPage() {
  return (
    <main className="wrap">
      <header>
        <p>
          <a href="/">REWIRE</a>
        </p>
        <h1>Find treatment near you.</h1>
        <p className="muted">
          Free. No account. Nothing you type is stored. Listings come from SAMHSA&apos;s
          FindTreatment.gov, the U.S. government&apos;s treatment locator.
        </p>
      </header>
      <Finder />
      <section className="note muted">
        <h2>Before you go</h2>
        <ul>
          <li>Call ahead: services, openings and insurance change.</li>
          <li>
            Be careful with anyone who offers free travel, cash or housing to get you into a
            specific program, or a helpline that won&apos;t say which facility it works for. Paying
            for referrals is illegal and common in this industry.
          </li>
          <li>
            REWIRE has no ties to any listed facility. Providers that receive REWIRE grants are not
            ranked higher or marked.
          </li>
          <li>The Guide is an AI. It can be wrong, and it does not give medical advice.</li>
        </ul>
      </section>
    </main>
  );
}

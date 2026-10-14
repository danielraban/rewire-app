import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "REWIRE",
  description:
    "A community coin whose creator fees fund drug and alcohol treatment. Every lamport in and out, in public.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "../globals.css";
export const metadata: Metadata = {
  title: "JURI Protocol — Pitch Deck",
  description: "DeFi Exploit Forensics & Cross-Chain Knowledge Base",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

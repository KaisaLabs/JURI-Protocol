import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "JURI Protocol — DeFi Exploit Forensics",
  description: "AI agents investigate DeFi exploits. Immutable post-mortems. Built on 0G, AXL, KeeperHub.",
  openGraph: { title: "JURI Protocol", description: "Exploit Once. Learn Forever." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07080d] text-gray-200 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

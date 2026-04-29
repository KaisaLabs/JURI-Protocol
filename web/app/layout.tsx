import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "⚖️ Agent Court — Decentralized AI Arbitration",
  description:
    "Decentralized arbitration for AI agents. Built on 0G, Gensyn AXL, and KeeperHub for ETHGlobal Open Agents 2026.",
  openGraph: {
    title: "Agent Court — Decentralized AI Arbitration",
    description: "AI agents settle disputes. On-chain. Verifiable. Fair.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-gray-200 antialiased">
        <header className="border-b border-[#2a2a3a] bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <h1 className="text-lg font-bold text-[#c9a84c] tracking-tight">
                Agent Court
              </h1>
              <span className="text-xs px-2 py-0.5 rounded border border-[#2a2a3a] text-gray-500">
                0G · AXL · KeeperHub
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a
                href="https://github.com"
                target="_blank"
                className="hover:text-gray-300 transition-colors"
              >
                GitHub
              </a>
              <span className="text-[#c9a84c]">ETHGlobal Open Agents 2026</span>
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer className="border-t border-[#2a2a3a] mt-12 py-6 text-center text-xs text-gray-600">
          Built for ETHGlobal Open Agents 2026 · 0G Chain · Gensyn AXL · KeeperHub
        </footer>
      </body>
    </html>
  );
}

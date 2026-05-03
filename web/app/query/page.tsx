"use client";

import { useState } from "react";
import Link from "next/link";

interface HackEntry {
  name: string;
  date: string;
  amount: number;
  category: string;
  target: string;
  chain: string;
  technique?: string;
}

interface MatchResult {
  hack: HackEntry;
  score: number;
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function getMatchLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Very High", color: "text-red-400" };
  if (score >= 60) return { label: "High", color: "text-orange-400" };
  if (score >= 40) return { label: "Medium", color: "text-amber-400" };
  if (score >= 20) return { label: "Low", color: "text-yellow-400" };
  return { label: "Minimal", color: "text-gray-400" };
}

function getMatchBg(score: number): string {
  if (score >= 80) return "bg-red-500/10 border-red-500/20";
  if (score >= 60) return "bg-orange-500/10 border-orange-500/20";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/20";
  if (score >= 20) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-gray-500/5 border-gray-500/10";
}

function getRiskLevel(results: MatchResult[]): {
  level: string;
  color: string;
  bg: string;
  icon: string;
  borderColor: string;
} {
  if (results.length === 0)
    return {
      level: "NO DATA",
      color: "text-gray-400",
      bg: "bg-gray-500/5",
      icon: "⚪",
      borderColor: "border-gray-500/20",
    };

  const topScore = results[0]?.score || 0;
  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.score, 0) / results.length
    : 0;

  if (topScore >= 80 || avgScore >= 60) {
    return {
      level: "HIGH RISK",
      color: "text-red-400",
      bg: "bg-red-500/10",
      icon: "🔴",
      borderColor: "border-red-500/30",
    };
  }

  if (topScore >= 50 || avgScore >= 30) {
    return {
      level: "MEDIUM RISK",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      icon: "🟡",
      borderColor: "border-amber-500/30",
    };
  }

  return {
    level: "LOW RISK",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: "🟢",
    borderColor: "border-emerald-500/30",
  };
}

function getMostCommonVector(results: MatchResult[]): string {
  const vectors = results
    .map((r) => r.hack.category || r.hack.technique || "Unknown")
    .filter(Boolean);
  if (vectors.length === 0) return "N/A";

  const freq: Record<string, number> = {};
  vectors.forEach((v) => {
    freq[v] = (freq[v] || 0) + 1;
  });

  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

function computeSimilarity(query: string, hack: HackEntry): number {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const targetFields = [
    hack.name.toLowerCase(),
    hack.category?.toLowerCase() || "",
    hack.target?.toLowerCase() || "",
    hack.chain?.toLowerCase() || "",
    hack.technique?.toLowerCase() || "",
  ];

  let matchCount = 0;

  for (const field of targetFields) {
    for (const kw of keywords) {
      if (field.includes(kw)) {
        matchCount += 1;
      }
    }
    if (queryLower.includes(field) && field.length > 3) {
      matchCount += 2;
    }
  }

  const maxPossibleScore = keywords.length * targetFields.length + targetFields.length * 2;
  const normalized = maxPossibleScore > 0 ? (matchCount / maxPossibleScore) * 100 : 0;
  return Math.min(100, Math.round(normalized));
}

export default function QueryPage() {
  const [description, setDescription] = useState("");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleAnalyze = async () => {
    if (!description.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch("https://api.llama.fi/hacks");
      if (!res.ok) throw new Error("Failed to fetch historical hack data");

      const hacksData = await res.json();
      const hacks: HackEntry[] = Array.isArray(hacksData.hacks)
        ? hacksData.hacks
        : Array.isArray(hacksData)
          ? hacksData
          : [];

      const scored = hacks
        .map((hack: HackEntry) => ({
          hack,
          score: computeSimilarity(description, hack),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setResults(scored);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const risk = getRiskLevel(results);
  const totalLost = results.reduce((sum, r) => sum + (r.hack.amount || 0), 0);
  const mostCommonVector = getMostCommonVector(results);

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-border/50 bg-surface-alt/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <span className="text-xl">⚖️</span>
            <span className="font-bold text-primary text-lg tracking-tight">JURI</span>
            <span className="text-gray-500 text-sm hidden sm:inline">Protocol</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Investigations
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <section className="text-center space-y-3 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Pattern Intelligence — Layer 2
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Protocol Risk Assessment
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto text-sm">
            Describe your protocol or smart contract. JURI cross-references all historical exploits to identify similar attack patterns.
          </p>
        </section>

        {/* Input */}
        <div className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <label htmlFor="protocol-desc" className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
            Protocol Description
          </label>
          <textarea
            id="protocol-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your protocol architecture — e.g. 'A lending protocol on Ethereum using Chainlink price oracles with flash loan protection, 30-minute TWAP, and a 15% deviation circuit breaker...'"
            rows={5}
            className="w-full bg-surface-alt border border-border rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary transition-colors resize-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !description.trim()}
            className="w-full px-6 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-all text-sm"
          >
            {loading ? "Analyzing..." : "Analyze Risk"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="border border-red-500/20 rounded-xl bg-red-500/5 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && !loading && (
          <div className="space-y-6 animate-fadeIn">
            {/* Risk Level */}
            <div className={`border ${risk.borderColor} rounded-xl ${risk.bg} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Risk Assessment</p>
                  <p className={`text-2xl font-black mt-1 ${risk.color}`}>
                    {risk.icon} {risk.level}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs text-gray-500">{results.length} pattern{results.length !== 1 ? "s" : ""} matched</p>
                  {totalLost > 0 && (
                    <p className="text-xs text-red-400 font-semibold">Total lost: {formatAmount(totalLost)}</p>
                  )}
                </div>
              </div>
              {mostCommonVector !== "N/A" && results.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500">
                    Most common attack vector:{" "}
                    <span className="text-gray-300 font-semibold">{mostCommonVector}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Matched Exploits */}
            {results.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                  Top Matching Historical Exploits
                </h3>
                {results.map(({ hack, score }, i) => {
                  const match = getMatchLabel(score);
                  const bg = getMatchBg(score);
                  return (
                    <div
                      key={i}
                      className={`border rounded-xl ${bg} p-4 space-y-3 animate-fadeIn`}
                      style={{ animationDelay: `${i * 0.08}s` }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">{hack.name}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {hack.date && `${hack.date} · `}
                            {hack.chain && `${hack.chain} · `}
                            {hack.category && `${hack.category}`}
                          </p>
                          {hack.target && (
                            <p className="text-[10px] text-gray-600 mt-0.5">Target: {hack.target}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-bold ${match.color} block`}>{match.label}</span>
                          <span className="text-[10px] text-gray-600 block">{score}% match</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-full max-w-[120px] bg-surface-alt rounded-full h-1.5 border border-border overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                score >= 80
                                  ? "bg-red-500"
                                  : score >= 60
                                  ? "bg-orange-500"
                                  : score >= 40
                                  ? "bg-amber-500"
                                  : score >= 20
                                  ? "bg-yellow-500"
                                  : "bg-gray-500"
                              }`}
                              style={{ width: `${Math.min(100, score)}%` }}
                            />
                          </div>
                        </div>
                        {hack.amount > 0 && (
                          <span className="text-[10px] text-red-400 font-mono">
                            {formatAmount(hack.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* No matches */}
            {results.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <span className="text-3xl">🟢</span>
                <p className="text-sm text-gray-400">No similar exploit patterns found.</p>
                <p className="text-xs text-gray-600">
                  Your protocol description did not match any known attack patterns in the historical database.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stats / Facts */}
        <footer className="text-center py-6 space-y-1 border-t border-border mt-8">
          <p className="text-[10px] text-gray-600">
            Data sourced from DefiLlama Hacks API · Cross-referenced against 513+ documented exploits
          </p>
          <p className="text-[10px] text-gray-700">
            Powered by JURI Protocol — The Immune System of DeFi
          </p>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out both; }
      `}</style>
    </div>
  );
}

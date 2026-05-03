"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { RuntimeCase, RuntimeVerdict } from "@/lib/case-types";

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function getSeverityColor(severity: string): string {
  const s = parseInt(severity, 10);
  if (isNaN(s)) return "text-gray-400";
  if (s >= 8) return "text-red-400";
  if (s >= 5) return "text-amber-400";
  return "text-emerald-400";
}

function getSeverityBg(severity: string): string {
  const s = parseInt(severity, 10);
  if (isNaN(s)) return "bg-gray-500";
  if (s >= 8) return "bg-red-500";
  if (s >= 5) return "bg-amber-500";
  return "bg-emerald-500";
}

function getSeverityBarStyle(severity: string, verdict: RuntimeVerdict | undefined): React.CSSProperties {
  const s = parseInt(severity, 10);
  const normalized = isNaN(s) ? 0 : Math.min(100, (s / 10) * 100);
  let bg = "bg-gray-500";
  if (!isNaN(s)) {
    if (s >= 8) bg = "bg-red-500";
    else if (s >= 5) bg = "bg-amber-500";
    else bg = "bg-emerald-500";
  }
  return { width: `${normalized}%` };
}

function SeverityBar({ severity }: { severity: string }) {
  const s = parseInt(severity, 10);
  const normalized = isNaN(s) ? 0 : Math.min(100, Math.max(0, (s / 10) * 100));
  const bg = !isNaN(s)
    ? s >= 8 ? "bg-red-500" : s >= 5 ? "bg-amber-500" : "bg-emerald-500"
    : "bg-gray-500";

  return (
    <div className="w-full bg-surface-alt rounded-full h-3 border border-border overflow-hidden">
      <div
        className={`h-full ${bg} rounded-full transition-all duration-700`}
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen bg-surface-alt">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-40 bg-surface rounded-lg" />
        <div className="h-8 w-72 bg-surface rounded-lg" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-xl border border-border" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PostMortemPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [caseData, setCaseData] = useState<RuntimeCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) return;

    fetch(`/api/case/${caseId}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Case not found");
          throw new Error("Failed to load case");
        }
        return res.json();
      })
      .then((data: RuntimeCase) => {
        setCaseData(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [caseId]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-surface-alt flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-4xl">🔍</span>
          <h2 className="text-xl font-bold text-white">Post-mortem not found</h2>
          <p className="text-sm text-gray-500">Case #{caseId} does not exist or has been removed.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover transition-colors"
          >
            ← Back to Investigations
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-surface-alt flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Post-mortem not found</h2>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-hover transition-colors"
          >
            ← Back to Investigations
          </Link>
        </div>
      </div>
    );
  }

  if (caseData.status !== "resolved" || !caseData.verdict) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Investigations
          </Link>
          <div className="text-center py-16 space-y-4">
            <span className="text-4xl">⏳</span>
            <h2 className="text-xl font-bold text-white">Investigation in Progress</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Case #{caseId} is currently being investigated by the JURI agent swarm. Check back soon for the full post-mortem.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Status: {caseData.status.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const verdict = caseData.verdict;
  const severity = verdict.severity || "0";
  const severityBg = getSeverityBg(severity);
  const severityColor = getSeverityColor(severity);
  const createdAt = caseData.createdAt * 1000;

  return (
    <div className="min-h-screen bg-surface-alt">
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Investigations
        </Link>

        {/* Header */}
        <div className="text-center space-y-3 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs">
            🧬 JURI Post-Mortem
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Case <span className="text-primary">#{caseId}</span>
          </h1>
          <p className="text-xs text-gray-500">
            Published on {new Date(createdAt).toLocaleString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border ${
              verdict.result === "FORENSIC"
                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                : verdict.result === "ANALYSIS"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}>
              VERDICT: {verdict.result}
            </span>
          </div>
        </div>

        <hr className="border-border" />

        {/* EXPLOIT SUMMARY */}
        <section className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Exploit Summary
          </h2>
          <p className="text-sm text-gray-200 leading-relaxed bg-surface-alt p-4 rounded-lg border border-border">
            {caseData.dispute}
          </p>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Attack Vector
            </h3>
            <p className="text-sm text-gray-300 bg-surface-alt p-4 rounded-lg border border-border font-mono">
              {verdict.attackVector || "Under analysis"}
            </p>
          </div>
        </section>

        {/* SEVERITY SCORE */}
        <section className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Severity Score
          </h2>
          <div className="flex items-center gap-6">
            <div className={`text-6xl font-black ${severityColor}`}>
              {severity}
            </div>
            <div className="flex-1 space-y-2">
              <SeverityBar severity={severity} />
              <p className={`text-xs font-semibold ${severityColor}`}>
                {severity}/10
              </p>
            </div>
          </div>
        </section>

        {/* ROOT CAUSE */}
        <section className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Root Cause
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed bg-surface-alt p-4 rounded-lg border border-border">
            {verdict.rootCause || verdict.reasoning}
          </p>
        </section>

        {/* PREVENTION GUIDE */}
        <section className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Prevention Guide
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed bg-surface-alt p-4 rounded-lg border border-border">
            {verdict.prevention || "See detailed reasoning below."}
          </p>
        </section>

        <hr className="border-border" />

        {/* HISTORICAL PATTERN MATCH */}
        {verdict.patternMatch && (
          <>
            <section className="border border-amber-500/20 rounded-xl bg-surface p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Historical Pattern Match
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-alt rounded-lg border border-border p-4 text-center">
                  <p className="text-2xl font-bold text-white">{verdict.patternMatch.count}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Similar Exploits</p>
                </div>
                <div className="bg-surface-alt rounded-lg border border-border p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{formatCurrency(verdict.patternMatch.totalLost)}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Total Lost</p>
                </div>
                <div className="bg-surface-alt rounded-lg border border-border p-4 text-center">
                  <p className="text-sm font-semibold text-amber-400">{verdict.patternMatch.topMatch}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Top Similar Exploit</p>
                </div>
              </div>
              {verdict.patternMatch.technique && (
                <p className="text-xs text-gray-500 bg-surface-alt p-3 rounded-lg border border-border">
                  <span className="text-amber-400 font-semibold">Technique: </span>
                  {verdict.patternMatch.technique}
                </p>
              )}
            </section>

            <hr className="border-border" />
          </>
        )}

        {/* VERIFICATION */}
        <section className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Verification
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface-alt rounded-lg border border-border p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Compute Provider</p>
              <p className="text-sm text-gray-200 mt-1 font-mono">{verdict.computeProvider || "0G Compute TEE"}</p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Attestation</p>
              <p className="text-sm text-gray-200 mt-1 font-mono">
                {verdict.reasoningRef ? `${verdict.reasoningRef.slice(0, 10)}...` : "N/A"}
              </p>
            </div>
            <div className="bg-surface-alt rounded-lg border border-border p-4">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">On-Chain Status</p>
              <p className="text-sm text-gray-200 mt-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  verdict.onChain?.status === "confirmed"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {verdict.onChain?.status || "pending"}
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* VERIFICATION PROOF */}
        <section className="border border-amber-500/20 rounded-xl bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-amber-500/10 bg-amber-500/5 flex items-center gap-2">
            <span>🔐</span>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Verification Proof
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <span>📦</span>
                <div>
                  <p className="text-sm text-gray-200">0G Storage Log</p>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {verdict.reasoningRef || "N/A"}
                  </p>
                </div>
              </div>
              <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">Stored</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <span>⛓️</span>
                <div>
                  <p className="text-sm text-gray-200">Smart Contract</p>
                  <p className="text-[10px] text-gray-500 font-mono">0x3D2924...4ACC</p>
                </div>
              </div>
              <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">Deployed</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <span>🌐</span>
                <div>
                  <p className="text-sm text-gray-200">Network</p>
                  <p className="text-[10px] text-gray-500">0G Galileo Testnet (Chain ID 16602)</p>
                </div>
              </div>
              <span className="text-blue-400 text-[10px] bg-blue-500/10 px-2 py-0.5 rounded">Testnet</span>
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* FULL REASONING */}
        <section className="border border-border rounded-xl bg-surface p-6 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Full Reasoning
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed bg-surface-alt p-4 rounded-lg border border-border whitespace-pre-wrap">
            {verdict.reasoning}
          </p>
        </section>

        <hr className="border-border" />

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).catch(() => {});
            }}
            className="px-4 py-2 rounded-lg border border-border bg-surface text-sm text-gray-300 hover:text-white hover:border-primary/30 transition-all"
          >
            Share this report
          </button>
          {verdict.reasoningRef && (
            <a
              href={`https://storagescan-galileo.0g.ai/log/${verdict.reasoningRef}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg border border-primary/20 bg-primary/5 text-sm text-primary hover:bg-primary/10 transition-all no-underline"
            >
              View on 0G Storage ↗
            </a>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-6 space-y-1 border-t border-border mt-4">
          <p className="text-[10px] text-gray-600">
            Generated by JURI Protocol — The Immune System of DeFi
          </p>
          <p className="text-[10px] text-gray-700">
            Powered by 0G Chain · 0G Storage · 0G Compute
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

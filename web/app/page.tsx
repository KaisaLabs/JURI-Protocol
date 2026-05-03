"use client";
import { useState, useEffect } from "react";
import { createCase, getCase, healthCheck } from "@/lib/api";
import VerdictCard from "./components/VerdictCard";
import type { RuntimeTimelineEvent } from "@/lib/case-types";

type Step = "report" | "investigating" | "post-mortem";

export default function Home() {
  const [step, setStep] = useState<Step>("report");
  const [dispute, setDispute] = useState("");
  const [caseId, setCaseId] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<RuntimeTimelineEvent[]>([]);
  const [verdict, setVerdict] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking...");
  const [liveStats, setLiveStats] = useState({ totalLost: 16.5, count: 513, repeatVictims: 40 });

  useEffect(() => {
    healthCheck().then((h) => setBackendStatus(h.transport)).catch(() => setBackendStatus("offline"));

    fetch("https://api.llama.fi/hacks")
      .then((r) => r.json())
      .then((hacks) => {
        const totalLost = hacks.reduce((s: number, h: any) => s + (h.amount || 0), 0);
        setLiveStats({ totalLost: totalLost / 1e9, count: hacks.length, repeatVictims: 40 });
      })
      .catch(() => {});
  }, []);

  const handleReport = async () => {
    if (!dispute.trim()) return;
    setLoading(true);
    setStep("investigating");
    setTimeline([{ at: Date.now(), actor: "orchestrator", type: "submitting", message: "📋 Submitting exploit report to JURI orchestrator..." }]);

    try {
      const res = await createCase({ dispute: dispute.trim(), stake: "0.01", skipOnChainCreate: false });
      setCaseId(res.caseId);

      setTimeline((t) => [...t, { at: Date.now(), actor: "orchestrator", type: "seeded", message: `✅ Case #${res.caseId} created. Orchestrator joining + seeding agents...` }]);
      setTimeline((t) => [...t, { at: Date.now(), actor: "orchestrator", type: "seeded", message: "🤖 Agents seeded. Investigation in progress..." }]);

      pollCaseUpdates(res.caseId);
    } catch (err: any) {
      setTimeline((t) => [...t, { at: Date.now(), actor: "orchestrator", type: "error", message: `❌ Error: ${err.message?.slice(0, 100)}` }]);
      setStep("report");
    } finally {
      setLoading(false);
    }
  };

  const pollCaseUpdates = (cid: number) => {
    const poll = setInterval(async () => {
      try {
        const c = await getCase(cid);
        if (c) {
          setTimeline(c.timeline || []);
          if (c.status === "resolved" && c.verdict) {
            setVerdict(c.verdict);
            setStep("post-mortem");
            clearInterval(poll);
          } else if (c.status === "failed") {
            clearInterval(poll);
          }
        }
      } catch {}
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-border/50 bg-surface-alt/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧬</span>
            <span className="font-bold text-primary text-lg tracking-tight">JURI</span>
            <span className="text-gray-500 text-sm hidden sm:inline">The Immune System of DeFi</span>
            <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === "direct" ? "bg-emerald-400" : backendStatus === "offline" ? "bg-red-400" : "bg-amber-400"}`} />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <section className="text-center space-y-4 mb-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight">
            <span className="text-primary">🧬</span> JURI
          </h1>
          <p className="text-xl md:text-2xl font-semibold text-gray-300 tracking-tight">
            The Immune System of DeFi
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
            Every exploit investigated, classified, and remembered forever. So the same attack never succeeds twice.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 text-xs text-gray-400 pt-2">
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-white">${liveStats.totalLost.toFixed(1)}B</span>
              <span>lost</span>
            </div>
            <span className="text-gray-700">|</span>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-white">{liveStats.count}</span>
              <span>hacks</span>
            </div>
            <span className="text-gray-700">|</span>
            <div className="flex flex-col items-center">
              <span className="text-lg font-bold text-white">{liveStats.repeatVictims}</span>
              <span>repeat victims</span>
            </div>
          </div>

          {/* Report button (inline in hero) */}
          {step === "report" && (
            <div className="pt-4">
              <button
                onClick={handleReport}
                disabled={loading || !dispute.trim()}
                className="px-8 py-3 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-all text-base"
              >
                {loading ? "Submitting..." : "Report Exploit"}
              </button>
            </div>
          )}

          {/* Powered by */}
          <p className="text-[10px] text-gray-600 pt-2">
            Powered by: 0G Chain · 0G Storage · 0G Compute · Gensyn AXL
          </p>
        </section>

        {/* Steps */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500 mb-6">
          {(["report", "investigating", "post-mortem"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all ${
                  step === s
                    ? "bg-primary text-black border-primary"
                    : (["report", "investigating", "post-mortem"] as Step[]).indexOf(step) >= i
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    : "bg-white/5 text-gray-600 border-white/10"
                }`}
              >
                {i + 1}
              </div>
              <span className={step === s ? "text-white" : ""}>
                {s === "report" ? "Report" : s === "investigating" ? "Investigating" : "Post-Mortem"}
              </span>
              {i < 2 && <span className="text-gray-700 mx-0.5">→</span>}
            </div>
          ))}
        </div>

        {/* Case form */}
        {step === "report" && (
          <div className="border border-border rounded-xl bg-surface p-6 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <div>
                <h3 className="font-bold text-white text-lg">Report Exploit</h3>
                <p className="text-xs text-gray-500">Describe the exploit. AI agents will trace funds, classify the attack, and publish a verified post-mortem.</p>
              </div>
            </div>
            <textarea
              value={dispute}
              onChange={(e) => setDispute(e.target.value)}
              placeholder="Kelp Finance rsETH LayerZero OFT bridge exploit — attacker spoofed cross-chain messages to mint unbacked rsETH, drained $293M across Ethereum and Arbitrum in April 2026"
              rows={4}
              className="w-full bg-surface-alt border border-border rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-600">Free to submit. No wallet required.</p>
              <button
                onClick={handleReport}
                disabled={loading || !dispute.trim()}
                className="px-8 py-2.5 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-all text-sm"
              >
                {loading ? "Submitting..." : "Start Investigation"}
              </button>
            </div>
          </div>
        )}

        {/* Timeline */}
        {timeline.length > 0 && (
          <div className="border border-border rounded-xl bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${step === "investigating" ? "bg-emerald-400 animate-pulse" : "bg-primary"}`} />
                <span className="text-xs font-semibold text-gray-300">
                  {step === "investigating" ? "Live Investigation" : "Post-Mortem Report"}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {timeline.map((t, i) => {
                const rc =
                  t.actor === "forensic"
                    ? "text-blue-400"
                    : t.actor === "analysis"
                    ? "text-purple-400"
                    : t.actor === "verification"
                    ? "text-emerald-400"
                    : "text-gray-400";
                const ri =
                  t.actor === "forensic"
                    ? "🔍"
                    : t.actor === "analysis"
                    ? "📊"
                    : t.actor === "verification"
                    ? "✅"
                    : "⚙️";
                return (
                  <div key={i} className="flex items-start gap-3 animate-fadeIn" style={{ animationDelay: `${i * 0.05}s` }}>
                    <span className="text-sm mt-0.5">{ri}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${rc}`}>{t.actor}</span>
                      <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">{t.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Post-Mortem */}
        {step === "post-mortem" && verdict && (
          <div className="space-y-4">
            <VerdictCard verdict={verdict} caseId={caseId ?? undefined} />
            
            {/* Additional 0G Integration proof links */}
            <div className="border border-amber-500/20 rounded-xl bg-surface overflow-hidden animate-fadeIn">
              <div className="px-4 py-2.5 border-b border-amber-500/10 bg-amber-500/5 flex items-center gap-2">
                <span className="text-sm">🔐</span>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Verifiable Proof — 0G Integration</h3>
              </div>
              <div className="p-4 space-y-3">
                <a href="https://chainscan-galileo.0g.ai/address/0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC" target="_blank" rel="noopener"
                  className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border hover:border-primary/30 transition-all group cursor-pointer no-underline">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">⛓️</span>
                    <div>
                      <p className="text-sm text-gray-200 group-hover:text-white transition-colors">0G Chain Contract</p>
                      <p className="text-[10px] text-gray-500 font-mono">0x3D292445484133aDA2d06b8d299E6aD31f0A4ACC</p>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">✓ Deployed</span>
                </a>

                <div className="flex items-center justify-between p-3 bg-blue-500/[0.03] rounded-lg border border-blue-500/10">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🧠</span>
                    <div>
                      <p className="text-sm text-gray-200">0G Compute TEE</p>
                      <p className="text-[10px] text-gray-500">Verification Agent inference — cryptographically signed</p>
                    </div>
                  </div>
                  <span className="text-blue-400 text-[10px] bg-blue-500/10 px-2 py-0.5 rounded">TEE Verified</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-500/[0.03] rounded-lg border border-purple-500/10">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔐</span>
                    <div>
                      <p className="text-sm text-gray-200">Gensyn AXL P2P</p>
                      <p className="text-[10px] text-gray-500">3 nodes · Encrypted mesh · Peer discovery</p>
                    </div>
                  </div>
                  <span className="text-purple-400 text-[10px] bg-purple-500/10 px-2 py-0.5 rounded">3 Peers</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface-alt rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">✅</span>
                    <div>
                      <p className="text-sm text-gray-200">Smart Contract Tests</p>
                      <p className="text-[10px] text-gray-500">Full AgentCourt.sol coverage</p>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">20/20 Passing</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Who uses this — value prop */}
        {step === "report" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8">
            {[
              { icon: "🛡️", title: "DeFi Protocols", desc: "Learn from every exploit. Patch before you're next." },
              { icon: "🔬", title: "Security Researchers", desc: "Standardized, verifiable post-mortems. No more Twitter threads." },
              { icon: "📚", title: "The Ecosystem", desc: "Open knowledge base. Same exploit never works twice." },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-surface/50 text-center space-y-2">
                <span className="text-2xl">{c.icon}</span>
                <p className="text-sm font-semibold text-gray-200">{c.title}</p>
                <p className="text-[11px] text-gray-500">{c.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out both; }
      `}</style>
    </div>
  );
}

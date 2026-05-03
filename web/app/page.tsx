"use client";
import { useState, useEffect, useCallback } from "react";
import { createCase, getCase, healthCheck } from "@/lib/api";
import type { RuntimeTimelineEvent, RuntimeCaseStatus } from "@/lib/case-types";
import ConnectWallet from "./components/ConnectWallet";

declare global { interface Window { ethereum?: any } }

type Step = "connect" | "investigate" | "live" | "resolved";

export default function Home() {
  const [account, setAccount] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("connect");
  const [dispute, setDispute] = useState("");
  const [stake, setStake] = useState("0.01");
  const [caseId, setCaseId] = useState<number | null>(null);
  const [timeline, setTimeline] = useState<RuntimeTimelineEvent[]>([]);
  const [verdict, setVerdict] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking...");

  useEffect(() => {
    healthCheck().then(h => setBackendStatus(h.transport)).catch(() => setBackendStatus("offline"));
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((a: string[]) => {
        if (a.length > 0) { setAccount(a[0]); setStep("investigate"); }
      });
      window.ethereum.on("accountsChanged", (a: string[]) => { setAccount(a[0] || null); if (!a[0]) setStep("connect"); });
    }
  }, []);

  useEffect(() => {
    if (!caseId || step !== "live") return;
    const poll = setInterval(async () => {
      try {
        const c = await getCase(caseId);
        if (c) {
          setTimeline(c.timeline || []);
          if (c.status === "resolved" && c.verdict) { setVerdict(c.verdict); setStep("resolved"); clearInterval(poll); }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [caseId, step]);

  const handleInvestigate = async () => {
    if (!dispute.trim()) return;
    setLoading(true);
    try {
      const result = await createCase({ dispute: dispute.trim(), stake });
      setCaseId(result.caseId);
      setTimeline([{ at: Date.now(), actor: "orchestrator", type: "case_created", message: `Case #${result.caseId} opened. Agents deploying...` }]);
      setStep("live");
    } catch (err: any) {
      setTimeline([{ at: Date.now(), actor: "orchestrator", type: "error", message: `Failed: ${err.message || "Orchestrator unreachable"}` }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      <header className="border-b border-white/5 bg-surface-alt/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚖️</span>
            <span className="font-bold text-primary text-lg tracking-tight">JURI</span>
            <span className="text-gray-500 text-sm hidden sm:inline">Protocol</span>
            <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === "direct" ? "bg-green-400" : "bg-yellow-400"}`} />
          </div>
          <ConnectWallet />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Steps */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          {(["connect", "investigate", "live", "resolved"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                step === s ? "bg-primary text-black border-[#e8734a]" : ["connect","investigate","live","resolved"].indexOf(step) > i ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-white/5 text-gray-600 border-white/10"
              }`}>{i + 1}</div>
              <span className={step === s ? "text-white" : ""}>{s === "connect" ? "Connect" : s === "investigate" ? "Case" : s === "live" ? "Live" : "Report"}</span>
              {i < 3 && <span className="text-gray-700 mx-1">→</span>}
            </div>
          ))}
        </div>

        {step === "connect" && (
          <div className="max-w-lg mx-auto text-center space-y-8 py-16">
            <span className="text-6xl">🔗</span>
            <h2 className="text-3xl font-bold text-white">Connect to 0G Galileo</h2>
            <p className="text-gray-400">Connect your wallet to start investigating DeFi exploits with AI agents.</p>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-gray-500 space-y-1 text-left max-w-xs mx-auto">
              <p>1. Open MetaMask or Rabby</p>
              <p>2. Add 0G Galileo (Chain ID 16602)</p>
              <p>3. Get tokens: <a href="https://faucet.0g.ai" target="_blank" className="text-primary hover:underline">faucet.0g.ai</a></p>
            </div>
          </div>
        )}

        {(step === "investigate" || step === "live" || step === "resolved") && (
          <div className="max-w-3xl mx-auto">
            {step === "investigate" && (
              <div className="border border-border rounded-xl bg-surface p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  <div><h3 className="font-bold text-white text-lg">New Investigation</h3>
                  <p className="text-xs text-gray-500">Describe the exploit. Agents will trace, classify, and publish a post-mortem.</p></div>
                </div>
                <textarea value={dispute} onChange={e => setDispute(e.target.value)}
                  placeholder="Protocol XYZ on Ethereum drained 500 ETH via flash loan oracle manipulation at block 19234000"
                  rows={3} className="w-full bg-surface-alt border border-border rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#e8734a] transition-colors resize-none" />
                <div className="flex gap-4 items-end">
                  <div className="w-32"><label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Bounty (0G)</label>
                  <input type="number" value={stake} onChange={e => setStake(e.target.value)} step="0.01" min="0.001"
                    className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#e8734a] transition-colors" /></div>
                  <button onClick={handleInvestigate} disabled={loading || !dispute.trim()}
                    className="px-8 py-2.5 bg-primary text-black font-bold rounded-lg hover:bg-primary-hover disabled:opacity-40 transition-all text-sm">
                    {loading ? "Deploying..." : "🔍 Investigate"}
                  </button>
                </div>
                {account && <p className="text-[10px] text-gray-600 font-mono">Wallet: {account}</p>}
              </div>
            )}

            {timeline.length > 0 && (
              <div className="mt-4 border border-white/[0.06] rounded-xl bg-surface overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${step === "live" ? "bg-green-400 animate-pulse" : "bg-primary"}`} />
                    <span className="text-xs font-semibold text-gray-300">{step === "live" ? "Live Investigation" : "Post-Mortem"}</span>
                  </div>
                  {caseId && <span className="text-[10px] text-gray-600 font-mono">Case #{caseId}</span>}
                </div>
                <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                  {timeline.map((t, i) => {
                    const rc = t.actor === "forensic" ? "text-blue-400" : t.actor === "analysis" ? "text-purple-400" : t.actor === "verification" ? "text-green-400" : "text-gray-400";
                    const ri = t.actor === "forensic" ? "🔍" : t.actor === "analysis" ? "📊" : t.actor === "verification" ? "✅" : "⚙️";
                    return (
                      <div key={i} className="flex items-start gap-3" style={{ animation: `slideUp 0.5s ${i * 0.08}s ease-out both` }}>
                        <span className="text-sm mt-0.5">{ri}</span>
                        <div className="flex-1 min-w-0"><span className={`text-[11px] font-semibold uppercase tracking-wider ${rc}`}>{t.actor}</span>
                        <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">{t.message}</p></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "resolved" && verdict && (
              <div className="mt-4 border border-primary/20 rounded-xl bg-surface overflow-hidden" style={{ animation: "slideUp 0.5s ease-out both" }}>
                <div className="px-4 py-3 border-b border-primary/10 bg-primary/5 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h3 className="font-bold text-primary">Post-Mortem Published</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 ml-auto">IMMUTABLE</span>
                </div>
                <div className="p-4 space-y-4">
                  <div className="p-4 bg-green-500/[0.03] rounded-lg border border-green-500/10 text-center">
                    <span className="text-3xl">🔒</span><p className="text-lg font-bold text-green-400 mt-2">{verdict.result}</p>
                  </div>
                  <div><h4 className="text-xs font-semibold text-gray-400 mb-2">FINDINGS</h4>
                  <p className="text-sm text-gray-300 leading-relaxed bg-surface-alt p-3 rounded-lg border border-white/[0.06]">{verdict.reasoning}</p></div>
                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div className="p-3 bg-surface-alt rounded-lg border border-white/[0.06]"><span className="text-gray-500">Stored on</span><p className="text-gray-300 font-mono mt-0.5">0G Storage Log</p></div>
                    <div className="p-3 bg-surface-alt rounded-lg border border-white/[0.06]"><span className="text-gray-500">Verified by</span><p className="text-gray-300 font-mono mt-0.5">0G Compute TEE</p></div>
                    <div className="col-span-2 p-3 bg-blue-500/[0.03] rounded-lg border border-blue-500/10"><span className="text-blue-400 text-[10px]">🔒 On-Chain Record</span><p className="text-gray-400 text-[11px] mt-0.5">Contract: 0xe6D5496a... on 0G Galileo</p></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <style jsx global>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

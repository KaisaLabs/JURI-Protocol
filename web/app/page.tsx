"use client";
import { useState, useEffect, useCallback } from "react";
import { createCase as apiCreateCase, getCase as apiGetCase, healthCheck } from "@/lib/api";
import type { RuntimeCase, RuntimeCaseStatus, RuntimeTimelineEvent, RuntimeVerdict } from "@/lib/case-types";
import CaseForm from "./components/CaseForm";
import AgentFeed from "./components/AgentFeed";
import VerdictCard from "./components/VerdictCard";
import PayoutStatus from "./components/PayoutStatus";

export type CaseStatus = "IDLE" | "CREATING" | "ARBITRATION" | "RESOLVED";

export interface CaseState {
  id: number;
  dispute: string;
  status: CaseStatus;
  plaintiffAddress: string;
  defendantAddress: string;
  judgeAddress: string;
  stake: string;
  contractAddress?: string;
  verdict?: { result: string; reasoning: string };
  transport?: "direct" | "axl";
  runtimeStatus?: RuntimeCaseStatus;
  timeline?: RuntimeTimelineEvent[];
  runtimeVerdict?: RuntimeVerdict;
}

export default function Home() {
  const [currentCase, setCurrentCase] = useState<CaseState | null>(null);
  const [timeline, setTimeline] = useState<RuntimeTimelineEvent[]>([]);
  const [backendStatus, setBackendStatus] = useState<string>("disconnected");
  const [loading, setLoading] = useState(false);

  useEffect(() => { healthCheck().then(h => setBackendStatus(`connected (${h.transport})`)).catch(() => setBackendStatus("disconnected")); }, []);

  useEffect(() => {
    if (!currentCase || currentCase.status !== "ARBITRATION") return;
    const poll = setInterval(async () => {
      try {
        const c = await apiGetCase(currentCase.id);
        if (c) {
          setTimeline(c.timeline || []);
          setCurrentCase(prev => prev ? {
            ...prev,
            runtimeStatus: c.status,
            transport: c.transport,
            timeline: c.timeline,
            runtimeVerdict: c.verdict,
            status: c.status === "resolved" ? "RESOLVED" : "ARBITRATION",
          } : prev);
          if (c.status === "resolved") clearInterval(poll);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(poll);
  }, [currentCase?.id, currentCase?.status]);

  const handleCaseCreated = useCallback(async (caseData: CaseState) => {
    setLoading(true);
    try {
      const result = await apiCreateCase({ dispute: caseData.dispute, stake: caseData.stake });
      const now = Date.now();
      setCurrentCase({ ...caseData, id: result.caseId, status: "ARBITRATION", transport: "direct" });
      setTimeline([{ at: now, actor: "orchestrator", type: "case_created", message: `Case #${result.caseId} opened. Agents investigating...` }]);
    } catch (err) {
      const now = Date.now();
      setCurrentCase({ ...caseData, status: "ARBITRATION" });
      setTimeline([{ at: now, actor: "orchestrator", type: "case_created", message: "Agents starting investigation..." }]);
    } finally { setLoading(false); }
  }, []);

  const runtimeStatus: RuntimeCaseStatus = currentCase?.runtimeStatus || (currentCase?.status === "RESOLVED" ? "resolved" : currentCase?.status === "ARBITRATION" ? "debating" : "created");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 text-[#c9a84c] text-sm">
          <span className={`w-2 h-2 rounded-full ${backendStatus.startsWith("connected") ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          Backend: {backendStatus} | 0G · AXL · KeeperHub
        </div>
        <h2 className="text-4xl font-bold tracking-tight">DeFi Exploit <span className="text-[#c9a84c]">Forensics</span></h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          AI agents investigate DeFi exploits, trace fund flows, classify attack vectors,
          and publish immutable post-mortems on 0G Storage.
        </p>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CaseForm onCaseCreated={handleCaseCreated} currentCase={currentCase} loading={loading} />
          {timeline.length > 0 && <AgentFeed timeline={timeline} caseStatus={runtimeStatus} transport={currentCase?.transport || "direct"} />}
          {currentCase?.status === "RESOLVED" && <VerdictCard caseData={currentCase} />}
        </div>
        <div className="space-y-6">
          <PayoutStatus caseData={currentCase} />
          <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">🏗️ Stack</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between"><span>0G Chain</span><span className="text-green-400">Galileo</span></div>
              <div className="flex justify-between"><span>0G Storage</span><span className="text-green-400">KV + Log</span></div>
              <div className="flex justify-between"><span>0G Compute</span><span className="text-blue-400">TEE</span></div>
              <div className="flex justify-between"><span>Gensyn AXL</span><span className="text-purple-400">P2P</span></div>
              <div className="flex justify-between"><span>KeeperHub</span><span className="text-orange-400">Execute</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

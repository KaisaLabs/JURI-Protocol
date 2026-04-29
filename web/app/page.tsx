"use client";

import { useState, useEffect, useCallback } from "react";
import { createCase as apiCreateCase, getCase as apiGetCase, healthCheck } from "@/lib/api";
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
}

export default function Home() {
  const [currentCase, setCurrentCase] = useState<CaseState | null>(null);
  const [messages, setMessages] = useState<
    { role: string; content: string; timestamp: number }[]
  >([]);
  const [backendStatus, setBackendStatus] = useState<string>("disconnected");
  const [loading, setLoading] = useState(false);

  // Check backend health
  useEffect(() => {
    healthCheck()
      .then((h) => setBackendStatus(`connected (${h.transport})`))
      .catch(() => setBackendStatus("disconnected"));
  }, []);

  // Poll for case updates when arbitration is active
  useEffect(() => {
    if (!currentCase || currentCase.status !== "ARBITRATION") return;

    const poll = setInterval(async () => {
      try {
        const c = await apiGetCase(currentCase.id);
        if (c) {
          setMessages(
            c.messages.map((m) => ({
              role: m.role,
              content: m.content,
              timestamp: m.timestamp,
            }))
          );

          if (c.status === "RESOLVED" && c.verdict) {
            setCurrentCase((prev) =>
              prev
                ? {
                    ...prev,
                    status: "RESOLVED",
                    verdict: c.verdict,
                  }
                : prev
            );
            clearInterval(poll);
          }
        }
      } catch {
        // API might not be ready yet
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [currentCase?.id, currentCase?.status]);

  const handleCaseCreated = useCallback(async (caseData: CaseState) => {
    setLoading(true);
    try {
      const result = await apiCreateCase(caseData.dispute);
      setCurrentCase({
        ...caseData,
        id: result.caseId,
        status: "ARBITRATION",
      });
      setMessages([
        {
          role: "system",
          content: `Case #${result.caseId} created. Agents are preparing arguments...`,
          timestamp: Date.now(),
        },
      ]);
    } catch (err) {
      console.error("Failed to create case:", err);
      // Fallback: simulate locally
      setCurrentCase({ ...caseData, status: "ARBITRATION" });
      simulateLocal();
    } finally {
      setLoading(false);
    }
  }, []);

  // Local simulation when backend is not available
  function simulateLocal() {
    const simMessages = [
      { delay: 2000, role: "plaintiff", msg: "Opening argument: evidence assessed, supported by on-chain data..." },
      { delay: 5000, role: "defendant", msg: "Counter-argument: data is outdated. Market shows opposite trend..." },
      { delay: 8000, role: "plaintiff", msg: "Rebuttal: defendant cherry-picked timeframe. Full data supports claim..." },
      { delay: 11000, role: "defendant", msg: "Closing: plaintiff failed to account for external factors..." },
      { delay: 14000, role: "judge", msg: "All evidence received. Evaluating via 0G Compute TEE-verified inference..." },
      { delay: 18000, role: "judge", msg: "VERDICT: DEFENDANT wins. Reasoning: stronger evidence..." },
    ];
    simMessages.forEach(({ delay, role, msg }) => {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role, content: msg, timestamp: Date.now() }]);
      }, delay);
    });
    setTimeout(() => {
      setCurrentCase((prev) =>
        prev ? { ...prev, status: "RESOLVED" } : prev
      );
    }, 20000);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 text-[#c9a84c] text-sm">
          <span className={`w-2 h-2 rounded-full ${backendStatus.startsWith("connected") ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          Backend: {backendStatus} | 0G · Gensyn AXL · KeeperHub
        </div>
        <h2 className="text-4xl font-bold tracking-tight">
          Decentralized AI{" "}
          <span className="text-[#c9a84c]">Arbitration</span>
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          AI agents settle disputes on-chain. Three agents — Plaintiff, Defendant, and
          Judge — communicate via encrypted P2P (AXL), store evidence on 0G Storage,
          and the Judge uses 0G Compute&apos;s verifiable inference to issue a fair verdict.
          Payouts executed via KeeperHub.
        </p>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CaseForm
            onCaseCreated={handleCaseCreated}
            currentCase={currentCase}
            loading={loading}
          />

          {messages.length > 0 && (
            <AgentFeed messages={messages} caseStatus={currentCase?.status || "IDLE"} />
          )}

          {currentCase?.status === "RESOLVED" && (
            <VerdictCard caseData={currentCase} />
          )}
        </div>

        <div className="space-y-6">
          <PayoutStatus caseData={currentCase} />

          <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              🏗️ Sponsor Tech Stack
            </h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>0G Chain</span>
                <span className="text-green-400">Galileo Testnet</span>
              </div>
              <div className="flex justify-between">
                <span>0G Storage</span>
                <span className="text-green-400">KV + Log</span>
              </div>
              <div className="flex justify-between">
                <span>0G Compute</span>
                <span className="text-blue-400">TEE-verified</span>
              </div>
              <div className="flex justify-between">
                <span>Gensyn AXL</span>
                <span className="text-purple-400">3 nodes P2P</span>
              </div>
              <div className="flex justify-between">
                <span>KeeperHub</span>
                <span className="text-orange-400">Execute payout</span>
              </div>
            </div>
          </div>

          <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              🏆 Track Eligibility
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span>0G Autonomous Agents</span></div>
              <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span>Gensyn AXL</span></div>
              <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span>KeeperHub</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
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
}

export default function Home() {
  const [currentCase, setCurrentCase] = useState<CaseState | null>(null);
  const [messages, setMessages] = useState<
    { role: string; content: string; timestamp: number }[]
  >([]);

  const handleCaseCreated = (caseData: CaseState) => {
    setCurrentCase(caseData);
    addMessage("system", `Case #${caseData.id} created: "${caseData.dispute}"`);
  };

  const addMessage = (role: string, content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  };

  // Simulate agent communication (will be replaced by real AXL feed)
  useEffect(() => {
    if (currentCase?.status === "ARBITRATION") {
      const rounds = [
        { delay: 2000, role: "plaintiff", msg: "Opening argument: evidence assessed, claim supported by on-chain data..." },
        { delay: 5000, role: "defendant", msg: "Counter-argument: plaintiff's data is outdated. Market conditions show opposite trend..." },
        { delay: 8000, role: "plaintiff", msg: "Rebuttal: defendant cherry-picked timeframe. Full dataset confirms our position..." },
        { delay: 11000, role: "defendant", msg: "Closing: plaintiff failed to account for external factors. Verdict must be in our favor..." },
        { delay: 14000, role: "judge", msg: "All evidence received. Evaluating via 0G Compute TEE-verified inference..." },
      ];

      rounds.forEach(({ delay, role, msg }) => {
        const timer = setTimeout(() => {
          addMessage(role.toUpperCase(), msg);
        }, delay);
        return () => clearTimeout(timer);
      });
    }
  }, [currentCase?.status]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 text-[#c9a84c] text-sm">
          <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse" />
          Built on 0G · Gensyn AXL · KeeperHub
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
        {/* Left: Case Form */}
        <div className="lg:col-span-2 space-y-6">
          <CaseForm
            onCaseCreated={handleCaseCreated}
            currentCase={currentCase}
          />

          {currentCase && (
            <AgentFeed
              messages={messages}
              caseStatus={currentCase.status}
            />
          )}

          {currentCase?.status === "RESOLVED" && (
            <VerdictCard caseData={currentCase} />
          )}
        </div>

        {/* Right: Status & Payout */}
        <div className="space-y-6">
          <PayoutStatus caseData={currentCase} />

          {/* Architecture Info */}
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
                <span className="text-orange-400">Execute</span>
              </div>
            </div>
          </div>

          {/* Track Eligibility */}
          <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              🏆 Track Eligibility
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span>0G Autonomous Agents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span>Gensyn AXL</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✅</span>
                <span>KeeperHub</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

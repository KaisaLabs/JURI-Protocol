"use client";
import { useState } from "react";
import type { CaseState } from "../page";

export default function CaseForm({ onCaseCreated, currentCase, loading = false }: {
  onCaseCreated: (c: CaseState) => void;
  currentCase: CaseState | null;
  loading?: boolean;
}) {
  const [dispute, setDispute] = useState("");
  const [stake, setStake] = useState("0.01");
  const isActive = currentCase && currentCase.status !== "IDLE" && currentCase.status !== "CREATING";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute.trim()) return;
    onCaseCreated({ id: 0, dispute: dispute.trim(), status: "CREATING", plaintiffAddress: "0xForensic...", defendantAddress: "0xAnalysis...", judgeAddress: "0xVerifier...", stake });
  };

  return (
    <div className="border border-[#2a2a3a] rounded-lg p-6 bg-[#14141f]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🔍</span>
        <h3 className="text-lg font-semibold text-gray-200">New Investigation</h3>
        {isActive && <span className={`text-xs px-2 py-0.5 rounded border ${currentCase.status === "RESOLVED" ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"}`}>{currentCase.status === "RESOLVED" ? "Published" : "Active"}</span>}
      </div>
      {isActive ? (
        <div className="space-y-3">
          <div className="p-4 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-xs text-gray-500">Case #{currentCase.id}</span>
            <p className="text-gray-200 mt-1 font-medium">&ldquo;{currentCase.dispute}&rdquo;</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500"><span>Bounty: {currentCase.stake} 0G</span><span>Status: {currentCase.status}</span></div>
          </div>
          <p className="text-xs text-gray-600 text-center">{currentCase.status === "RESOLVED" ? "Post-mortem published." : "Agents investigating. Watch live feed."}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Exploit Case</label>
            <textarea value={dispute} onChange={e => setDispute(e.target.value)}
              placeholder='e.g. "Protocol XYZ on Ethereum drained 500 ETH via flash loan attack at block 19234000"'
              rows={3} className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Bounty (0G)</label>
              <input type="number" value={stake} onChange={e => setStake(e.target.value)} step="0.01" min="0.001"
                className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#c9a84c] transition-colors" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={loading || !dispute.trim()}
                className="px-6 py-2 bg-[#c9a84c] text-black font-semibold rounded hover:bg-[#d4b55a] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm">
                {loading ? "Starting..." : "🔍 Investigate"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

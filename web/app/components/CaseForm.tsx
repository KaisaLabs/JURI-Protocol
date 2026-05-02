"use client";

import { useState } from "react";
import type { CreateCaseRequest, RuntimeCase } from "@/lib/case-types";

interface CaseFormProps {
  onCaseCreated: (caseData: CreateCaseRequest) => void;
  currentCase: RuntimeCase | null;
  loading?: boolean;
  error?: string | null;
}

function formatStatus(status: RuntimeCase["status"]) {
  return status.replace(/_/g, " ");
}

export default function CaseForm({ onCaseCreated, currentCase, loading = false, error = null }: CaseFormProps) {
  const [dispute, setDispute] = useState("");
  const [stake, setStake] = useState("0.01");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispute.trim()) return;

    onCaseCreated({ dispute: dispute.trim(), stake });
  };

  const activeCase = currentCase;

  return (
    <div className="border border-[#2a2a3a] rounded-lg p-6 bg-[#14141f]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📋</span>
        <h3 className="text-lg font-semibold text-gray-200">New Dispute</h3>
        {activeCase && (
          <span className={`text-xs px-2 py-0.5 rounded border ${
              activeCase.status === "resolved"
                ? "bg-green-500/10 text-green-400 border-green-500/30"
                : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
           }`}>
             {activeCase.status === "resolved" ? "Resolved" : "Active"}
           </span>
         )}
       </div>

       {activeCase ? (
        <div className="space-y-3">
          <div className="p-4 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-xs text-gray-500">Case #{activeCase.id}</span>
            <p className="text-gray-200 mt-1 font-medium">
              &ldquo;{activeCase.dispute}&rdquo;
            </p>
            <div className="mt-2 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
              <span>Stake: {activeCase.stake} 0G</span>
              <span>Status: {formatStatus(activeCase.status)}</span>
              <span className="truncate">Plaintiff: {activeCase.plaintiffAddress}</span>
              <span className="truncate">Defendant: {activeCase.defendantAddress}</span>
              <span className="truncate sm:col-span-2">Judge: {activeCase.judgeAddress}</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 text-center">
             {activeCase.status === "resolved"
               ? "Case resolved. See verdict below."
               : activeCase.status === "failed"
                 ? "Case failed. Review the runtime timeline for the last reported error."
                 : "Runtime status is live from the orchestrator. Watch the timeline below."}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="dispute" className="block text-sm text-gray-400 mb-1">Dispute Question</label>
            <textarea
              id="dispute"
              value={dispute}
              onChange={(e) => setDispute(e.target.value)}
              placeholder='e.g. "Will ETH be above $3,000 on May 5?" or "Is DeFi safer than CeFi?"'
              rows={3}
              autoComplete="off"
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded px-3 py-2 text-sm text-gray-200 placeholder-gray-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14141f]"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="stake" className="block text-sm text-gray-400 mb-1">Stake (0G)</label>
              <input
                id="stake"
                type="number"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                step="0.01" min="0.001"
                inputMode="decimal"
                autoComplete="off"
                className="w-full bg-[#0a0a0f] border border-[#2a2a3a] rounded px-3 py-2 text-sm text-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a84c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14141f]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !dispute.trim()}
                className="min-h-10 px-6 py-2 bg-[#c9a84c] text-black font-semibold rounded hover:bg-[#d4b55a] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1d584] focus-visible:ring-offset-2 focus-visible:ring-offset-[#14141f]"
              >
                {loading ? "Creating..." : "⚖️ Start Case"}
              </button>
            </div>
          </div>
          {error ? (
            <p className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}

"use client";

import type { CaseState } from "../page";

interface PayoutStatusProps {
  caseData: CaseState | null;
}

export default function PayoutStatus({ caseData }: PayoutStatusProps) {
  if (!caseData) {
    return (
      <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">💰</span>
          <h3 className="font-semibold text-gray-200">Payout Status</h3>
        </div>
        <p className="text-sm text-gray-600 text-center py-8">
          Create a case to see payout status
        </p>
      </div>
    );
  }

  const isResolved = caseData.status === "RESOLVED";

  return (
    <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💰</span>
        <h3 className="font-semibold text-gray-200">Payout Status</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Stake Pool</span>
          <span className="text-gray-200 font-mono">{caseData.stake} 0G × 2</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Judge Fee (10%)</span>
          <span className="text-gray-200 font-mono">
            {(parseFloat(caseData.stake) * 2 * 0.1).toFixed(3)} 0G
          </span>
        </div>

        <hr className="border-[#2a2a3a]" />

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Winner Payout</span>
          <span className="text-green-400 font-mono">
            {(parseFloat(caseData.stake) * 2 * 0.9).toFixed(3)} 0G
          </span>
        </div>

        {isResolved ? (
          <div className="mt-3 p-3 bg-green-500/5 border border-green-500/20 rounded text-center">
            <span className="text-green-400 text-sm">✅ Paid via KeeperHub</span>
          </div>
        ) : caseData.status === "ARBITRATION" ? (
          <div className="mt-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded text-center">
            <span className="text-yellow-400 text-sm flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Awaiting verdict...
            </span>
          </div>
        ) : null}

        <div className="mt-4 text-[10px] text-gray-600 text-center">
          Execution by KeeperHub · Settlement on 0G Chain
        </div>
      </div>
    </div>
  );
}

"use client";

import type { RuntimeCase } from "@/lib/case-types";

interface PayoutStatusProps {
  caseData: RuntimeCase | null;
}

function formatPayoutLabel(status: NonNullable<RuntimeCase["payout"]>["status"]) {
  return status.replace(/_/g, " ");
}

function formatPath(path: NonNullable<RuntimeCase["payout"]>["path"]) {
  return path.replace(/_/g, " ");
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

  const stakeValue = Number(caseData.stake);
  const stakePool = Number.isFinite(stakeValue) ? stakeValue * 2 : null;
  const judgeFee = stakePool === null ? null : stakePool * 0.1;
  const winnerPayout = stakePool === null ? null : stakePool * 0.9;
  const payout = caseData.payout;

  return (
    <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">💰</span>
        <h3 className="font-semibold text-gray-200">Payout Status</h3>
      </div>

      <div className="space-y-3">
        {payout ? (
          <div className="space-y-2 rounded border border-[#2a2a3a] bg-[#0a0a0f] p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Payout Runtime Status</span>
              <span className="text-gray-200">{formatPayoutLabel(payout.status)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Path</span>
              <span className="text-gray-200">{formatPath(payout.path)}</span>
            </div>
            {payout.actor ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Actor</span>
                <span className="text-gray-200 uppercase">{payout.actor}</span>
              </div>
            ) : null}
            {payout.txHash ? (
              <div>
                <span className="text-gray-500">Transaction</span>
                <p className="mt-1 break-all font-mono text-xs text-gray-300">{payout.txHash}</p>
              </div>
            ) : null}
            {payout.note ? <p className="text-xs text-gray-400">{payout.note}</p> : null}
            {payout.error ? <p className="text-xs text-red-300">{payout.error}</p> : null}
          </div>
        ) : caseData.status === "resolved" ? (
          <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded text-center">
            <span className="text-yellow-300 text-sm">Verdict is final, but no payout update has been reported yet.</span>
          </div>
        ) : caseData.status === "failed" ? (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded text-center">
            <span className="text-red-300 text-sm">Case failed before payout execution could be reported.</span>
          </div>
        ) : (
          <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded text-center">
            <span className="text-yellow-400 text-sm flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Waiting for verdict and payout updates...
            </span>
          </div>
        )}

        <div className="rounded border border-[#2a2a3a] bg-[#0a0a0f] p-3 text-sm">
          <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">Estimate only</div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated Stake Pool</span>
              <span className="text-gray-200 font-mono">
                {stakePool === null ? `${caseData.stake} 0G x 2` : `${stakePool.toFixed(3)} 0G`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated Judge Fee (10%)</span>
              <span className="text-gray-200 font-mono">
                {judgeFee === null ? "Unknown" : `${judgeFee.toFixed(3)} 0G`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Estimated Winner Payout</span>
              <span className="text-green-400 font-mono">
                {winnerPayout === null ? "Unknown" : `${winnerPayout.toFixed(3)} 0G`}
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            These numbers are local estimates from the displayed stake and contract rules. The runtime status above is the authoritative payout signal.
          </p>
        </div>

        <div className="mt-4 text-[10px] text-gray-600 text-center">
          Settlement data is rendered directly from the orchestrator runtime.
        </div>
      </div>
    </div>
  );
}

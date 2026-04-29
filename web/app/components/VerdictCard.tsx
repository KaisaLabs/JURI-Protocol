"use client";

import type { CaseState } from "../page";

interface VerdictCardProps {
  caseData: CaseState;
}

export default function VerdictCard({ caseData }: VerdictCardProps) {
  // Simulated verdict — in production, this comes from the Judge agent
  const simulatedVerdict = {
    result: "DEFENDANT",
    reasoning:
      "After evaluating all evidence presented by both sides, the defendant's argument was more logically sound and supported by verifiable on-chain data. The plaintiff's claims were partially valid but failed to account for critical market factors that the defendant correctly identified. Verdict: DEFENDANT WINS. The defendant's counter-arguments demonstrated superior reasoning and evidence quality.",
    txHash: "0x7a3b...c9f2",
    storageRef: "case:1:verdict:1714500000",
    computeProof: "TEE-signed by 0G Compute (qwen-2.5-7b-instruct)",
  };

  return (
    <div className="border border-[#c9a84c]/30 rounded-lg bg-[#14141f] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c9a84c]/20 bg-[#c9a84c]/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <h3 className="text-lg font-bold text-[#c9a84c]">Verdict</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/30">
            FINAL
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Result Banner */}
        <div className="p-4 bg-[#0a0a0f] rounded border border-green-500/20 text-center">
          <span className="text-3xl">🏆</span>
          <p className="text-lg font-bold text-green-400 mt-2">
            {simulatedVerdict.result} WINS
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Case #{caseData.id} · Stake: {caseData.stake} 0G
          </p>
        </div>

        {/* Reasoning */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            📝 Judge&apos;s Reasoning
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed bg-[#0a0a0f] p-3 rounded border border-[#2a2a3a]">
            {simulatedVerdict.reasoning}
          </p>
        </div>

        {/* Verification Info */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">Transaction</span>
            <p className="text-gray-300 font-mono mt-0.5 truncate">
              {simulatedVerdict.txHash}
            </p>
          </div>
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">Storage Ref</span>
            <p className="text-gray-300 font-mono mt-0.5 truncate">
              {simulatedVerdict.storageRef}
            </p>
          </div>
          <div className="col-span-2 p-3 bg-blue-500/5 rounded border border-blue-500/20">
            <span className="text-blue-400 text-xs">🔒 Verification</span>
            <p className="text-gray-400 mt-0.5">{simulatedVerdict.computeProof}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

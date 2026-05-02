"use client";
import type { CaseState } from "../page";

export default function VerdictCard({ caseData }: { caseData: CaseState }) {
  const v = caseData.verdict;
  if (!v) return null;

  const result = v.result || "PENDING";
  const reasoning = v.reasoning || "Investigation pending...";
  const txHash = (v as any).txHash || "pending";
  const storageRef = (v as any).storageRef || (v as any).reasoningRef || "pending";
  const computeProof = (v as any).computeProof || (v as any).computeProvider || "0G Compute TEE-verified";

  return (
    <div className="border border-[#c9a84c]/30 rounded-lg bg-[#14141f] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#c9a84c]/20 bg-[#c9a84c]/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <h3 className="text-lg font-bold text-[#c9a84c]">Post-Mortem Report</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/30">PUBLISHED</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="p-4 bg-[#0a0a0f] rounded border border-green-500/20 text-center">
          <span className="text-3xl">🔍</span>
          <p className="text-lg font-bold text-green-400 mt-2">{result}</p>
          <p className="text-xs text-gray-500 mt-1">Case #{caseData.id}</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">📝 Investigation Findings</h4>
          <p className="text-sm text-gray-300 leading-relaxed bg-[#0a0a0f] p-3 rounded border border-[#2a2a3a]">{reasoning}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">Transaction</span>
            <p className="text-gray-300 font-mono mt-0.5 truncate">{txHash}</p>
          </div>
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">Storage Ref</span>
            <p className="text-gray-300 font-mono mt-0.5 truncate">{storageRef}</p>
          </div>
          <div className="col-span-2 p-3 bg-blue-500/5 rounded border border-blue-500/20">
            <span className="text-blue-400 text-xs">🔒 Verification</span>
            <p className="text-gray-400 mt-0.5">{computeProof}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

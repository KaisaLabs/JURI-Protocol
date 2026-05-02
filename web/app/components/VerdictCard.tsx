"use client";

import type { RuntimeCase } from "@/lib/case-types";

interface VerdictCardProps {
  caseData: RuntimeCase;
}

export default function VerdictCard({ caseData }: VerdictCardProps) {
  const verdict = caseData.verdict;

  if (!verdict) {
    return (
      <div className="border border-[#c9a84c]/30 rounded-lg bg-[#14141f] p-4 text-sm text-gray-400">
        The case reached a terminal state, but no verdict payload was returned by the runtime.
      </div>
    );
  }

  const verdictTone =
    verdict.result === "PLAINTIFF"
      ? "border-blue-500/20 text-blue-400"
      : verdict.result === "DEFENDANT"
        ? "border-green-500/20 text-green-400"
        : "border-gray-500/20 text-gray-300";

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
        <div className={`p-4 bg-[#0a0a0f] rounded border text-center ${verdictTone}`}>
          <span className="text-3xl">🏆</span>
          <p className="text-lg font-bold mt-2">
            {verdict.result === "TIED" ? "TIED" : `${verdict.result} WINS`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Case #{caseData.id} · Stake: {caseData.stake} 0G
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-2">
            📝 Judge&apos;s Reasoning
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed bg-[#0a0a0f] p-3 rounded border border-[#2a2a3a]">
            {verdict.reasoning}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">Compute Provider</span>
            <p className="text-gray-300 mt-0.5 break-all">
              {verdict.computeProvider}
            </p>
          </div>
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">Storage Ref</span>
            <p className="text-gray-300 font-mono mt-0.5 break-all">
              {verdict.reasoningRef}
            </p>
          </div>
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">LLM Mode</span>
            <p className="mt-0.5 text-gray-300">
              {verdict.simulated ? "Simulated fallback" : "Live provider"}
            </p>
          </div>
          <div className="p-3 bg-[#0a0a0f] rounded border border-[#2a2a3a]">
            <span className="text-gray-500">On-Chain Verdict</span>
            <p className="mt-0.5 text-gray-300">
              {verdict.onChain.status}
            </p>
          </div>
          <div className="col-span-2 p-3 bg-blue-500/5 rounded border border-blue-500/20">
            <span className="text-blue-400 text-xs">🔒 Verification</span>
            <p className="text-gray-400 mt-0.5">
              {verdict.simulated
                ? "Judge used the configured simulated fallback path."
                : "Judge reported a live compute provider for this verdict."}
            </p>
            {verdict.onChain.txHash ? (
              <p className="mt-2 break-all font-mono text-xs text-gray-300">
                TX: {verdict.onChain.txHash}
              </p>
            ) : null}
            {verdict.onChain.error ? (
              <p className="mt-2 text-xs text-red-300">{verdict.onChain.error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

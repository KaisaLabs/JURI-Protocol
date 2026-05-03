"use client";
export default function VerdictCard({ verdict, caseId }: { verdict: any; caseId?: number }) {
  if (!verdict) return null;
  return (
    <div className="mt-4 border border-[#e8734a]/20 rounded-xl bg-[#0a0a12] overflow-hidden" style={{ animation: "slideUp 0.5s ease-out both" }}>
      <div className="px-4 py-3 border-b border-[#e8734a]/10 bg-[#e8734a]/5 flex items-center gap-2">
        <span className="text-lg">📋</span><h3 className="font-bold text-[#e8734a] text-sm">Post-Mortem</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 ml-auto">IMMUTABLE</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="p-3 bg-green-500/[0.03] rounded-lg border border-green-500/10 text-center">
          <p className="text-lg font-bold text-green-400">{verdict.result || "RESOLVED"}</p>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed bg-[#06060b] p-3 rounded-lg border border-white/[0.06]">{verdict.reasoning}</p>
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          <div className="p-2 bg-[#06060b] rounded border border-white/[0.06]"><span className="text-gray-500">Storage</span><p className="text-gray-300 font-mono">0G Storage Log</p></div>
          <div className="p-2 bg-[#06060b] rounded border border-white/[0.06]"><span className="text-gray-500">Verification</span><p className="text-gray-300 font-mono">0G Compute TEE</p></div>
          <div className="col-span-2 p-2 bg-blue-500/[0.03] rounded border border-blue-500/10"><span className="text-blue-400 text-[10px]">🔒 On-Chain</span><p className="text-gray-400 text-[11px]">0xe6D5496a... on 0G Galileo</p></div>
        </div>
      </div>
    </div>
  );
}

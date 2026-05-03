"use client";
export default function PayoutStatus({ caseData }: { caseData: { id?: number; dispute?: string; stake?: string; status?: string } | null }) {
  if (!caseData) return null;
  const isResolved = caseData.status === "RESOLVED";
  return (
    <div className="border border-white/[0.06] rounded-xl bg-[#0a0a12] p-5">
      <div className="flex items-center gap-2 mb-4"><span className="text-lg">📊</span><h3 className="font-semibold text-gray-200 text-sm">Case Info</h3></div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between"><span className="text-gray-500">Bounty</span><span className="text-gray-300 font-mono">{caseData.stake || "0"} 0G</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Verifier Fee</span><span className="text-gray-300 font-mono">{(parseFloat(caseData.stake || "0") * 0.1).toFixed(3)} 0G</span></div>
        <hr className="border-white/[0.06]" />
        <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={isResolved ? "text-green-400" : "text-yellow-400"}>{caseData.status || "CREATING"}</span></div>
        {isResolved && <div className="mt-2 p-2 bg-green-500/5 border border-green-500/10 rounded text-center"><span className="text-green-400 text-[11px]">✅ Published on 0G Storage</span></div>}
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";

interface CaseData { id: number; dispute: string; stake: string; }

export default function CaseForm({ onSubmit, loading = false }: { onSubmit: (d: CaseData) => void; loading?: boolean }) {
  const [dispute, setDispute] = useState("");
  const [stake, setStake] = useState("0.01");
  return (
    <div className="space-y-4">
      <textarea value={dispute} onChange={e => setDispute(e.target.value)}
        placeholder="Protocol XYZ on Ethereum drained 500 ETH via flash loan oracle manipulation at block 19234000"
        rows={3} className="w-full bg-[#06060b] border border-[#2a2a3a] rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-[#c9a84c] transition-colors resize-none" />
      <div className="flex gap-4 items-end">
        <div className="w-32">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Bounty (0G)</label>
          <input type="number" value={stake} onChange={e => setStake(e.target.value)} step="0.01" min="0.001"
            className="w-full bg-[#06060b] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#c9a84c] transition-colors" />
        </div>
        <button onClick={() => onSubmit({ id: 0, dispute: dispute.trim(), stake })} disabled={loading || !dispute.trim()}
          className="px-8 py-2.5 bg-[#c9a84c] text-black font-bold rounded-lg hover:bg-[#d4b55a] disabled:opacity-40 transition-all text-sm">
          {loading ? "Deploying..." : "🔍 Investigate"}
        </button>
      </div>
    </div>
  );
}

"use client";
export default function AgentFeed({ events }: { events: { actor: string; message: string; at: number }[] }) {
  if (!events.length) return null;
  return (
    <div className="mt-4 border border-white/[0.06] rounded-xl bg-[#0a0a12] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs font-semibold text-gray-300">Live Feed</span>
      </div>
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {events.map((e, i) => {
          const rc = e.actor === "forensic" ? "text-blue-400" : e.actor === "analysis" ? "text-purple-400" : e.actor === "verification" ? "text-green-400" : "text-gray-400";
          const ri = e.actor === "forensic" ? "🔍" : e.actor === "analysis" ? "📊" : e.actor === "verification" ? "✅" : "⚙️";
          return (
            <div key={i} className="flex items-start gap-3" style={{ animation: `slideUp 0.4s ${i * 0.08}s ease-out both` }}>
              <span className="text-sm mt-0.5">{ri}</span>
              <div className="flex-1 min-w-0"><span className={`text-[11px] font-semibold uppercase ${rc}`}>{e.actor}</span>
              <p className="text-sm text-gray-300 mt-0.5">{e.message}</p></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

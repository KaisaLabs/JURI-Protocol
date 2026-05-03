"use client";

import { useEffect, useRef } from "react";

interface Event {
  actor: string;
  message: string;
  at: number;
  type?: string;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

function actorIcon(actor: string): string {
  switch (actor) {
    case "forensic":
      return "🔍";
    case "analysis":
      return "📊";
    case "verification":
      return "✅";
    case "orchestrator":
      return "⚙️";
    default:
      return "⚙️";
  }
}

function actorColors(actor: string): {
  text: string;
  bg: string;
} {
  switch (actor) {
    case "forensic":
      return { text: "text-blue-400", bg: "bg-blue-500/5 border-blue-500/10" };
    case "analysis":
      return { text: "text-purple-400", bg: "bg-purple-500/5 border-purple-500/10" };
    case "verification":
      return { text: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" };
    case "orchestrator":
      return { text: "text-gray-400", bg: "bg-gray-500/5 border-gray-500/10" };
    default:
      return { text: "text-gray-400", bg: "bg-gray-500/5 border-gray-500/10" };
  }
}

const TYPE_ICONS: Record<string, string> = {
  search: "🔎",
  storage: "💾",
  contract: "📜",
  verdict: "⚖️",
  compute: "🧠",
  p2p: "🔗",
  test: "🧪",
};

function getProgressPhase(events: Event[]): string {
  if (events.length < 3) return "Initializing...";

  const lastFive = events.slice(-5);
  const joined = lastFive.map((e) => `${e.actor}:${e.message}`).join(" ").toUpperCase();

  if (joined.includes("CLOSING_STATEMENT") || joined.includes("VERDICT")) {
    return "Publishing post-mortem...";
  }

  if (
    joined.includes("COUNTER_ARGUMENT") ||
    joined.includes("REBUTTAL")
  ) {
    if (joined.includes("ROUND 3")) return "Round 3/3";
    return "Round 2-3/3";
  }

  return "Round 1/3";
}

export default function AgentFeed({
  events,
}: {
  events: Event[];
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const phase = getProgressPhase(events);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  if (!events.length) return null;

  return (
    <div className="mt-4 border border-border rounded-xl bg-surface overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${
            phase === "Publishing post-mortem..."
              ? "bg-primary animate-pulse"
              : "bg-emerald-400 animate-pulse"
          }`}
        />
        <span className="text-xs font-semibold text-gray-300">
          Live Investigation
        </span>
        <span className="ml-auto text-[10px] text-gray-500 font-mono">
          {phase}
        </span>
      </div>

      {/* Events */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {events.map((e, i) => {
          const colors = actorColors(e.actor);
          const icon = actorIcon(e.actor);
          const time = relativeTime(e.at);
          const hasStorage =
            e.message.includes("0G Storage") || e.message.includes("stored");
          const typeIcon = e.type ? TYPE_ICONS[e.type] : undefined;

          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${colors.bg} transition-colors`}
              style={{
                animation: `slideUp 0.4s ${i * 0.06}s ease-out both`,
              }}
            >
              <span className="text-sm mt-0.5 flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}
                  >
                    {e.actor}
                  </span>
                  {typeIcon && (
                    <span className="text-[11px]" title={e.type}>
                      {typeIcon}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-600 font-mono ml-auto flex-shrink-0">
                    {time}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5 leading-relaxed break-words">
                  {e.message}
                </p>
                {hasStorage && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    ✓ Stored
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

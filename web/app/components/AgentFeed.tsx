"use client";

import { useEffect, useRef } from "react";
import type { RuntimeCaseStatus, RuntimeTimelineEvent } from "@/lib/case-types";

interface AgentFeedProps {
  timeline: RuntimeTimelineEvent[];
  caseStatus: RuntimeCaseStatus;
  transport: "direct" | "axl";
  error?: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  forensic: "text-blue-400",
  analysis: "text-red-400",
  verification: "text-[#c9a84c]",
  orchestrator: "text-gray-400",
};

const ROLE_ICONS: Record<string, string> = {
  forensic: "🔍",
  analysis: "📊",
  verification: "✅",
  orchestrator: "⚙️",
};

function formatActor(actor: RuntimeTimelineEvent["actor"]) {
  return actor.toUpperCase();
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

export default function AgentFeed({ timeline, caseStatus, transport, error = null }: AgentFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [timeline]);

  const isLive = caseStatus !== "resolved" && caseStatus !== "failed";

  return (
    <div className="border border-[#2a2a3a] rounded-lg bg-[#14141f] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a3a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="font-semibold text-gray-200">Runtime Timeline</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-green-400 animate-pulse" : "bg-gray-600"
            }`}
          />
          <span className="text-xs text-gray-500">
            {isLive ? "Polling" : "Terminal"}
          </span>
        </div>
      </div>

      <div
        ref={feedRef}
        className="p-4 space-y-3 max-h-96 overflow-y-auto"
      >
        {timeline.length === 0 ? (
          <div className="rounded border border-dashed border-[#2a2a3a] bg-[#0a0a0f] px-4 py-8 text-center text-sm text-gray-500">
            No runtime events yet. Once the orchestrator seeds the case, agent and on-chain updates will appear here.
          </div>
        ) : (
          timeline.map((event, i) => (
            <div
              key={`${event.at}-${event.actor}-${event.type}-${i}`}
              className="animate-fadeIn"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">
                  {ROLE_ICONS[event.actor] || "💬"}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        ROLE_COLORS[event.actor] || "text-gray-400"
                      }`}
                    >
                      {formatActor(event.actor)}
                    </span>
                    <span className="rounded border border-[#2a2a3a] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                      {event.type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-gray-600">
                      {new Date(event.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {event.message}
                  </p>
                  {event.data && Object.keys(event.data).length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(event.data).map(([key, value]) => (
                        <span
                          key={`${event.at}-${key}`}
                          className="max-w-full truncate rounded border border-[#2a2a3a] bg-[#0a0a0f] px-2 py-1 text-[10px] text-gray-500"
                          title={`${key}: ${formatValue(value)}`}
                        >
                          {key}: {formatValue(value)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-[#2a2a3a] bg-[#0a0a0f] space-y-1">
        <p className="text-xs text-gray-600 flex items-center gap-2">
          <span className={isLive ? "animate-spin" : ""}>⏳</span>
          Transport: {transport === "axl" ? "Gensyn AXL" : "Direct local runtime"}
        </p>
        {error ? <p className="text-xs text-red-300">{error}</p> : null}
      </div>

      {isLive && (
        <div className="px-4 py-2 border-t border-[#2a2a3a] bg-[#0a0a0f]">
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Polling the orchestrator for runtime state changes until a terminal status is reported.
          </p>
        </div>
      )}
    </div>
  );
}

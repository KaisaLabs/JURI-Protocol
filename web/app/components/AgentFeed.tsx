"use client";

import { useEffect, useRef } from "react";
import type { CaseStatus } from "../page";

interface AgentFeedProps {
  messages: { role: string; content: string; timestamp: number }[];
  caseStatus: CaseStatus;
}

const ROLE_COLORS: Record<string, string> = {
  PLAINTIFF: "text-blue-400",
  DEFENDANT: "text-red-400",
  JUDGE: "text-[#c9a84c]",
  system: "text-gray-500",
};

const ROLE_ICONS: Record<string, string> = {
  PLAINTIFF: "📢",
  DEFENDANT: "🛡️",
  JUDGE: "👨‍⚖️",
  system: "⚙️",
};

export default function AgentFeed({ messages, caseStatus }: AgentFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="border border-[#2a2a3a] rounded-lg bg-[#14141f] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a3a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h3 className="font-semibold text-gray-200">Live Agent Feed</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              caseStatus === "ARBITRATION" ? "bg-green-400 animate-pulse" : "bg-gray-600"
            }`}
          />
          <span className="text-xs text-gray-500">
            {caseStatus === "ARBITRATION" ? "Live" : "Inactive"}
          </span>
        </div>
      </div>

      <div
        ref={feedRef}
        className="p-4 space-y-3 max-h-96 overflow-y-auto"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className="animate-fadeIn"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start gap-2">
              <span className="text-sm mt-0.5">
                {ROLE_ICONS[msg.role] || "💬"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      ROLE_COLORS[msg.role] || "text-gray-400"
                    }`}
                  >
                    {msg.role}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5 leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {caseStatus === "ARBITRATION" && (
        <div className="px-4 py-2 border-t border-[#2a2a3a] bg-[#0a0a0f]">
          <p className="text-xs text-gray-600 flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Agents communicating via Gensyn AXL (encrypted P2P)
          </p>
        </div>
      )}
    </div>
  );
}

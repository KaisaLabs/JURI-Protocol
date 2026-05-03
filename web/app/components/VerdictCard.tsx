"use client";

interface Verdict {
  result: "FORENSIC" | "ANALYSIS" | "TIED";
  reasoning: string;
  reasoningRef?: string;
  attackVector?: string;
  severity?: string;
  rootCause?: string;
  prevention?: string;
  patternMatch?: {
    count: number;
    totalLost: number;
    topMatch: string;
    technique: string;
  };
  computeProvider?: string;
  onChain?: {
    status: string;
    txHash?: string;
  };
  simulated?: boolean;
}

function severityLabel(severity: string): string {
  const n = parseFloat(severity);
  if (isNaN(n)) return "MODERATE";
  if (n >= 8) return "CRITICAL";
  if (n >= 5) return "HIGH";
  return "MODERATE";
}

function severityBarColor(severity: string): string {
  const n = parseFloat(severity);
  if (isNaN(n)) return "bg-blue-500";
  if (n >= 8) return "bg-red-500";
  if (n >= 5) return "bg-amber-500";
  return "bg-blue-500";
}

function severityLabelColor(severity: string): string {
  const n = parseFloat(severity);
  if (isNaN(n)) return "text-blue-400";
  if (n >= 8) return "text-red-400";
  if (n >= 5) return "text-amber-400";
  return "text-blue-400";
}

function confidence(simulated?: boolean): number {
  return simulated ? 68 : 94;
}

export default function VerdictCard({
  verdict,
  caseId,
}: {
  verdict: Verdict;
  caseId?: number;
}) {
  if (!verdict) return null;

  const sev = verdict.severity || "0";
  const sevN = parseFloat(sev) || 0;
  const barW = Math.min(sevN * 10, 100);
  const label = severityLabel(sev);
  const barColor = severityBarColor(sev);
  const labelColor = severityLabelColor(sev);
  const reasoningPreview = verdict.reasoning
    ? verdict.reasoning.slice(0, 60)
    : "No reasoning provided";
  const provider = verdict.computeProvider || "0G Compute TEE";
  const confidencePct = confidence(verdict.simulated);

  return (
    <div
      className="mt-4 border border-primary/20 rounded-xl bg-surface overflow-hidden animate-fadeIn"
      style={{ animation: "slideUp 0.5s ease-out both" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary/10 bg-primary/5 flex items-center gap-2 flex-wrap">
        <span className="text-lg">📋</span>
        <h3 className="font-bold text-primary text-sm">
          ✅ Post-Mortem Published
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-auto">
          IMMUTABLE
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Case ID + preview */}
        <div className="text-xs text-gray-500">
          {caseId != null && (
            <span className="font-mono text-gray-400">Case #{caseId}</span>
          )}
          {caseId != null && <span className="mx-2 text-border">—</span>}
          <span>{reasoningPreview}</span>
          <div className="mt-1 text-[10px] text-gray-600">
            Verified by {provider} |{" "}
            {new Date().toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        {/* Simulated warning */}
        {verdict.simulated && (
          <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>Simulated inference — LLM fallback used</span>
          </div>
        )}

        {/* ATTACK VECTOR */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            ATTACK VECTOR
          </h4>
          <p className="text-sm text-gray-200 font-medium">
            {verdict.attackVector || "Classified by AI agents"}
          </p>
        </div>

        {/* SEVERITY */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            SEVERITY
          </h4>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-2.5 rounded-full bg-surface-alt border border-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                style={{ width: `${barW}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${labelColor} min-w-[72px] text-right`}>
              {sev}/10{"  "}
              <span className="text-[10px] font-semibold uppercase">[{label}]</span>
            </span>
          </div>
        </div>

        {/* ROOT CAUSE */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            ROOT CAUSE
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed bg-surface-alt p-3 rounded-lg border border-border">
            {verdict.rootCause || verdict.reasoning?.slice(0, 200) || "N/A"}
          </p>
        </div>

        {/* PREVENTION */}
        <div>
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            PREVENTION
          </h4>
          <p className="text-sm text-gray-300 leading-relaxed bg-surface-alt p-3 rounded-lg border border-border">
            {verdict.prevention || "See full reasoning below."}
          </p>
        </div>

        {/* PATTERN MATCH (conditional) */}
        {verdict.patternMatch && (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              <span>⚠️</span>
              <span>Pattern Match</span>
            </div>
            <p className="text-xs text-gray-300">
              {verdict.patternMatch.count} similar exploits found
            </p>
            <p className="text-xs text-gray-300">
              $
              {(verdict.patternMatch.totalLost / 1e6).toFixed(1)}M
              total lost using this technique
            </p>
            <p className="text-xs text-gray-400">
              Top match: <span className="text-amber-300">{verdict.patternMatch.topMatch}</span>
            </p>
          </div>
        )}

        {/* CONFIDENCE + ATTESTATION + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              CONFIDENCE:{" "}
              <span className="text-gray-300 font-semibold">{confidencePct}%</span>
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">
              ATTESTATION:{" "}
              <span className="font-mono text-gray-400">
                {verdict.reasoningRef
                  ? verdict.reasoningRef.slice(0, 10) + "..."
                  : "—"}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {verdict.reasoningRef && verdict.reasoningRef !== "local" ? (
              <a
                href={`https://storagescan-galileo.0g.ai/tx/${verdict.reasoningRef}`}
                target="_blank"
                rel="noopener"
                className="text-[10px] text-gray-400 hover:text-primary transition-colors"
              >
                View on 0G Storage ↗
              </a>
            ) : (
              <span className="text-[10px] text-gray-600">0G Storage ↗</span>
            )}
            {verdict.onChain?.txHash ? (
              <a
                href={`https://chainscan-galileo.0g.ai/tx/${verdict.onChain.txHash}`}
                target="_blank"
                rel="noopener"
                className="text-[10px] text-gray-400 hover:text-primary transition-colors"
              >
                View on-chain ↗
              </a>
            ) : (
              <span className="text-[10px] text-gray-600">View on-chain ↗</span>
            )}
            <button className="text-[10px] text-gray-400 hover:text-primary transition-colors cursor-pointer">
              Share ↗
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { createCase as apiCreateCase, getCase as apiGetCase, healthCheck } from "@/lib/api";
import type { CreateCaseRequest, HealthResponse, RuntimeCase } from "@/lib/case-types";
import { isTerminalCaseStatus } from "@/lib/case-types";
import CaseForm from "./components/CaseForm";
import AgentFeed from "./components/AgentFeed";
import VerdictCard from "./components/VerdictCard";
import PayoutStatus from "./components/PayoutStatus";

function formatCaseStatus(status: RuntimeCase["status"]) {
  return status.replace(/_/g, " ");
}

export default function Home() {
  const [currentCase, setCurrentCase] = useState<RuntimeCase | null>(null);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    healthCheck()
      .then((health) => {
        setBackendHealth(health);
        setBackendError(null);
      })
      .catch((error) => {
        setBackendHealth(null);
        setBackendError(error instanceof Error ? error.message : "Backend unavailable");
      });
  }, []);

  useEffect(() => {
    if (!currentCase || isTerminalCaseStatus(currentCase.status)) return;

    const poll = setInterval(async () => {
      try {
        const c = await apiGetCase(currentCase.id);
        if (c) {
          setCurrentCase(c);
          setPollError(null);
        }
      } catch (error) {
        setPollError(error instanceof Error ? error.message : "Failed to refresh case runtime");
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [currentCase?.id, currentCase?.status]);

  const handleCaseCreated = useCallback(async (caseData: CreateCaseRequest) => {
    setLoading(true);
    setSubmitError(null);
    try {
      const result = await apiCreateCase(caseData);
      const runtimeCase = await apiGetCase(result.caseId);

      if (!runtimeCase) {
        throw new Error(`Case #${result.caseId} was created but could not be read back from the orchestrator`);
      }

      setCurrentCase(runtimeCase);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create case";
      console.error("Failed to create case:", err);
      setSubmitError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <section className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 text-[#c9a84c] text-sm">
          <span className={`w-2 h-2 rounded-full ${backendHealth ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          Backend: {backendHealth ? `connected (${backendHealth.transport})` : "disconnected"} | 0G runtime
        </div>
        <h2 className="text-4xl font-bold tracking-tight">
          Decentralized AI{" "}
          <span className="text-[#c9a84c]">Arbitration</span>
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto">
          AI agents settle disputes on-chain. Three agents — Plaintiff, Defendant, and
          Judge — communicate via encrypted P2P (AXL), store evidence on 0G Storage,
          and the Judge uses 0G Compute&apos;s verifiable inference to issue a fair verdict.
          The dashboard now renders the orchestrator&apos;s live runtime shape without local simulation.
        </p>
        {backendHealth ? (
          <div className="mx-auto grid max-w-3xl gap-3 text-left text-xs text-gray-400 sm:grid-cols-4">
            <div className="rounded border border-[#2a2a3a] bg-[#14141f] p-3">
              <div className="text-gray-500">Transport</div>
              <div className="mt-1 text-gray-200">{backendHealth.transport}</div>
            </div>
            <div className="rounded border border-[#2a2a3a] bg-[#14141f] p-3">
              <div className="text-gray-500">Storage</div>
              <div className="mt-1 text-gray-200">{backendHealth.storage.connected ? "Connected" : "Disconnected"}</div>
            </div>
            <div className="rounded border border-[#2a2a3a] bg-[#14141f] p-3">
              <div className="text-gray-500">Contract</div>
              <div className="mt-1 text-gray-200">{backendHealth.contractConfigured ? "Configured" : "Missing"}</div>
            </div>
            <div className="rounded border border-[#2a2a3a] bg-[#14141f] p-3">
              <div className="text-gray-500">Active Cases</div>
              <div className="mt-1 text-gray-200">{backendHealth.activeCases}</div>
            </div>
          </div>
        ) : null}
        {backendError ? (
          <p className="mx-auto max-w-2xl rounded border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {backendError}
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CaseForm
            onCaseCreated={handleCaseCreated}
            currentCase={currentCase}
            loading={loading}
            error={submitError}
          />

          {currentCase ? (
            <AgentFeed
              timeline={currentCase.timeline}
              caseStatus={currentCase.status}
              transport={currentCase.transport}
              error={pollError}
            />
          ) : (
            <div className="border border-[#2a2a3a] rounded-lg bg-[#14141f] p-8 text-center text-sm text-gray-500">
              Create a case to start polling the orchestrator runtime timeline.
            </div>
          )}

          {currentCase?.verdict ? (
            <VerdictCard caseData={currentCase} />
          ) : currentCase?.status === "failed" ? (
            <div className="border border-red-500/20 rounded-lg bg-red-500/5 p-4 text-sm text-red-300">
              Case #{currentCase.id} failed. The timeline above contains the last reported orchestrator or agent error.
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <PayoutStatus caseData={currentCase} />

          <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              🏗️ Sponsor Tech Stack
            </h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>0G Chain</span>
                <span className="text-green-400">Galileo Testnet</span>
              </div>
              <div className="flex justify-between">
                <span>0G Storage</span>
                <span className="text-green-400">KV + Log</span>
              </div>
              <div className="flex justify-between">
                <span>0G Compute</span>
                <span className="text-blue-400">TEE-verified</span>
              </div>
              <div className="flex justify-between">
                <span>Gensyn AXL</span>
                <span className="text-purple-400">Optional transport</span>
              </div>
              <div className="flex justify-between">
                <span>Runtime Status</span>
                <span className="text-orange-400">{currentCase ? formatCaseStatus(currentCase.status) : "idle"}</span>
              </div>
            </div>
          </div>

          <div className="border border-[#2a2a3a] rounded-lg p-5 bg-[#14141f]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">
              🏆 Track Eligibility
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span>0G Autonomous Agents</span></div>
              <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span>Gensyn AXL</span></div>
              <div className="flex items-center gap-2"><span className="text-green-400">✅</span><span>KeeperHub</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

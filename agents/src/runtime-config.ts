import type { AgentRole } from "./types";
import { ethers } from "ethers";

export type TransportMode = "direct" | "axl";

export interface RuntimeConfig {
  transportMode: TransportMode;
  orchestratorUrl: string;
  controlPorts: Record<AgentRole, number>;
  controlToken: string;
  bindHost: string;
}

const DEFAULT_CONTROL_PORTS: Record<AgentRole, number> = {
  plaintiff: 9101,
  defendant: 9102,
  judge: 9103,
};

export function resolveTransportMode(value = process.env.AGENT_TRANSPORT): TransportMode {
  const mode = (value || "direct").toLowerCase();
  if (mode === "direct" || mode === "axl") {
    return mode;
  }
  throw new Error(`Unsupported AGENT_TRANSPORT \"${value}\". Use \"direct\" or \"axl\".`);
}

export function getControlPort(role: AgentRole): number {
  const envKey = `${role.toUpperCase()}_CONTROL_PORT`;
  const configured = process.env[envKey];
  return parseInt(configured || String(DEFAULT_CONTROL_PORTS[role]), 10);
}

export function getRuntimeConfig(): RuntimeConfig {
  const controlToken = process.env.AGENT_CONTROL_TOKEN;
  if (!controlToken) {
    throw new Error("AGENT_CONTROL_TOKEN is required for control-plane and runtime update POST endpoints");
  }

  return {
    transportMode: resolveTransportMode(),
    orchestratorUrl: process.env.ORCHESTRATOR_URL || `http://127.0.0.1:${process.env.API_PORT || "4000"}`,
    controlToken,
    bindHost: "127.0.0.1",
    controlPorts: {
      plaintiff: getControlPort("plaintiff"),
      defendant: getControlPort("defendant"),
      judge: getControlPort("judge"),
    },
  };
}

export function isContractBackedFlowEnabled(): boolean {
  return Boolean(process.env.CONTRACT_ADDRESS);
}

export function getRolePrivateKey(role: AgentRole): string {
  const roleKey = process.env[`${role.toUpperCase()}_KEY`];
  if (isContractBackedFlowEnabled()) {
    if (!roleKey) {
      throw new Error(`${role.toUpperCase()}_KEY is required when CONTRACT_ADDRESS is configured`);
    }
    return roleKey;
  }

  return roleKey || process.env.PRIVATE_KEY || fallbackPrivateKey(role);
}

export function getRoleAddress(role: AgentRole): string {
  const key = getRolePrivateKey(role);
  const derivedAddress = new ethers.Wallet(key).address;
  const configuredAddress = process.env[`${role.toUpperCase()}_ADDRESS`];
  if (configuredAddress && configuredAddress.toLowerCase() !== derivedAddress.toLowerCase()) {
    throw new Error(`${role.toUpperCase()}_ADDRESS does not match ${role.toUpperCase()}_KEY`);
  }
  return configuredAddress || derivedAddress;
}

export function validateDistinctRoleSigners(): void {
  if (!isContractBackedFlowEnabled()) {
    return;
  }

  const roles: AgentRole[] = ["plaintiff", "defendant", "judge"];
  const addresses = roles.map((role) => ({ role, address: getRoleAddress(role).toLowerCase() }));
  const uniqueAddresses = new Set(addresses.map((entry) => entry.address));
  if (uniqueAddresses.size !== roles.length) {
    throw new Error("Distinct PLAINTIFF_KEY, DEFENDANT_KEY, and JUDGE_KEY are required when CONTRACT_ADDRESS is configured");
  }
}

function fallbackPrivateKey(role: AgentRole): string {
  switch (role) {
    case "plaintiff":
      return "0x0000000000000000000000000000000000000000000000000000000000000001";
    case "defendant":
      return "0x0000000000000000000000000000000000000000000000000000000000000002";
    case "judge":
      return "0x0000000000000000000000000000000000000000000000000000000000000003";
  }
}

#!/usr/bin/env node
/**
 * ⚖️ Agent Court — E2E System Test
 * Usage: pnpm test:e2e
 */
const fs = require("fs"), path = require("path"), { spawn } = require("child_process");

// Load .env
const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)/);
    if (m && !m[2].startsWith('"')) process.env[m[1]] = m[2].replace(/"/g, "");
  }
}

const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", b: "\x1b[34m", c: "\x1b[36m", x: "\x1b[0m", B: "\x1b[1m" };
const API_PORT = process.env.API_PORT || "4000";
const API_URL = `http://localhost:${API_PORT}`;
const ROOT = path.resolve(__dirname, "..");
const AGENTS = path.join(ROOT, "agents");
const TSX = path.join(AGENTS, "node_modules", ".bin", "tsx");

function log(icon: string, msg: string, color = "") { console.log(`${color}${icon} ${msg}${C.x}`); }
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
const procs: any[] = [];

function start(label: string, script: string) {
  const p = spawn("node", [TSX, script], {
    cwd: AGENTS,
    env: { ...process.env, AGENT_TRANSPORT: process.env.AGENT_TRANSPORT || "direct", FORCE_COLOR: "1" },
    stdio: "pipe",
  });
  p.stdout.on("data", (d: Buffer) => {
    for (const l of d.toString().trim().split("\n")) {
      if (l) console.log(`${C.c}[${label}]${C.x} ${l}`);
    }
  });
  p.stderr.on("data", (d: Buffer) => {
    for (const l of d.toString().trim().split("\n")) {
      if (l && !l.includes("ExperimentalWarning")) console.log(`${C.y}[${label}]${C.x} ${l}`);
    }
  });
  procs.push(p);
  return p;
}

function cleanup() {
  for (const p of procs) { try { p.kill("SIGTERM"); } catch {} }
  setTimeout(() => { for (const p of procs) { try { p.kill("SIGKILL"); } catch {} } process.exit(0); }, 500);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

async function main() {
  console.log(`\n${C.B}${C.b}╔══════════════════════════════════════════╗`);
  console.log(`║  ⚖️  Agent Court — E2E System Test       ║`);
  console.log(`║  Transport: ${(process.env.AGENT_TRANSPORT || "direct").padEnd(24)}║`);
  console.log(`╚══════════════════════════════════════════╝${C.x}\n`);

  const llmSet = process.env.CUSTOM_LLM_URL && !process.env.CUSTOM_LLM_URL?.includes("your_custom");
  if (!llmSet) log("⚠️ ", "LLM not configured — agents use SIMULATED responses", C.y);

  // Start orchestrator
  log("\n🔧", "Orchestrator...", C.b);
  start("ORCH", "src/orchestrator.ts");
  await sleep(3000);

  try {
    await fetch(`${API_URL}/api/health`);
    log("✅", "Orchestrator ready", C.g);
  } catch {
    log("❌", "Orchestrator failed — check port " + API_PORT, C.r);
    cleanup(); return;
  }

  // Start agents
  log("\n🤖", "Agents...", C.b);
  start("PLAINTIFF", "src/plaintiff.ts"); await sleep(2000);
  start("DEFENDANT", "src/defendant.ts"); await sleep(2000);
  start("JUDGE", "src/judge.ts"); await sleep(4000);

  // Create case
  const dispute = "Will Ethereum surpass $10,000 by the end of 2026?";
  log("\n📋", `Case: "${dispute}"`, C.b);

  let caseId: number | null = null;
  try {
    const r = await fetch(`${API_URL}/api/case`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispute }),
    });
    caseId = (await r.json()).caseId;
    log("✅", `Case #${caseId}`, C.g);
  } catch (e: any) { log("⚠️ ", `API: ${e.message}`, C.y); }

  // Monitor
  log("\n👀", "Monitoring (Ctrl+C to stop)...", C.b);
  const start = Date.now();

  while (Date.now() - start < 120000) {
    await sleep(5000);
    const elapsed = Math.floor((Date.now() - start) / 1000);

    if (caseId) {
      try {
        const r = await fetch(`${API_URL}/api/case/${caseId}`);
        const c = await r.json();
        if (c?.status === "RESOLVED") {
          log("\n⚖️ ", `${C.B}RESOLVED: ${c.verdict?.result || "?"}${C.x}`, C.g);
          if (c.verdict?.reasoning) log("   ", c.verdict.reasoning.slice(0, 300) + "...", C.c);
          break;
        }
      } catch {}
    }
    if (elapsed > 0 && elapsed % 20 === 0) log("⏳", `${elapsed}s...`, C.y);
  }

  log("\n🛑", "Done.", C.b);
  cleanup();
}

main().catch((e) => { console.error(e); cleanup(); });

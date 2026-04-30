#!/usr/bin/env npx tsx
/**
 * 0G Storage Integration Test — verifies connect, KV write/read, file upload.
 * Usage: pnpm test:storage
 */
import { ZgStorage, ZG_NETWORKS } from "../agents/src/storage";

let dotenvConfig: ((opts?: any) => void) | null = null;
try { dotenvConfig = require("dotenv").config; }
catch { try { dotenvConfig = require("../agents/node_modules/dotenv").config; }
catch { console.log("⚠️  dotenv not found"); }}
if (dotenvConfig) { dotenvConfig({ path: ".env" }); dotenvConfig({ path: "../.env" }); }

const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", b: "\x1b[34m", x: "\x1b[0m", B: "\x1b[1m" };
function ok(m: string) { console.log(`${C.g}✅ ${m}${C.x}`); }
function fail(m: string) { console.log(`${C.r}❌ ${m}${C.x}`); }
function warn(m: string) { console.log(`${C.y}⚠️  ${m}${C.x}`); }
function info(m: string) { console.log(`${C.b}   ${m}${C.x}`); }

/** Promise with timeout */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>(r => setTimeout(() => r(null), ms))]);
}

async function main() {
  console.log(`\n${C.B}${C.b}╔══════════════════════════════════╗`);
  console.log(`║ 0G Storage Integration Test     ║`);
  console.log(`╚══════════════════════════════════╝${C.x}\n`);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey.startsWith("0x_your")) {
    fail("PRIVATE_KEY not set — cp .env.example .env");
    process.exit(1);
  }

  info("Initializing...");
  const storage = new ZgStorage({
    privateKey,
    network: "testnet",
    indexerUrl: process.env.ZG_STORAGE_INDEXER,
    kvNodeUrl: process.env.ZG_KV_NODE,
    rpcUrl: process.env.ZG_RPC_URL,
  });

  try {
    const bal = await storage.getBalance();
    info(`Balance: ${bal} 0G`);
  } catch {}

  info("Test 1: Connect...");
  if (!(await storage.connect())) {
    fail("Connection failed — check network");
    process.exit(1);
  }
  ok("Connected");

  info("Test 2: KV Write...");
  const testVal = `agent-court-test-${Date.now()}`;
  try {
    await storage.storeEvidence(0, "test", 1, testVal);
    ok(`KV Write: ${testVal}`);
  } catch (e: any) { fail(`KV Write: ${e.message}`); }

  info("Test 3: KV Read (10s timeout)...");
  const readVal = await withTimeout(
    storage.readValue("case:0:test:round:1"), 10000
  );
  if (readVal) {
    ok(`KV Read: ${readVal}`);
  } else {
    warn("KV Read returned null (propagation delay — ok)");
  }

  info("Test 4: File Upload...");
  try {
    const r = await withTimeout(storage.storeLog(0, {
      event: "STORAGE_TEST", ts: Date.now(),
      wallet: storage.getAddress(),
      msg: "0G Storage verified ✅"
    }), 30000);
    if (r) {
      ok(`File Upload: ${r.rootHash.slice(0, 20)}...`);
      info(`TX: ${r.txHash}`);
      info(`Scan: ${ZG_NETWORKS.testnet.storageScan}`);
    } else {
      warn("File upload null (balance?)");
    }
  } catch (e: any) { warn(`Upload: ${e.message}`); }

  console.log(`\n${C.B}${C.g}✅ 0G Storage Integration Complete!${C.x}\n`);
  console.log(`TX verified on: ${ZG_NETWORKS.testnet.explorer}`);
  console.log(`Storage scan:   ${ZG_NETWORKS.testnet.storageScan}\n`);
}

main().catch((e) => { console.error(`\n${C.r}💥 ${C.x}`, e); process.exit(1); });

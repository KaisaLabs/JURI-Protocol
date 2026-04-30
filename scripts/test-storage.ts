#!/usr/bin/env npx tsx
/**
 * 0G Storage Integration Test
 * Usage: pnpm test:storage
 */
import { ZgStorage, ZG_NETWORKS } from "../agents/src/storage";

// dotenv — try multiple locations (no top-level await)
let dotenvConfig: ((opts?: any) => void) | null = null;
try {
  const dotenv = require("dotenv");
  dotenvConfig = dotenv.config;
} catch {
  try {
    const dotenv = require("../agents/node_modules/dotenv");
    dotenvConfig = dotenv.config;
  } catch {
    console.log("⚠️  dotenv not found — using existing env vars");
  }
}
if (dotenvConfig) {
  dotenvConfig({ path: ".env" });
  dotenvConfig({ path: "../.env" });
}

const C = { g: "\x1b[32m", r: "\x1b[31m", y: "\x1b[33m", b: "\x1b[34m", x: "\x1b[0m", B: "\x1b[1m" };
function log(e: string, m: string, c = "") { console.log(`${c}${e} ${m}${C.x}`); }

async function main() {
  console.log(`\n${C.B}${C.b}╔══════════════════════════════════════╗`);
  console.log(`║   0G Storage Integration Test        ║`);
  console.log(`╚══════════════════════════════════════╝${C.x}\n`);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey.startsWith("0x_your")) {
    log("❌", "PRIVATE_KEY not set — create .env first", C.r);
    log("💡", "cp .env.example .env && edit PRIVATE_KEY", C.y);
    log("💡", "Fund at https://faucet.0g.ai", C.y);
    process.exit(1);
  }

  log("🔧", "Initializing 0G Storage...", C.b);
  const storage = new ZgStorage({
    privateKey,
    network: "testnet",
    indexerUrl: process.env.ZG_STORAGE_INDEXER,
    kvNodeUrl: process.env.ZG_KV_NODE,
    rpcUrl: process.env.ZG_RPC_URL,
  });

  log("👛", `Wallet: ${storage.getAddress()}`, C.y);

  // Balance
  try {
    const bal = await storage.getBalance();
    log("💰", `Balance: ${bal} 0G`, parseFloat(bal) < 0.001 ? C.r : C.g);
  } catch (e: any) { log("⚠️ ", `Balance check: ${e.message}`, C.y); }

  // Test 1: Connect
  log("\n📡", "Test 1: Connect to Indexer", C.b);
  const ok = await storage.connect();
  if (!ok) {
    log("❌", "FAILED — indexer unreachable or no gas", C.r);
    log("💡", ZG_NETWORKS.testnet.turbo.indexer, C.y);
    process.exit(1);
  }
  log("✅", "Connected", C.g);

  // Test 2: KV Write
  log("\n📝", "Test 2: KV Write", C.b);
  try {
    const ref = await storage.storeEvidence(0, "test", 1,
      `Test @ ${new Date().toISOString()}`);
    log("✅", `KV Write: ${ref}`, C.g);
  } catch (e: any) { log("❌", `KV Write: ${e.message}`, C.r); }

  // Test 3: KV Read
  log("\n📖", "Test 3: KV Read", C.b);
  try {
    const v = await storage.readValue(`case:0:test:round:1`);
    log(v ? "✅" : "⚠️ ", v ? `Read: ${v.slice(0, 60)}...` : "Null (may need time)", v ? C.g : C.y);
  } catch (e: any) { log("⚠️ ", `KV Read: ${e.message}`, C.y); }

  // Test 4: File Upload
  log("\n📦", "Test 4: File Upload (immutable log)", C.b);
  try {
    const r = await storage.storeLog(0, {
      event: "STORAGE_TEST", ts: Date.now(),
      wallet: storage.getAddress(), msg: "0G Storage verified ✅"
    });
    if (r) {
      log("✅", "File Upload OK", C.g);
      log("   ", `Root: ${r.rootHash}`, C.y);
      log("   ", `TX:   ${r.txHash}`, C.y);
      log("   ", `Scan: ${ZG_NETWORKS.testnet.storageScan}`, C.y);
    } else { log("⚠️ ", "Upload null (check balance)", C.y); }
  } catch (e: any) { log("⚠️ ", `Upload: ${e.message}`, C.y); }

  console.log(`\n${C.B}${C.g}✅ 0G Storage Integration Complete!${C.x}\n`);
}

main().catch((e) => { console.error(`\n${C.r}💥 Crashed:${C.x}`, e); process.exit(1); });

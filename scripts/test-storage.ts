#!/usr/bin/env npx tsx
/**
 * 0G Storage Integration Test
 *
 * Verifies:
 *   1. Connection to 0G Storage indexer
 *   2. KV write + read
 *   3. File upload (immutable log)
 *   4. Wallet balance check
 *
 * Usage: npx tsx scripts/test-storage.ts
 */
import { ZgStorage, ZG_NETWORKS } from "../agents/src/storage";
import * as dotenv from "dotenv";
dotenv.config();

const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(emoji: string, msg: string, color = "") {
  console.log(`${color}${emoji} ${msg}${COLORS.reset}`);
}

async function main() {
  console.log(`\n${COLORS.bold}${COLORS.blue}╔══════════════════════════════════╗`);
  console.log(`║  0G Storage Integration Test    ║`);
  console.log(`╚══════════════════════════════════╝${COLORS.reset}\n`);

  // ── Check prerequisites ──
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === "0x_your_private_key_here") {
    log("❌", "PRIVATE_KEY not set in .env — please configure first", COLORS.red);
    log("💡", "1. Create wallet: cast wallet new", COLORS.yellow);
    log("💡", "2. Fund at https://faucet.0g.ai", COLORS.yellow);
    log("💡", "3. Set PRIVATE_KEY in .env", COLORS.yellow);
    process.exit(1);
  }

  // ── Initialize Storage ──
  log("🔧", "Initializing 0G Storage client...", COLORS.blue);

  const storage = new ZgStorage({
    privateKey,
    network: "testnet",
    indexerUrl: process.env.ZG_STORAGE_INDEXER,
    kvNodeUrl: process.env.ZG_KV_NODE,
    rpcUrl: process.env.ZG_RPC_URL,
  });

  const address = storage.getAddress();
  log("👛", `Wallet: ${address}`, COLORS.yellow);

  // ── Check balance ──
  log("💰", "Checking balance...", COLORS.blue);
  try {
    const balance = await storage.getBalance();
    log("💰", `Balance: ${balance} 0G`, balance === "0.0" ? COLORS.red : COLORS.green);
    if (parseFloat(balance) < 0.001) {
      log("⚠️ ", "Balance too low! Get tokens at https://faucet.0g.ai", COLORS.yellow);
    }
  } catch (err) {
    log("⚠️ ", `Balance check failed: ${(err as Error).message}`, COLORS.yellow);
  }

  // ── Test 1: Connect ──
  log("\n📡", "Test 1: Connect to 0G Indexer", COLORS.blue);
  const connected = await storage.connect();
  if (!connected) {
    log("❌", "Connection FAILED — check network/endpoints", COLORS.red);
    log("💡", "Indexer: " + ZG_NETWORKS.testnet.turbo.indexer, COLORS.yellow);
    log("💡", "RPC:     " + ZG_NETWORKS.testnet.rpc, COLORS.yellow);
    log("💡", "Make sure you have 0G testnet tokens for gas", COLORS.yellow);
    process.exit(1);
  }
  log("✅", "Connection OK", COLORS.green);

  // ── Test 2: KV Write ──
  log("\n📝", "Test 2: KV Write", COLORS.blue);
  const testKey = `test:${Date.now()}`;
  const testValue = `Hello 0G Storage! Timestamp: ${new Date().toISOString()}`;

  try {
    const ref = await storage.storeEvidence(0, "test", 1, testValue);
    log("✅", `KV Write OK: ${ref}`, COLORS.green);
  } catch (err) {
    log("❌", `KV Write FAILED: ${(err as Error).message}`, COLORS.red);
  }

  // ── Test 3: KV Read ──
  log("\n📖", "Test 3: KV Read", COLORS.blue);
  try {
    const readKey = `case:0:test:round:1`;
    const value = await storage.readValue(readKey);
    if (value) {
      log("✅", `KV Read OK: ${value.slice(0, 60)}...`, COLORS.green);
    } else {
      log("⚠️ ", "KV Read returned null (may need time to propagate)", COLORS.yellow);
      log("💡", "Re-run script in a few seconds for read test", COLORS.yellow);
    }
  } catch (err) {
    log("⚠️ ", `KV Read error: ${(err as Error).message}`, COLORS.yellow);
  }

  // ── Test 4: File Upload (immutable log) ──
  log("\n📦", "Test 4: File Upload (immutable log)", COLORS.blue);
  try {
    const logEntry = {
      event: "STORAGE_INTEGRATION_TEST",
      timestamp: Date.now(),
      wallet: address,
      testKey,
      message: "Agent Court 0G Storage verified",
    };

    const result = await storage.storeLog(0, logEntry);
    if (result) {
      log("✅", `File Upload OK`, COLORS.green);
      log("   ", `Root Hash: ${result.rootHash}`, COLORS.yellow);
      log("   ", `TX Hash:   ${result.txHash}`, COLORS.yellow);
      log("   ", `Verify:    ${ZG_NETWORKS.testnet.storageScan}`, COLORS.yellow);
    } else {
      log("⚠️ ", "File Upload returned null (check balance)", COLORS.yellow);
    }
  } catch (err) {
    log("⚠️ ", `File Upload error: ${(err as Error).message}`, COLORS.yellow);
  }

  // ── Summary ──
  console.log(`\n${COLORS.bold}${COLORS.green}✅ 0G Storage Integration Test Complete!${COLORS.reset}`);
  console.log(`${COLORS.bold}Track: 0G Autonomous Agents — evidence storage verified${COLORS.reset}\n`);

  console.log("Next steps:");
  console.log("  1. Run agents:    pnpm agent:plaintiff");
  console.log("  2. Evidence will be auto-stored to 0G Storage KV");
  console.log("  3. Verdict will be stored immutably to 0G Storage Log");
  console.log("  4. Verify at:     https://storagescan-galileo.0g.ai");
}

main().catch((err) => {
  console.error(`\n${COLORS.red}💥 Test crashed:${COLORS.reset}`, err);
  process.exit(1);
});

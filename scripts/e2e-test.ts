#!/usr/bin/env node
const fs = require("fs"), path = require("path"), { exec } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), AGENTS = path.join(ROOT, "agents");
const TSX = path.join(AGENTS, "node_modules", ".bin", "tsx");
const API_URL = "http://localhost:" + (process.env.API_PORT || "4000");

// Load .env
const ep = path.join(ROOT, ".env");
if (fs.existsSync(ep)) {
  for (const l of fs.readFileSync(ep,"utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)/);
    if (m && !l.startsWith("#")) process.env[m[1]] = m[2].replace(/"/g,"");
  }
}

const procs = [];
function st(label, script) {
  const p = exec(TSX + " " + script, {cwd:AGENTS, env:{...process.env, AGENT_TRANSPORT:"direct"}});
  p.stdout.on("data", d => d.toString().trim().split("\n").forEach(l => process.stdout.write("\x1b[36m[" + label + "]\x1b[0m " + l + "\n")));
  p.stderr.on("data", d => d.toString().trim().split("\n").forEach(l => { if(l && !l.includes("ExperimentalWarning") && !l.includes("npm warn")) process.stdout.write("\x1b[33m[" + label + "]\x1b[0m " + l + "\n"); }));
  procs.push(p);
}
function done() { procs.forEach(p => {try{p.kill()}catch{}}); setTimeout(()=>process.exit(0),500); }
process.on("SIGINT",done); process.on("SIGTERM",done);

(async () => {
  console.log("\n⚖️  Agent Court E2E\n");

  console.log("🔧 Orchestrator...");
  st("ORCH","src/orchestrator.ts");
  await new Promise(r=>setTimeout(r,3000));

  try{await fetch(API_URL+"/api/health");console.log("✅ Orchestrator ready\n");}
  catch(e){console.log("❌",e.message);done();return;}

  console.log("👨‍⚖️  Judge...");
  st("JUDGE","src/judge.ts");
  await new Promise(r=>setTimeout(r,3000));

  console.log("📢 Plaintiff...");
  st("PLAINTIFF","src/plaintiff.ts");
  await new Promise(r=>setTimeout(r,2000));

  console.log("🛡️  Defendant...");
  st("DEFENDANT","src/defendant.ts");
  await new Promise(r=>setTimeout(r,4000));

  const d = "Will ETH exceed $3000 by June 2026?";
  console.log("\n📋 Case: " + d);

  let cid;
  try{
    cid=(await(await fetch(API_URL+"/api/case",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dispute:d})})).json()).caseId;
    console.log("✅ Case #" + cid + "\n");
  }catch(e){console.log("⚠️",e.message);}

  console.log("👀 Monitoring...\n");
  for(let i=0;i<120;i++){
    await new Promise(r=>setTimeout(r,3000));
    if(cid){try{
      const c=await(await fetch(API_URL+"/api/case/"+cid)).json();
      if(c&&c.status==="RESOLVED"){console.log("\n⚖️  RESOLVED: "+(c.verdict?.result||"?")+"\n");if(c.verdict?.reasoning)console.log(c.verdict.reasoning.slice(0,500)+"\n");break;}
    }catch{}}
  }
  console.log("\n🛑 Done.\n");
  done();
})();

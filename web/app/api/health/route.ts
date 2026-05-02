import { proxyToOrchestrator } from "../_lib/orchestrator";

export async function GET() {
  return proxyToOrchestrator("/api/health");
}

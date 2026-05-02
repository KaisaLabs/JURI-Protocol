import { proxyToOrchestrator } from "../_lib/orchestrator";

export async function POST(request: Request) {
  const body = await request.text();

  return proxyToOrchestrator("/api/case", {
    method: "POST",
    body,
  });
}

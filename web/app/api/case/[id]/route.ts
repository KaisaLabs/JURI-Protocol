import { proxyToOrchestrator } from "../../_lib/orchestrator";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  return proxyToOrchestrator(`/api/case/${id}`);
}

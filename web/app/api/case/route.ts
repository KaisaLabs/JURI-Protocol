import { proxyToOrchestrator } from "../_lib/orchestrator";
import { INVALID_STAKE_ERROR, parseStakeInput } from "@/lib/stake";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const dispute = typeof body?.dispute === "string" ? body.dispute.trim() : "";
  const stake = typeof body?.stake === "string" ? body.stake : "";
  const parsedStake = parseStakeInput(stake);

  if (!dispute) {
    return NextResponse.json({ error: "Dispute is required." }, { status: 400 });
  }

  if (!parsedStake.ok) {
    return NextResponse.json({ error: INVALID_STAKE_ERROR }, { status: 400 });
  }

  return proxyToOrchestrator("/api/case", {
    method: "POST",
    body: JSON.stringify({
      dispute,
      stake: parsedStake.value,
    }),
  });
}

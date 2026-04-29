import { NextResponse } from "next/server";

/**
 * POST /api/case — Create a new dispute case.
 * In production, this stores the dispute to 0G Storage KV
 * and triggers the smart contract + AXL notifications.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dispute, stake, plaintiffAddress, defendantAddress, judgeAddress } = body;

    if (!dispute || !stake) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production:
    // 1. Store dispute to 0G Storage KV
    // 2. Deploy or call AgentCourt.sol createCase()
    // 3. Notify agents via AXL

    const caseId = Math.floor(Math.random() * 10000);

    return NextResponse.json({
      success: true,
      case: {
        id: caseId,
        dispute,
        stake,
        plaintiffAddress: plaintiffAddress || "0xP1aint1ff...",
        defendantAddress: defendantAddress || "0xD3f3ndant...",
        judgeAddress: judgeAddress || "0xJudg3...",
        status: "ARBITRATION",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

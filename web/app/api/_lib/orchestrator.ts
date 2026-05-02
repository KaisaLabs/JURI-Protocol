import { NextResponse } from "next/server";

const ORCHESTRATOR_BASE_URL =
  process.env.ORCHESTRATOR_URL || `http://127.0.0.1:${process.env.API_PORT || "4000"}`;

export async function proxyToOrchestrator(path: string, init?: RequestInit) {
  try {
    const upstream = await fetch(`${ORCHESTRATOR_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });

    const text = await upstream.text();
    const body = text ? JSON.parse(text) : null;

    return NextResponse.json(body, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to reach orchestrator: ${error.message}`
            : "Failed to reach orchestrator",
      },
      { status: 502 }
    );
  }
}

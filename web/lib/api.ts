import type {
  ApiErrorResponse,
  CreateCaseRequest,
  CreateCaseResponse,
  HealthResponse,
  RuntimeCase,
} from "./case-types";
import { parseStakeInput } from "./stake";

async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = (await res.json().catch(() => null)) as T | ApiErrorResponse | null;

  if (!res.ok) {
    const error = body && typeof body === "object" && "error" in body ? body.error : "Request failed";
    throw new Error(error);
  }

  return body as T;
}

export function createCase(input: CreateCaseRequest): Promise<CreateCaseResponse> {
  const parsedStake = parseStakeInput(input.stake);
  if (!parsedStake.ok) {
    throw new Error(parsedStake.error);
  }

  return readJson<CreateCaseResponse>("/api/case", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      stake: parsedStake.value,
    }),
  });
}

export async function getCase(caseId: number): Promise<RuntimeCase | null> {
  try {
    return await readJson<RuntimeCase>(`/api/case/${caseId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "Case not found") {
      return null;
    }
    throw error;
  }
}

export function getCases(): Promise<RuntimeCase[]> {
  return readJson<RuntimeCase[]>("/api/cases");
}

export function healthCheck(): Promise<HealthResponse> {
  return readJson<HealthResponse>("/api/health");
}

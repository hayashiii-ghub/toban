import type { ScheduleData } from "@shared/schemas";
import {
  createScheduleResponseSchema,
  scheduleResponseSchema,
  type CreateScheduleResponseData,
  type ScheduleResponseData,
} from "./apiSchemas";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

function parseResponse<T>(schema: { parse(data: unknown): T }, data: unknown, endpoint: string): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new Error(
      `Invalid API response from ${endpoint}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

/** リクエストタイムアウト（keepalive送信時は適用しない） */
const FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { keepalive?: boolean },
): Promise<Response> {
  if (init?.keepalive) return fetch(input, init);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId),
  );
}

/** Status codes that should never be retried (client errors). */
function isRetriable(status: number): boolean {
  return status >= 500;
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit & { keepalive?: boolean },
  maxRetries = 2,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(input, init);
      if (res.ok || !isRetriable(res.status)) return res;
      // 5xx: retry
      if (attempt < maxRetries) {
        console.warn(`[api] サーバーエラー ${res.status}, リトライ ${attempt + 1}/${maxRetries}: ${String(input)}`);
        await new Promise((r) => setTimeout(r, 1000 * 3 ** attempt));
        continue;
      }
      return res;
    } catch (error) {
      // Network error: retry
      if (attempt < maxRetries) {
        console.warn(`[api] ネットワークエラー, リトライ ${attempt + 1}/${maxRetries}: ${String(input)}`, error);
        await new Promise((r) => setTimeout(r, 1000 * 3 ** attempt));
        continue;
      }
      throw error;
    }
  }
  // Unreachable, but satisfies TypeScript
  throw new Error("fetchWithRetry: unexpected state");
}

const BASE = "/api/schedules";

export async function createSchedule(
  data: ScheduleData,
  options?: { keepalive?: boolean },
): Promise<CreateScheduleResponseData> {
  const res = await fetchWithRetry(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: options?.keepalive,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(`Failed to create schedule: ${res.status}`, res.status);
  const json = await res.json();
  return parseResponse(createScheduleResponseSchema, json, "POST /api/schedules");
}

export async function getSchedule(slug: string): Promise<ScheduleResponseData> {
  const res = await fetchWithTimeout(`${BASE}/${slug}`);
  if (!res.ok) throw new ApiError(`Failed to fetch schedule: ${res.status}`, res.status);
  const json = await res.json();
  return parseResponse(scheduleResponseSchema, json, `GET /api/schedules/${slug}`);
}

export async function getScheduleForEdit(
  slug: string,
  editToken: string,
): Promise<ScheduleResponseData> {
  const res = await fetchWithTimeout(`${BASE}/${slug}/edit`, {
    headers: { "x-edit-token": editToken },
  });
  if (!res.ok) throw new ApiError(`Failed to fetch editable schedule: ${res.status}`, res.status);
  const json = await res.json();
  return parseResponse(scheduleResponseSchema, json, `GET /api/schedules/${slug}/edit`);
}

export async function updateSchedule(
  slug: string,
  editToken: string,
  data: ScheduleData,
  options?: { keepalive?: boolean },
): Promise<void> {
  const res = await fetchWithRetry(`${BASE}/${slug}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-edit-token": editToken,
    },
    keepalive: options?.keepalive,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new ApiError(`Failed to update schedule: ${res.status}`, res.status);
}

export async function publishSchedule(slug: string, editToken: string): Promise<void> {
  const res = await fetchWithRetry(`${BASE}/${slug}/publish`, {
    method: "POST",
    headers: { "x-edit-token": editToken },
  });
  if (!res.ok) throw new ApiError(`Failed to publish schedule: ${res.status}`, res.status);
}

export async function deleteSchedule(slug: string, editToken: string): Promise<void> {
  const res = await fetchWithTimeout(`${BASE}/${slug}`, {
    method: "DELETE",
    headers: { "x-edit-token": editToken },
  });
  if (!res.ok) throw new ApiError(`Failed to delete schedule: ${res.status}`, res.status);
}

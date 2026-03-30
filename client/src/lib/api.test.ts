import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  createSchedule,
  getSchedule,
  getScheduleForEdit,
  updateSchedule,
  publishSchedule,
  deleteSchedule,
} from "./api";

const mockScheduleData = {
  name: "テスト",
  rotation: 0,
  groups: [{ id: "g1", tasks: ["掃除"], emoji: "🧹" }],
  members: [{ id: "m1", name: "太郎", color: "#3B82F6", bgColor: "#DBEAFE", textColor: "#1E3A5F" }],
};

const mockScheduleResponse = {
  ...mockScheduleData,
  slug: "abc123",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockCreateResponse = {
  slug: "abc123",
  editToken: "token-123",
};

let mockFetch: ReturnType<typeof vi.fn>;

function createMockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  vi.useFakeTimers();
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("createSchedule", () => {
  it("成功時にレスポンスデータを返す", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(mockCreateResponse));

    const result = await createSchedule(mockScheduleData);

    expect(result).toEqual(mockCreateResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/schedules");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual(mockScheduleData);
  });

  it("400エラー時にApiErrorをスローする（リトライしない）", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 400));

    try {
      await createSchedule(mockScheduleData);
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(400);
      expect((e as ApiError).message).toMatch(/400/);
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("500エラー後にリトライで成功する", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({}, 500))
      .mockResolvedValueOnce(createMockResponse(mockCreateResponse));

    const promise = createSchedule(mockScheduleData);

    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toEqual(mockCreateResponse);
    expect(mockFetch).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});

describe("getSchedule", () => {
  it("成功時にスケジュールデータを返す", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(mockScheduleResponse));

    const result = await getSchedule("abc123");

    expect(result).toEqual(mockScheduleResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith("/api/schedules/abc123", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("404エラー時にApiErrorをスローする", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 404));

    try {
      await getSchedule("nonexistent");
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(404);
    }
  });
});

describe("getScheduleForEdit", () => {
  it("成功時にx-edit-tokenヘッダー付きでリクエストし、データを返す", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse(mockScheduleResponse));

    const result = await getScheduleForEdit("abc123", "token-123");

    expect(result).toEqual(mockScheduleResponse);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/schedules/abc123/edit");
    expect(init.headers).toEqual({ "x-edit-token": "token-123" });
  });
});

describe("updateSchedule", () => {
  it("成功時にエラーなく完了する", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 200));

    await expect(updateSchedule("abc123", "token-123", mockScheduleData)).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/schedules/abc123");
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "x-edit-token": "token-123",
    });
    expect(JSON.parse(init.body)).toEqual(mockScheduleData);
  });

  it("500エラー時にリトライする", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({}, 500))
      .mockResolvedValueOnce(createMockResponse({}, 200));

    const promise = updateSchedule("abc123", "token-123", mockScheduleData);

    // First retry delay: 1000ms
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("publishSchedule", () => {
  it("成功時にエラーなく完了する", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 200));

    await expect(publishSchedule("abc123", "token-123")).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/schedules/abc123/publish");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "x-edit-token": "token-123" });
  });
});

describe("deleteSchedule", () => {
  it("成功時にエラーなく完了する", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 200));

    await expect(deleteSchedule("abc123", "token-123")).resolves.toBeUndefined();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/schedules/abc123");
    expect(init.method).toBe("DELETE");
    expect(init.headers).toEqual({ "x-edit-token": "token-123" });
  });

  it("エラー時にリトライしない（fetchWithRetryを使わない）", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 500));

    try {
      await deleteSchedule("abc123", "token-123");
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(500);
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetchWithRetry (indirect)", () => {
  it("5xxエラー後に2回目のリトライで成功する", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({}, 503))
      .mockResolvedValueOnce(createMockResponse({}, 503))
      .mockResolvedValueOnce(createMockResponse({}, 200));

    const promise = updateSchedule("abc123", "token-123", mockScheduleData);

    // 1st retry: 1000 * 3^0 = 1000ms
    await vi.advanceTimersByTimeAsync(1000);
    // 2nd retry: 1000 * 3^1 = 3000ms
    await vi.advanceTimersByTimeAsync(3000);

    await expect(promise).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("4xxエラーではリトライしない", async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({}, 422));

    const promise = createSchedule(mockScheduleData);

    await expect(promise).rejects.toThrow(ApiError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("5xxエラー後にリトライで成功する", async () => {
    mockFetch
      .mockResolvedValueOnce(createMockResponse({}, 502))
      .mockResolvedValueOnce(createMockResponse({}, 200));

    const promise = updateSchedule("abc123", "token-123", mockScheduleData);

    // 1st retry delay
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("ネットワークエラーでもリトライする", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(createMockResponse({}, 200));

    const promise = updateSchedule("abc123", "token-123", mockScheduleData);

    // 1st retry delay
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

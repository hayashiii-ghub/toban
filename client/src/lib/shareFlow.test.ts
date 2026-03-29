import { describe, expect, it } from "vitest";
import { ApiError } from "./api";
import { getShareErrorMessage } from "./shareFlow";

describe("getShareErrorMessage", () => {
  describe("ApiError status 400", () => {
    it("stage=save → 保存内容に不正な値があります", () => {
      const error = new ApiError("Bad Request", 400);
      expect(getShareErrorMessage(error, "save")).toBe(
        "保存内容に不正な値があります",
      );
    });

    it("stage=publish → 共有公開のリクエスト内容が不正です", () => {
      const error = new ApiError("Bad Request", 400);
      expect(getShareErrorMessage(error, "publish")).toBe(
        "共有公開のリクエスト内容が不正です",
      );
    });
  });

  describe("ApiError status 401 / 403（認証・認可エラー）", () => {
    it("status=401 → 編集権限の確認に失敗しました", () => {
      const error = new ApiError("Unauthorized", 401);
      expect(getShareErrorMessage(error, "save")).toBe(
        "編集権限の確認に失敗しました。共有リンクを作り直してください",
      );
    });

    it("status=403 → 編集権限の確認に失敗しました", () => {
      const error = new ApiError("Forbidden", 403);
      expect(getShareErrorMessage(error, "publish")).toBe(
        "編集権限の確認に失敗しました。共有リンクを作り直してください",
      );
    });
  });

  describe("ApiError status 404", () => {
    it("stage=save → 保存先が見つかりません", () => {
      const error = new ApiError("Not Found", 404);
      expect(getShareErrorMessage(error, "save")).toBe(
        "保存先が見つかりません",
      );
    });

    it("stage=publish → 保存先が見つかりません。もう一度共有をやり直してください", () => {
      const error = new ApiError("Not Found", 404);
      expect(getShareErrorMessage(error, "publish")).toBe(
        "保存先が見つかりません。もう一度共有をやり直してください",
      );
    });
  });

  describe("ApiError status 500（サーバーエラー）", () => {
    it("stage=save → サーバーで保存に失敗しました", () => {
      const error = new ApiError("Internal Server Error", 500);
      expect(getShareErrorMessage(error, "save")).toBe(
        "サーバーで保存に失敗しました。時間をおいて再度お試しください",
      );
    });

    it("stage=publish → 保存はできましたが公開に失敗しました", () => {
      const error = new ApiError("Internal Server Error", 500);
      expect(getShareErrorMessage(error, "publish")).toBe(
        "保存はできましたが公開に失敗しました。時間をおいて再度お試しください",
      );
    });
  });

  describe("通常の Error（非 ApiError）", () => {
    it("stage=save → 保存に失敗しました。ネットワーク接続を確認してください", () => {
      const error = new Error("Network error");
      expect(getShareErrorMessage(error, "save")).toBe(
        "保存に失敗しました。ネットワーク接続を確認してください",
      );
    });

    it("stage=publish → 保存はできましたが公開に失敗しました", () => {
      const error = new Error("Something went wrong");
      expect(getShareErrorMessage(error, "publish")).toBe(
        "保存はできましたが公開に失敗しました",
      );
    });
  });
});

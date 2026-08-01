import { ApiError } from "./api";
import { tStandalone } from "@/i18n";

export type ShareStage = "save" | "publish";

export function getShareErrorMessage(
  error: unknown,
  stage: ShareStage
): string {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return stage === "publish"
        ? tStandalone("shareErr.publish400")
        : tStandalone("shareErr.save400");
    }
    if (error.status === 401 || error.status === 403) {
      return tStandalone("shareErr.auth");
    }
    if (error.status === 404) {
      return stage === "publish"
        ? tStandalone("shareErr.publish404")
        : tStandalone("shareErr.save404");
    }
    // 429 / 413 は既定の「ネットワーク接続を確認してください」だと案内が逆向きになる。
    // 回線は正常で、待つ・減らすことでしか解消しないため専用の文言を出す。
    if (error.status === 429) {
      return tStandalone("shareErr.rateLimit");
    }
    if (error.status === 413) {
      return tStandalone("shareErr.tooLarge");
    }
    if (error.status >= 500) {
      return stage === "publish"
        ? tStandalone("shareErr.publish500")
        : tStandalone("shareErr.save500");
    }
  }

  return stage === "publish"
    ? tStandalone("shareErr.publishDefault")
    : tStandalone("shareErr.saveDefault");
}

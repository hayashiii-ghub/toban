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

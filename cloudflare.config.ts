import { bindings, defineConfig, triggers } from "cf/config";
import path from "node:path";
import {
  localDatabaseId,
  productionDatabaseId,
  PRODUCTION_DATABASE_ID_PLACEHOLDER,
} from "./scripts/cloudflare.ts";

export default defineConfig(({ mode }) => {
  const production = mode === "production";
  return {
    worker: {
      name: "toban",
      compatibilityDate: "2025-04-01",
      compatibilityFlags: ["nodejs_compat"],
      entrypoint: path.resolve(import.meta.dirname, "server/worker.ts"),
      workersDev: false,
      previewUrls: false,
      observability: { logs: { enabled: true, invocationLogs: true } },
      assets: { notFoundHandling: "none" },
      triggers: [triggers.scheduled({ schedule: "0 3 * * *" })],
      env: {
        DB: bindings.d1({
          name: "toban-maker-db",
          id: production
            ? (productionDatabaseId() ?? PRODUCTION_DATABASE_ID_PLACEHOLDER)
            : localDatabaseId(),
        }),
        ASSETS: bindings.assets(),
        ENVIRONMENT: bindings.text(production ? "production" : "development"),
        SLACK_WEBHOOK_URL: bindings.secret(),
      },
    },
  };
});

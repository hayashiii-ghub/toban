import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cloudflareConfig from "../cloudflare.config";
import {
  assertDeploymentTarget,
  localDatabaseId,
  productionDatabaseId,
  requireProductionDatabaseId,
  runCommand,
} from "../scripts/cloudflare";

const databaseA = "00000000-0000-4000-8000-000000000001";
const databaseB = "00000000-0000-4000-8000-000000000002";
const temporaryRoots: string[] = [];

beforeEach(() => {
  for (const name of [
    "CLOUDFLARE_D1_DATABASE_ID",
    "D1_DATABASE_ID",
    "CLOUDFLARE_D1_PREVIEW_DATABASE_ID",
    "D1_PREVIEW_DATABASE_ID",
  ]) {
    vi.stubEnv(name, undefined);
  }
});
afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("Cloudflare configuration", () => {
  it("本番のIDがあっても、開発用D1へ分離する", () => {
    const local = localDatabaseId();
    expect(local).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
    );
    vi.stubEnv("CLOUDFLARE_D1_DATABASE_ID", databaseA);
    const development = cloudflareConfig({
      mode: "development",
      isPreview: false,
    });
    const production = cloudflareConfig({
      mode: "production",
      isPreview: false,
    });
    expect(development.worker.env.DB.id).toBe(local);
    expect(production.worker.env.DB.id).toBe(databaseA);
    expect(development.worker.env.ENVIRONMENT.value).toBe("development");
    expect(production.worker.env.ENVIRONMENT.value).toBe("production");
    expect(production.worker.env.SLACK_WEBHOOK_URL).toEqual({ type: "secret" });
  });

  it("既存の環境変数名を読み、本番と開発のIDを混ぜない", () => {
    vi.stubEnv("D1_DATABASE_ID", databaseA);
    vi.stubEnv("D1_PREVIEW_DATABASE_ID", databaseB);
    expect(productionDatabaseId()).toBe(databaseA);
    expect(localDatabaseId()).toBe(databaseB);
    vi.stubEnv("CLOUDFLARE_D1_DATABASE_ID", databaseB);
    vi.stubEnv("CLOUDFLARE_D1_PREVIEW_DATABASE_ID", databaseA);
    expect(productionDatabaseId()).toBe(databaseB);
    expect(localDatabaseId()).toBe(databaseA);
  });

  it.each([undefined, "", "toban-maker-db", "__CLOUDFLARE_D1_DATABASE_ID__"])(
    "本番ID %s では、DB更新や公開を始めない",
    async id => {
      vi.stubEnv("CLOUDFLARE_D1_DATABASE_ID", id);
      expect(() => requireProductionDatabaseId()).toThrow("production D1 UUID");
      await expect(runCommand(["deploy", "--dry-run"])).rejects.toThrow(
        "production D1 UUID"
      );
    }
  );
});

function outputFixture(
  options: {
    id?: string;
    mode?: string;
    preview?: boolean;
    name?: string;
    environment?: string;
  } = {}
) {
  const root = mkdtempSync(path.join(tmpdir(), "toban-cf-output-"));
  temporaryRoots.push(root);
  const output = path.join(root, ".cloudflare/output/v0");
  mkdirSync(path.join(output, "workers/default"), { recursive: true });
  writeFileSync(
    path.join(output, "config.json"),
    JSON.stringify({
      buildContext: {
        mode: options.mode ?? "production",
        isPreview: options.preview ?? false,
      },
    })
  );
  writeFileSync(
    path.join(output, "workers/default/worker.config.json"),
    JSON.stringify({
      name: options.name ?? "toban",
      env: {
        DB: { type: "d1", id: options.id ?? databaseA },
        ENVIRONMENT: {
          type: "text",
          value: options.environment ?? "production",
        },
      },
    })
  );
  return root;
}

describe("prebuilt deployment target", () => {
  it("同じD1でビルドした本番成果物を使える", () => {
    expect(() =>
      assertDeploymentTarget(databaseA, outputFixture())
    ).not.toThrow();
  });

  it.each([
    { id: databaseB },
    { id: "__CLOUDFLARE_D1_DATABASE_ID__" },
    { mode: "development" },
    { preview: true },
    { name: "another-worker" },
    { environment: "development" },
  ])("ビルドと公開先が異なると止める: %o", options => {
    expect(() =>
      assertDeploymentTarget(databaseA, outputFixture(options))
    ).toThrow("Build Output does not match");
  });
});

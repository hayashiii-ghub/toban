/// <reference types="vitest/config" />
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vue from "@vitejs/plugin-vue";
import path from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { LOCAL_STATE_PATH } from "./scripts/cloudflare.ts";

const clientAssetsDirectory = path.resolve(
  import.meta.dirname,
  "client/.cloudflare/output/v0/workers/default/assets"
);

export default defineConfig({
  cacheDir: "node_modules/.vite-vue",
  plugins: [
    vue(),
    vueJsx({ mergeProps: false }),
    tailwindcss(),
    ...VitePWA({
      outDir: clientAssetsDirectory,
      registerType: "autoUpdate",
      manifest: {
        // アプリのウィンドウでは、Chrome がこの名前をページの題名の前に付ける。題名とかぶらないよう名前だけにする
        name: "toban",
        short_name: "toban",
        description: "学校・介護施設・自治会・家庭の当番表を作成・印刷・共有",
        theme_color: "#2D4A3E",
        background_color: "#2D4A3E",
        display: "standalone",
        start_url: "/",
        lang: "ja",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // 静的ページへの遷移は index.html で返さない（返すと SPA の 404 になる）。
        // ドットを含むパスも index.html にしない。Workbox は pathname + search に
        // 正規表現を当てるので、クエリのドット（?v=1.2）では反応させない。
        navigateFallbackDenylist: [/^\/privacy$/, /^\/junban$/, /^[^?]*\./],
        // /api/ は runtimeCaching に載せない。
        // Cache Storage は cache-control: no-store を尊重しないので、載せると
        // 通信できないときに古い応答が 200 として返る。useAutoSync の引き直しは
        // throw しか見ていないため、それを最新のサーバ内容として取り込み、
        // ローカルの新しい編集を巻き戻したうえでサーバへも書き戻してしまう。
        // オフライン時の読み取りは localStorage が担っているので、外して困らない。
        // 既存端末に残る api-cache は、読む経路が無くなるので参照されない。
      },
    }).map(plugin => ({
      ...plugin,
      // Worker（toban 環境）に registerSW.js などを出さない
      applyToEnvironment: (env: { name: string }) => env.name === "client",
    })),
    // Vitest では Worker を起動しない
    ...(process.env.VITEST
      ? []
      : [
          cloudflare({
            // D1 の CLI と Vite は、旧環境のデータを同じ場所で読む。
            persistState: {
              path: LOCAL_STATE_PATH,
            },
            types: { includeRuntime: false },
          }),
        ]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: clientAssetsDirectory,
    emptyOutDir: true,
  },
  test: {
    root: path.resolve(import.meta.dirname),
    environment: "jsdom",
    include: [
      "client/src/**/*.test.{ts,tsx}",
      "server/**/*.test.{ts,tsx}",
      "shared/**/*.test.{ts,tsx}",
    ],
    setupFiles: ["client/src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "client/src/**/*.{ts,tsx,vue}",
        "server/**/*.{ts,tsx}",
        "shared/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/test/**",
        "**/node_modules/**",
        "**/dist/**",
        "client/src/main.tsx",
        "**/*.d.ts",
        "client/src/components/ui/**",
      ],
      // 実測（2026-09: 行 74% / 分岐 65%）の少し下。下がったら理由を確かめる
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 65,
        lines: 70,
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import type { UserConfig as VitestUserConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "toban — かんたん当番表",
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
        // /api/ は runtimeCaching に載せない。
        // Cache Storage は cache-control: no-store を尊重しないので、載せると
        // 通信できないときに古い応答が 200 として返る。useAutoSync の引き直しは
        // throw しか見ていないため、それを最新のサーバ内容として取り込み、
        // ローカルの新しい編集を巻き戻したうえでサーバへも書き戻してしまう。
        // オフライン時の読み取りは localStorage が担っているので、外して困らない。
        // 既存端末に残る api-cache は、読む経路が無くなるので参照されない。
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
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
        "client/src/**/*.{ts,tsx}",
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
        "client/src/vite-env.d.ts",
        "client/src/components/ui/**",
      ],
      thresholds: {
        statements: 35,
        branches: 35,
        functions: 35,
        lines: 35,
      },
    },
  } satisfies VitestUserConfig["test"],
  server: {
    port: 3000,
    strictPort: false,
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": "http://localhost:8788",
    },
  },
});

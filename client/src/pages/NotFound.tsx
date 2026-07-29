import { Home, LayoutTemplate } from "lucide-react";
import { useLocation } from "wouter";
import { useT } from "@/i18n";

export default function NotFound() {
  const [, setLocation] = useLocation();
  const t = useT();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--dt-page-bg)" }}
    >
      <div
        className="theme-border theme-shadow w-full max-w-md p-8 text-center"
        style={{
          borderRadius: "var(--dt-border-radius)",
          backgroundColor: "var(--dt-card-bg)",
        }}
      >
        <div className="flex justify-center mb-6">
          {/* 404 はユーザーの過失ではないので警告色を使わない（赤は破壊操作専用） */}
          <div
            className="theme-border size-16 flex items-center justify-center"
            style={{
              borderRadius: "50%",
              backgroundColor: "var(--dt-current-highlight)",
            }}
          >
            <span className="text-3xl" aria-hidden="true">
              🔍
            </span>
          </div>
        </div>

        <h1
          className="text-3xl font-extrabold mb-2"
          style={{ color: "var(--dt-text)" }}
        >
          404
        </h1>
        <h2
          className="text-lg font-bold mb-4"
          style={{ color: "var(--dt-text)" }}
        >
          {t("notFound.title")}
        </h2>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--dt-text-secondary)" }}
        >
          {t("notFound.message")}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm text-white transition-all duration-150 theme-hover-lift"
            style={{ backgroundColor: "#1a1a1a", borderRadius: "10px" }}
          >
            <Home className="size-4" aria-hidden="true" />
            {t("notFound.home")}
          </button>
          <button
            type="button"
            onClick={() => setLocation("/templates")}
            className="theme-border theme-shadow-sm inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm transition-all duration-150 theme-hover-lift"
            style={{
              backgroundColor: "var(--dt-card-bg)",
              color: "var(--dt-text)",
              borderRadius: "10px",
            }}
          >
            <LayoutTemplate className="size-4" aria-hidden="true" />
            {t("notFound.templates")}
          </button>
        </div>
      </div>
    </div>
  );
}

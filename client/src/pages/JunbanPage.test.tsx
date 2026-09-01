import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, within } from "@testing-library/react";
import JunbanPage from "./JunbanPage";
import { JUNBAN_PAGE_SEO } from "@shared/seo-templates";
import { LanguageProvider } from "@/i18n";

afterEach(() => {
  cleanup();
  localStorage.removeItem("toban-lang");
  document.documentElement.lang = "ja";
});

describe("JunbanPage", () => {
  it("見出し・導入・ベネフィットを描画する", () => {
    const { container } = render(<JunbanPage />);
    const view = within(container);
    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      JUNBAN_PAGE_SEO.heading
    );
    expect(view.getByText(JUNBAN_PAGE_SEO.benefits[0])).toBeInTheDocument();
  });

  it("サンプルの円盤（RotationDisc）を実際に描画する（show don't tell）", () => {
    const { container } = render(<JunbanPage />);
    // RotationDisc は表現可能な構成で3枚の svg を出す（全体/外円/内円）
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(1);
    expect(within(container).getAllByText("たろう").length).toBeGreaterThan(0);
  });

  it("CTA が円盤ビューへ着地する（/?view=disc）", () => {
    const { container } = render(<JunbanPage />);
    const cta = container.querySelector('a[href="/?view=disc"]');
    expect(cta).not.toBeNull();
  });

  it("英語UIでは円盤の実例も英語で表示する", () => {
    localStorage.setItem("toban-lang", "en");
    const { container } = render(
      <LanguageProvider>
        <JunbanPage />
      </LanguageProvider>
    );
    const view = within(container);
    expect(view.getAllByText("Alex").length).toBeGreaterThan(0);
    expect(view.getByText("Cleaning", { exact: true })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(
      /たろう|はなこ|ゆうき|そうじ|はいぜん|にっちょく/
    );
  });

  it("ランダム抽選を約束しない FAQ を含む（intent ミスマッチ回避）", () => {
    const { container } = render(<JunbanPage />);
    expect(
      within(container).getByText(/抽選とは異なります/)
    ).toBeInTheDocument();
  });
});

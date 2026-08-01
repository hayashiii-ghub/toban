import { describe, expect, it } from "vitest";
import {
  DESIGN_THEMES,
  THEME_COLORS,
  THEME_TEXTURES,
  composeTheme,
  composeThemeId,
  getThemeById,
  getThemeLabel,
  splitThemeId,
} from "./designThemes";
import { applyThemeToRoot } from "@/contexts/DesignThemeContext";

describe("旧テーマの凍結", () => {
  // designThemeId には単体IDで保存済みのスケジュールがある。2軸化で既存の見た目が
  // 動かないことを固定する。値を更新する前に、既存ユーザーの表示が変わってよいか確認すること。
  it.each([
    ["whiteboard", { width: "1px", radius: "8px", radiusSm: "4px" }],
    ["chalkboard", { width: "1.5px", radius: "6px", radiusSm: "4px" }],
    ["crayon", { width: "2.5px", radius: "16px", radiusSm: "10px" }],
    ["sunflower", { width: "1.5px", radius: "12px", radiusSm: "8px" }],
    ["sakura", { width: "1.5px", radius: "16px", radiusSm: "10px" }],
    ["nature", { width: "1.5px", radius: "10px", radiusSm: "6px" }],
  ])("%s の枠は据え置き", (id, borders) => {
    expect(getThemeById(id).borders).toEqual(borders);
  });

  it("旧テーマは質感を持たず、複合IDにもならない", () => {
    for (const theme of DESIGN_THEMES) {
      expect(theme.surface).toBeUndefined();
      expect(getThemeById(theme.id).id).toBe(theme.id);
    }
  });

  it("旧テーマの影は色付きのまま（合成テーマの color-mix に置き換わらない）", () => {
    expect(getThemeById("sunflower").shadows.card).toBe(
      "0 2px 8px rgba(212, 168, 48, 0.12)"
    );
  });
});

describe("getThemeById のフォールバック", () => {
  it("未指定・未知のIDは whiteboard", () => {
    expect(getThemeById(undefined).id).toBe("whiteboard");
    expect(getThemeById("nonexistent").id).toBe("whiteboard");
  });

  it("複合IDの質感・色が不正なら既定へ寄せる", () => {
    expect(getThemeById("bogus/sakura").id).toBe("sarasara/sakura");
    expect(getThemeById("mochimochi/bogus").id).toBe("mochimochi/whiteboard");
    // 質感IDを付け替えたので、旧IDの複合は既定へ落ちる
    expect(getThemeById("clay/sakura").id).toBe("sarasara/sakura");
  });
});

describe("2軸の合成", () => {
  it("複合IDは質感の枠と色のパレットを組み合わせる", () => {
    const theme = getThemeById("mochimochi/sakura");
    const clay = THEME_TEXTURES.find(t => t.id === "mochimochi")!;
    const sakura = THEME_COLORS.find(c => c.id === "sakura")!;

    expect(theme.borders).toEqual(clay.borders);
    expect(theme.colors).toEqual(sakura.colors);
  });

  it("名前と色が一致していた色は、旧テーマのパレットのまま", () => {
    for (const id of ["whiteboard", "chalkboard", "sakura", "nightsky"]) {
      const color = THEME_COLORS.find(c => c.id === id)!;
      const legacy = DESIGN_THEMES.find(t => t.id === id)!;
      expect(color.colors).toEqual(legacy.colors);
      expect(color.preview).toEqual(legacy.preview);
    }
  });

  it("名前に寄せて調整した色は、旧テーマと別のパレットになる", () => {
    // 旧テーマは凍結されているので、調整しても既存スケジュールの表示は動かない
    for (const id of ["crayon", "sunflower", "lavender", "nature", "ocean"]) {
      const color = THEME_COLORS.find(c => c.id === id)!;
      const legacy = DESIGN_THEMES.find(t => t.id === id)!;
      expect(color.colors).not.toEqual(legacy.colors);
      expect(legacy.colors).toEqual(getThemeById(id).colors);
    }
  });

  it("色名は情景の名前。IDは据え置きなので保存データに影響しない", () => {
    const nameOf = (id: string) => THEME_COLORS.find(c => c.id === id)?.name;
    expect(nameOf("whiteboard")).toBe("いんさつ");
    expect(nameOf("crayon")).toBe("だいだい");
    expect(nameOf("lavender")).toBe("あじさい");
    expect(nameOf("nature")).toBe("わかば");
    expect(nameOf("ocean")).toBe("そら");
  });

  it("色と質感はすべて i18n キーを持つ", () => {
    for (const color of THEME_COLORS) {
      expect(color.labelKey).toMatch(/^themeColor\./);
    }
    for (const texture of THEME_TEXTURES) {
      expect(texture.labelKey).toMatch(/^texture\./);
    }
  });

  it("表示名は翻訳を通す。旧テーマは凍結した日本語名のまま", () => {
    const t = (key: string) => `[${key}]`;
    expect(getThemeLabel("sarasara/sakura", t)).toBe("[themeColor.sakura]");
    expect(getThemeLabel("mochimochi/sakura", t)).toBe(
      "[themeColor.sakura]（[texture.mochimochi]）"
    );
    expect(getThemeLabel("crayon", t)).toBe("クレヨン");
  });

  it("zarazara/crayon は旧クレヨンテーマの枠を引き継ぐ", () => {
    // クレヨンの個性は色ではなく線だった。太枠と角丸は複合IDへ移しても失われない。
    // 色は「だいだい」へ調整済みなので、パレットまで一致はしない
    const legacy = DESIGN_THEMES.find(t => t.id === "crayon")!;
    const composed = composeTheme("zarazara", "crayon");

    expect(composed.borders).toEqual(legacy.borders);
    expect(composed.effects).toEqual(legacy.effects);
  });

  it("紙面は質感ごとに粒を変え、カード面とも別にする", () => {
    const pageOf = (id: string) =>
      THEME_TEXTURES.find(t => t.id === id)!.surface;

    // 3質感の紙面がすべて異なる（周波数帯を分けている）
    const pages = THEME_TEXTURES.map(t => t.surface.pageTexture);
    expect(new Set(pages).size).toBe(THEME_TEXTURES.length);

    // 粒を使う2種はカード面と紙面で粗さが違う。同じだと画面全体が一枚の板に見えてカードが浮かない
    expect(pageOf("sarasara").pageTexture).not.toBe(pageOf("sarasara").texture);
    expect(pageOf("zarazara").pageTexture).not.toBe(
      pageOf("zarazara").texture
    );
  });

  it("既定の質感は色名だけ、それ以外は質感を併記する", () => {
    // DesignTheme.name は日本語固定のフォールバック。画面表示は getThemeLabel を使う
    expect(composeTheme("sarasara", "sakura").name).toBe("さくら");
    expect(composeTheme("mochimochi", "sakura").name).toBe("さくら（もちもち）");
  });

  it("旧IDは既定の質感 × その色として分解される", () => {
    expect(splitThemeId("sakura")).toEqual({
      textureId: "sarasara",
      colorId: "sakura",
    });
    expect(splitThemeId(composeThemeId("mochimochi", "ocean"))).toEqual({
      textureId: "mochimochi",
      colorId: "ocean",
    });
  });

  it("旧クレヨンは、対応する質感ができたのでそちらへ寄せる", () => {
    // 選び直しても太枠が失われないようにするため
    expect(splitThemeId("crayon")).toEqual({
      textureId: "zarazara",
      colorId: "crayon",
    });
  });
});

describe("印刷時の影", () => {
  it("さらさらは紙に影を落とさない", () => {
    expect(composeTheme("sarasara", "whiteboard").surface?.printShadow).toBe(
      "none"
    );
  });

  it("画面で枠を持たない質感でも、印刷では輪郭が出る", () => {
    // 白黒印刷では inset の陰影がほぼ飛ぶ。枠が0のままだとカードの切れ目が消える
    const clay = THEME_TEXTURES.find(t => t.id === "mochimochi")!;
    expect(clay.borders.width).toBe("0px");
    expect(parseFloat(clay.surface.printBorderWidth)).toBeGreaterThan(0);

    for (const texture of THEME_TEXTURES) {
      expect(parseFloat(texture.surface.printBorderWidth)).toBeGreaterThan(0);
    }
  });

  it("もちもちは inset を残し、外側の落ち影だけ印刷で落とす", () => {
    const clay = THEME_TEXTURES.find(t => t.id === "mochimochi")!;
    const OUTER_DROP_SHADOW = "2px 3px 8px";

    // 画面では立体を出すために落ち影を持つ
    expect(clay.shadows.card).toContain(OUTER_DROP_SHADOW);
    expect(clay.shadows.card).toContain("inset");
    // 印刷では紙に影が出てしまうので落ち影だけ外し、inset は残す
    expect(clay.surface.printShadow).not.toContain(OUTER_DROP_SHADOW);
    expect(clay.surface.printShadow).toContain("inset");
  });
});

describe("applyThemeToRoot", () => {
  const read = (name: string) =>
    document.documentElement.style.getPropertyValue(name);

  it("質感を持たない旧テーマには従来どおりの既定値を入れる", () => {
    applyThemeToRoot(getThemeById("crayon"));
    expect(read("--dt-chip-border-width")).toBe("2px");
    expect(read("--dt-chip-shadow")).toBe("none");
    expect(read("--dt-shadow-print")).toBe("none");
    expect(read("--dt-surface-texture")).toBe("none");
  });

  it("さらさらは繊維のテクスチャを載せ、旧テーマには載せない", () => {
    applyThemeToRoot(getThemeById("sarasara/sakura"));
    expect(read("--dt-surface-texture")).toContain("feTurbulence");

    // 旧テーマは凍結。既定が さらさら になっても既存スケジュールに繊維は出ない
    applyThemeToRoot(getThemeById("crayon"));
    expect(read("--dt-surface-texture")).toBe("none");
  });

  it("もちもちはチップの枠を消して陰影に置き換える", () => {
    applyThemeToRoot(getThemeById("mochimochi/ocean"));
    expect(read("--dt-chip-border-width")).toBe("0px");
    expect(read("--dt-chip-shadow")).toContain("inset");
    expect(read("--dt-border-width")).toBe("0px");
  });
});

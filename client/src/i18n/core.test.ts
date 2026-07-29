import { describe, it, expect } from "vitest";
import {
  isLocale,
  detectLocale,
  interpolate,
  translate,
  type Locale,
} from "./core";

describe("isLocale", () => {
  it("accepts supported locales and rejects everything else", () => {
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(123)).toBe(false);
  });
});

describe("detectLocale", () => {
  it("prefers a valid stored locale over the browser", () => {
    expect(detectLocale("en", "ja-JP")).toBe("en");
    expect(detectLocale("ja", "en-US")).toBe("ja");
  });

  it("falls back to the browser when stored is missing or invalid", () => {
    expect(detectLocale(null, "en-US")).toBe("en");
    expect(detectLocale("fr", "en-US")).toBe("en");
    expect(detectLocale("", "en-GB")).toBe("en");
  });

  it("treats the browser language case-insensitively by en-prefix", () => {
    expect(detectLocale(null, "EN")).toBe("en");
    expect(detectLocale(null, "en")).toBe("en");
  });

  it("defaults to ja when nothing points to en", () => {
    expect(detectLocale(null, "ja-JP")).toBe("ja");
    expect(detectLocale(null, undefined)).toBe("ja");
    expect(detectLocale(null, "")).toBe("ja");
  });
});

describe("interpolate", () => {
  it("returns the template unchanged when no params are given", () => {
    expect(interpolate("hello")).toBe("hello");
    expect(interpolate("hi {name}")).toBe("hi {name}");
  });

  it("replaces known placeholders and stringifies numbers", () => {
    expect(interpolate("hi {name}", { name: "Mei" })).toBe("hi Mei");
    expect(interpolate("{a} and {b}", { a: "x", b: "y" })).toBe("x and y");
    expect(interpolate("count: {n}", { n: 3 })).toBe("count: 3");
  });

  it("leaves unknown placeholders in place", () => {
    expect(interpolate("hi {name} {x}", { name: "Mei" })).toBe("hi Mei {x}");
  });
});

describe("translate", () => {
  const dicts: Record<Locale, Record<string, string>> = {
    ja: { greeting: "こんにちは {name}", only_ja: "日本語のみ" },
    en: { greeting: "Hello {name}" },
  };

  it("returns the entry for the active locale, interpolated", () => {
    expect(translate(dicts, "en", "greeting", { name: "Mei" })).toBe(
      "Hello Mei"
    );
    expect(translate(dicts, "ja", "greeting", { name: "メイ" })).toBe(
      "こんにちは メイ"
    );
  });

  it("falls back to ja when the active locale lacks the key", () => {
    expect(translate(dicts, "en", "only_ja")).toBe("日本語のみ");
  });

  it("returns the key itself when no locale has it", () => {
    expect(translate(dicts, "en", "missing_everywhere")).toBe(
      "missing_everywhere"
    );
  });
});

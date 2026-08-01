// LP・SEO ページの配色。値の実体は index.css の :root にある --lp-* で、
// ここはインラインスタイル用の参照。Tailwind からは bg-lp-card / text-lp-text
// のように同じトークンを使う。
export const LP_COLORS = {
  pageBg: "var(--lp-bg)",
  cardBg: "var(--lp-card)",
  primary: "var(--lp-primary)",
  text: "var(--lp-text)",
  textSecondary: "var(--lp-text-secondary)",
  textMuted: "var(--lp-text-muted)",
  border: "var(--lp-border)",
  highlight: "var(--lp-highlight)",
  heroBg: "var(--lp-hero-bg)",
  heroText: "var(--lp-hero-text)",
  heroSubtext: "var(--lp-hero-subtext)",
} as const;

/** トークン色を透過させる。`${color}40` のような hex 連結の代わり */
export function alpha(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

const BASE =
  "inline-flex items-center gap-2 rounded-xl font-bold shadow-lg transition-colors bg-lp-primary hover:bg-lp-primary-hover text-lp-hero-text";

const VARIANT = {
  // ページ内に置く通常のCTA
  inline: "px-6 py-3",
  // 画面右下に固定するCTA
  fixed: "fixed bottom-6 right-6 z-50 px-5 py-3 print:hidden",
} as const;

export function LpCtaLink({
  href,
  variant = "inline",
  children,
}: {
  href: string;
  variant?: keyof typeof VARIANT;
  children: ReactNode;
}) {
  return (
    <a href={href} className={`${BASE} ${VARIANT[variant]}`}>
      {children}
      <ArrowRight className="size-4" />
    </a>
  );
}

import type { VNodeChild } from "vue";
import { CircleHelp, Shield } from "@lucide/vue";
import type { MessageKey } from "@/i18n";

export interface SiteLink {
  href: string;
  labelKey: MessageKey;
  newTab?: boolean;
  icon: VNodeChild;
}

/**
 * 画面の一番下の案内（App.tsx の AppFooter）と、編集画面の「くわしい設定」に並べるリンク。
 * 中身を揃えるため、どちらもここから作る（言語の切り替えは別に置く）
 */
export const SITE_LINKS: SiteLink[] = [
  {
    href: "/about",
    labelKey: "footer.about",
    newTab: true,
    icon: <CircleHelp class="size-4" aria-hidden="true" />,
  },
  {
    href: "/privacy",
    labelKey: "footer.privacy",
    icon: <Shield class="size-4" aria-hidden="true" />,
  },
  {
    href: "https://shigoto.dev/works/toban",
    labelKey: "footer.maker",
    newTab: true,
    icon: <img src="/hayashigoto-seal.svg" alt="" class="size-4 opacity-80" />,
  },
];

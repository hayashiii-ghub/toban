import { defineAsyncComponent, h, type Component } from "vue";
import { RouterView } from "vue-router";
import { MotionConfig } from "motion-v";
import { Toaster } from "@/components/ui/sonner";
import { defineView } from "@/lib/vue";
import { createAppRouter, useLocation } from "@/lib/router";
import ErrorBoundary from "./components/ErrorBoundary";
import { LoadingScreen } from "./components/LoadingScreen";
import { LanguageProvider, useT } from "./i18n";
import LanguageSwitcher from "./components/LanguageSwitcher";
import { SITE_LINKS } from "./components/siteLinks";
import Home from "./pages/Home";

const lazyPage = (loader: () => Promise<{ default: Component }>) => {
  const Page = defineAsyncComponent({
    loader,
    loadingComponent: LoadingScreen,
    delay: 0,
  });
  // Preserve the existing loading screen after the URL has changed.
  return defineView<object>([], () => () => h(Page));
};
// Keep these paths aligned with server/handlers/seo.ts and the service worker.
export const router = createAppRouter([
  { path: "/", component: Home },
  { path: "/about", component: lazyPage(() => import("./pages/LandingPage")) },
  {
    path: "/templates",
    component: lazyPage(() => import("./pages/TemplatesPage")),
  },
  {
    path: "/templates/:slug",
    component: lazyPage(() => import("./pages/TemplateDetailPage")),
  },
  {
    path: "/s/:slug",
    component: lazyPage(() => import("./pages/SharedScheduleView")),
  },
  { path: "/transfer", component: lazyPage(() => import("./pages/Transfer")) },
  {
    path: "/:pathMatch(.*)*",
    component: lazyPage(() => import("./pages/NotFound")),
  },
]);
const FOOTER_ITEM_CLASS =
  "flex items-center gap-1.5 px-2 h-8 rounded-full text-sm whitespace-nowrap text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-muted/40 transition-colors";
const AppFooter = defineView<object>([], () => {
  const [location] = useLocation();
  const t = useT();
  return () => {
    if (location.value !== "/" && !location.value.startsWith("/s/"))
      return null;
    return (
      <footer
        class={`px-3 pt-6 pb-[calc(1rem+var(--home-toolbar-space,0px))] print:hidden ${location.value === "/" ? "max-sm:hidden" : ""}`}
        style={{
          backgroundColor: "var(--dt-page-bg)",
          backgroundImage: "var(--dt-page-texture, none)",
        }}
      >
        <div class="max-w-4xl mx-auto flex flex-wrap items-center justify-end gap-1">
          <LanguageSwitcher class={FOOTER_ITEM_CLASS} />
          {SITE_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              {...(link.newTab
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              class={FOOTER_ITEM_CLASS}
            >
              {link.icon}
              <span>{t(link.labelKey)}</span>
            </a>
          ))}
        </div>
      </footer>
    );
  };
});
const App = defineView<object>([], () => () => (
  <ErrorBoundary>
    <MotionConfig reducedMotion="user">
      <LanguageProvider>
        <Toaster />
        <RouterView />
        <AppFooter />
      </LanguageProvider>
    </MotionConfig>
  </ErrorBoundary>
));
export default App;

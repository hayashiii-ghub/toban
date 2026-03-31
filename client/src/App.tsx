import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import SharedScheduleView from "@/pages/SharedScheduleView";
import { Route, Switch, useLocation } from "wouter";
import { CircleHelp } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import TemplatesPage from "./pages/TemplatesPage";
import TemplateDetailPage from "./pages/TemplateDetailPage";
import Transfer from "./pages/Transfer";


function Router() {
  return (
    <Switch>
      <Route path={"/"} component={LandingPage} />
      <Route path={"/app"} component={Home} />
      <Route path={"/templates"} component={TemplatesPage} />
      <Route path={"/templates/:slug"} component={TemplateDetailPage} />
      <Route path={"/s/:slug"} component={SharedScheduleView} />
      <Route path={"/transfer"} component={Transfer} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppFooter() {
  const [location] = useLocation();
  // アプリ本体と共有ページのみ表示
  const showFooter = location === "/app" || location.startsWith("/s/");
  if (!showFooter) return null;

  return (
    <footer className="py-2 pr-3 text-right print:hidden md:fixed md:bottom-0 md:right-0 md:z-50">
      <div className="flex items-center justify-end gap-1 md:inline-flex">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground/60 hover:text-muted-foreground/80 hover:bg-muted/40 transition-colors"
          title="toban について"
        >
          <CircleHelp className="w-5 h-5" />
        </a>
        <a
          href="https://shigoto.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-0 px-2 text-sm text-muted-foreground/60 hover:text-muted-foreground/80 transition-colors"
        >
          <img src="/hayashigoto-logo.png" alt="はやしごと" className="h-9 w-auto" />
          <span>hay@shigoto.dev</span>
        </a>
      </div>
    </footer>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <AppFooter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

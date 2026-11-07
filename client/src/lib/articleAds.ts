// The SPA/PWA shell must stay ad-free. Only a mounted article with its body
// present may start Auto Ads. Removing the script cannot undo its execution:
// once started, every route change must create a fresh document.
let started = false;
const disabledStateKey = "tobanAdsDisabledAfterError";
let replaceHistoryState: History["replaceState"];

export function loadArticleAds(articlePath: string) {
  if (
    started ||
    window.location.pathname !== articlePath ||
    window.history.state?.[disabledStateKey]
  )
    return;
  started = true;
  const articleUrl = window.location.pathname + window.location.search;
  replaceHistoryState = window.history.replaceState.bind(window.history);

  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (state, unused, url) => {
      if (url != null) {
        const target = new URL(url, window.location.href);
        if (target.pathname + target.search !== articleUrl) {
          if (method === "replaceState") window.location.replace(target.href);
          else window.location.assign(target.href);
          return;
        }
      }
      original(state, unused, url);
    };
  }

  // Run before the router's subscribers, including back/forward to an earlier
  // ad-free SPA entry. Never render the destination in the ad-bearing document.
  window.addEventListener(
    "popstate",
    event => {
      if (window.location.pathname + window.location.search !== articleUrl) {
        event.stopImmediatePropagation();
        window.location.reload();
      }
    },
    { capture: true }
  );

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4096581456452149";
  document.head.appendChild(script);
}

// A runtime error can remove an article without navigating. Reset the entire
// document and suppress ads on this history entry, preventing a reload loop.
export function resetAdsAfterError() {
  if (!started) return;
  replaceHistoryState(
    { ...window.history.state, [disabledStateKey]: true },
    ""
  );
  document.documentElement.style.visibility = "hidden";
  window.location.reload();
}

import { toValue, watchEffect, type MaybeRefOrGetter } from "vue";

type PageMeta = {
  title: string;
  description: string;
  path: string;
};

type HeadTarget = {
  selector: string;
  tagName: "link" | "meta";
  identity: [string, string];
  valueAttribute: "content" | "href";
  value: string;
};

export function usePageMeta(meta: MaybeRefOrGetter<PageMeta>): void {
  watchEffect(onCleanup => {
    const { title, description, path } = toValue(meta);
    const previousTitle = document.title;
    const url = new URL(path, window.location.origin).href;
    const targets: HeadTarget[] = [
      {
        selector: 'meta[name="description"]',
        tagName: "meta",
        identity: ["name", "description"],
        valueAttribute: "content",
        value: description,
      },
      {
        selector: 'link[rel="canonical"]',
        tagName: "link",
        identity: ["rel", "canonical"],
        valueAttribute: "href",
        value: url,
      },
      {
        selector: 'meta[property="og:title"]',
        tagName: "meta",
        identity: ["property", "og:title"],
        valueAttribute: "content",
        value: title,
      },
      {
        selector: 'meta[property="og:description"]',
        tagName: "meta",
        identity: ["property", "og:description"],
        valueAttribute: "content",
        value: description,
      },
      {
        selector: 'meta[property="og:url"]',
        tagName: "meta",
        identity: ["property", "og:url"],
        valueAttribute: "content",
        value: url,
      },
      {
        selector: 'meta[name="twitter:title"]',
        tagName: "meta",
        identity: ["name", "twitter:title"],
        valueAttribute: "content",
        value: title,
      },
      {
        selector: 'meta[name="twitter:description"]',
        tagName: "meta",
        identity: ["name", "twitter:description"],
        valueAttribute: "content",
        value: description,
      },
    ];
    const previousAttributes = new Map<Element, string | null>();
    const createdElements: Element[] = [];

    document.title = title;
    for (const target of targets) {
      let element = document.head.querySelector(target.selector);
      if (!element) {
        element = document.createElement(target.tagName);
        element.setAttribute(...target.identity);
        document.head.appendChild(element);
        createdElements.push(element);
      }
      previousAttributes.set(
        element,
        element.getAttribute(target.valueAttribute)
      );
      element.setAttribute(target.valueAttribute, target.value);
    }

    onCleanup(() => {
      document.title = previousTitle;
      for (const [element, previousValue] of previousAttributes) {
        if (createdElements.includes(element)) {
          element.remove();
        } else if (previousValue === null) {
          const target = targets.find(item => element.matches(item.selector));
          if (target) element.removeAttribute(target.valueAttribute);
        } else {
          const target = targets.find(item => element.matches(item.selector));
          if (target)
            element.setAttribute(target.valueAttribute, previousValue);
        }
      }
    });
  });
}

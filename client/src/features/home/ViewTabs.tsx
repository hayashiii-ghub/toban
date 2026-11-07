import { defineView } from "@/lib/vue";
import { useT } from "@/i18n";
import { VIEW_TABS, type ViewTabValue } from "./viewTabsConfig";

export type { ViewTabValue };

interface ViewTabsProps {
  viewTab: ViewTabValue;
  onChangeTab: (tab: ViewTabValue) => void;
}

export const ViewTabs = defineView<ViewTabsProps>(
  ["viewTab", "onChangeTab"],
  props => {
    const t = useT();
    return () => {
      const { viewTab, onChangeTab } = props;

      return (
        <div
          class="px-3 sm:px-4 pt-2 pb-1 rotation-no-print"
          data-onboarding="view-tabs"
        >
          <div class="max-w-4xl mx-auto grid grid-cols-4 gap-1.5 sm:flex sm:gap-2">
            {VIEW_TABS.map(({ value, labelKey }) => (
              <button
                type="button"
                key={value}
                onClick={() => onChangeTab(value)}
                class={`theme-border px-1 sm:px-4 py-1.5 sm:py-2 font-bold text-xs min-[360px]:text-sm whitespace-nowrap transition-all duration-150 ${
                  viewTab === value ? "theme-shadow-sm" : "theme-hover-lift"
                }`}
                style={{
                  backgroundColor:
                    viewTab === value
                      ? "var(--dt-tab-active-bg)"
                      : "var(--dt-tab-inactive-bg)",
                  color:
                    viewTab === value
                      ? "var(--dt-tab-active-text)"
                      : "var(--dt-tab-inactive-text)",
                  borderRadius: "var(--dt-border-radius-sm)",
                  transform:
                    viewTab === value
                      ? `translate(var(--dt-hover-translate), var(--dt-hover-translate))`
                      : undefined,
                }}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
      );
    };
  }
);

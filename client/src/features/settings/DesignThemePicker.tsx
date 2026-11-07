import { defineView } from "@/lib/vue";
import { computed, type VNodeChild, type CSSProperties } from "vue";
import { Printer } from "@lucide/vue";
import {
  THEME_COLORS,
  THEME_TEXTURES,
  composeTheme,
  composeThemeId,
  splitThemeId,
} from "@/rotation/designThemes";
import { useT } from "@/i18n";
interface DesignThemePickerProps {
  selectedThemeId: string | undefined;
  onSelect: (themeId: string) => void;
}
const MiniCard = defineView<{
  textureId: string;
  colorId: string;
}>(["textureId", "colorId"], (props, _viewContext) => {
  const theme = computed(() => composeTheme(props.textureId, props.colorId));
  return () => (
    <div
      class="w-full h-11 mb-1.5 overflow-hidden flex flex-col"
      style={{
        backgroundColor: theme.value.preview.bgColor,
        borderRadius: theme.value.borders.radius,
      }}
    >
      <div
        class="h-3.5 w-full shrink-0"
        style={{ backgroundColor: theme.value.preview.primaryColor }}
      />
      <div class="flex-1 flex items-center justify-center px-2">
        <div
          class="w-full h-5"
          style={{
            backgroundColor: theme.value.colors.cardBg,
            backgroundImage: theme.value.surface?.texture,
            borderRadius: theme.value.borders.radiusSm,
            border: `${theme.value.borders.width} solid ${theme.value.colors.borderColor}`,
            boxShadow: theme.value.shadows.cardSm,
          }}
        />
      </div>
    </div>
  );
});
const PickerButton = defineView<{
  isSelected: boolean;
  label: VNodeChild;
  ariaLabel: string;
  onClick: () => void;
  children?: VNodeChild;
}>(["isSelected", "label", "ariaLabel", "onClick"], (props, viewContext) => {
  return () => (
    <button
      type="button"
      onClick={props.onClick}
      class={`relative theme-border p-2 text-left transition-all duration-150 flex flex-col justify-start ${props.isSelected ? "ring-2 ring-offset-1" : "hover:opacity-80"}`}
      style={{
        borderRadius: "var(--dt-border-radius-sm)",
        backgroundColor: "var(--dt-card-bg)",
        ...(props.isSelected
          ? ({
              "--tw-ring-color": "var(--dt-current-highlight)",
            } as CSSProperties)
          : {}),
      }}
      aria-pressed={props.isSelected}
      aria-label={props.ariaLabel}
    >
      {viewContext.slots.default?.()}
      <div class="flex items-center gap-1">
        <span class="text-xs font-bold" style={{ color: "var(--dt-text)" }}>
          {props.label}
        </span>
      </div>
    </button>
  );
});
export const DesignThemePicker = defineView<DesignThemePickerProps>(
  ["selectedThemeId", "onSelect"],
  (props, _viewContext) => {
    const t = useT();
    const _derived0 = computed(() => splitThemeId(props.selectedThemeId));
    return () => (
      <div class="flex flex-col gap-3 p-0.5">
        <section>
          <h3
            class="text-xs font-bold mb-1.5"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("theme.textureLabel")}
          </h3>
          <div class="grid grid-cols-3 gap-2">
            {THEME_TEXTURES.map(texture => (
              <PickerButton
                key={texture.id}
                isSelected={texture.id === _derived0.value.textureId}
                label={t(texture.labelKey)}
                ariaLabel={t("theme.selectAria", {
                  name: t(texture.labelKey),
                })}
                onClick={() =>
                  props.onSelect(
                    composeThemeId(texture.id, _derived0.value.colorId)
                  )
                }
              >
                <MiniCard
                  textureId={texture.id}
                  colorId={_derived0.value.colorId}
                />
              </PickerButton>
            ))}
          </div>
        </section>

        <section>
          <h3
            class="text-xs font-bold mb-1.5"
            style={{ color: "var(--dt-text-secondary)" }}
          >
            {t("theme.colorLabel")}
          </h3>
          <div class="grid grid-cols-3 gap-2">
            {THEME_COLORS.map(color => (
              <PickerButton
                key={color.id}
                isSelected={color.id === _derived0.value.colorId}
                label={
                  <>
                    {t(color.labelKey)}
                    {color.id === "whiteboard" && (
                      <Printer
                        class="inline size-3 ml-1 align-[-1px]"
                        style={{ color: "var(--dt-text-muted)" }}
                        aria-label={t("theme.forPrint")}
                      />
                    )}
                  </>
                }
                ariaLabel={t("theme.selectAria", { name: t(color.labelKey) })}
                onClick={() =>
                  props.onSelect(
                    composeThemeId(_derived0.value.textureId, color.id)
                  )
                }
              >
                <MiniCard
                  textureId={_derived0.value.textureId}
                  colorId={color.id}
                />
              </PickerButton>
            ))}
          </div>
        </section>

        <p class="text-[10px]" style={{ color: "var(--dt-text-muted)" }}>
          {
            composeTheme(_derived0.value.textureId, _derived0.value.colorId)
              .description
          }
        </p>
      </div>
    );
  }
);

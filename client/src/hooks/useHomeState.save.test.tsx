import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";
import { toast } from "vue-sonner";
import { act, cleanup, fireEvent, render, waitFor } from "@/test/vue";
import { LanguageProvider } from "@/i18n";
import { DEFAULT_APP_STATE } from "@/rotation/defaultState";
import { STORAGE_KEY } from "@/rotation/constants";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { DesignThemeProvider } from "@/contexts/DesignThemeContext";
import { useHomeState } from "./useHomeState";

let originalRootStyle: string | null;
beforeEach(() => {
  originalRootStyle = document.documentElement.getAttribute("style");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({}, "", "/");
  localStorage.setItem("toban-lang", "ja");
  const source = {
    ...structuredClone(DEFAULT_APP_STATE.schedules[0]),
    id: "save-source",
    name: "元の表",
  };
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      schedules: [source, { ...source, id: "other", name: "別の表" }],
      activeScheduleId: source.id,
    })
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {}))
  );
});
afterEach(() => {
  cleanup();
  if (originalRootStyle === null) {
    document.documentElement.removeAttribute("style");
  } else {
    document.documentElement.setAttribute("style", originalRootStyle);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderHome(withSettings = false) {
  let home!: ReturnType<typeof useHomeState>;
  const Page = defineComponent(() => {
    home = useHomeState();
    return () => (
      <DesignThemeProvider
        themeId={home.activeSchedule?.designThemeId}
        fontId={home.activeSchedule?.fontId}
      >
        <output data-testid="saved-name">{home.activeSchedule?.name}</output>
        {withSettings &&
          home.modal.type === "settings" &&
          home.activeSchedule && (
            <SettingsModal
              scheduleName={home.activeSchedule.name}
              groups={home.activeSchedule.groups}
              members={home.activeSchedule.members}
              rotationConfig={home.activeSchedule.rotationConfig}
              pinned={home.activeSchedule.pinned}
              assignmentMode={home.activeSchedule.assignmentMode}
              designThemeId={home.activeSchedule.designThemeId}
              fontId={home.activeSchedule.fontId}
              canDelete={true}
              onSave={home.onSaveSettings}
              onClose={home.closeModal}
              onDuplicate={home.onDuplicateSchedule}
              onDelete={() => {}}
            />
          )}
      </DesignThemeProvider>
    );
  });
  const view = render(<Page />, { wrapper: LanguageProvider });
  return { home, ...view };
}

function readRootAppearance() {
  const style = document.documentElement.style;
  return {
    page: style.getPropertyValue("--dt-page-bg"),
    card: style.getPropertyValue("--dt-card-bg"),
    texture: style.getPropertyValue("--dt-surface-texture"),
    font: style.getPropertyValue("--dt-font-family"),
    fontWeight: style.getPropertyValue("--dt-font-weight-bold"),
  };
}

describe("manual settings persistence", () => {
  it("notifies success only once the rendered roster and localStorage contain the save", async () => {
    const page = renderHome();
    await act(() => page.home.openSettings());
    const success = vi.spyOn(toast, "success").mockImplementation(() => {
      expect(page.getByTestId("saved-name")).toHaveTextContent("保存した表");
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).schedules[0].name
      ).toBe("保存した表");
      return "save-notice";
    });
    await act(() =>
      page.home.onSaveSettings({
        ...page.home.activeSchedule!,
        name: "保存した表",
      })
    );
    expect(success).toHaveBeenCalledExactlyOnceWith("保存しました");
    expect(page.home.modal.type).toBeNull();
    expect(page.home.localSaveStatus).toBe("saved");
  });

  it.each([
    ["ja", "当番表の名前", "保存する", "端末に保存できませんでした。"],
    ["en", "Schedule name", "Save", "Could not save on this device."],
  ])(
    "keeps the actual %s editor draft open on a failed write and allows retry",
    async (locale, nameLabel, saveLabel, failure) => {
      localStorage.setItem("toban-lang", locale);
      const page = renderHome(true);
      await act(() => page.home.openSettings());
      await fireEvent.input(page.getByLabelText(nameLabel), {
        target: { value: "保存できていない編集" },
      });
      const saved = localStorage.getItem(STORAGE_KEY);
      const success = vi.spyOn(toast, "success");
      const error = vi.spyOn(toast, "error");
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const write = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new DOMException("Storage is full", "QuotaExceededError");
      });
      await fireEvent.click(page.getByRole("button", { name: saveLabel }));
      await waitFor(() => expect(error).toHaveBeenCalled());
      expect(error).toHaveBeenCalledWith(expect.stringContaining(failure));
      expect(success).not.toHaveBeenCalled();
      expect(page.home.modal.type).toBe("settings");
      expect(page.getByLabelText(nameLabel)).toHaveValue(
        "保存できていない編集"
      );
      expect(page.home.activeSchedule?.name).toBe("保存できていない編集");
      expect(page.home.localSaveStatus).toBe("failed");
      expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);

      write.mockRestore();
      await fireEvent.click(page.getByRole("button", { name: saveLabel }));
      await waitFor(() => expect(page.home.modal.type).toBeNull());
      expect(success).toHaveBeenCalledOnce();
      expect(
        JSON.parse(localStorage.getItem(STORAGE_KEY)!).schedules[0].name
      ).toBe("保存できていない編集");
    }
  );

  it("restores the applied appearance when discarding further previews after a failed save", async () => {
    const page = renderHome(true);
    const initialAppearance = readRootAppearance();
    await act(() => page.home.openSettings());
    await fireEvent.click(page.getByRole("tab", { name: "見た目" }));
    await fireEvent.click(
      page.getByRole("button", { name: "さくらテーマを選択" })
    );
    await fireEvent.click(
      page.getByRole("button", { name: "エレガントの文字を選択" })
    );
    const saved = localStorage.getItem(STORAGE_KEY);
    const error = vi.spyOn(toast, "error");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage is full", "QuotaExceededError");
    });
    await fireEvent.click(page.getByRole("button", { name: "保存する" }));
    await waitFor(() => expect(error).toHaveBeenCalled());
    const appliedAppearance = readRootAppearance();
    expect(appliedAppearance).not.toEqual(initialAppearance);
    expect(page.home.activeSchedule).toMatchObject({
      designThemeId: "sarasara/sakura",
      fontId: "elegant",
    });

    await fireEvent.click(
      page.getByRole("button", { name: "そらテーマを選択" })
    );
    await fireEvent.click(
      page.getByRole("button", { name: "手書きの文字を選択" })
    );
    expect(readRootAppearance()).not.toEqual(appliedAppearance);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await fireEvent.click(page.getByRole("button", { name: "閉じる" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(page.home.modal.type).toBeNull();
    expect(readRootAppearance()).toEqual(appliedAppearance);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
  });

  it("saves the captured roster when another tab is selected while waiting", async () => {
    const page = renderHome();
    await act(() => page.home.openSettings());
    const success = vi.spyOn(toast, "success");
    await act(async () => {
      const saving = page.home.onSaveSettings({
        ...page.home.activeSchedule!,
        name: "Aの保存",
      });
      page.home.selectSchedule("other");
      await saving;
    });
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(
      saved.schedules.map((schedule: { name: string }) => schedule.name)
    ).toEqual(["Aの保存", "別の表"]);
    expect(page.home.activeSchedule?.name).toBe("別の表");
    expect(page.home.modal.type).toBe("settings");
    expect(success).not.toHaveBeenCalled();
  });

  it("preserves rapid saves and only the latest save closes the editor", async () => {
    const page = renderHome();
    await act(() => page.home.openSettings());
    const success = vi.spyOn(toast, "success");
    const settings = page.home.activeSchedule!;
    await act(() =>
      Promise.all([
        page.home.onSaveSettings({ ...settings, name: "1回目" }),
        page.home.onSaveSettings({ ...settings, name: "2回目" }),
      ])
    );
    expect(page.home.activeSchedule?.name).toBe("2回目");
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).schedules[0].name
    ).toBe("2回目");
    expect(success).toHaveBeenCalledOnce();
    expect(page.home.modal.type).toBeNull();
  });

  it("does not close a newly opened editor when an earlier save finishes", async () => {
    const page = renderHome();
    await act(() => page.home.openSettings());
    const success = vi.spyOn(toast, "success");
    await act(async () => {
      const saving = page.home.onSaveSettings({
        ...page.home.activeSchedule!,
        name: "前の編集",
      });
      page.home.closeModal();
      page.home.openSettings();
      await saving;
    });
    expect(page.home.activeSchedule?.name).toBe("前の編集");
    expect(page.home.modal.type).toBe("settings");
    expect(success).not.toHaveBeenCalled();
  });

  it("settles without writing or notifying after leaving the page", async () => {
    const page = renderHome();
    const saved = localStorage.getItem(STORAGE_KEY);
    const success = vi.spyOn(toast, "success");
    const error = vi.spyOn(toast, "error");
    const saving = page.home.onSaveSettings({
      ...page.home.activeSchedule!,
      name: "離脱後の編集",
    });
    page.unmount();
    expect(await saving).toMatchObject({ applied: false, code: "UNMOUNTED" });
    expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);
    expect(success).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});

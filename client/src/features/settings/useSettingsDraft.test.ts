import { act, cleanup, renderHook } from "@/test/vue";
import { afterEach, expect, it } from "vitest";
import type { ScheduleSettings } from "@/hooks/useScheduleManager";
import { useSettingsDraft } from "./useSettingsDraft";
afterEach(cleanup);
it("同じ操作の人と仕事の変更を両方保持し、すべて元に戻した時だけ未保存を解除する", async () => {
  const settings: ScheduleSettings = {
    name: "掃除当番",
    groups: [{ id: "g1", tasks: ["床"], emoji: "🧹" }],
    members: [
      {
        id: "m1",
        name: "佐藤",
        color: "#3B82F6",
        bgColor: "#DBEAFE",
        textColor: "#1E3A5F",
      },
    ],
    fontId: "standard",
  };
  const { result } = renderHook(() => useSettingsDraft(settings));
  const initial = result.current.draft;
  expect(result.current.isDirty).toBe(false);
  await act(() => {
    result.current.applyPatch({
      members: [{ ...settings.members[0], name: "鈴木" }],
    });
    result.current.applyPatch({
      groups: [{ ...settings.groups[0], tasks: ["窓"] }],
    });
  });
  expect(result.current.draft.members[0].name).toBe("鈴木");
  expect(result.current.draft.groups[0].tasks).toEqual(["窓"]);
  expect(result.current.isDirty).toBe(true);
  expect(initial.members[0].name).toBe("佐藤");
  expect(initial.groups[0].tasks).toEqual(["床"]);
  await act(() => result.current.applyPatch({ groups: initial.groups }));
  expect(result.current.isDirty).toBe(true);
  await act(() => result.current.applyPatch({ members: initial.members }));
  expect(result.current.isDirty).toBe(false);
  expect(result.current.draft).toEqual(initial);
});

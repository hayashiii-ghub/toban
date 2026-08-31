import { describe, expect, it } from "vitest";
import { TEMPLATES } from "./templates";
import { findTemplate, getTemplates } from "./template-localization";
import { createScheduleFromTemplate } from "../client/src/rotation/utils";

const japanese = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

describe("built-in template localization", () => {
  it.each(TEMPLATES.map((template, index) => ({ template, index })))(
    "translates every visible field of $template.name without changing its structure",
    ({ template, index }) => {
      const translated = getTemplates("en")[index];
      expect(japanese.test(translated.name)).toBe(false);
      expect(translated.name).not.toBe(template.name);
      expect(translated.groups).toHaveLength(template.groups.length);
      expect(translated.members).toHaveLength(template.members.length);
      expect(translated.assignmentMode).toBe(template.assignmentMode);
      expect(translated.designThemeId).toBe(template.designThemeId);
      expect(translated.emoji).toBe(template.emoji);

      translated.groups.forEach((group, groupIndex) => {
        const source = template.groups[groupIndex];
        expect(group.tasks).toHaveLength(source.tasks.length);
        expect(
          group.tasks.every(task => task.length > 0 && !japanese.test(task))
        ).toBe(true);
        expect({ ...group, tasks: [] }).toEqual({ ...source, tasks: [] });
      });
      translated.members.forEach((member, memberIndex) => {
        expect(member.name.length).toBeGreaterThan(0);
        expect(japanese.test(member.name)).toBe(false);
        expect({ ...member, name: "" }).toEqual({
          ...template.members[memberIndex],
          name: "",
        });
      });
      expect(findTemplate(template.name, "en")).toBe(translated);
      expect(findTemplate(translated.name, "en")).toBe(translated);
      expect(findTemplate(translated.name, "ja")).toBe(template);
    }
  );

  it("keeps Japanese defaults and both template sets intact when a new roster is edited", () => {
    const source = structuredClone(TEMPLATES);
    const english = structuredClone(getTemplates("en"));
    const created = createScheduleFromTemplate(getTemplates("en")[2]);
    created.name = "My roster";
    created.groups[0].tasks[0] = "My task";
    created.members[0].name = "My group";

    expect(getTemplates("ja")).toEqual(source);
    expect(TEMPLATES).toEqual(source);
    expect(getTemplates("en")).toEqual(english);
  });

  it("keeps the blank template at the same index with editable English starter content", () => {
    const index = TEMPLATES.findIndex(
      template => template.name === "カスタム（空白）"
    );
    const blank = getTemplates("en")[index];
    expect(index).toBe(TEMPLATES.length - 1);
    expect(blank.name).toBe("Untitled roster");
    expect(blank.groups[0].tasks).toEqual(["Task 1"]);
    expect(blank.members[0].name).toBe("Member 1");
    expect(findTemplate("Unknown template", "en")).toBeUndefined();
  });
});

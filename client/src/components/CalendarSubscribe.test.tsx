import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@/test/vue";
import { LanguageProvider } from "@/i18n";
import {
  CalendarSubscribe,
  type CalendarSubscribeProps,
} from "./CalendarSubscribe";
import { calendarFeedUrl } from "@/lib/calendarLinks";

const member = {
  id: "m1",
  name: "佐藤",
  color: "#3B82F6",
  bgColor: "#DBEAFE",
  textColor: "#1E3A5F",
};

function renderIt(props: Partial<CalendarSubscribeProps>) {
  render(
    <LanguageProvider>
      <CalendarSubscribe slug="abcdefghij" {...props} />
    </LanguageProvider>
  );
}

beforeEach(() => {
  localStorage.setItem("toban-lang", "ja");
});
afterEach(cleanup);

const origin = window.location.origin;
const host = origin.replace(/^https?:/, "webcal:");

describe("CalendarSubscribe", () => {
  it("名前を選んだ人には、まず自分の当番だけの購読を出す", async () => {
    renderIt({ member });
    expect(screen.getByRole("button", { name: "佐藤の当番" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const feed = `${host}/api/schedules/abcdefghij/calendar.ics?member=m1`;
    expect(
      screen.getByRole("link", { name: "Apple カレンダー" })
    ).toHaveAttribute("href", feed);
    expect(
      screen.getByRole("link", { name: "Google カレンダー" })
    ).toHaveAttribute(
      "href",
      `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feed)}`
    );
  });

  it("全員の当番に切り替えられる", async () => {
    renderIt({ member });
    await fireEvent.click(screen.getByRole("button", { name: "全員の当番" }));
    expect(
      screen.getByRole("link", { name: "Apple カレンダー" })
    ).toHaveAttribute("href", `${host}/api/schedules/abcdefghij/calendar.ics`);
  });

  it("名前を選んでいなければ、全員の当番だけ", async () => {
    renderIt({});
    expect(screen.queryByRole("button", { name: "全員の当番" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Apple カレンダー" })
    ).toHaveAttribute("href", `${host}/api/schedules/abcdefghij/calendar.ics`);
  });
});

describe("calendarFeedUrl", () => {
  it("英語なら lang=en を付ける", async () => {
    expect(calendarFeedUrl("https://toban.app", "abcdefghij", "m1", "en")).toBe(
      "https://toban.app/api/schedules/abcdefghij/calendar.ics?member=m1&lang=en"
    );
  });
});

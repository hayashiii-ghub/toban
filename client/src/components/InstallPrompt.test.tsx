import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@/test/vue";
import { InstallPrompt } from "./InstallPrompt";

const UA = {
  iPhone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iPhoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  macSafari16:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  android:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
};

function setDevice(ua: string, maxTouchPoints = 0) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  // jsdom の navigator には maxTouchPoints が無い
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: maxTouchPoints,
    configurable: true,
  });
}

async function fireInstallPrompt() {
  const event = Object.assign(new Event("beforeinstallprompt"), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome: "dismissed" }),
  });
  await act(() => {
    window.dispatchEvent(event);
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("InstallPrompt", () => {
  it("iPhone の Safari にはホーム画面に追加する手順を出す", async () => {
    setDevice(UA.iPhone, 5);
    render(<InstallPrompt />);
    expect(screen.getByText("ホーム画面に追加")).toBeInTheDocument();
  });

  it("Mac と同じ UA を名乗る iPad の Safari も iPhone と同じ案内にする", async () => {
    setDevice(UA.macSafari, 5);
    render(<InstallPrompt />);
    expect(screen.getByText("ホーム画面に追加")).toBeInTheDocument();
  });

  it("Mac の Safari 17 以降には Dock に追加する手順を出す", async () => {
    setDevice(UA.macSafari);
    render(<InstallPrompt />);
    expect(screen.getByText("Dock に追加")).toBeInTheDocument();
  });

  it("Dock に追加できない Safari 16 や、Safari 以外には手順を出さない", async () => {
    for (const ua of [UA.macSafari16, UA.iPhoneChrome, UA.macChrome]) {
      setDevice(ua);
      const { container } = render(<InstallPrompt />);
      expect(container.childElementCount).toBe(0);
      expect(container.textContent).toBe("");
      cleanup();
    }
  });

  it("インストールできるブラウザでは、スマホはホーム画面、PC は Dock やタスクバーと案内する", async () => {
    setDevice(UA.android);
    render(<InstallPrompt />);
    await fireInstallPrompt();
    expect(screen.getByText("ホーム画面からすぐ開けます")).toBeInTheDocument();
    cleanup();

    setDevice(UA.macChrome);
    render(<InstallPrompt />);
    await fireInstallPrompt();
    expect(
      screen.getByText("Dock やタスクバーからすぐ開けます")
    ).toBeInTheDocument();
  });

  it("閉じたら次に開いても出さない", async () => {
    setDevice(UA.iPhone, 5);
    render(<InstallPrompt />);
    await fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByText("ホーム画面に追加")).not.toBeInTheDocument();
    cleanup();

    render(<InstallPrompt />);
    expect(screen.queryByText("ホーム画面に追加")).not.toBeInTheDocument();
  });
});

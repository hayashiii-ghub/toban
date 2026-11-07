import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@/test/vue";
import { ShareModal } from "./ShareModal";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn(() => Promise.resolve()) },
});

const defaultProps = {
  slug: "test-slug",
  editToken: "test-token",
  scheduleName: "テスト当番表",
  onClose: vi.fn(),
};

afterEach(() => cleanup());

describe("ShareModal", () => {
  it("共有URLが表示される", async () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText(/\/s\/test-slug/)).toBeTruthy();
  });

  it("コピーボタンでclipboard APIが呼ばれる", async () => {
    render(<ShareModal {...defaultProps} />);
    await fireEvent.click(screen.getByText("URLをコピー"));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("閉じるボタンでonCloseが呼ばれる", async () => {
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} onClose={onClose} />);
    await fireEvent.click(screen.getByLabelText("閉じる"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // 共有元の端末では自分のQRを読めないので、既定は畳んである
  it("QRコードは初期状態では表示されず、トグルで開く", async () => {
    render(<ShareModal {...defaultProps} />);
    // QR は size の値を width に出す（アイコンは 24）。
    const qr = () => document.querySelector('svg[width="140"]');
    expect(qr()).toBeNull();

    await fireEvent.click(screen.getByText("QRコードを表示"));
    expect(qr()?.querySelector("path")).not.toBeNull();
  });

  // 編集URLを渡す前に警告を読ませたいので、コピー操作より上に出す
  it("編集タブでは警告がコピーボタンより前にある", async () => {
    render(<ShareModal {...defaultProps} />);
    await fireEvent.click(screen.getByText("✏️ 編集もできる"));

    const warning = screen.getByText(/信頼できる相手にのみ共有/);
    const copyButton = screen.getByText("URLをコピー");
    expect(
      warning.compareDocumentPosition(copyButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("日付で交代する表だけ「カレンダー」のタブがあり、下のボタンが Google と Apple に替わる", async () => {
    const { unmount } = render(<ShareModal {...defaultProps} />);
    expect(screen.queryByRole("button", { name: /カレンダー/ })).toBeNull();
    unmount();

    render(<ShareModal {...defaultProps} canAddToCalendar />);
    await fireEvent.click(
      screen.getByRole("button", { name: "📅 カレンダー" })
    );
    expect(screen.queryByText("URLをコピー")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Google カレンダー" })
    ).toHaveAttribute(
      "href",
      expect.stringContaining(
        encodeURIComponent("/api/schedules/test-slug/calendar.ics")
      )
    );
    expect(
      screen
        .getByRole("link", { name: "Apple カレンダー" })
        .getAttribute("href")
    ).toMatch(/^webcal:\/\/.+\/api\/schedules\/test-slug\/calendar\.ics$/);
  });

  // 共有した当番表は放置すると自動削除される。共有する画面で必ず伝える。
  it("保存期間が表示される", async () => {
    render(<ShareModal {...defaultProps} />);
    expect(
      screen.getByText(
        /1年間まったく編集がなく、カレンダーからも読まれていないと自動で削除/
      )
    ).toBeTruthy();
  });
});

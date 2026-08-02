import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShareModal } from "./ShareModal";

vi.mock("framer-motion", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ReactMod = require("react");
  const MotionComponent = ReactMod.forwardRef(
    ({ children, ...props }: Record<string, unknown>, ref: unknown) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(
          ([key]) =>
            ![
              "initial",
              "animate",
              "exit",
              "transition",
              "variants",
              "whileHover",
              "whileTap",
            ].includes(key)
        )
      );
      return ReactMod.createElement("div", { ...filteredProps, ref }, children);
    }
  );
  return {
    motion: new Proxy({}, { get: () => MotionComponent }),
    m: new Proxy({}, { get: () => MotionComponent }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

// このモックがある限り、実際の import が壊れていてもここでは気づけない。
// 本物を描画する担保は e2e の「共有モーダルが開く」に置いてある。
vi.mock("react-qr-code", () => {
  const QRCode = (props: { value: string }) => (
    <div data-testid="qr-code" data-value={props.value} />
  );
  return { QRCode, default: QRCode };
});

Object.assign(navigator, {
  clipboard: { writeText: vi.fn(() => Promise.resolve()) },
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/useEscapeKey", () => ({ useEscapeKey: vi.fn() }));
vi.mock("@/hooks/useFocusTrap", () => ({ useFocusTrap: vi.fn() }));

const defaultProps = {
  slug: "test-slug",
  editToken: "test-token",
  scheduleName: "テスト当番表",
  onClose: vi.fn(),
};

afterEach(() => cleanup());

describe("ShareModal", () => {
  it("共有URLが表示される", () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText(/\/s\/test-slug/)).toBeTruthy();
  });

  it("コピーボタンでclipboard APIが呼ばれる", () => {
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText("URLをコピー"));
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it("閉じるボタンでonCloseが呼ばれる", () => {
    const onClose = vi.fn();
    render(<ShareModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("閉じる"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // 共有元の端末では自分のQRを読めないので、既定は畳んである
  it("QRコードは初期状態では表示されず、トグルで開く", () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.queryByTestId("qr-code")).toBeNull();

    fireEvent.click(screen.getByText("QRコードを表示"));
    const qr = screen.getByTestId("qr-code");
    expect(qr.dataset.value).toContain("/s/test-slug");
  });

  // 編集URLを渡す前に警告を読ませたいので、コピー操作より上に出す
  it("編集タブでは警告がコピーボタンより前にある", () => {
    render(<ShareModal {...defaultProps} />);
    fireEvent.click(screen.getByText("✏️ 編集もできる"));

    const warning = screen.getByText(/信頼できる相手にのみ共有/);
    const copyButton = screen.getByText("URLをコピー");
    expect(
      warning.compareDocumentPosition(copyButton) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  // 共有した当番表は放置すると自動削除される。共有する画面で必ず伝える。
  it("保存期間が表示される", () => {
    render(<ShareModal {...defaultProps} />);
    expect(
      screen.getByText(/1年間まったく編集がないと自動で削除/)
    ).toBeTruthy();
  });
});

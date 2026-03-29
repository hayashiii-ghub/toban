import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShareModal } from "./ShareModal";

vi.mock("framer-motion", () => {
  const React = require("react");
  const MotionComponent = React.forwardRef(
    ({ children, ...props }: any, ref: any) => {
      const filteredProps = Object.fromEntries(
        Object.entries(props).filter(
          ([key]) => !["initial", "animate", "exit", "transition", "variants", "whileHover", "whileTap"].includes(key)
        )
      );
      return React.createElement("div", { ...filteredProps, ref }, children);
    }
  );
  return {
    motion: new Proxy({}, { get: () => MotionComponent }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock("react-qr-code", () => ({
  default: (props: any) => <div data-testid="qr-code" data-value={props.value} />,
}));

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

  it("QRコードが表示される", () => {
    render(<ShareModal {...defaultProps} />);
    const qr = screen.getByTestId("qr-code");
    expect(qr).toBeTruthy();
    expect(qr.dataset.value).toContain("/s/test-slug");
  });
});

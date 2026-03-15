import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Printer, ChevronDown } from "lucide-react";

interface PrintMenuProps {
  onPrint: (mode: "all" | "cards" | "table") => void;
}

export function PrintMenu({ onPrint }: PrintMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const handleSelect = (mode: "all" | "cards" | "table") => {
    setIsOpen(false);
    onPrint(mode);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="brutal-border brutal-shadow-sm flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 font-bold text-sm transition-all duration-150 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[5px_5px_0px_#1a1a1a] active:translate-x-[1px] active:translate-y-[1px]"
        style={{ backgroundColor: "#fff", borderRadius: "8px" }}
        aria-label="印刷メニュー"
        aria-expanded={isOpen}
      >
        <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
        印刷
        <ChevronDown className="w-3 h-3" aria-hidden="true" />
      </button>
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] brutal-border py-1 min-w-[160px]"
          style={{
            top: menuPos.top,
            right: menuPos.right,
            backgroundColor: "#fff",
            borderRadius: "10px",
            boxShadow: "4px 4px 0px #1a1a1a",
          }}
        >
          {[
            { mode: "all" as const, label: "すべて印刷" },
            { mode: "cards" as const, label: "カードのみ" },
            { mode: "table" as const, label: "早見表のみ" },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              className="w-full text-left px-4 py-2.5 text-sm font-bold transition-colors hover:bg-yellow-50"
              style={{ color: "#333" }}
              onClick={() => handleSelect(mode)}
            >
              {label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

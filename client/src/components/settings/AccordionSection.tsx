import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function AccordionSection({
  title,
  summary,
  defaultOpen = false,
  children,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        borderBottom: "var(--dt-border-width) solid var(--dt-border-color)",
      }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-extrabold"
            style={{ color: "var(--dt-text)" }}
          >
            {title}
          </span>
          {!isOpen && (
            <span className="text-xs font-bold" style={{ color: "#999" }}>
              {summary}
            </span>
          )}
        </div>
        <m.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="size-4" style={{ color: "#999" }} />
        </m.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0, overflow: "hidden" }}
            animate={{
              height: "auto",
              opacity: 1,
              overflow: "visible",
              transitionEnd: { overflow: "visible" },
            }}
            exit={{ height: 0, opacity: 0, overflow: "hidden" }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 sm:px-5 pb-4">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

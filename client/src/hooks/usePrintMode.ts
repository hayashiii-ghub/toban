import { useCallback, useEffect } from "react";

export function usePrintMode(): {
  handlePrint: (viewTab: string) => void;
} {
  useEffect(() => {
    const cleanupPrintState = () => {
      delete document.body.dataset.printMode;
      document.getElementById("print-orientation")?.remove();
    };
    window.addEventListener("afterprint", cleanupPrintState);
    return () => {
      window.removeEventListener("afterprint", cleanupPrintState);
      cleanupPrintState();
    };
  }, []);

  const handlePrint = useCallback((viewTab: string) => {
    document.body.dataset.printMode = viewTab;
    const orientation = viewTab === "calendar" ? "portrait" : "landscape";
    const style = document.createElement("style");
    style.id = "print-orientation";
    style.textContent = `@page { size: A4 ${orientation}; }`;
    document.head.appendChild(style);
    window.print();
  }, []);

  return { handlePrint };
}

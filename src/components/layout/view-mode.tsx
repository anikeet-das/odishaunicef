import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ViewMode = "macro" | "micro";
const Ctx = createContext<{ mode: ViewMode; setMode: (m: ViewMode) => void }>({
  mode: "macro",
  setMode: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "macro";
    const v = window.localStorage.getItem("crsap.viewMode");
    return v === "micro" ? "micro" : "macro";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("crsap.viewMode", mode);
    if (typeof document !== "undefined") document.documentElement.dataset.view = mode;
  }, [mode]);
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export const useViewMode = () => useContext(Ctx);
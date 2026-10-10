import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ViewMode = "macro" | "micro";
const Ctx = createContext<{ mode: ViewMode; setMode: (m: ViewMode) => void }>({
  mode: "macro",
  setMode: () => {},
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>("macro");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { setMode(window.localStorage.getItem("crsap.viewMode") === "micro" ? "micro" : "macro"); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem("crsap.viewMode", mode); } catch {}
    document.documentElement.dataset.view = mode;
  }, [mode, ready]);
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

export const useViewMode = () => useContext(Ctx);
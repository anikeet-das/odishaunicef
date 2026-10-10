import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Sparkles, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nextTheme, resolveTheme, type Theme } from "./theme-state";

export type { Theme } from "./theme-state";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "cream", setTheme: () => {}, toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("cream");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      setTheme(resolveTheme(window.localStorage.getItem("crsap.theme")));
    } catch {
      // Restricted browser storage must not stop the app or its controls.
      setTheme("cream");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    try { window.localStorage.setItem("crsap.theme", theme); } catch {}
  }, [theme, ready]);
  return (
    <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(nextTheme) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const icon = theme === "dark"
    ? <Moon className="h-3.5 w-3.5 text-[var(--cyan)]" />
    : <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />;
  const label = theme === "dark" ? "DARK" : "LIGHT AZURE";
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title="Switch theme (Light Azure / Dark)"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-soft text-xs text-muted-foreground hover:text-foreground transition"
    >
      {icon}
      <span className="font-semibold uppercase tracking-wider">{label}</span>
    </Button>
  );
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Sparkles, Moon } from "lucide-react";

export type Theme = "cream" | "dark";
const ORDER: Theme[] = ["cream", "dark"];
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "cream", setTheme: () => {}, toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "cream";
    const saved = window.localStorage.getItem("crsap.theme") as Theme | null;
    // Migrate the removed "light" theme to the handcrafted Light Azure.
    if (saved === "cream" || saved === "dark") return saved;
    return "cream";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("crsap.theme", theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  return (
    <Ctx.Provider value={{ theme, setTheme, toggle: () => setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]) }}>
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
    <button
      onClick={toggle}
      title="Switch theme (Light Azure / Dark)"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-soft text-xs text-muted-foreground hover:text-foreground transition"
    >
      {icon}
      <span className="font-semibold uppercase tracking-wider">{label}</span>
    </button>
  );
}

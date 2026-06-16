import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AppSettings = {
  accentHue: number;          // 0..360 — drives primary/accent colors
  neonIntensity: number;      // 0..100 — drives glow/box-shadow strength
  glassBlur: number;          // 0..40 px — drives backdrop blur
  density: "compact" | "comfortable" | "spacious";
  fontScale: number;          // 0.85..1.2
  reduceMotion: boolean;
  liveRefreshSec: number;     // simulated tick interval
  language: "en" | "hi" | "or";
  showAiFab: boolean;
  mapJitter: boolean;
};

const DEFAULTS: AppSettings = {
  accentHue: 220,
  neonIntensity: 60,
  glassBlur: 18,
  density: "comfortable",
  fontScale: 1,
  reduceMotion: false,
  liveRefreshSec: 5,
  language: "en",
  showAiFab: true,
  mapJitter: true,
};

const KEY = "crsap.settings.v1";

const Ctx = createContext<{
  settings: AppSettings;
  set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void;
  reset: () => void;
}>({ settings: DEFAULTS, set: () => {}, reset: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);

  // Hydrate from localStorage after mount (SSR safe).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  // Persist + apply.
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch {}
    const r = document.documentElement;
    const hue = settings.accentHue;
    // Live theme tokens
    r.style.setProperty("--primary",      `oklch(0.78 0.18 ${hue})`);
    r.style.setProperty("--accent",       `oklch(0.82 0.19 ${(hue + 320) % 360})`);
    r.style.setProperty("--ring",         `oklch(0.78 0.18 ${hue} / 0.6)`);
    r.style.setProperty("--border",       `oklch(0.78 0.18 ${hue} / 0.18)`);
    r.style.setProperty("--neon-cyan",    `oklch(0.86 0.16 ${(hue - 20 + 360) % 360})`);
    r.style.setProperty("--gradient-aurora",
      `linear-gradient(135deg, oklch(0.72 0.21 ${(hue + 35) % 360}) 0%, oklch(0.82 0.19 ${(hue + 320) % 360}) 50%, oklch(0.84 0.2 ${(hue + 290) % 360}) 100%)`);
    const k = settings.neonIntensity / 100;
    r.style.setProperty("--shadow-glow", `0 0 ${20 + 60 * k}px -8px oklch(0.78 0.18 ${hue} / ${0.2 + 0.6 * k})`);
    r.style.setProperty("--glass-blur", `${settings.glassBlur}px`);
    r.style.setProperty("--font-scale", String(settings.fontScale));
    r.dataset.density = settings.density;
    r.dataset.reduceMotion = settings.reduceMotion ? "1" : "0";
    r.dataset.lang = settings.language;
  }, [settings]);

  return (
    <Ctx.Provider value={{
      settings,
      set: (k, v) => setSettings((s) => ({ ...s, [k]: v })),
      reset: () => setSettings(DEFAULTS),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useSettings = () => useContext(Ctx);
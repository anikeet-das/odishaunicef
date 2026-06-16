import { useState, useRef, useEffect } from "react";
import { Languages, Check } from "lucide-react";
import { useI18n, LANG_LABELS, type Lang } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-soft text-xs hover:text-foreground text-muted-foreground transition"
      >
        <Languages className="h-3.5 w-3.5 text-[var(--cyan)]" />
        <span className="font-bold">{LANG_LABELS[lang].latin}</span>
        <span className="hidden md:inline">{LANG_LABELS[lang].native}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-2xl p-1.5 z-50"
          style={{
            background: "var(--panel-solid)",
            border: "1px solid oklch(0.85 0.2 195 / 0.35)",
            boxShadow: "0 24px 60px -20px oklch(0 0 0 / 0.85)",
          }}
        >
          {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => { setLang(l); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition ${
                lang === l ? "bg-[oklch(0.85_0.2_195/0.15)] text-foreground" : "hover:bg-white/5 text-muted-foreground"
              }`}
            >
              <span className="font-bold w-6 text-[var(--cyan)]">{LANG_LABELS[l].latin}</span>
              <span className="flex-1 text-left">{LANG_LABELS[l].native}</span>
              {lang === l && <Check className="h-3.5 w-3.5 text-[var(--aurora)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
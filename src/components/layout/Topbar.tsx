import { useViewMode } from "@/components/layout/view-mode";
import { Activity, Maximize2, Minimize2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeProvider";
import { UploadDataButton } from "@/components/admin/UploadDataButton";
import { useI18n } from "@/lib/i18n";
import { useRouterState } from "@tanstack/react-router";
import { tabFor } from "@/lib/tabs/config";

type Props = {
  title: string;
  subtitle?: string;
  /** Override route auto-config for view toggle. */
  hasViewToggle?: boolean;
  /** Override route auto-config for upload. */
  uploadTab?: string;
  uploadRecommendedColumns?: string[];
};

export function Topbar({ title, subtitle, hasViewToggle, uploadTab, uploadRecommendedColumns }: Props) {
  const { mode, setMode } = useViewMode();
  const { t } = useI18n();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const cfg = tabFor(path);
  const viewEnabled = hasViewToggle ?? cfg.view;
  const upload = uploadTab
    ? { tab: uploadTab, cols: uploadRecommendedColumns }
    : cfg.upload
    ? { tab: cfg.upload.tab, cols: cfg.upload.cols }
    : null;
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 glass-soft rounded-2xl mx-3 mt-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{subtitle ?? "Command Center"}</div>
        <h1 className="text-xl font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass-soft text-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.84_0.2_155)] pulse-dot" />
          <Activity className="h-3.5 w-3.5 text-accent" />
          <span className="text-muted-foreground">{t("live.schools")}</span>
        </div>
        {viewEnabled ? (
          <div className="inline-flex rounded-full glass-soft p-1 text-xs">
            <button
              onClick={() => setMode("macro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                mode === "macro" ? "bg-primary/20 text-foreground neon-ring" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" /> {t("view.macro")}
            </button>
            <button
              onClick={() => setMode("micro")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                mode === "micro" ? "bg-primary/20 text-foreground neon-ring" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Minimize2 className="h-3.5 w-3.5" /> {t("view.micro")}
            </button>
          </div>
        ) : (
          <span className="px-3 py-1.5 rounded-full glass-soft text-[11px] text-muted-foreground" title="Micro/Macro View Not Applicable">
            {t("view.macro")} / {t("view.micro")} · {t("view.disabled")}
          </span>
        )}
        {upload && <UploadDataButton tab={upload.tab} recommendedColumns={upload.cols} />}
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
    </header>
  );
}
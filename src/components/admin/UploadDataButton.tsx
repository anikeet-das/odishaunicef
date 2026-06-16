import { useState } from "react";
import { Upload } from "lucide-react";
import { UploadDataModal } from "./UploadDataModal";
import { useI18n } from "@/lib/i18n";

export function UploadDataButton({ tab, recommendedColumns }: { tab: string; recommendedColumns?: string[] }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-soft text-xs text-muted-foreground hover:text-foreground transition border border-[oklch(0.85_0.2_195/0.25)]"
        title={t("btn.upload")}
      >
        <Upload className="h-3.5 w-3.5 text-[var(--cyan)]" />
        <span className="hidden md:inline">{t("btn.upload")}</span>
      </button>
      <UploadDataModal open={open} onClose={() => setOpen(false)} tab={tab} recommendedColumns={recommendedColumns} />
    </>
  );
}
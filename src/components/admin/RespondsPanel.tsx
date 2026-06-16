import { ExternalLink, ShieldCheck } from "lucide-react";

const SHEET_VIEW_URL =
  "https://docs.google.com/spreadsheets/d/18ZFwN8UEGsp5Kx3wsxMau1sRd5RbAueMqML0kkYT07Y/edit?usp=sharing";
const SHEET_EMBED_URL =
  "https://docs.google.com/spreadsheets/d/18ZFwN8UEGsp5Kx3wsxMau1sRd5RbAueMqML0kkYT07Y/preview";

export function RespondsPanel() {
  return (
    <div className="glass rounded-2xl p-3 min-h-[70vh] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-[oklch(0.84_0.2_155)]" />
          Unlocked · live spreadsheet
        </div>
        <a href={SHEET_VIEW_URL} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass-soft hover:neon-ring transition">
          Open spreadsheet <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex-1 rounded-xl overflow-hidden border border-border/50 bg-white">
        <iframe src={SHEET_EMBED_URL} title="CR-SAP Form Responses"
                className="w-full h-full min-h-[70vh]" loading="lazy" />
      </div>
    </div>
  );
}
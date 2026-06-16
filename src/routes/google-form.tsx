import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { ExternalLink } from "lucide-react";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdfiO-Nh1uTSLbhE1oOuGg_ktFEfyh6w9EmFPELKeGOiumk9A/viewform?embedded=true";
const OPEN_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdfiO-Nh1uTSLbhE1oOuGg_ktFEfyh6w9EmFPELKeGOiumk9A/viewform?usp=sharing";

export const Route = createFileRoute("/google-form")({
  head: () => ({ meta: [{ title: "Google Form · CR-SAP Odisha" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Google Form" subtitle="Live Data Capture" />
      <div className="p-3 flex-1">
        <div className="glass rounded-2xl p-3 min-h-[calc(100vh-9rem)] flex flex-col">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="text-xs text-muted-foreground">
              Live preview · responses sync in real time
            </div>
            <a
              href={OPEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass-soft hover:neon-ring transition"
            >
              Open in new tab <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex-1 rounded-xl overflow-hidden border border-border/50 bg-white">
            <iframe
              src={FORM_URL}
              title="CR-SAP Data Capture Form"
              className="w-full h-full min-h-[calc(100vh-13rem)]"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
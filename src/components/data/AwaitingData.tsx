import { Link } from "@tanstack/react-router";
import { Inbox, RefreshCw, ExternalLink } from "lucide-react";

const FORM_OPEN_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe1v8RWC6U483d2O7gZfGDA4OnP8c1HtjSq5rChZkprjYNprA/viewform?usp=header";

/**
 * Shown anywhere the live Google-Form spreadsheet has zero responses yet.
 * The whole dashboard is data-driven: the moment a response is submitted it
 * materialises automatically across every tab.
 */
export function AwaitingData({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-6">
      <div className="glass rounded-2xl p-8 max-w-lg text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-2xl grid place-items-center"
             style={{ background: "var(--gradient-aurora)" }}>
          <Inbox className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-semibold neon-text">Awaiting first live response</h2>
        <p className="text-sm text-muted-foreground">
          This dashboard is fully real-time. As soon as a school submits the
          attached Google Form, its data flows into every tab — KPIs, maps,
          charts and AI recommendations build themselves automatically. No
          dummy data is used.
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <a href={FORM_OPEN_URL} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full glass-soft hover:neon-ring transition">
            Open the data form <ExternalLink className="h-3 w-3" />
          </a>
          {onRefresh && (
            <button onClick={onRefresh}
                    className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full glass-soft hover:neon-ring transition">
              Check now <RefreshCw className="h-3 w-3" />
            </button>
          )}
          <Link to="/admin"
                className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-full glass-soft hover:neon-ring transition">
            View responses sheet
          </Link>
        </div>
      </div>
    </div>
  );
}

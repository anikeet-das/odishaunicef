import type { ReactNode } from "react";
import { Topbar } from "./Topbar";
import { useViewMode } from "./view-mode";

export function ModuleShell({
  title,
  subtitle,
  macro,
  micro,
}: {
  title: string;
  subtitle?: string;
  macro: ReactNode;
  micro: ReactNode;
}) {
  const { mode } = useViewMode();
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-3 flex-1">
        <div className="glass rounded-2xl p-6 min-h-[calc(100vh-9rem)]">
          {mode === "macro" ? macro : micro}
        </div>
      </div>
    </div>
  );
}

export function Placeholder({ note }: { note?: string }) {
  return (
    <div className="h-full grid place-items-center text-center">
      <div className="max-w-md space-y-3">
        <div className="mx-auto h-12 w-12 rounded-2xl glass-soft grid place-items-center neon-ring">
          <span className="h-2 w-2 rounded-full bg-accent pulse-dot" />
        </div>
        <h3 className="text-lg font-semibold neon-text">Module ready for data</h3>
        <p className="text-sm text-muted-foreground">
          {note ?? "Connect your Supabase backend to stream live data into this module."}
        </p>
      </div>
    </div>
  );
}
import { Topbar } from "@/components/layout/Topbar";

export function LoadingShell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-3">
        <div className="glass rounded-2xl h-[70vh] grid place-items-center">
          <div className="text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <div className="text-sm text-muted-foreground">Streaming live data…</div>
          </div>
        </div>
      </div>
    </div>
  );
}
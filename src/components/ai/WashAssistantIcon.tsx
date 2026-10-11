import { School, Droplet } from "lucide-react";

export function WashAssistantIcon({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center ${className}`}>
      <School className="h-7 w-7" strokeWidth={1.8} />
      <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-assistant-ink text-assistant-paper">
        <Droplet className="h-3 w-3" strokeWidth={2} />
      </span>
    </span>
  );
}
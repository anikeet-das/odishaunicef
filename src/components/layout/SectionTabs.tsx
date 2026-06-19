import { Link, useRouterState } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { groupForPath } from "./nav-config";

/**
 * Secondary navigation rendered inside the page area.
 * Sidebar (desktop) and bottom nav (mobile/tablet) handle category switching;
 * this strip only surfaces the SUB-TABS of the active category and stays
 * hidden when there's only a single item.
 */
export function SectionTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const activeGroup = groupForPath(pathname);

  if (!activeGroup || activeGroup.items.length <= 1) {
    return <div className="px-3 pt-3" />;
  }

  return (
    <div className="px-3 pt-3">
      <div className="glass-soft rounded-2xl p-1.5 flex gap-1 overflow-x-auto scroll-invisible">
        {activeGroup.items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all ${
                active
                  ? "bg-[oklch(0.85_0.2_195/0.12)] text-foreground neon-ring"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--cyan)]" : ""}`} />
              <span className="whitespace-nowrap font-medium">{t(it.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

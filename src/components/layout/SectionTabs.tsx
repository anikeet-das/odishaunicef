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
    <nav aria-label={`${t(activeGroup.items[0].labelKey)} section navigation`} className="section-navigation px-3 pt-3">
      <div className="glass-soft rounded-2xl p-1.5 grid grid-cols-2 gap-1 lg:flex lg:overflow-x-auto lg:scroll-invisible">
        {activeGroup.items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              aria-current={active ? "page" : undefined}
              className={`min-w-0 lg:shrink-0 inline-flex items-center gap-2 px-2.5 lg:px-3.5 py-2.5 lg:py-2 rounded-xl text-xs lg:text-sm transition-all ${
                active
                   ? "bg-primary/10 text-foreground neon-ring"
                   : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--cyan)]" : ""}`} />
              <span className="min-w-0 break-words lg:whitespace-nowrap font-medium">{t(it.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { NAV_GROUPS, groupForPath } from "./nav-config";

/**
 * Secondary navigation rendered inside the page area. The sidebar only shows
 * top-level categories — the sub-tabs of the active category live here as a
 * horizontal topbar. On mobile (sidebar hidden) the category switcher is also
 * surfaced here so every section stays reachable.
 */
export function SectionTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const activeGroup = groupForPath(pathname);

  return (
    <div className="px-3 pt-3 space-y-2">
      {/* Category switcher — mobile only (sidebar covers desktop) */}
      <div className="lg:hidden flex gap-1.5 overflow-x-auto scroll-invisible pb-1">
        {NAV_GROUPS.map((g) => {
          const active = activeGroup?.id === g.id;
          const Icon = g.icon;
          return (
            <Link
              key={g.id}
              to={g.items[0].to}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition ${
                active ? "bg-primary/20 text-foreground neon-ring" : "glass-soft text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(g.labelKey)}
            </Link>
          );
        })}
        <Link
          to="/settings"
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition ${
            pathname === "/settings" ? "bg-primary/20 text-foreground neon-ring" : "glass-soft text-muted-foreground"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          {t("nav.settings")}
        </Link>
      </div>


      {/* Sub-tabs of the active category */}
      {activeGroup && activeGroup.items.length > 1 && (
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
                <Icon className={`h-4 w-4 ${active ? "text-[var(--cyan)]" : ""}`} />
                <span className="whitespace-nowrap font-medium">{t(it.labelKey)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

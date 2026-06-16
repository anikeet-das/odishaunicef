import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import unicefLogo from "@/assets/unicef-logo.png";
import { useI18n } from "@/lib/i18n";
import { NAV_GROUPS, groupForPath } from "./nav-config";

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useI18n();
  const activeGroup = groupForPath(pathname);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("crsap.sidebar.collapsed") === "1";
  });
  useEffect(() => {
    if (typeof window !== "undefined")
      window.localStorage.setItem("crsap.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const width = collapsed ? 76 : 280;

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      className="hidden lg:flex fixed left-3 top-3 bottom-3 z-40 flex-col glass rounded-2xl overflow-hidden"
      style={{ width }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl"
           style={{ background: "radial-gradient(120% 60% at 0% 0%, oklch(0.85 0.2 195 / 0.08), transparent 60%)" }} />

      {/* Header */}
      <div className="relative flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <img src={unicefLogo} alt="UNICEF" className="h-8 w-auto drop-shadow-[0_0_12px_oklch(0.78_0.18_220/0.5)] shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="brand"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              className="leading-tight min-w-0"
            >
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">CR-SAP Odisha</div>
              <div className="text-sm font-semibold neon-text truncate">Intelligence Platform</div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand" : "Collapse"}
          className="ml-auto h-7 w-7 grid place-items-center rounded-lg glass-soft text-muted-foreground hover:text-foreground transition"
        >
          {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Category-only navigation */}
      <nav className="relative flex-1 overflow-y-auto scroll-invisible fade-mask-y px-2 py-3 space-y-1.5">
        {!collapsed && (
          <div className="px-3 mb-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            Categories

          </div>
        )}
        {NAV_GROUPS.map((g) => {
          const active = activeGroup?.id === g.id;
          const Icon = g.icon;
          const label = t(g.labelKey);
          const target = g.items[0].to;
          return (
            <Link
              key={g.id}
              to={target}
              title={collapsed ? label : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                active
                  ? "bg-[oklch(0.85_0.2_195/0.10)] text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.72_0.21_255/0.08)]"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="active-beam"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                  style={{ background: "var(--cyan)", boxShadow: "0 0 12px var(--cyan)" }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                />
              )}
              <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[var(--cyan)]" : "group-hover:text-primary"}`}
                    style={active ? { filter: "drop-shadow(0 0 6px var(--cyan))" } : undefined} />
              {!collapsed && <span className="truncate font-medium">{label}</span>}
              {!collapsed && active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--aurora)] animate-pulse-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings — standalone, sits above the AI Copilot block with a gap */}
      <div className="relative px-3 pt-3 mt-2 border-t border-border/50">
        <Link
          to="/settings"
          title={collapsed ? t("nav.settings") : undefined}
          className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            pathname === "/settings"
              ? "bg-[oklch(0.85_0.2_195/0.10)] text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-[oklch(0.72_0.21_255/0.08)]"
          }`}
        >
          <Settings className={`h-4 w-4 shrink-0 ${pathname === "/settings" ? "text-[var(--cyan)]" : "group-hover:text-primary"}`} />
          {!collapsed && <span className="truncate font-medium">{t("nav.settings")}</span>}
        </Link>
      </div>

      {/* AI orb */}
      <div className="relative px-3 py-3">

        <button
          className={`w-full flex items-center gap-3 rounded-xl glass-soft px-3 py-2.5 text-left transition hover:bg-[oklch(0.82_0.19_175/0.10)]`}
          onClick={() => window.dispatchEvent(new CustomEvent("crsap:open-ai"))}
        >
          <span className="relative inline-grid h-9 w-9 place-items-center rounded-full animate-orb"
                style={{ background: "radial-gradient(circle at 30% 30%, oklch(0.95 0.13 200), oklch(0.62 0.22 285))" }}>
            <Bot className="h-4 w-4 text-background" />
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold">Aurora · AI Copilot</div>
              <div className="text-[10px] text-muted-foreground truncate">Ask anything · context-aware</div>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

/** Width consumed by the sidebar — kept in sync with the spring above (collapsed/expanded). */
export function useSidebarWidth() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("crsap.sidebar.collapsed") === "1";
  });
  useEffect(() => {
    const i = setInterval(() => {
      const c = window.localStorage.getItem("crsap.sidebar.collapsed") === "1";
      setCollapsed((prev) => (prev === c ? prev : c));
    }, 200);
    return () => clearInterval(i);
  }, []);
  return collapsed ? 76 : 280;
}

import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Network, Award, ClipboardList,
  LayoutDashboard, Globe2, Building2, School,
  Gauge, ShieldAlert, Star, Droplets, Wallet, GitCompare,
  X, ChevronUp, Settings,
} from "lucide-react";
import unicefLogo from "@/assets/unicef-logo.png";

/**
 * Apple-style frosted glass bottom navigation for tablet & mobile.
 * 5 controls: Intelligence · Analytics · UNICEF (admin) · Evaluation · Form.
 * A small Settings disc floats top-right for live config.
 */

type GroupItem = { to: string; label: string; icon: typeof Brain };
type Group = { id: string; label: string; icon: typeof Brain; accent: string; items: GroupItem[] };

const GROUPS: Group[] = [
  {
    id: "intel", label: "Intelligence", icon: Brain, accent: "var(--cyan)",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/map", label: "Odisha Live Map", icon: Globe2 },
      { to: "/districts", label: "District Intelligence", icon: Building2 },
      { to: "/schools", label: "School Explorer", icon: School },
    ],
  },
  {
    id: "analytics", label: "Analytics", icon: Network, accent: "var(--indigo-glow)",
    items: [
      { to: "/sustainability", label: "Sustainability", icon: Gauge },
      { to: "/risk", label: "Risk", icon: ShieldAlert },
      { to: "/shvr", label: "SHVR", icon: Star },
      { to: "/wash", label: "WASH", icon: Droplets },
      { to: "/finance", label: "Financial Intelligence", icon: Wallet },
      { to: "/compare", label: "Compare", icon: GitCompare },
    ],
  },
  {
    id: "eval", label: "Evaluation", icon: Award, accent: "var(--aurora)",
    items: [
      { to: "/scorecard", label: "Scorecard", icon: Award },
    ],
  },
  {
    id: "form", label: "Form", icon: ClipboardList, accent: "var(--warn)",
    items: [
      { to: "/google-form", label: "Google Form", icon: ClipboardList },
    ],
  },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [openGroup, setOpenGroup] = useState<Group | null>(null);
  const [atTop, setAtTop] = useState(true);

  // close sheet when route changes
  useEffect(() => { setOpenGroup(null); }, [pathname]);

  // Hide the floating Settings disc as soon as the user scrolls.
  // The main scroller is `.app-main`; fall back to window when absent.
  useEffect(() => {
    const scroller: HTMLElement | Window =
      (typeof document !== "undefined" && document.querySelector<HTMLElement>(".app-main")) || window;
    const readTop = () => {
      const y = scroller instanceof Window ? window.scrollY : scroller.scrollTop;
      setAtTop(y < 24);
    };
    readTop();
    scroller.addEventListener("scroll", readTop, { passive: true });
    return () => scroller.removeEventListener("scroll", readTop as EventListener);
  }, [pathname]);

  const activeGroupId =
    GROUPS.find((g) => g.items.some((it) => it.to === pathname))?.id
    ?? GROUPS.find((g) => g.items.some((it) => it.to !== "/" && pathname.startsWith(it.to)))?.id;

  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {/* Spacer so page content never sits under the bar */}
      <div className="lg:hidden h-[96px]" aria-hidden />

      {/* Floating Settings disc (top-right, mobile/tablet only) — hides on scroll */}
      <Link
        to="/settings"
        aria-label="Settings"
        className={`lg:hidden fixed top-3 right-3 z-[55] h-10 w-10 grid place-items-center rounded-full transition-all duration-300 active:scale-95 ${
          atTop ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-3 pointer-events-none"
        }`}
        style={{
          background: "color-mix(in oklab, var(--background) 70%, transparent)",
          backdropFilter: "blur(18px) saturate(160%)",
          WebkitBackdropFilter: "blur(18px) saturate(160%)",
          border: "1px solid color-mix(in oklab, var(--foreground) 14%, transparent)",
          boxShadow: "0 10px 24px -10px rgba(0,0,0,0.45)",
          color: pathname === "/settings" ? "var(--cyan)" : "var(--muted-foreground)",
        }}
      >
        <Settings className="h-4 w-4" />
      </Link>



      {/* Sheet */}
      <AnimatePresence>
        {openGroup && (
          <>
            <motion.div
              className="lg:hidden fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpenGroup(null)}
            />
            <motion.div
              key={openGroup.id}
              initial={{ y: 240, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 240, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="lg:hidden fixed left-3 right-3 bottom-[108px] z-[56] rounded-3xl overflow-hidden"
              style={{
                background: "color-mix(in oklab, var(--background) 70%, transparent)",
                backdropFilter: "blur(28px) saturate(160%)",
                WebkitBackdropFilter: "blur(28px) saturate(160%)",
                border: "1px solid color-mix(in oklab, var(--foreground) 12%, transparent)",
                boxShadow: "0 24px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04) inset",
              }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <openGroup.icon className="h-4 w-4" style={{ color: openGroup.accent }} />
                  <div className="text-sm font-semibold">{openGroup.label}</div>
                </div>
                <button onClick={() => setOpenGroup(null)} className="h-7 w-7 grid place-items-center rounded-full bg-white/5 text-muted-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 px-4 pb-4 max-h-[55vh] overflow-y-auto scroll-invisible">
                {openGroup.items.map((it) => {
                  const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
                  return (
                    <Link
                      key={it.to}
                      to={it.to}
                      onClick={() => setOpenGroup(null)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 transition"
                      style={{
                        background: active
                          ? `color-mix(in oklab, ${openGroup.accent} 18%, transparent)`
                          : "color-mix(in oklab, var(--foreground) 5%, transparent)",
                        border: `1px solid ${active ? openGroup.accent : "transparent"}`,
                      }}
                    >
                      <span className="h-9 w-9 grid place-items-center rounded-xl"
                            style={{ background: "color-mix(in oklab, var(--foreground) 8%, transparent)", color: openGroup.accent }}>
                        <it.icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-medium truncate">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <nav
        className="lg:hidden fixed left-3 right-3 bottom-3 z-[60] h-[88px] rounded-[36px] flex items-center px-3"
        style={{
          background: "color-mix(in oklab, var(--background) 62%, transparent)",
          backdropFilter: "blur(26px) saturate(170%)",
          WebkitBackdropFilter: "blur(26px) saturate(170%)",
          border: "1px solid color-mix(in oklab, var(--foreground) 14%, transparent)",
          boxShadow:
            "0 18px 48px -16px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
      >
        <div className="grid grid-cols-5 items-center w-full">
          {/* Intelligence */}
          <SideButton group={GROUPS[0]} active={activeGroupId === "intel"} onClick={() => setOpenGroup(GROUPS[0])} />
          {/* Analytics */}
          <SideButton group={GROUPS[1]} active={activeGroupId === "analytics"} onClick={() => setOpenGroup(GROUPS[1])} />

          {/* Centre UNICEF disc → admin */}
          <div className="flex justify-center">
            <Link
              to="/admin"
              aria-label="Admin panel"
              className="relative -mt-10 grid place-items-center rounded-full"
              style={{
                width: 84, height: 84,
                background: "radial-gradient(circle at 30% 28%, #ffffff 0%, #f3faff 55%, #d6ecff 100%)",
                boxShadow:
                  "0 18px 36px -10px rgba(0, 113, 206, 0.55), 0 0 0 6px color-mix(in oklab, var(--background) 70%, transparent), 0 0 0 1px rgba(0, 113, 206, 0.25)",
              }}
            >
              <img
                src={unicefLogo}
                alt="UNICEF"
                className="h-12 w-auto object-contain pointer-events-none select-none"
                draggable={false}
              />
              {isAdmin && (
                <motion.span layoutId="mob-active-glow"
                  className="absolute -bottom-1 h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--aurora)", boxShadow: "0 0 8px var(--aurora)" }}
                />
              )}
            </Link>
          </div>

          {/* Evaluation */}
          <SideButton group={GROUPS[2]} active={activeGroupId === "eval"} onClick={() => setOpenGroup(GROUPS[2])} />
          {/* Form */}
          <SideButton group={GROUPS[3]} active={activeGroupId === "form"} onClick={() => setOpenGroup(GROUPS[3])} />
        </div>
      </nav>
    </>
  );
}

function SideButton({ group, active, onClick }: { group: Group; active: boolean; onClick: () => void }) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-center gap-0.5 py-2 transition active:scale-95"
    >
      <span
        className="h-9 w-9 grid place-items-center rounded-2xl transition"
        style={{
          background: active
            ? `color-mix(in oklab, ${group.accent} 22%, transparent)`
            : "color-mix(in oklab, var(--foreground) 5%, transparent)",
          color: active ? group.accent : "var(--muted-foreground)",
          boxShadow: active ? `0 0 0 1px ${group.accent}` : "none",
        }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-[10px] font-medium" style={{ color: active ? group.accent : "var(--muted-foreground)" }}>
        {group.label}
      </span>
      {active && (
        <ChevronUp className="absolute -top-1 h-3 w-3 opacity-70" style={{ color: group.accent }} />
      )}
    </button>
  );
}

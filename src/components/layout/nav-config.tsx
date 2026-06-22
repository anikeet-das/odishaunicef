import {
  LayoutDashboard, Globe2, Building2, School, Gauge, ShieldAlert, Star,
  FileBarChart2, BookOpen, ClipboardList,
  Lock, Droplets, Award, GitCompare, MessageCircle, Palette, Wallet,
  Brain, FolderKanban, Network, Sparkles, Images, Image as ImageIcon, Video as VideoIcon,
} from "lucide-react";

export type NavItem = { to: string; labelKey: string; icon: any };
export type NavGroup = { id: string; labelKey: string; icon: any; items: NavItem[] };

/**
 * Top-level categories shown in the sidebar. The sub-tabs of the active
 * category are surfaced as a topbar (SectionTabs) inside the page itself.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "intel",
    labelKey: "group.intel",
    icon: Brain,
    items: [
      { to: "/", labelKey: "nav.overview", icon: LayoutDashboard },
      { to: "/map", labelKey: "nav.map", icon: Globe2 },
      { to: "/districts", labelKey: "nav.districts", icon: Building2 },
      { to: "/schools", labelKey: "nav.schools", icon: School },
    ],
  },
  {
    id: "analytics",
    labelKey: "group.analytics",
    icon: Network,
    items: [
      { to: "/sustainability", labelKey: "nav.sustainability", icon: Gauge },
      { to: "/risk", labelKey: "nav.risk", icon: ShieldAlert },
      { to: "/shvr", labelKey: "nav.shvr", icon: Star },
      { to: "/wash", labelKey: "nav.wash", icon: Droplets },
      { to: "/finance", labelKey: "nav.finance", icon: Wallet },
      { to: "/ai-notes", labelKey: "nav.ainotes", icon: Sparkles },
      { to: "/compare", labelKey: "nav.compare", icon: GitCompare },
    ],
  },
  {
    id: "eval",
    labelKey: "group.eval",
    icon: Award,
    items: [
      { to: "/scorecard", labelKey: "nav.scorecard", icon: Award },
    ],
  },
  {
    id: "gallery",
    labelKey: "group.gallery",
    icon: Images,
    items: [
      { to: "/gallery/photos", labelKey: "nav.gallery.photos", icon: ImageIcon },
      { to: "/gallery/videos", labelKey: "nav.gallery.videos", icon: VideoIcon },
    ],
  },
  {
    id: "form",
    labelKey: "group.form",
    icon: ClipboardList,
    items: [
      { to: "/google-form", labelKey: "nav.gform", icon: ClipboardList },
    ],
  },
  {
    id: "system",
    labelKey: "group.system",
    icon: FolderKanban,
    items: [
      { to: "/admin", labelKey: "nav.admin", icon: Lock },
      { to: "/resources", labelKey: "nav.resources", icon: BookOpen },
      { to: "/reports", labelKey: "nav.reports", icon: FileBarChart2 },
      { to: "/theme", labelKey: "nav.theme", icon: Palette },
      { to: "/feedback", labelKey: "nav.feedback", icon: MessageCircle },
    ],
  },
];

/** Find the group that owns a given pathname. */
export function groupForPath(pathname: string): NavGroup | undefined {
  // exact match first
  let found = NAV_GROUPS.find((g) => g.items.some((it) => it.to === pathname));
  if (found) return found;
  // prefix match for nested routes
  found = NAV_GROUPS.find((g) =>
    g.items.some((it) => it.to !== "/" && pathname.startsWith(it.to)),
  );
  return found;
}

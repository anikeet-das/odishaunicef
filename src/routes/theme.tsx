import { createFileRoute } from "@tanstack/react-router";
import { Topbar } from "@/components/layout/Topbar";
import { useTheme } from "@/components/layout/ThemeProvider";
import { Moon, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/theme")({
  head: () => ({ meta: [{ title: "Theme · CR-SAP Odisha" }] }),
  component: Page,
});

function Page() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-col min-h-full">
      <Topbar title="Theme" subtitle="Visual Preference Center" hasViewToggle={false} />
      <div className="p-3 grid lg:grid-cols-2 gap-4">
        <Card
          active={theme === "cream"}
          onClick={() => setTheme("cream")}
          icon={<Sparkles className="h-6 w-6" />}
          title="Light Azure"
          subtitle="Handcrafted bright-white canvas with azure-blue accents and soft sky shadows — the signature daylight look."
        />
        <Card
          active={theme === "dark"}
          onClick={() => setTheme("dark")}
          icon={<Moon className="h-6 w-6" />}
          title="Dark · Aurora"
          subtitle="Futuristic neon glass — the operational night-mode."
        />
        <div className="glass rounded-2xl p-5 lg:col-span-2 text-sm">
          Theme persists per browser. Charts, glass surfaces, terminals and tooltips re-skin automatically across every tab.
          Use the toggle in the top-bar for a quick swap from any page.
        </div>
      </div>
    </div>
  );
}

function Card({ active, onClick, icon, title, subtitle }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; subtitle: string;
}) {
  return (
    <motion.button whileHover={{ y: -2 }} onClick={onClick}
      className={`glass rounded-2xl p-6 text-left relative overflow-hidden transition ${active ? "neon-ring" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 grid place-items-center rounded-xl text-background" style={{ background: "var(--gradient-aurora)" }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold">{title}</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
        {active && <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full text-background"
                         style={{ background: "var(--gradient-aurora)" }}><Check className="h-3 w-3" /> ACTIVE</span>}
      </div>
    </motion.button>
  );
}

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Wallet, AlertTriangle, Scale, HandCoins } from "lucide-react";
import {
  useFundLedger, ledgerTotals, inr,
  CAPITAL_CATEGORIES, OPEX_CATEGORIES, SOURCE_OPTIONS,
  type LedgerKind, type CostType, type CapitalCategory, type OpexCategory, type SourceOption,
} from "@/lib/data/fund-ledger";
import { ODISHA_DISTRICTS } from "@/lib/data/odisha";

const TODAY = () => new Date().toISOString().slice(0, 10);

const CAPITAL_LABEL: Record<CapitalCategory, string> = {
  water: "Water systems", sanitation: "Sanitation / Toilets", hygiene: "Hygiene",
  environment: "Environment / Rainwater", riskReduction: "Risk Reduction",
  technology: "Technology", education: "Education Infra",
};
const OPEX_LABEL: Record<OpexCategory, string> = {
  maintenance: "Maintenance", repairs: "Repairs", cleaning: "Cleaning",
  consumables: "Consumables", utilities: "Utilities",
};
const SOURCE_LABEL: Record<SourceOption, string> = {
  unicef: "UNICEF", government: "Government", csr: "CSR", panchayat: "Panchayat",
  ngo: "NGO", community: "Community", others: "Others",
};

export function FundLedgerPanel() {
  const { entries, add, remove } = useFundLedger();
  const totals = ledgerTotals(entries);

  const [kind, setKind] = useState<LedgerKind>("fund");
  const [source, setSource] = useState<SourceOption>("unicef");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY());
  const [purpose, setPurpose] = useState("");
  const [district, setDistrict] = useState("Statewide");
  const [costType, setCostType] = useState<CostType>("capital");
  const [capCat, setCapCat] = useState<CapitalCategory>("water");
  const [opexCat, setOpexCat] = useState<OpexCategory>("maintenance");
  const [udise, setUdise] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [block, setBlock] = useState("");
  const [utilized, setUtilized] = useState(false);

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(String(amount).replace(/[^\d.]/g, ""));
    if (!amt) return;
    add({
      kind,
      source: kind === "fund" ? source : (source || "others"),
      amount: amt,
      date,
      purpose: purpose.trim(),
      district,
      costType: kind === "gap" ? costType : undefined,
      category: kind === "gap" ? (costType === "capital" ? capCat : opexCat) : undefined,
      udise: udise.trim() || undefined,
      schoolName: schoolName.trim() || undefined,
      block: block.trim() || undefined,
      utilized: kind === "fund" ? utilized : undefined,
    });
    setAmount(""); setPurpose(""); setUdise(""); setSchoolName(""); setBlock(""); setUtilized(false);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<HandCoins className="h-4 w-4" />} label="Funds collected" value={inr(totals.collected)} accent="var(--aurora)" />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Resource gap" value={inr(totals.gap)} accent="var(--warn)" />
        <Stat icon={<Scale className="h-4 w-4" />}
              label={totals.balance >= 0 ? "Surplus" : "Shortfall"}
              value={inr(Math.abs(totals.balance))}
              accent={totals.balance >= 0 ? "var(--cyan)" : "var(--danger)"} />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Gap coverage" value={`${totals.coverage}%`} accent="var(--indigo-glow)" />
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-3">
        <form onSubmit={submit} className="glass rounded-2xl p-4 space-y-2.5 h-fit">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">Record an entry</div>

          <div className="grid grid-cols-2 gap-1.5">
            {(["fund", "gap"] as LedgerKind[]).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition border ${
                  kind === k
                    ? "bg-[oklch(0.85_0.2_195/0.12)] border-[oklch(0.85_0.2_195/0.4)] text-foreground"
                    : "border-transparent glass-soft text-muted-foreground"
                }`}>
                {k === "fund" ? "Funds collected" : "Required (gap)"}
              </button>
            ))}
          </div>

          {kind === "fund" ? (
            <Field label="Source">
              <select value={source} onChange={(e) => setSource(e.target.value as SourceOption)}
                      className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring">
                {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
              </select>
            </Field>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {(["capital", "opex"] as CostType[]).map((c) => (
                  <button key={c} type="button" onClick={() => setCostType(c)}
                    className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition border ${
                      costType === c
                        ? "bg-[oklch(0.85_0.2_195/0.12)] border-[oklch(0.85_0.2_195/0.4)] text-foreground"
                        : "border-transparent glass-soft text-muted-foreground"
                    }`}>
                    {c === "capital" ? "Capital" : "Operational"}
                  </button>
                ))}
              </div>
              <Field label="Category">
                {costType === "capital" ? (
                  <select value={capCat} onChange={(e) => setCapCat(e.target.value as CapitalCategory)}
                          className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring">
                    {CAPITAL_CATEGORIES.map((c) => <option key={c} value={c}>{CAPITAL_LABEL[c]}</option>)}
                  </select>
                ) : (
                  <select value={opexCat} onChange={(e) => setOpexCat(e.target.value as OpexCategory)}
                          className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring">
                    {OPEX_CATEGORIES.map((c) => <option key={c} value={c}>{OPEX_LABEL[c]}</option>)}
                  </select>
                )}
              </Field>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Amount (₹)">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="50000"
                className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
            </Field>
          </div>

          <Field label="District">
            <select value={district} onChange={(e) => setDistrict(e.target.value)}
              className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring">
              <option>Statewide</option>
              {ODISHA_DISTRICTS.map((d) => <option key={d.id}>{d.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="UDISE (optional)">
              <input value={udise} onChange={(e) => setUdise(e.target.value)} placeholder="21010100101"
                className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
            </Field>
            <Field label="Block (optional)">
              <input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="Block"
                className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
            </Field>
          </div>

          <Field label="School name (optional)">
            <input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="UPS Govt. School"
              className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
          </Field>

          <Field label="Purpose">
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Toilet repair, rainwater harvesting"
              className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
          </Field>

          {kind === "fund" && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none cursor-pointer">
              <input type="checkbox" checked={utilized} onChange={(e) => setUtilized(e.target.checked)}
                     className="h-3.5 w-3.5 accent-[var(--aurora)]" />
              Mark as already utilised
            </label>
          )}

          <button type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-[var(--aurora)] text-background hover:brightness-110">
            <Plus className="h-4 w-4" /> Add to ledger
          </button>
        </form>

        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Fund ledger · {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </div>
          {entries.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              No entries yet. Add at least one <b>Required (gap)</b> and one <b>Funds collected</b> entry — every
              chart, leaderboard and AI insight populates automatically from this ledger.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Type", "Source / Sector", "Amount", "Date", "District", "School", "Purpose", ""].map((h) => (
                      <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {sorted.map((e) => (
                      <motion.tr key={e.id} layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border-t border-border/30">
                        <td className="px-2 py-2">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{
                              background: e.kind === "fund" ? "oklch(0.82 0.22 150 / 0.15)" : "oklch(0.8 0.18 70 / 0.15)",
                              color: e.kind === "fund" ? "var(--aurora)" : "var(--warn)",
                            }}>
                            {e.kind === "fund" ? (e.utilized ? "Used" : "Fund") : (e.costType === "opex" ? "Opex" : "Capital")}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-medium">
                          {e.kind === "fund"
                            ? (SOURCE_LABEL[e.source as SourceOption] ?? e.source)
                            : (e.category
                                ? (e.costType === "opex"
                                    ? OPEX_LABEL[e.category as OpexCategory]
                                    : CAPITAL_LABEL[e.category as CapitalCategory])
                                : "—")}
                        </td>
                        <td className="px-2 py-2 tabular-nums font-semibold">{inr(e.amount)}</td>
                        <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{e.date}</td>
                        <td className="px-2 py-2 text-muted-foreground">{e.district}</td>
                        <td className="px-2 py-2 text-muted-foreground max-w-[16ch] truncate">{e.schoolName || (e.udise ? `UDISE ${e.udise}` : "—")}</td>
                        <td className="px-2 py-2 text-muted-foreground max-w-[18ch] truncate">{e.purpose || "—"}</td>
                        <td className="px-2 py-2 text-right">
                          <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-[var(--danger)] transition">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full blur-2xl opacity-30" style={{ background: accent }} />
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        <span style={{ color: accent }}>{icon}</span>{label}
      </div>
      <div className="text-xl font-bold mt-1.5 tabular-nums" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

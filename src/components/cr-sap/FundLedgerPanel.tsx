import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Wallet, AlertTriangle, Scale, HandCoins } from "lucide-react";
import { useFundLedger, ledgerTotals, inr, type LedgerKind } from "@/lib/data/fund-ledger";
import { ODISHA_DISTRICTS } from "@/lib/data/odisha";

const TODAY = () => new Date().toISOString().slice(0, 10);

export function FundLedgerPanel() {
  const { entries, add, remove } = useFundLedger();
  const totals = ledgerTotals(entries);

  const [kind, setKind] = useState<LedgerKind>("fund");
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(TODAY());
  const [purpose, setPurpose] = useState("");
  const [district, setDistrict] = useState("Statewide");

  const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(String(amount).replace(/[^\d.]/g, ""));
    if (!source.trim() || !amt) return;
    add({ kind, source: source.trim(), amount: amt, date, purpose: purpose.trim(), district });
    setSource(""); setAmount(""); setPurpose("");
  }

  return (
    <div className="space-y-3">
      {/* Balance sheet summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<HandCoins className="h-4 w-4" />} label="Funds collected" value={inr(totals.collected)} accent="var(--aurora)" />
        <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Resource gap" value={inr(totals.gap)} accent="var(--warn)" />
        <Stat
          icon={<Scale className="h-4 w-4" />}
          label={totals.balance >= 0 ? "Surplus" : "Shortfall"}
          value={inr(Math.abs(totals.balance))}
          accent={totals.balance >= 0 ? "var(--cyan)" : "var(--danger)"}
        />
        <Stat icon={<Wallet className="h-4 w-4" />} label="Gap coverage" value={`${totals.coverage}%`} accent="var(--indigo-glow)" />
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-3">
        {/* Entry form */}
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
                {k === "fund" ? "Fund collected" : "Resource gap"}
              </button>
            ))}
          </div>

          <Field label="Source / Contributor">
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. UNICEF, CSR, Govt, Panchayat"
              className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
          </Field>

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

          <Field label="Purpose">
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Toilet repair, rainwater harvesting"
              className="w-full glass-soft rounded-lg px-2.5 py-1.5 text-sm outline-none focus:neon-ring" />
          </Field>

          <button type="submit"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold bg-[var(--aurora)] text-background hover:brightness-110">
            <Plus className="h-4 w-4" /> Add to ledger
          </button>
        </form>

        {/* Ledger table */}
        <div className="glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Fund ledger · {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </div>
          {entries.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              No entries yet. Record collected funds and resource gaps with who gave, when and for what purpose.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    {["Type", "Source", "Amount", "Date", "District", "Purpose", ""].map((h) => (
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
                            {e.kind === "fund" ? "Fund" : "Gap"}
                          </span>
                        </td>
                        <td className="px-2 py-2 font-medium">{e.source}</td>
                        <td className="px-2 py-2 tabular-nums font-semibold">{inr(e.amount)}</td>
                        <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{e.date}</td>
                        <td className="px-2 py-2 text-muted-foreground">{e.district}</td>
                        <td className="px-2 py-2 text-muted-foreground max-w-[20ch] truncate">{e.purpose || "—"}</td>
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

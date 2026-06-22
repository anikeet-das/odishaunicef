import { useMemo } from "react";
import { useSchools, type School } from "./cces";

/* =========================================================================
 *  GALLERY — real photo / video proofs submitted via the Google Form.
 *  Source columns (live sheet):
 *    - "Photo uploaded?"           → Yes/No
 *    - "Photo count"               → number (or text)
 *    - "Video proof available?"    → Yes/No
 *    - "Photo / Drive link"        → URL or note
 *    - "Evidence notes"            → free text
 *    - "Problem description"       → free text
 *    - "Problem categories…"       → comma list
 *    - "Main problem priority"     → text
 *  No synthetic data — schools that didn't submit proof are filtered out.
 * ========================================================================= */

export type MediaKind = "photo" | "video";

export type MediaRecord = {
  id: string;
  kind: MediaKind;
  udise: string;
  schoolName: string;
  district: string;
  count: number | null;        // only meaningful for photos
  problem: string;             // short description
  category: string;            // problem categories
  priority: string;            // High / Medium / Low / Critical
  driveLink: string | null;    // real URL if the school pasted one
  evidence: string;            // evidence notes
};

function findHeader(raw: Record<string, string>, frags: string[]): string | undefined {
  return Object.keys(raw).find((h) => {
    const lc = h.toLowerCase();
    return frags.every((f) => lc.includes(f));
  });
}
function cell(raw: Record<string, string>, frags: string[]): string {
  const h = findHeader(raw, frags);
  return h ? (raw[h] ?? "").trim() : "";
}
function isYes(v: string): boolean {
  const t = v.trim().toLowerCase();
  return t === "yes" || t.startsWith("yes /") || t.startsWith("a) yes") || t === "true";
}
function parseCount(v: string): number | null {
  const m = v.replace(/[, ]/g, "").match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}
function extractUrl(v: string): string | null {
  const m = v.match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
}
function cleanProblem(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const low = t.toLowerCase();
  // Form often has Yes/No/NA echoed in description field — treat as empty.
  if (["yes", "no", "na", "n/a", "0", "-", "yes / ହଁ", "no / ନା"].includes(low)) return "";
  return t;
}
function cleanCategory(raw: string): string {
  // Categories are bilingual "English / Odia, English / Odia" — keep only English half.
  return raw.split(",").map((p) => p.split("/")[0].trim()).filter(Boolean).join(", ");
}
function cleanPriority(raw: string): string {
  return raw.split("/")[0].trim();
}

export function extractMedia(schools: School[], kind: MediaKind): MediaRecord[] {
  const out: MediaRecord[] = [];
  for (const s of schools) {
    const raw = s.raw;
    const photoYes = isYes(cell(raw, ["photo uploaded"]));
    const videoYes = isYes(cell(raw, ["video proof"]));
    const want = kind === "photo" ? photoYes : videoYes;
    if (!want) continue;

    const driveCellPhoto = cell(raw, ["photo", "drive"]);
    const driveLink = extractUrl(driveCellPhoto) ?? extractUrl(cell(raw, ["gps", "map link"]));
    const countStr = kind === "photo" ? cell(raw, ["photo count"]) : "";
    out.push({
      id: `${s.udise || s.name}-${kind}`,
      kind,
      udise: s.udise || "—",
      schoolName: s.name || "Unnamed school",
      district: s.district,
      count: kind === "photo" ? parseCount(countStr) : null,
      problem: cleanProblem(cell(raw, ["problem description"])),
      category: cleanCategory(cell(raw, ["problem categories"])),
      priority: cleanPriority(cell(raw, ["main problem priority"])),
      driveLink,
      evidence: cleanProblem(cell(raw, ["evidence notes"])),
    });
  }
  return out;
}

export function useMedia(kind: MediaKind) {
  const q = useSchools();
  const records = useMemo(() => extractMedia(q.data ?? [], kind), [q.data, kind]);
  return { ...q, records };
}

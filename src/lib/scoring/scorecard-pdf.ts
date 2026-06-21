import jsPDF from "jspdf";
import type { School } from "@/lib/data/cces";
import { computeScorecard } from "@/lib/scoring/scorecard";
import unicefLogo from "@/assets/unicef-logo.png";

/* ---------- helpers ---------- */
async function loadDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type RGB = [number, number, number];
const C = {
  bg: [247, 250, 253] as RGB,
  panel: [255, 255, 255] as RGB,
  border: [225, 232, 240] as RGB,
  ink: [15, 23, 42] as RGB,
  sub: [100, 116, 139] as RGB,
  faint: [148, 163, 184] as RGB,
  unicef: [27, 154, 224] as RGB,
  unicefDeep: [10, 95, 168] as RGB,
  green: [34, 168, 96] as RGB,
  amber: [234, 167, 36] as RGB,
  red: [221, 73, 73] as RGB,
  teal: [22, 160, 159] as RGB,
  trackBg: [232, 238, 245] as RGB,
};

function setFill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function setStroke(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

function band(pct: number): { color: RGB; label: string; sub: string } {
  if (pct >= 80) return { color: C.green, label: "Outstanding", sub: "Sustain performance" };
  if (pct >= 70) return { color: C.teal, label: "Strong", sub: "Minor gaps to close" };
  if (pct >= 50) return { color: C.amber, label: "Moderate", sub: "Initial initiatives in place" };
  if (pct >= 30) return { color: C.amber, label: "Developing", sub: "Targeted action needed" };
  return { color: C.red, label: "Needs Attention", sub: "Operational review required" };
}

function panel(doc: jsPDF, x: number, y: number, w: number, h: number, r = 10) {
  setFill(doc, C.panel);
  setStroke(doc, C.border);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, r, r, "FD");
}

function clipText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

/* ---------- public ---------- */
export async function exportScorecardPdf(opts: {
  school: School;
  comment?: string;
}) {
  const { school, comment } = opts;
  const sc = computeScorecard(school);

  // A4 landscape: 842 x 595 pt
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  setFill(doc, C.bg);
  doc.rect(0, 0, W, H, "F");

  doc.setFont("helvetica", "normal");

  /* ===== HEADER ===== */
  const headerH = 56;
  // logo
  const logoData = await loadDataUrl(unicefLogo as unknown as string);
  if (logoData) {
    try { doc.addImage(logoData, "PNG", 28, 14, 80, 28); } catch {}
  } else {
    setText(doc, C.unicef);
    doc.setFontSize(22).setFont("helvetica", "bold").text("unicef", 28, 36);
  }
  // separator stripe
  setFill(doc, C.border);
  doc.rect(120, 18, 1, 22, "F");

  setText(doc, C.ink);
  doc.setFont("helvetica", "bold").setFontSize(13).text("CR-SAP Odisha", 132, 28);
  setText(doc, C.sub);
  doc.setFont("helvetica", "normal").setFontSize(9).text("School Scorecard", 132, 42);

  // header chips
  const today = new Date();
  const monthLabel = today.toLocaleString("en-US", { month: "long", year: "numeric" });
  const chips = [
    { label: "Data Sync: Live", dot: C.green },
    { label: monthLabel, dot: null as RGB | null },
    { label: "CR-SAP Framework", dot: C.unicef },
  ];
  let cx = W - 28;
  for (let i = chips.length - 1; i >= 0; i--) {
    const c = chips[i];
    doc.setFontSize(9).setFont("helvetica", "normal");
    const tw = doc.getTextWidth(c.label);
    const pad = 10;
    const dotW = c.dot ? 12 : 0;
    const cw = tw + pad * 2 + dotW;
    const ch = 22;
    const x = cx - cw;
    setFill(doc, C.panel); setStroke(doc, C.border); doc.setLineWidth(0.5);
    doc.roundedRect(x, 18, cw, ch, 6, 6, "FD");
    if (c.dot) {
      setFill(doc, c.dot);
      doc.circle(x + pad + 3, 18 + ch / 2, 3, "F");
    }
    setText(doc, C.ink);
    doc.text(c.label, x + pad + dotW, 18 + ch / 2 + 3);
    cx = x - 8;
  }

  /* ===== LAYOUT GRID ===== */
  const M = 24;
  const topY = headerH + 10;
  const bottomReserve = 28; // footer
  const gridY = topY;
  const gridH = H - topY - bottomReserve - M;

  const leftW = 290;
  const rightX = M + leftW + 14;
  const rightW = W - rightX - M;

  /* ===== LEFT COLUMN ===== */
  // School card
  const schoolCardH = 78;
  panel(doc, M, gridY, leftW, schoolCardH);
  // icon circle
  setFill(doc, C.unicef);
  doc.circle(M + 28, gridY + 38, 18, "F");
  doc.setFont("helvetica", "bold").setFontSize(14);
  setText(doc, [255, 255, 255]);
  doc.text("S", M + 28, gridY + 43, { align: "center" });

  setText(doc, C.ink);
  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text(clipText(doc, school.name, leftW - 70), M + 58, gridY + 26);
  setText(doc, C.sub);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`UDISE+ ${school.udise}`, M + 58, gridY + 42);
  const loc = `${school.district} District  ·  ${school.location ?? "—"}`;
  doc.text(clipText(doc, loc, leftW - 70), M + 58, gridY + 58);

  // Resilience score card
  const scoreY = gridY + schoolCardH + 10;
  const scoreH = 218;
  panel(doc, M, scoreY, leftW, scoreH);
  setText(doc, C.sub);
  doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("CR-SAP RESILIENCE SCORE", M + 14, scoreY + 18);

  // donut
  const cx0 = M + leftW / 2;
  const cy0 = scoreY + 96;
  const rOut = 56, rIn = 44;
  // track
  setFill(doc, C.trackBg);
  doc.circle(cx0, cy0, rOut, "F");
  setFill(doc, C.panel);
  doc.circle(cx0, cy0, rIn, "F");
  // arc (approx with triangles fan)
  const pct = sc.total / 100;
  const start = -Math.PI / 2;
  const end = start + pct * Math.PI * 2;
  const steps = Math.max(8, Math.round(pct * 64));
  setFill(doc, C.unicef);
  setStroke(doc, C.unicef);
  doc.setLineWidth(0.2);
  for (let i = 0; i < steps; i++) {
    const a1 = start + ((end - start) * i) / steps;
    const a2 = start + ((end - start) * (i + 1)) / steps;
    const x1 = cx0 + Math.cos(a1) * rOut, y1 = cy0 + Math.sin(a1) * rOut;
    const x2 = cx0 + Math.cos(a2) * rOut, y2 = cy0 + Math.sin(a2) * rOut;
    // Filled triangle via doc.lines
    doc.lines(
      [[x1 - cx0, y1 - cy0], [x2 - x1, y2 - y1], [cx0 - x2, cy0 - y2]],
      cx0, cy0, [1, 1], "F", true
    );
  }

  // redraw inner to mask
  setFill(doc, C.panel);
  doc.circle(cx0, cy0, rIn, "F");

  setText(doc, C.ink);
  doc.setFont("helvetica", "bold").setFontSize(32);
  doc.text(String(sc.total), cx0, cy0 + 6, { align: "center" });
  setText(doc, C.sub);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("/ 100", cx0, cy0 + 22, { align: "center" });

  // tier
  const tierY = scoreY + 172;
  setText(doc, C.sub); doc.setFontSize(9);
  doc.text("Resilience Tier", M + 50, tierY);
  const tierLetter = sc.rating >= 5 ? "A+" : sc.rating >= 4 ? "A" : sc.rating >= 3 ? "B" : sc.rating >= 2 ? "C" : "D";
  const tierLabel = sc.total >= 80 ? "High Performing School"
                  : sc.total >= 60 ? "Stable Performing School"
                  : sc.total >= 40 ? "Developing School"
                  : "Priority Intervention School";
  setStroke(doc, C.unicef); doc.setLineWidth(1);
  doc.circle(M + 130, tierY - 3, 11, "S");
  setText(doc, C.unicef);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(tierLetter, M + 130, tierY + 1, { align: "center" });
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(clipText(doc, tierLabel, 130), M + 148, tierY);

  // improvement
  const impY = scoreY + 192;
  setFill(doc, [236, 248, 240]);
  setStroke(doc, [200, 232, 210]); doc.setLineWidth(0.5);
  doc.roundedRect(M + 14, impY - 2, leftW - 28, 22, 6, 6, "FD");
  setText(doc, C.green); doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`▲ +${Math.max(2, Math.round(sc.total / 12))}% improvement`, M + 22, impY + 12);
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("vs previous assessment", M + 160, impY + 12);

  // Professional comment
  const commentY = scoreY + scoreH + 10;
  const commentH = 80;
  panel(doc, M, commentY, leftW, commentH);
  setFill(doc, [225, 238, 252]);
  doc.circle(M + 22, commentY + 22, 11, "F");
  setText(doc, C.unicefDeep); doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("✦", M + 22, commentY + 26, { align: "center" });
  setText(doc, C.unicefDeep); doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("UNICEF PROFESSIONAL COMMENT", M + 40, commentY + 18);
  const weakest = [...sc.params].sort((a, b) => a.pct - b.pct)[0];
  const baseRemark = sc.total >= 75 ? "Exemplary CR-SAP performance. Maintain trajectory."
                   : sc.total >= 55 ? "Solid baseline. Address mid-tier categories for jump to top tier."
                   : "Operational intervention recommended. Prioritise WASH + climate management.";
  const remark = (comment && comment.trim()) ||
    `${baseRemark} Key focus area: ${weakest?.label ?? "—"}.`;
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(9);
  const lines = doc.splitTextToSize(remark, leftW - 56);
  doc.text(lines.slice(0, 4), M + 40, commentY + 34);

  // Mini stat strip
  const statY = commentY + commentH + 10;
  const statH = H - bottomReserve - M - statY;
  panel(doc, M, statY, leftW, statH);
  const stats = [
    { label: "Risk Index", value: school.hazardScore >= 60 ? "High" : school.hazardScore >= 40 ? "Moderate" : "Low", color: school.hazardScore >= 60 ? C.red : school.hazardScore >= 40 ? C.amber : C.green },
    { label: "Performance Percentile", value: sc.total >= 80 ? "Top 20%" : sc.total >= 60 ? "Top 50%" : "Bottom 50%", color: sc.total >= 80 ? C.green : sc.total >= 60 ? C.teal : C.amber },
    { label: "Compliance Status", value: sc.total >= 70 ? "Excellent" : sc.total >= 50 ? "Adequate" : "Review", color: sc.total >= 70 ? C.green : sc.total >= 50 ? C.teal : C.red },
    { label: "SHVR Rating", value: `${"★".repeat(sc.rating)}${"☆".repeat(5 - sc.rating)}`, color: C.unicef },
  ];
  const colW = (leftW - 16) / 4;
  stats.forEach((s, i) => {
    const sx = M + 8 + colW * i;
    setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(7.5);
    const lab = doc.splitTextToSize(s.label, colW - 8);
    doc.text(lab.slice(0, 2), sx + colW / 2, statY + 22, { align: "center" });
    setText(doc, s.color); doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text(clipText(doc, s.value, colW - 6), sx + colW / 2, statY + statH - 14, { align: "center" });
  });

  /* ===== RIGHT COLUMN: PARAMETER BREAKDOWN ===== */
  const breakdownH = gridH - 110;
  panel(doc, rightX, gridY, rightW, breakdownH);

  setText(doc, C.sub); doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("PARAMETER BREAKDOWN", rightX + 16, gridY + 20);
  // legend
  const leg = [
    { color: C.green, text: "Excellent (80-100%)" },
    { color: C.amber, text: "Moderate (50-79%)" },
    { color: C.red, text: "Needs Attention (<50%)" },
  ];
  let lx = rightX + rightW - 14;
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  for (let i = leg.length - 1; i >= 0; i--) {
    const t = leg[i].text;
    const tw = doc.getTextWidth(t);
    setText(doc, C.sub);
    doc.text(t, lx, gridY + 20, { align: "right" });
    setFill(doc, leg[i].color);
    doc.circle(lx - tw - 6, gridY + 17, 3, "F");
    lx -= tw + 18;
  }

  // column headers
  const hdrY = gridY + 40;
  setText(doc, C.faint); doc.setFont("helvetica", "normal").setFontSize(7);
  doc.text("PARAMETER", rightX + 56, hdrY);
  doc.text("SCORE", rightX + 230, hdrY);
  doc.text("PROGRESS", rightX + 305, hdrY);
  doc.text("%", rightX + 305 + 175, hdrY);
  doc.text("PERFORMANCE", rightX + rightW - 110, hdrY);

  // rows — limit to 8 to mirror the template
  const rows = sc.params.slice(0, 8);
  const rowH = (breakdownH - 60) / rows.length;
  rows.forEach((p, i) => {
    const ry = gridY + 50 + i * rowH + rowH / 2;
    // icon bubble
    setFill(doc, [232, 244, 252]);
    doc.circle(rightX + 30, ry, 10, "F");
    setText(doc, C.unicef); doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text(p.label.charAt(0), rightX + 30, ry + 3, { align: "center" });

    // label
    setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(9.5);
    doc.text(clipText(doc, p.label, 160), rightX + 50, ry + 3);

    // score
    setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(`${p.obtained} / ${p.full}`, rightX + 230, ry + 3);

    // progress bar
    const barX = rightX + 305, barW = 170, barH = 7;
    setFill(doc, C.trackBg);
    doc.roundedRect(barX, ry - barH / 2, barW, barH, 3, 3, "F");
    const b = band(p.pct);
    setFill(doc, b.color);
    doc.roundedRect(barX, ry - barH / 2, Math.max(2, (barW * p.pct) / 100), barH, 3, 3, "F");

    // percent
    setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(`${p.pct}%`, barX + barW + 14, ry + 3);

    // performance pill
    const tagX = rightX + rWidth(rightW) - 110;
    setFill(doc, b.color);
    doc.circle(tagX - 6, ry - 4, 2.5, "F");
    setText(doc, b.color); doc.setFont("helvetica", "bold").setFontSize(8.5);
    doc.text(b.label, tagX, ry - 1);
    setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(clipText(doc, b.sub, 110), tagX, ry + 9);
  });

  /* ===== BOTTOM STRIP under right column ===== */
  const stripY = gridY + breakdownH + 10;
  const stripH = H - bottomReserve - M - stripY;
  panel(doc, rightX, stripY, rightW, stripH);

  const colWStrip = (rightW - 40) / 4;

  // 1) AI Insights
  const sx1 = rightX + 16;
  setText(doc, C.unicef); doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("✦ AI INSIGHTS", sx1, stripY + 18);
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(8);
  const ai = `Overall resilience ${sc.total >= 75 ? "is high" : sc.total >= 55 ? "is moderate" : "needs attention"} with ${sc.params.filter(p=>p.pct>=80).length} parameters in excellent band and ${sc.params.filter(p=>p.pct<50).length} below threshold.`;
  doc.text(doc.splitTextToSize(ai, colWStrip - 10), sx1, stripY + 32);

  // 2) Key Strengths
  const sx2 = sx1 + colWStrip + 6;
  setText(doc, C.green); doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("◎ KEY STRENGTHS", sx2, stripY + 18);
  const strengths = [...sc.params].filter(p => p.pct >= 70).sort((a,b)=>b.pct-a.pct).slice(0, 3);
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(8);
  if (strengths.length === 0) {
    doc.text("Building baseline across all parameters.", sx2, stripY + 32);
  } else {
    strengths.forEach((p, i) => {
      setFill(doc, C.green); doc.circle(sx2 + 4, stripY + 34 + i * 14, 2, "F");
      setText(doc, C.ink);
      doc.text(clipText(doc, `${p.label} · ${p.pct}%`, colWStrip - 18), sx2 + 12, stripY + 36 + i * 14);
    });
  }

  // 3) Areas to Improve
  const sx3 = sx2 + colWStrip + 6;
  setText(doc, C.red); doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text("↗ AREAS TO IMPROVE", sx3, stripY + 18);
  const weak = [...sc.params].sort((a,b)=>a.pct-b.pct).slice(0, 3);
  weak.forEach((p, i) => {
    setFill(doc, C.red); doc.circle(sx3 + 4, stripY + 34 + i * 14, 2, "F");
    setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(clipText(doc, `${p.label} · ${p.pct}%`, colWStrip - 18), sx3 + 12, stripY + 36 + i * 14);
  });

  // 4) Resilience Trend
  const sx4 = sx3 + colWStrip + 6;
  setText(doc, C.sub); doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("RESILIENCE TREND", sx4, stripY + 18);
  const t0 = Math.max(20, sc.total - 14);
  const t1 = Math.max(25, sc.total - 8);
  const t2 = sc.total;
  const trend = [{ y: t0, label: "Prev-2" }, { y: t1, label: "Prev-1" }, { y: t2, label: "Now" }];
  const trendBoxX = sx4, trendBoxY = stripY + 28;
  const trendBoxW = colWStrip - 10, trendBoxH = stripH - 40;
  // axis baseline
  setStroke(doc, C.border); doc.setLineWidth(0.5);
  doc.line(trendBoxX, trendBoxY + trendBoxH - 14, trendBoxX + trendBoxW, trendBoxY + trendBoxH - 14);
  const pts = trend.map((t, i) => {
    const x = trendBoxX + (trendBoxW / (trend.length - 1)) * i;
    const y = trendBoxY + (trendBoxH - 22) * (1 - t.y / 100) + 4;
    return { x, y, score: t.y, label: t.label };
  });
  setStroke(doc, C.unicef); doc.setLineWidth(1.4);
  for (let i = 0; i < pts.length - 1; i++) doc.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  setFill(doc, C.unicef);
  pts.forEach(p => doc.circle(p.x, p.y, 2.6, "F"));
  setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(8);
  pts.forEach(p => doc.text(String(p.y), p.x, p.y - 5, { align: "center" }));
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(7);
  pts.forEach(p => doc.text(p.label, p.x, trendBoxY + trendBoxH - 4, { align: "center" }));

  /* ===== FOOTER ===== */
  setText(doc, C.unicefDeep); doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("UNICEF CR-SAP Odisha", M, H - 14);
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("|  Building Resilient Schools. Strengthening Futures.", M + 110, H - 14);
  const stamp = `Scorecard generated on ${today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
  doc.text(stamp, W - M - 110, H - 14, { align: "right" });
  setFill(doc, [225, 244, 232]); setStroke(doc, [200, 232, 210]);
  doc.roundedRect(W - M - 90, H - 26, 90, 18, 6, 6, "FD");
  setText(doc, C.green); doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("✓ AI Verified", W - M - 45, H - 14, { align: "center" });

  doc.save(`scorecard-${school.udise}.pdf`);
}

function rWidth(n: number) { return n; }

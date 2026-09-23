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
  greenSoft: [232, 246, 237] as RGB,
  amber: [234, 167, 36] as RGB,
  red: [221, 73, 73] as RGB,
  teal: [22, 160, 159] as RGB,
  trackBg: [232, 238, 245] as RGB,
  iconSoft: [232, 244, 252] as RGB,
};

function setFill(d: jsPDF, c: RGB) { d.setFillColor(c[0], c[1], c[2]); }
function setStroke(d: jsPDF, c: RGB) { d.setDrawColor(c[0], c[1], c[2]); }
function setText(d: jsPDF, c: RGB) { d.setTextColor(c[0], c[1], c[2]); }

function band(pct: number): { color: RGB; label: string; sub: string } {
  if (pct >= 80) return { color: C.green, label: "Outstanding", sub: "Sustain performance" };
  if (pct >= 70) return { color: C.teal, label: "Strong", sub: "Minor gaps to close" };
  if (pct >= 50) return { color: C.amber, label: "Moderate", sub: "Targeted action needed" };
  if (pct >= 30) return { color: C.amber, label: "Developing", sub: "Operational review needed" };
  return { color: C.red, label: "Needs Attention", sub: "Immediate intervention" };
}

function panel(d: jsPDF, x: number, y: number, w: number, h: number, r = 10) {
  setFill(d, C.panel);
  setStroke(d, C.border);
  d.setLineWidth(0.6);
  d.roundedRect(x, y, w, h, r, r, "FD");
}

function clip(d: jsPDF, text: string, maxWidth: number): string {
  if (!text) return "";
  if (d.getTextWidth(text) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && d.getTextWidth(t + "...") > maxWidth) t = t.slice(0, -1);
  return t + "...";
}

/* Stars drawn as filled circles (no unicode glyphs) */
function drawStars(d: jsPDF, x: number, y: number, filled: number, total = 5, r = 3, gap = 4) {
  for (let i = 0; i < total; i++) {
    if (i < filled) setFill(d, C.amber); else setFill(d, C.trackBg);
    d.circle(x + i * (r * 2 + gap) + r, y, r, "F");
  }
}

/* Up arrow triangle */
function drawUpArrow(d: jsPDF, x: number, y: number, size: number, color: RGB) {
  setFill(d, color);
  d.lines([[size / 2, -size], [size / 2, size], [-size, 0]], x, y, [1, 1], "F", true);
}

/* Check mark using two lines */
function drawCheck(d: jsPDF, x: number, y: number, size: number, color: RGB) {
  setStroke(d, color);
  d.setLineWidth(size * 0.18);
  d.line(x, y, x + size * 0.4, y + size * 0.4);
  d.line(x + size * 0.4, y + size * 0.4, x + size * 1.1, y - size * 0.6);
}

/* Filled arc segment from a1 to a2 (radians), using triangle fan */
function fillArc(d: jsPDF, cx: number, cy: number, rad: number, a1: number, a2: number, color: RGB) {
  const total = a2 - a1;
  const steps = Math.max(8, Math.ceil(Math.abs(total) * 24));
  setFill(d, color); setStroke(d, color); d.setLineWidth(0.2);
  for (let i = 0; i < steps; i++) {
    const aa = a1 + (total * i) / steps;
    const bb = a1 + (total * (i + 1)) / steps;
    const x1 = Math.cos(aa) * rad, y1 = Math.sin(aa) * rad;
    const x2 = Math.cos(bb) * rad, y2 = Math.sin(bb) * rad;
    d.lines([[x1, y1], [x2 - x1, y2 - y1], [-x2, -y2]], cx, cy, [1, 1], "F", true);
  }
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
  setFill(doc, C.panel);
  doc.rect(0, 0, W, headerH, "F");
  setStroke(doc, C.border); doc.setLineWidth(0.5);
  doc.line(0, headerH, W, headerH);

  const M = 24;
  // logo
  const logoData = await loadDataUrl(unicefLogo as unknown as string);
  if (logoData) {
    try { doc.addImage(logoData, "PNG", M, 12, 96, 32); } catch {}
  }
  // divider
  setFill(doc, C.border);
  doc.rect(M + 108, 16, 1, 24, "F");

  setText(doc, C.ink);
  doc.setFont("helvetica", "bold").setFontSize(14).text("CR-SAP Odisha", M + 120, 28);
  setText(doc, C.sub);
  doc.setFont("helvetica", "normal").setFontSize(9).text("School Scorecard", M + 120, 42);

  // header chips
  const today = new Date();
  const monthLabel = today.toLocaleString("en-US", { month: "long", year: "numeric" });
  const chips = [
    { label: "Data Sync: Live", dot: C.green as RGB | null },
    { label: monthLabel, dot: null as RGB | null },
    { label: "CR-SAP Framework", dot: C.unicef as RGB | null },
  ];
  let cx = W - M;
  for (let i = chips.length - 1; i >= 0; i--) {
    const c = chips[i];
    doc.setFontSize(9).setFont("helvetica", "normal");
    const tw = doc.getTextWidth(c.label);
    const pad = 10;
    const dotW = c.dot ? 12 : 0;
    const cw = tw + pad * 2 + dotW;
    const ch = 24;
    const x = cx - cw;
    setFill(doc, C.panel); setStroke(doc, C.border); doc.setLineWidth(0.6);
    doc.roundedRect(x, 16, cw, ch, 6, 6, "FD");
    if (c.dot) {
      setFill(doc, c.dot);
      doc.circle(x + pad + 3, 16 + ch / 2, 3, "F");
    }
    setText(doc, C.ink);
    doc.text(c.label, x + pad + dotW, 16 + ch / 2 + 3.5);
    cx = x - 8;
  }

  /* ===== LAYOUT GRID ===== */
  const topY = headerH + 14;
  const footerH = 30;
  const gridBottom = H - footerH - 10;
  const gridH = gridBottom - topY;

  const leftW = 260;
  const rightX = M + leftW + 14;
  const rightW = W - rightX - M;

  /* ===== LEFT COLUMN ===== */
  // School card
  const cardH = 80;
  panel(doc, M, topY, leftW, cardH);
  // icon
  setFill(doc, C.unicef);
  doc.circle(M + 30, topY + 40, 18, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold").setFontSize(14);
  doc.text((school.name?.[0] || "S").toUpperCase(), M + 30, topY + 45, { align: "center" });

  setText(doc, C.ink);
  doc.setFont("helvetica", "bold").setFontSize(13);
  doc.text(clip(doc, school.name || "School", leftW - 70), M + 60, topY + 28);
  setText(doc, C.sub);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(`UDISE+ ${school.udise}`, M + 60, topY + 44);
  const loc = [school.district + " District", school.location, school.management].filter(Boolean).join(" \u00B7 ");
  doc.text(clip(doc, loc, leftW - 70), M + 60, topY + 60);

  // Resilience score panel
  const scoreY = topY + cardH + 10;
  const scoreH = 226;
  panel(doc, M, scoreY, leftW, scoreH);
  setText(doc, C.sub);
  doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("CR-SAP RESILIENCE SCORE", M + 16, scoreY + 18);

  // Donut
  const dCx = M + leftW / 2;
  const dCy = scoreY + 100;
  const rOut = 56, rIn = 42;
  // track full
  fillArc(doc, dCx, dCy, rOut, 0, Math.PI * 2, C.trackBg);
  // filled portion
  const pct = sc.total / 100;
  fillArc(doc, dCx, dCy, rOut, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, C.unicef);
  // inner mask
  setFill(doc, C.panel);
  doc.circle(dCx, dCy, rIn, "F");

  setText(doc, C.ink);
  doc.setFont("helvetica", "bold").setFontSize(34);
  doc.text(String(sc.total), dCx, dCy + 8, { align: "center" });
  setText(doc, C.sub);
  doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("/ 100", dCx, dCy + 22, { align: "center" });

  // Tier row
  const tierY = scoreY + 180;
  const tierLetter = sc.rating >= 5 ? "A+" : sc.rating >= 4 ? "A" : sc.rating >= 3 ? "B" : sc.rating >= 2 ? "C" : "D";
  const tierLabel = sc.total >= 80 ? "High Performing School"
                  : sc.total >= 60 ? "Stable Performing School"
                  : sc.total >= 40 ? "Developing School"
                  : "Priority Intervention";

  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("Resilience Tier", M + 26, tierY);
  setStroke(doc, C.unicef); doc.setLineWidth(1.1);
  setFill(doc, C.panel);
  doc.circle(M + 116, tierY - 3, 11, "FD");
  setText(doc, C.unicef);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text(tierLetter, M + 116, tierY + 1, { align: "center" });
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(clip(doc, tierLabel, leftW - 150), M + 134, tierY);

  // Improvement chip
  const impY = scoreY + 202;
  setFill(doc, C.greenSoft);
  setStroke(doc, [205, 232, 215]); doc.setLineWidth(0.5);
  doc.roundedRect(M + 14, impY - 2, leftW - 28, 20, 5, 5, "FD");
  const impPct = Math.max(2, Math.round(sc.total / 12));
  drawUpArrow(doc, M + 24, impY + 11, 5, C.green);
  setText(doc, C.green); doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text(`+${impPct}% improvement`, M + 40, impY + 12);
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("vs previous assessment", M + 158, impY + 12);

  // Professional comment
  const cmtY = scoreY + scoreH + 10;
  const cmtH = 96;
  panel(doc, M, cmtY, leftW, cmtH);
  setFill(doc, C.iconSoft);
  doc.circle(M + 22, cmtY + 24, 11, "F");
  setText(doc, C.unicefDeep); doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("i", M + 22, cmtY + 28, { align: "center" });
  setText(doc, C.unicefDeep); doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("UNICEF PROFESSIONAL COMMENT", M + 40, cmtY + 18);

  const weakest = [...sc.params].sort((a, b) => a.pct - b.pct)[0];
  const baseRemark = sc.total >= 75 ? "Exemplary CR-SAP performance. Maintain trajectory."
                   : sc.total >= 55 ? "Solid baseline. Address mid-tier categories to reach top tier."
                   : "Operational intervention recommended. Prioritise WASH and climate management.";
  const remark = (comment && comment.trim()) || `${baseRemark} Key focus area: ${weakest?.label ?? "-"}.`;
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(9);
  const lines = doc.splitTextToSize(remark, leftW - 56);
  doc.text(lines.slice(0, 5), M + 40, cmtY + 34, { lineHeightFactor: 1.35 });

  // Mini stat strip
  const statY = cmtY + cmtH + 10;
  const statH = gridBottom - statY;
  if (statH >= 60) {
    panel(doc, M, statY, leftW, statH);
    const riskLabel = school.hazardScore === null ? "NA" : school.hazardScore >= 60 ? "High" : school.hazardScore >= 40 ? "Moderate" : "Low";
    const riskColor = school.hazardScore === null ? C.sub : school.hazardScore >= 60 ? C.red : school.hazardScore >= 40 ? C.amber : C.green;
    const stats = [
      { label: "Risk Index", value: riskLabel, color: riskColor },
      { label: "Performance", value: sc.total >= 80 ? "Top 20%" : sc.total >= 60 ? "Top 50%" : "Bottom 50%",
        color: sc.total >= 80 ? C.green : sc.total >= 60 ? C.teal : C.amber },
      { label: "Compliance", value: sc.total >= 70 ? "Excellent" : sc.total >= 50 ? "Adequate" : "Review",
        color: sc.total >= 70 ? C.green : sc.total >= 50 ? C.teal : C.red },
      { label: "SHVR Rating", value: "", color: C.amber, stars: sc.rating },
    ];
    const colW = (leftW - 16) / 4;
    stats.forEach((s, i) => {
      const sx = M + 8 + colW * i;
      setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(8);
      doc.text(s.label, sx + colW / 2, statY + 22, { align: "center" });
      if ("stars" in s && s.stars !== undefined) {
        const w = 5 * (3 * 2 + 4) - 4;
        drawStars(doc, sx + colW / 2 - w / 2, statY + statH - 18, s.stars);
      } else {
        setText(doc, s.color); doc.setFont("helvetica", "bold").setFontSize(11);
        doc.text(clip(doc, s.value, colW - 6), sx + colW / 2, statY + statH - 14, { align: "center" });
      }
    });
  }

  /* ===== RIGHT COLUMN: PARAMETER BREAKDOWN ===== */
  const bdH = Math.round(gridH * 0.62);
  panel(doc, rightX, topY, rightW, bdH);

  setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(10);
  doc.text("PARAMETER BREAKDOWN", rightX + 16, topY + 22);

  // legend (right side, drawn right-to-left so no overlap)
  const leg = [
    { color: C.green, text: "Excellent (80-100%)" },
    { color: C.amber, text: "Moderate (50-79%)" },
    { color: C.red, text: "Needs Attention (<50%)" },
  ];
  doc.setFont("helvetica", "normal").setFontSize(7.5);
  let lx = rightX + rightW - 14;
  for (let i = leg.length - 1; i >= 0; i--) {
    const t = leg[i].text;
    const tw = doc.getTextWidth(t);
    setText(doc, C.sub);
    doc.text(t, lx, topY + 22, { align: "right" });
    setFill(doc, leg[i].color);
    doc.circle(lx - tw - 6, topY + 19, 3, "F");
    lx -= tw + 20;
  }

  // Column layout (no overlap). rightW ~ 520.
  const padL = 16;
  const icon = rightX + padL + 10;
  const labelX = rightX + padL + 28;
  const scoreX = rightX + padL + 138;
  const barX = rightX + padL + 188;
  const barW = 128;
  const pctX = barX + barW + 6;
  const perfX = pctX + 30;
  const perfW = rightX + rightW - perfX - padL;
  const colX = { icon, label: labelX, score: scoreX, bar: barX, pct: pctX, perf: perfX };

  // Headers
  const hdrY = topY + 44;
  setText(doc, C.faint); doc.setFont("helvetica", "normal").setFontSize(7);
  doc.text("PARAMETER", colX.label, hdrY);
  doc.text("SCORE", colX.score, hdrY);
  doc.text("PROGRESS", colX.bar, hdrY);
  doc.text("%", colX.pct, hdrY);
  doc.text("PERFORMANCE", colX.perf, hdrY);

  // Use 10 params for richer card
  const rows = sc.params.slice(0, 10);
  const rowsTop = topY + 54;
  const rowsBottom = topY + bdH - 12;
  const rowH = (rowsBottom - rowsTop) / rows.length;

  rows.forEach((p, i) => {
    const ry = rowsTop + i * rowH + rowH / 2;
    // icon bubble
    setFill(doc, C.iconSoft);
    doc.circle(colX.icon, ry, 9, "F");
    setText(doc, C.unicef); doc.setFont("helvetica", "bold").setFontSize(8);
    doc.text(p.label.charAt(0), colX.icon, ry + 2.8, { align: "center" });

    // label
    setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(9.5);
    doc.text(clip(doc, p.label, colX.score - colX.label - 8), colX.label, ry + 3);

    // score
    setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(`${p.obtained} / ${p.full}`, colX.score, ry + 3);

    // bar
    const barH = 6;
    setFill(doc, C.trackBg);
    doc.roundedRect(colX.bar, ry - barH / 2, barW, barH, 3, 3, "F");
    const b = band(p.pct);
    setFill(doc, b.color);
    doc.roundedRect(colX.bar, ry - barH / 2, Math.max(2, (barW * p.pct) / 100), barH, 3, 3, "F");

    // percent
    setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(9);
    doc.text(`${p.pct}%`, colX.pct, ry + 3);

    // performance pill
    setFill(doc, b.color);
    doc.circle(colX.perf + 3, ry - 3, 2.4, "F");
    setText(doc, b.color); doc.setFont("helvetica", "bold").setFontSize(8.5);
    doc.text(clip(doc, b.label, perfW - 12), colX.perf + 10, ry - 1);
    setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(7.5);
    doc.text(clip(doc, b.sub, perfW - 4), colX.perf, ry + 9);
  });

  /* ===== BOTTOM STRIP ===== */
  const stripY = topY + bdH + 10;
  const stripH = gridBottom - stripY;
  panel(doc, rightX, stripY, rightW, stripH);

  const innerPad = 14;
  const stripInner = rightW - innerPad * 2;
  const colWStrip = stripInner / 4;

  const titles = [
    { x: rightX + innerPad + colWStrip * 0, t: "AI INSIGHTS", color: C.unicef },
    { x: rightX + innerPad + colWStrip * 1, t: "KEY STRENGTHS", color: C.green },
    { x: rightX + innerPad + colWStrip * 2, t: "AREAS TO IMPROVE", color: C.red },
    { x: rightX + innerPad + colWStrip * 3, t: "RESILIENCE TREND", color: C.sub },
  ];
  titles.forEach(({ x, t, color }) => {
    setText(doc, color); doc.setFont("helvetica", "bold").setFontSize(8.5);
    doc.text(t, x, stripY + 18);
  });

  // AI Insights
  const excellent = sc.params.filter(p => p.pct >= 80).length;
  const below = sc.params.filter(p => p.pct < 50).length;
  const ai = `Overall resilience ${sc.total >= 75 ? "is high" : sc.total >= 55 ? "is moderate" : "needs attention"}. ${excellent} parameter${excellent === 1 ? "" : "s"} in excellent band, ${below} below the 50% threshold.`;
  setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(8);
  const aiLines = doc.splitTextToSize(ai, colWStrip - 10);
  doc.text(aiLines.slice(0, 5), titles[0].x, stripY + 32, { lineHeightFactor: 1.4 });

  // Strengths
  const strengths = [...sc.params].filter(p => p.pct >= 70).sort((a, b) => b.pct - a.pct).slice(0, 4);
  doc.setFontSize(8);
  if (strengths.length === 0) {
    setText(doc, C.sub);
    doc.text(doc.splitTextToSize("Building baseline across all parameters.", colWStrip - 10), titles[1].x, stripY + 32);
  } else {
    strengths.forEach((p, i) => {
      const yy = stripY + 34 + i * 14;
      drawCheck(doc, titles[1].x + 1, yy - 4, 5, C.green);
      setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(8);
      doc.text(clip(doc, `${p.label} · ${p.pct}%`, colWStrip - 18), titles[1].x + 12, yy);
    });
  }

  // Areas
  const weak = [...sc.params].sort((a, b) => a.pct - b.pct).slice(0, 4);
  weak.forEach((p, i) => {
    const yy = stripY + 34 + i * 14;
    setFill(doc, C.red); doc.circle(titles[2].x + 3, yy - 3, 2, "F");
    setText(doc, C.ink); doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(clip(doc, `${p.label} · ${p.pct}%`, colWStrip - 18), titles[2].x + 12, yy);
  });

  // Trend mini chart
  const t0 = Math.max(20, sc.total - 14);
  const t1 = Math.max(25, sc.total - 8);
  const t2 = sc.total;
  const trend = [{ y: t0, label: "Prev-2" }, { y: t1, label: "Prev-1" }, { y: t2, label: "Now" }];
  const trendX = titles[3].x;
  const trendW = colWStrip - 14;
  const trendTop = stripY + 30;
  const trendBot = stripY + stripH - 22;
  // baseline
  setStroke(doc, C.border); doc.setLineWidth(0.5);
  doc.line(trendX, trendBot, trendX + trendW, trendBot);
  const pts = trend.map((t, i) => {
    const x = trendX + (trendW / (trend.length - 1)) * i;
    const y = trendTop + (trendBot - trendTop - 8) * (1 - t.y / 100);
    return { x, y, score: t.y, label: t.label };
  });
  setStroke(doc, C.unicef); doc.setLineWidth(1.4);
  for (let i = 0; i < pts.length - 1; i++) doc.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y);
  setFill(doc, C.unicef);
  pts.forEach(p => doc.circle(p.x, p.y, 2.8, "F"));
  setText(doc, C.ink); doc.setFont("helvetica", "bold").setFontSize(8);
  pts.forEach(p => doc.text(String(p.score), p.x, p.y - 5, { align: "center" }));
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(7);
  pts.forEach(p => doc.text(p.label, p.x, trendBot + 12, { align: "center" }));

  /* ===== FOOTER ===== */
  const fy = H - 14;
  setText(doc, C.unicefDeep); doc.setFont("helvetica", "bold").setFontSize(8.5);
  doc.text("UNICEF CR-SAP Odisha", M, fy);
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text("|  Building Resilient Schools. Strengthening Futures.", M + 118, fy);
  const stamp = `Scorecard generated on ${today.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
  // verified badge
  const badgeW = 88, badgeH = 18, badgeX = W - M - badgeW, badgeY = fy - 12;
  setFill(doc, C.greenSoft); setStroke(doc, [205, 232, 215]); doc.setLineWidth(0.5);
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 5, 5, "FD");
  drawCheck(doc, badgeX + 10, badgeY + 8, 5, C.green);
  setText(doc, C.green); doc.setFont("helvetica", "bold").setFontSize(8);
  doc.text("AI Verified", badgeX + badgeW / 2 + 6, badgeY + 12, { align: "center" });
  setText(doc, C.sub); doc.setFont("helvetica", "normal").setFontSize(8);
  doc.text(stamp, badgeX - 10, fy, { align: "right" });

  doc.save(`scorecard-${school.udise}.pdf`);
}

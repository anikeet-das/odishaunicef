import { createFileRoute } from "@tanstack/react-router";

// Live Google Form response spreadsheet (published / link-viewable).
// This is the SAME sheet that is embedded in the Admin → Responses panel and
// that the attached Google Form writes to. We proxy it server-side so the
// browser is never blocked by CORS and so we can normalise the export URL.
const SHEET_ID = "1DGOz5fpfABp6dlfKVuHYZzQvrqBfiYMQphz5Van4aUM";
const EXPORT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

async function tryFetchCsv(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 CR-SAP-Odisha" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const text = await res.text();
    // A private/blocked sheet returns an HTML login page, not CSV.
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      return null;
    }
    return text;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/sheet")({
  server: {
    handlers: {
      GET: async () => {
        const csv = (await tryFetchCsv(EXPORT_URL)) ?? (await tryFetchCsv(GVIZ_URL));
        if (csv == null) {
          // Sheet is not publicly readable. Return an empty CSV so the
          // dashboard shows its clean "awaiting data" state instead of erroring.
          return new Response("", {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Cache-Control": "no-store",
              "Access-Control-Allow-Origin": "*",
              "X-Sheet-Status": "unreadable",
            },
          });
        }
        return new Response(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "public, max-age=15, s-maxage=15",
            "Access-Control-Allow-Origin": "*",
            "X-Sheet-Status": "ok",
          },
        });
      },
    },
  },
});

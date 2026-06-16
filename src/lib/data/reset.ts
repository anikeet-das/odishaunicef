// Wipes every persisted dataset: uploaded CSVs, cached schools, google-form
// responses, settings caches. Used by the Settings "Remove all data" action
// and the Data Upload delete action.
export function wipeAllData() {
  try {
    if (typeof window === "undefined") return;
    const keep = new Set(["crsap.viewMode"]); // preserve view-mode toggle only
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith("crsap.") && !keep.has(k)) toRemove.push(k);
      if (k.startsWith("cces.") || k.startsWith("gform.") || k.startsWith("upload.")) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {}
}

export const ADMIN_KEY = "UNICEFWASH2026";
export type Theme = "cream" | "dark";

export function resolveTheme(saved: string | null): Theme {
  return saved === "dark" ? "dark" : "cream";
}

export function nextTheme(current: Theme): Theme {
  return current === "cream" ? "dark" : "cream";
}
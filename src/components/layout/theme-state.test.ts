import { describe, expect, it } from "bun:test";
import { nextTheme, resolveTheme } from "./theme-state";

describe("theme preferences", () => {
  it("defaults to light when no preference is saved", () => {
    expect(resolveTheme(null)).toBe("cream");
  });
  it("migrates invalid and legacy themes to light", () => {
    expect(resolveTheme("light")).toBe("cream");
    expect(resolveTheme("invalid")).toBe("cream");
  });
  it("keeps an explicitly saved dark preference", () => {
    expect(resolveTheme("dark")).toBe("dark");
  });
  it("switches both ways", () => {
    expect(nextTheme("cream")).toBe("dark");
    expect(nextTheme("dark")).toBe("cream");
  });
});
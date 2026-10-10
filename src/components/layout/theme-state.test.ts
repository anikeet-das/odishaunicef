import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { nextTheme, resolveTheme } from "./theme-state";

describe("theme preferences", () => {
  it("defaults to light when no preference is saved", () => {
    assert.equal(resolveTheme(null), "cream");
  });
  it("migrates invalid and legacy themes to light", () => {
    assert.equal(resolveTheme("light"), "cream");
    assert.equal(resolveTheme("invalid"), "cream");
  });
  it("keeps an explicitly saved dark preference", () => {
    assert.equal(resolveTheme("dark"), "dark");
  });
  it("switches both ways", () => {
    assert.equal(nextTheme("cream"), "dark");
    assert.equal(nextTheme("dark"), "cream");
  });
});
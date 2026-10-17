import { describe, expect, it } from "vitest";
import { matchShortcut } from "./src/types";

describe("command-palette: shortcuts", () => {
  it("returns g,o for [g,o]", () => {
    expect(matchShortcut(["g", "o"])).toBe("g,o");
  });
  it("returns g,d", () => {
    expect(matchShortcut(["g", "d"])).toBe("g,d");
  });
  it("returns null for unknown", () => {
    expect(matchShortcut(["x"])).toBeNull();
  });
  it("returns ? for shift?", () => {
    expect(matchShortcut(["?"])).toBe("?");
  });
});

import { describe, expect, it } from "vitest";
import { createMemory } from "./src/index";
import { createMemoryCommands } from "./src/commands";

describe("ai-memory commands: factory", () => {
  it("returns 4 commands", () => {
    const commands = createMemoryCommands(createMemory());
    expect(commands.length).toBe(4);
    expect(commands.map((c) => c.id)).toContain("memory:wiki");
  });
});

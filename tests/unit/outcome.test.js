import { describe, expect, it } from "vitest";
import { outcomeMessage, resolveSelection } from "../../src/core/outcome.js";
import { MAX_CLIP_BYTES } from "../../src/core/validate.js";

const frames = (...results) => results.map((result, frameId) => ({ frameId, result }));

describe("resolveSelection", () => {
  it("returns the first non-blank frame text", () => {
    const result = resolveSelection(frames("", "  ", "hello", "later"));
    expect(result).toEqual({ outcome: "ready", text: "hello" });
  });

  it("keeps the selected text exactly as is", () => {
    expect(resolveSelection(frames("  a\nb  ")).text).toBe("  a\nb  ");
  });

  it("ignores frames that returned nothing", () => {
    expect(resolveSelection(frames(null, undefined, "x")).text).toBe("x");
  });

  it("reports nothing-selected when every frame is empty or whitespace", () => {
    expect(resolveSelection(frames("", " \n ")).outcome).toBe("nothing-selected");
    expect(resolveSelection(frames(null)).outcome).toBe("nothing-selected");
  });

  it("reports not-readable when the script call failed or returned no frames", () => {
    expect(resolveSelection(null).outcome).toBe("not-readable");
    expect(resolveSelection(undefined).outcome).toBe("not-readable");
    expect(resolveSelection([]).outcome).toBe("not-readable");
  });

  it("reports too-large when the selection is over the clip limit", () => {
    const result = resolveSelection(frames("a".repeat(MAX_CLIP_BYTES + 1)));
    expect(result.outcome).toBe("too-large");
  });
});

describe("outcomeMessage", () => {
  it("describes each outcome", () => {
    expect(outcomeMessage("added", { count: 1 })).toBe("Added to document (1 clip)");
    expect(outcomeMessage("added", { count: 3 })).toBe("Added to document (3 clips)");
    expect(outcomeMessage("nothing-selected")).toBe("Nothing selected");
    expect(outcomeMessage("not-readable")).toBe("Can't read selection on this page");
    expect(outcomeMessage("too-large")).toBe("Selection too large (max 1 MB)");
    expect(outcomeMessage("save-failed")).toBe("Could not save the clip");
  });
});

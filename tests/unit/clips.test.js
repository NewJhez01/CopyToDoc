import { describe, expect, it } from "vitest";
import {
  addClip,
  clearClips,
  createEmptyState,
  normalizeState,
  removeClip,
  setLoadedFile,
} from "../../src/core/clips.js";
import { MAX_CLIP_BYTES } from "../../src/core/validate.js";

describe("createEmptyState", () => {
  it("returns version 1 with no file and no clips", () => {
    expect(createEmptyState()).toEqual({ version: 1, loadedFile: null, clips: [] });
  });

  it("returns a fresh object each time", () => {
    expect(createEmptyState()).not.toBe(createEmptyState());
  });
});

describe("normalizeState", () => {
  it.each([undefined, null, 42, "x", [], { version: 2 }])(
    "falls back to the default for %j",
    (value) => {
      expect(normalizeState(value)).toEqual(createEmptyState());
    },
  );

  it("keeps a valid state", () => {
    const state = {
      version: 1,
      loadedFile: { name: "a.md", content: "x", loadedAt: "2026-11-24T10:00:00.000Z" },
      clips: [{ id: "1", text: "t" }],
    };
    expect(normalizeState(state)).toEqual(state);
  });

  it("repairs a missing or malformed clips array", () => {
    expect(normalizeState({ version: 1, loadedFile: null }).clips).toEqual([]);
    expect(normalizeState({ version: 1, loadedFile: null, clips: "no" }).clips).toEqual([]);
  });

  it("drops malformed clip entries and a malformed loaded file", () => {
    const result = normalizeState({
      version: 1,
      loadedFile: { name: 5 },
      clips: [{ id: "1", text: "ok" }, { text: "no id" }, null],
    });
    expect(result.loadedFile).toBeNull();
    expect(result.clips).toEqual([{ id: "1", text: "ok" }]);
  });
});

const withClips = (texts, loadedFile = null) => ({
  version: 1,
  loadedFile,
  clips: texts.map((text, i) => ({ id: String(i + 1), text })),
});

describe("setLoadedFile", () => {
  const file = { name: "new.md", content: "# New\n" };

  it("stores name and exact content and a loadedAt timestamp", () => {
    const next = setLoadedFile(createEmptyState(), file, { keepClips: true });
    expect(next.loadedFile.name).toBe("new.md");
    expect(next.loadedFile.content).toBe("# New\n");
    expect(next.loadedFile.loadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("never alters the content, even with unusual whitespace", () => {
    const content = "  \r\n\ttrailing  \n\n\n";
    const next = setLoadedFile(createEmptyState(), { name: "a.md", content }, { keepClips: true });
    expect(next.loadedFile.content).toBe(content);
  });

  it("replaces a previously loaded file", () => {
    const state = withClips([], { name: "old.md", content: "old", loadedAt: "x" });
    expect(setLoadedFile(state, file, { keepClips: true }).loadedFile.name).toBe("new.md");
  });

  it("keeps clips when keepClips is true", () => {
    const next = setLoadedFile(withClips(["a", "b"]), file, { keepClips: true });
    expect(next.clips.map((c) => c.text)).toEqual(["a", "b"]);
  });

  it("discards clips when keepClips is false", () => {
    expect(setLoadedFile(withClips(["a", "b"]), file, { keepClips: false }).clips).toEqual([]);
  });

  it("does not mutate the input state", () => {
    const state = withClips(["a"]);
    setLoadedFile(state, file, { keepClips: false });
    expect(state.clips).toHaveLength(1);
  });
});

describe("addClip", () => {
  it("appends the clip at the end and keeps earlier clips and the file", () => {
    const loaded = { name: "a.md", content: "x", loadedAt: "t" };
    const result = addClip(withClips(["first"], loaded), "second");
    expect(result.ok).toBe(true);
    expect(result.state.clips.map((c) => c.text)).toEqual(["first", "second"]);
    expect(result.state.loadedFile).toEqual(loaded);
  });

  it("assigns a unique id to every clip", () => {
    let state = createEmptyState();
    for (const text of ["a", "b", "c"]) state = addClip(state, text).state;
    const ids = state.clips.map((c) => c.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });

  it("stores the text exactly as selected", () => {
    const text = "  line one\n\n  **line two**  ";
    expect(addClip(createEmptyState(), text).state.clips[0].text).toBe(text);
  });

  it("rejects blank text without changing the state", () => {
    const state = withClips(["a"]);
    const result = addClip(state, "   \n");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("blank");
    expect(state.clips).toHaveLength(1);
  });

  it("rejects text over the clip limit", () => {
    const result = addClip(createEmptyState(), "a".repeat(MAX_CLIP_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("too-large");
  });
});

describe("clearClips", () => {
  const loaded = { name: "a.md", content: "x", loadedAt: "t" };

  it("clears all clips and keeps the loaded file by default", () => {
    const next = clearClips(withClips(["a", "b"], loaded), {});
    expect(next.clips).toEqual([]);
    expect(next.loadedFile).toEqual(loaded);
  });

  it("also removes the loaded file when clearFile is true", () => {
    const next = clearClips(withClips(["a"], loaded), { clearFile: true });
    expect(next.clips).toEqual([]);
    expect(next.loadedFile).toBeNull();
  });
});

describe("removeClip", () => {
  const loaded = { name: "a.md", content: "x", loadedAt: "t" };

  it("removes only the clip with that id and keeps the order of the others", () => {
    const next = removeClip(withClips(["a", "b", "c"], loaded), "2");
    expect(next.clips.map((c) => c.text)).toEqual(["a", "c"]);
    expect(next.loadedFile).toEqual(loaded);
  });

  it("is a no-op for an unknown id", () => {
    const state = withClips(["a", "b"]);
    expect(removeClip(state, "nope").clips).toEqual(state.clips);
  });
});

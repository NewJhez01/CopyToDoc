import { describe, expect, it } from "vitest";
import {
  MAX_CLIP_BYTES,
  MAX_FILE_BYTES,
  validateClipText,
  validateFile,
} from "../../src/core/validate.js";

describe("validateFile", () => {
  it.each(["notes.md", "NOTES.MD", "a.markdown", "b.txt"])("accepts %s", (name) => {
    expect(validateFile({ name, content: "# hi\n" }).ok).toBe(true);
  });

  it.each(["pic.png", "doc.pdf", "noextension", "x.md.exe"])("rejects %s by extension", (name) => {
    const result = validateFile({ name, content: "text" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Markdown|text/i);
  });

  it("rejects content with a NUL character", () => {
    const result = validateFile({ name: "a.md", content: "abc\u0000def" });
    expect(result.ok).toBe(false);
  });

  it("rejects content with the replacement character (invalid UTF-8)", () => {
    const result = validateFile({ name: "a.md", content: "abc\uFFFDdef" });
    expect(result.ok).toBe(false);
  });

  it("accepts an empty file", () => {
    expect(validateFile({ name: "a.md", content: "" }).ok).toBe(true);
  });

  it("rejects content over the size limit and mentions the limit", () => {
    const result = validateFile({ name: "a.md", content: "a".repeat(MAX_FILE_BYTES + 1) });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/5 MB/);
  });

  it("accepts content exactly at the size limit", () => {
    expect(validateFile({ name: "a.md", content: "a".repeat(MAX_FILE_BYTES) }).ok).toBe(true);
  });

  it("counts bytes, not characters", () => {
    const result = validateFile({ name: "a.md", content: "é".repeat(MAX_FILE_BYTES) });
    expect(result.ok).toBe(false);
  });
});

describe("validateClipText", () => {
  it("accepts normal text", () => {
    expect(validateClipText("hello").ok).toBe(true);
  });

  it.each(["", "   ", "\n\t \n"])("rejects blank text %j", (text) => {
    const result = validateClipText(text);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("blank");
  });

  it("rejects non-string values as blank", () => {
    expect(validateClipText(undefined).reason).toBe("blank");
    expect(validateClipText(null).reason).toBe("blank");
  });

  it("rejects text over the clip limit", () => {
    const result = validateClipText("a".repeat(MAX_CLIP_BYTES + 1));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("too-large");
    expect(result.error).toMatch(/1 MB/);
  });

  it("accepts text exactly at the clip limit", () => {
    expect(validateClipText("a".repeat(MAX_CLIP_BYTES)).ok).toBe(true);
  });
});

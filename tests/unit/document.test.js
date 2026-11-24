import { describe, expect, it } from "vitest";
import { composeDocument, suggestExportName } from "../../src/core/document.js";

describe("composeDocument", () => {
  it("returns the base unchanged when there are no clips", () => {
    expect(composeDocument("# Notes\n", [])).toBe("# Notes\n");
  });

  it("emits the base content unchanged before the clips", () => {
    const base = "# Notes\n\n  odd   spacing \r\n";
    expect(composeDocument(base, ["clip"]).startsWith(base)).toBe(true);
  });

  it("leaves one blank line when the base ends with a single newline", () => {
    expect(composeDocument("# Notes\n", ["clip"])).toBe("# Notes\n\nclip\n");
  });

  it("leaves one blank line when the base has no trailing newline", () => {
    expect(composeDocument("# Notes", ["clip"])).toBe("# Notes\n\nclip\n");
  });

  it("adds nothing extra when the base already ends with a blank line", () => {
    expect(composeDocument("# Notes\n\n", ["clip"])).toBe("# Notes\n\nclip\n");
  });

  it("does not add more separators when the base ends with several blank lines", () => {
    expect(composeDocument("a\n\n\n", ["clip"])).toBe("a\n\n\nclip\n");
  });

  it("separates multiple clips with one blank line, in order", () => {
    expect(composeDocument("base\n", ["one", "two", "three"])).toBe(
      "base\n\none\n\ntwo\n\nthree\n",
    );
  });

  it("builds a document from clips only when the base is empty", () => {
    expect(composeDocument("", ["one", "two"])).toBe("one\n\ntwo\n");
  });

  it("treats a missing base as empty", () => {
    expect(composeDocument(undefined, ["one"])).toBe("one\n");
  });

  it("keeps multi-line clips and Markdown characters exactly", () => {
    const clip = "# Heading\n* item\n\n`code` and *stars*";
    expect(composeDocument("base", [clip])).toBe(`base\n\n${clip}\n`);
  });

  it("does not add an extra newline when the last clip already ends with one", () => {
    expect(composeDocument("", ["one\n"])).toBe("one\n");
  });

  it("still separates clips by a blank line when a clip ends with a newline", () => {
    expect(composeDocument("", ["one\n", "two"])).toBe("one\n\ntwo\n");
  });
});

describe("composeDocument with source links", () => {
  const clip = { text: "quote", url: "https://example.com/a", title: "Example A" };
  const on = { includeSources: true };

  it("adds a Markdown link after the clip when enabled", () => {
    expect(composeDocument("base\n", [clip], on)).toBe(
      "base\n\nquote\n\n[Example A](https://example.com/a)\n",
    );
  });

  it("writes no link when the option is off or missing", () => {
    expect(composeDocument("base\n", [clip])).toBe("base\n\nquote\n");
    expect(composeDocument("base\n", [clip], { includeSources: false })).toBe("base\n\nquote\n");
  });

  it("uses the url as link text without a title", () => {
    const bare = { text: "quote", url: "https://example.com/a" };
    expect(composeDocument("", [bare], on)).toBe(
      "quote\n\n[https://example.com/a](https://example.com/a)\n",
    );
  });

  it("gives no link to clips without a url and still separates clips by a blank line", () => {
    expect(composeDocument("", [clip, { text: "plain" }, { ...clip, text: "again" }], on)).toBe(
      "quote\n\n[Example A](https://example.com/a)\n\nplain\n\nagain\n\n[Example A](https://example.com/a)\n",
    );
  });

  it("escapes link text and encodes spaces and parentheses in the url", () => {
    const odd = { text: "q", url: "https://x.test/a b/(c)", title: "[a] \\ b" };
    expect(composeDocument("", [odd], on)).toBe(
      "q\n\n[\\[a\\] \\\\ b](https://x.test/a%20b/%28c%29)\n",
    );
  });

  it("still accepts plain strings as clips", () => {
    expect(composeDocument("", ["one"], on)).toBe("one\n");
  });
});

describe("suggestExportName", () => {
  it("adds -updated and uses the .md extension", () => {
    expect(suggestExportName("notes.md")).toBe("notes-updated.md");
    expect(suggestExportName("notes.markdown")).toBe("notes-updated.md");
    expect(suggestExportName("notes.txt")).toBe("notes-updated.md");
  });

  it("only strips the last extension", () => {
    expect(suggestExportName("my.notes.md")).toBe("my.notes-updated.md");
  });

  it("handles names without an extension", () => {
    expect(suggestExportName("notes")).toBe("notes-updated.md");
  });

  it("falls back to a generic name when no file is loaded", () => {
    expect(suggestExportName(undefined)).toBe("copytodoc-export.md");
    expect(suggestExportName(null)).toBe("copytodoc-export.md");
    expect(suggestExportName("")).toBe("copytodoc-export.md");
  });

  it("falls back for a name that is only an extension", () => {
    expect(suggestExportName(".md")).toBe("copytodoc-export.md");
  });
});

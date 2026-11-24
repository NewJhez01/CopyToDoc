export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CLIP_BYTES = 1024 * 1024;

const ALLOWED_EXTENSIONS = [".md", ".markdown", ".txt"];
const encoder = new TextEncoder();

function byteLength(text) {
  return encoder.encode(text).length;
}

export function validateFile({ name, content }) {
  const lowerName = String(name ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return { ok: false, error: "Please choose a Markdown or text file (.md, .markdown or .txt)." };
  }
  if (typeof content !== "string" || content.includes("\u0000") || content.includes("\uFFFD")) {
    return { ok: false, error: "This file can't be read as UTF-8 text." };
  }
  if (byteLength(content) > MAX_FILE_BYTES) {
    return { ok: false, error: "This file is too large (maximum 5 MB)." };
  }
  return { ok: true };
}

export function validateClipText(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, reason: "blank", error: "Nothing selected." };
  }
  if (byteLength(text) > MAX_CLIP_BYTES) {
    return { ok: false, reason: "too-large", error: "Selection too large (maximum 1 MB)." };
  }
  return { ok: true };
}

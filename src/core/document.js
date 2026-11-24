function trailingNewlines(text) {
  let count = 0;
  for (let i = text.length - 1; i >= 0 && text[i] === "\n"; i--) count++;
  return count;
}

function separate(result) {
  return result.length > 0 ? result + "\n".repeat(Math.max(0, 2 - trailingNewlines(result))) : result;
}

function sourceLink({ url, title }) {
  const label = (title || url).replace(/[\\[\]]/g, "\\$&");
  const target = url.replace(/[ ()<>]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `[${label}](${target})`;
}

export function composeDocument(base, clips, { includeSources = false } = {}) {
  let result = typeof base === "string" ? base : "";
  clips.forEach((item, index) => {
    const clip = typeof item === "string" ? { text: item } : item;
    result = separate(result) + clip.text;
    if (includeSources && clip.url) result = separate(result) + sourceLink(clip);
    if (index === clips.length - 1 && trailingNewlines(result) === 0) result += "\n";
  });
  return result;
}

export function suggestExportName(name) {
  if (typeof name !== "string" || name === "") return "copytodoc-export.md";
  const dot = name.lastIndexOf(".");
  const stem = dot >= 0 ? name.slice(0, dot) : name;
  return stem === "" ? "copytodoc-export.md" : `${stem}-updated.md`;
}

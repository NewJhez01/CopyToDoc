function trailingNewlines(text) {
  let count = 0;
  for (let i = text.length - 1; i >= 0 && text[i] === "\n"; i--) count++;
  return count;
}

export function composeDocument(base, clips) {
  let result = typeof base === "string" ? base : "";
  clips.forEach((clip, index) => {
    if (result.length > 0) {
      result += "\n".repeat(Math.max(0, 2 - trailingNewlines(result)));
    }
    result += clip;
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

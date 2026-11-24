import { validateClipText } from "./validate.js";

export function resolveSelection(frameResults) {
  if (!Array.isArray(frameResults) || frameResults.length === 0) {
    return { outcome: "not-readable" };
  }
  const hit = frameResults
    .map((frame) => frame?.result)
    .find((text) => typeof text === "string" && text.trim() !== "");
  if (hit === undefined) return { outcome: "nothing-selected" };
  const check = validateClipText(hit);
  if (!check.ok) return { outcome: check.reason };
  return { outcome: "ready", text: hit };
}

export function outcomeMessage(outcome, { count } = {}) {
  switch (outcome) {
    case "added":
      return `Added to document (${count} ${count === 1 ? "clip" : "clips"})`;
    case "nothing-selected":
      return "Nothing selected";
    case "not-readable":
      return "Can't read selection on this page";
    case "too-large":
      return "Selection too large (max 1 MB)";
    case "save-failed":
      return "Could not save the clip";
    default:
      return "";
  }
}

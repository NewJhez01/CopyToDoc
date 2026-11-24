import { validateClipText } from "./validate.js";

export function createEmptyState() {
  return { version: 1, loadedFile: null, clips: [] };
}

function isValidFile(file) {
  return (
    file !== null &&
    typeof file === "object" &&
    typeof file.name === "string" &&
    typeof file.content === "string"
  );
}

function isValidClip(clip) {
  return (
    clip !== null &&
    typeof clip === "object" &&
    typeof clip.id === "string" &&
    typeof clip.text === "string"
  );
}

export function normalizeState(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    value.version !== 1
  ) {
    return createEmptyState();
  }
  return {
    version: 1,
    loadedFile: isValidFile(value.loadedFile) ? value.loadedFile : null,
    clips: Array.isArray(value.clips) ? value.clips.filter(isValidClip) : [],
  };
}

export function setLoadedFile(state, file, { keepClips }) {
  return {
    ...state,
    loadedFile: { name: file.name, content: file.content, loadedAt: new Date().toISOString() },
    clips: keepClips ? [...state.clips] : [],
  };
}

export function addClip(state, text) {
  const check = validateClipText(text);
  if (!check.ok) return { ok: false, reason: check.reason, error: check.error };
  const clip = { id: crypto.randomUUID(), text };
  return { ok: true, state: { ...state, clips: [...state.clips, clip] } };
}

export function clearClips(state, { clearFile } = {}) {
  return { ...state, loadedFile: clearFile ? null : state.loadedFile, clips: [] };
}

export function removeClip(state, id) {
  return { ...state, clips: state.clips.filter((clip) => clip.id !== id) };
}

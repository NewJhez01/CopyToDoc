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
  const state = {
    version: 1,
    loadedFile: isValidFile(value.loadedFile) ? value.loadedFile : null,
    clips: Array.isArray(value.clips) ? value.clips.filter(isValidClip).map(cleanClip) : [],
  };
  const snapshot = cleanUndo(value.undo);
  if (snapshot) state.undo = snapshot;
  return state;
}

function cleanUndo(undo) {
  if (undo === null || typeof undo !== "object" || typeof undo.label !== "string") return null;
  if (!Array.isArray(undo.clips)) return null;
  const snapshot = { label: undo.label, clips: undo.clips.filter(isValidClip).map(cleanClip) };
  if (isValidFile(undo.loadedFile)) snapshot.loadedFile = undo.loadedFile;
  return snapshot;
}

function withoutUndo(state) {
  const { undo: _dropped, ...rest } = state;
  return rest;
}

function withUndo(state, label, extra = {}) {
  return { ...state, undo: { label, clips: state.clips, ...extra } };
}

const MAX_URL_LENGTH = 2048;
const MAX_TITLE_LENGTH = 300;

function cleanSource({ url, title } = {}) {
  const source = {};
  if (typeof url === "string" && url !== "" && url.length <= MAX_URL_LENGTH) source.url = url;
  if (typeof title === "string") {
    const collapsed = title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
    if (collapsed !== "") source.title = collapsed;
  }
  return source;
}

function cleanClip(clip) {
  return { id: clip.id, text: clip.text, ...cleanSource(clip) };
}

export function setLoadedFile(state, file, { keepClips }) {
  return {
    ...withoutUndo(state),
    loadedFile: { name: file.name, content: file.content, loadedAt: new Date().toISOString() },
    clips: keepClips ? [...state.clips] : [],
  };
}

export function addClip(state, text, source) {
  const check = validateClipText(text);
  if (!check.ok) return { ok: false, reason: check.reason, error: check.error };
  const clip = { id: crypto.randomUUID(), text, ...cleanSource(source) };
  return { ok: true, state: { ...withoutUndo(state), clips: [...state.clips, clip] } };
}

export function clearClips(state, { clearFile = false, label = "start over" } = {}) {
  const removesFile = clearFile && state.loadedFile !== null;
  if (state.clips.length === 0 && !removesFile) return state;
  const next = withUndo(state, label, removesFile ? { loadedFile: state.loadedFile } : {});
  return { ...next, loadedFile: clearFile ? null : state.loadedFile, clips: [] };
}

export function removeClip(state, id) {
  if (!state.clips.some((clip) => clip.id === id)) return state;
  return { ...withUndo(state, "remove"), clips: state.clips.filter((clip) => clip.id !== id) };
}

export function editClip(state, id, text) {
  const index = state.clips.findIndex((clip) => clip.id === id);
  if (index === -1) return { ok: false, reason: "not-found", error: "That clip no longer exists." };
  const check = validateClipText(text);
  if (!check.ok) return { ok: false, reason: check.reason, error: check.error };
  const clips = state.clips.map((clip, i) => (i === index ? { ...clip, text } : clip));
  return { ok: true, state: { ...withUndo(state, "edit"), clips } };
}

export function moveClip(state, id, direction) {
  const from = state.clips.findIndex((clip) => clip.id === id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= state.clips.length) {
    return { ok: false, reason: "not-movable", error: "That clip can't be moved there." };
  }
  const clips = [...state.clips];
  [clips[from], clips[to]] = [clips[to], clips[from]];
  return { ok: true, state: { ...withUndo(state, "move"), clips } };
}

export function undo(state) {
  if (!state.undo) return { ok: false, reason: "nothing-to-undo", error: "Nothing to undo." };
  const { loadedFile, clips } = state.undo;
  const restored = { ...withoutUndo(state), clips };
  if (loadedFile) restored.loadedFile = loadedFile;
  return { ok: true, state: restored };
}

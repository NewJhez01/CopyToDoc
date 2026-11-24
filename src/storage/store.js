import { createEmptyState, normalizeState } from "../core/clips.js";

const KEY = "state";

export async function readState() {
  const stored = await browser.storage.local.get(KEY);
  return normalizeState(stored[KEY] ?? createEmptyState());
}

export async function writeState(state) {
  await browser.storage.local.set({ [KEY]: state });
}

export function onStateChanged(callback) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[KEY]) {
      callback(normalizeState(changes[KEY].newValue ?? createEmptyState()));
    }
  });
}

const EXPORT_KEY = "exportResult";
const PENDING_KEY = "pendingExport";

export async function readExportResult() {
  const stored = await browser.storage.local.get(EXPORT_KEY);
  return stored[EXPORT_KEY] ?? null;
}

export async function writeExportResult(result) {
  if (result === null) await browser.storage.local.remove(EXPORT_KEY);
  else await browser.storage.local.set({ [EXPORT_KEY]: result });
}

export async function readPendingExport() {
  const stored = await browser.storage.local.get(PENDING_KEY);
  return stored[PENDING_KEY] ?? null;
}

export async function writePendingExport(id) {
  if (id === null) await browser.storage.local.remove(PENDING_KEY);
  else await browser.storage.local.set({ [PENDING_KEY]: id });
}

export function onExportResult(callback) {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[EXPORT_KEY]?.newValue) callback(changes[EXPORT_KEY].newValue);
  });
}

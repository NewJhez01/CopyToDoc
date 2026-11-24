import { addClip, clearClips, removeClip, setLoadedFile } from "../core/clips.js";
import { outcomeMessage, resolveSelection } from "../core/outcome.js";
import { composeDocument, suggestExportName } from "../core/document.js";
import { validateFile } from "../core/validate.js";
import {
  readExportResult,
  readPendingExport,
  readState,
  writeExportResult,
  writePendingExport,
  writeState,
} from "../storage/store.js";
import { readSelection } from "./selection.js";

// Single write path: every state change is serialized through this queue.
let queue = Promise.resolve();
function mutate(fn) {
  const run = queue.then(async () => {
    const current = await readState();
    const result = await fn(current);
    if (result?.state) await writeState(result.state);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

let exportUrl = null;

const operations = {
  async loadFile({ name, content, keepClips }) {
    const check = validateFile({ name, content });
    if (!check.ok) return { ok: false, error: check.error };
    await mutate((state) => ({ state: setLoadedFile(state, { name, content }, { keepClips }) }));
    return { ok: true };
  },
  async removeClip({ id }) {
    await mutate((state) => ({ state: removeClip(state, id) }));
    return { ok: true };
  },
  async clearClips({ clearFile }) {
    await mutate((state) => ({ state: clearClips(state, { clearFile }) }));
    return { ok: true };
  },
  // Runs here because the popup is destroyed when the save dialog opens in Firefox.
  async exportDocument({ includeSources = false } = {}) {
    const state = await readState();
    if (state.clips.length === 0) {
      return { ok: false, error: "Nothing to export: there are no clips yet." };
    }
    const text = composeDocument(state.loadedFile?.content ?? "", state.clips, { includeSources });
    // Firefox rejects data: URLs here; a Blob URL owned by this page outlives the popup.
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    exportUrl = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const url = exportUrl;
    const filename = suggestExportName(state.loadedFile?.name);
    const attempt = async (saveAs) => {
      const id = await browser.downloads.download({ url, filename, saveAs });
      await writePendingExport(id);
    };
    try {
      await attempt(true);
      return { ok: true };
    } catch (error) {
      const message = String(error?.message ?? error);
      if (/cancel/i.test(message)) return { ok: false, cancelled: true };
      try {
        await attempt(false);
        return { ok: true, savedToDownloads: true };
      } catch (retryError) {
        return {
          ok: false,
          error: `Export failed: ${String(retryError?.message ?? retryError)} (first error: ${message})`,
        };
      }
    }
  },
  async ackExport() {
    await writeExportResult(null);
    return { ok: true };
  },
};

browser.downloads.onChanged.addListener(async (delta) => {
  const current = delta.state?.current;
  if (current !== "complete" && current !== "interrupted") return;
  if ((await readPendingExport()) !== delta.id) return;
  if (exportUrl) URL.revokeObjectURL(exportUrl);
  exportUrl = null;
  await writePendingExport(null);
  await writeExportResult(current);
});

browser.runtime.onMessage.addListener((message) => {
  const handler = operations[message?.op];
  if (!handler) return undefined;
  return handler(message.args ?? {}).catch(() => ({ ok: false, error: "Could not save the change." }));
});

let badgeTimer;
let feedbackActive = false;

async function showCount() {
  if (feedbackActive) return;
  const { clips } = await readState();
  await browser.action.setBadgeBackgroundColor({ color: "#0060df" });
  await browser.action.setBadgeTextColor({ color: "#ffffff" });
  await browser.action.setBadgeText({ text: clips.length > 0 ? String(clips.length) : "" });
}

async function giveFeedback(outcome, count) {
  const success = outcome === "added";
  feedbackActive = true;
  await browser.action.setBadgeText({ text: success ? "✓" : "!" });
  await browser.action.setBadgeBackgroundColor({ color: success ? "#2e7d32" : "#c62828" });
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => {
    feedbackActive = false;
    showCount();
  }, 2000);
  await browser.notifications.create({
    type: "basic",
    iconUrl: browser.runtime.getURL("icons/icon.svg"),
    title: "CopyToDoc",
    message: outcomeMessage(outcome, { count }),
  });
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.state) showCount();
});
showCount();

async function collectSelection() {
  let frameResults = null;
  let tab = null;
  try {
    [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    frameResults = await browser.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: readSelection,
    });
  } catch {
    frameResults = null;
  }

  const resolved = resolveSelection(frameResults);
  if (resolved.outcome !== "ready") return giveFeedback(resolved.outcome);

  try {
    const result = await mutate((state) => {
      const added = addClip(state, resolved.text, { url: tab?.url, title: tab?.title });
      return added.ok ? { state: added.state, ok: true } : { ok: false, reason: added.reason };
    });
    if (!result.ok) return giveFeedback(result.reason);
    const { clips } = await readState();
    return giveFeedback("added", clips.length);
  } catch {
    return giveFeedback("save-failed");
  }
}

browser.commands.onCommand.addListener((command) => {
  if (command === "collect-selection") collectSelection();
});

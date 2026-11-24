import { validateFile } from "../core/validate.js";
import { onExportResult, onStateChanged, readExportResult, readState } from "../storage/store.js";

const $ = (id) => document.getElementById(id);
let state = { loadedFile: null, clips: [] };

function send(op, args) {
  return browser.runtime.sendMessage({ op, args });
}

function setStatus(message, isError = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", isError);
}

let editing = null; // { id, draft, error }

function button(label, onClick, { disabled = false, className = "" } = {}) {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = label;
  el.disabled = disabled;
  if (className) el.className = className;
  el.addEventListener("click", onClick);
  return el;
}

async function saveEdit() {
  const result = await send("editClip", { id: editing.id, text: editing.draft });
  if (result?.ok) {
    editing = null;
    render();
  } else {
    editing.error = result?.error ?? "Could not save the change.";
    render();
  }
}

function renderClip(clip, index, total) {
  const item = document.createElement("li");
  const body = document.createElement("div");
  body.className = "clip-body";
  const actions = document.createElement("div");
  actions.className = "clip-actions";

  if (editing?.id === clip.id) {
    const box = document.createElement("textarea");
    box.className = "clip-edit";
    box.value = editing.draft;
    box.rows = 4;
    box.addEventListener("input", () => {
      editing.draft = box.value;
    });
    body.append(box);
    if (editing.error) {
      const error = document.createElement("span");
      error.className = "clip-error";
      error.textContent = editing.error;
      body.append(error);
    }
    actions.append(
      button("Save", () => {
        editing.draft = box.value;
        saveEdit();
      }),
      button("Cancel", () => {
        editing = null;
        render();
      }),
    );
  } else {
    const text = document.createElement("pre");
    text.className = "clip-text";
    text.textContent = clip.text;
    body.append(text);
    if (clip.url) {
      const source = document.createElement("span");
      source.className = "clip-source";
      source.textContent = `${clip.title || clip.url} · ${clip.url}`;
      source.title = clip.url;
      body.append(source);
    }
    actions.append(
      button("↑", () => send("moveClip", { id: clip.id, direction: -1 }), { disabled: index === 0, className: "move-up" }),
      button("↓", () => send("moveClip", { id: clip.id, direction: 1 }), { disabled: index === total - 1, className: "move-down" }),
      button("Edit", () => {
        editing = { id: clip.id, draft: clip.text, error: null };
        render();
      }, { className: "edit" }),
      button("Remove", () => send("removeClip", { id: clip.id }), { className: "remove" }),
    );
  }
  item.append(body, actions);
  return item;
}

function render() {
  if (editing && !state.clips.some((clip) => clip.id === editing.id)) editing = null;
  $("file-name").textContent = state.loadedFile ? state.loadedFile.name : "None loaded";
  $("clip-count").textContent = String(state.clips.length);
  $("empty-state").hidden = state.clips.length > 0;
  $("undo-button").hidden = !state.undo;
  if (state.undo) $("undo-button").textContent = `Undo ${state.undo.label}`;
  $("clip-list").replaceChildren(
    ...state.clips.map((clip, index) => renderClip(clip, index, state.clips.length)),
  );
}

function askDialog(dialog) {
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue), { once: true });
    dialog.returnValue = "cancel";
    dialog.showModal();
  });
}

async function handleFileChosen(event) {
  const input = event.target;
  const file = input.files[0];
  input.value = "";
  if (!file) return;

  let content;
  try {
    content = await file.text();
  } catch {
    setStatus("This file can't be read.", true);
    return;
  }
  const check = validateFile({ name: file.name, content });
  if (!check.ok) {
    setStatus(check.error, true);
    return;
  }

  let keepClips = true;
  if (state.loadedFile && state.clips.length > 0) {
    $("load-dialog-name").textContent = file.name;
    const choice = await askDialog($("load-dialog"));
    if (choice === "cancel") {
      setStatus("Load cancelled, nothing changed.");
      return;
    }
    keepClips = choice === "keep";
  }

  const result = await send("loadFile", { name: file.name, content, keepClips });
  if (result?.ok) {
    setStatus(`Loaded ${file.name}.`);
    if (isTab) setTimeout(closeThisTab, 1200);
  } else setStatus(result?.error ?? "Could not load the file.", true);
}

async function handleExport() {
  if (state.clips.length === 0) {
    setStatus("Nothing to export: there are no clips yet.", true);
    return;
  }
  const result = await send("exportDocument", { includeSources: $("include-sources").checked });
  if (result?.cancelled) setStatus("Export cancelled, nothing changed.");
  else if (!result?.ok) setStatus(result?.error ?? "Export failed. Your clips are untouched.", true);
  else if (result.savedToDownloads) setStatus("The save dialog was unavailable, so the file went to your Downloads folder.");
}

let handlingExportResult = false;
async function handleExportResult(result) {
  if (!result || handlingExportResult) return;
  handlingExportResult = true;
  try {
    if (result === "complete") {
      setStatus("Export saved.");
      if ((await askDialog($("clear-dialog"))) === "yes") await send("clearClips", { clearFile: false, label: "clear" });
    } else {
      setStatus("Export failed. Your clips are untouched.", true);
    }
    await send("ackExport");
  } finally {
    handlingExportResult = false;
  }
}

async function handleStartOver() {
  $("start-over-file").checked = false;
  if ((await askDialog($("start-over-dialog"))) !== "confirm") return;
  await send("clearClips", { clearFile: $("start-over-file").checked });
  setStatus("Started over.");
}

// Firefox closes a toolbar popup when the file picker opens, so loading happens in a small tab.
const isTab = location.hash === "#load";
document.body.classList.toggle("tab-mode", isTab);

async function closeThisTab() {
  const tab = await browser.tabs.getCurrent();
  if (tab) await browser.tabs.remove(tab.id);
}

async function handleLoadClick() {
  if (isTab) {
    $("file-input").click();
    return;
  }
  await browser.tabs.create({ url: browser.runtime.getURL("src/manager/manager.html#load") });
  window.close();
}

$("include-sources").checked = localStorage.getItem("includeSources") === "true";
$("include-sources").addEventListener("change", (event) => {
  localStorage.setItem("includeSources", String(event.target.checked));
});
$("undo-button").addEventListener("click", async () => {
  const result = await send("undo");
  setStatus(result?.ok ? "Undone." : (result?.error ?? "Nothing to undo."), !result?.ok);
});
$("load-button").addEventListener("click", handleLoadClick);
$("file-input").addEventListener("change", handleFileChosen);
$("export-button").addEventListener("click", handleExport);
$("start-over-button").addEventListener("click", handleStartOver);

onStateChanged((next) => {
  state = next;
  render();
});

onExportResult(handleExportResult);

state = await readState();
render();
await handleExportResult(await readExportResult());

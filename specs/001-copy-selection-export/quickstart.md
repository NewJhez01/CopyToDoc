# Quickstart: Validation Guide

Proves the feature end to end. Run on macOS and on Linux before a release (constitution).

## Prerequisites

- Firefox 140 or newer
- Node.js 20+ and npm
- A sample file `notes.md` containing a few lines, once with and once without a trailing newline

## Setup

```bash
npm install
npm test            # unit tests for src/core
npx web-ext lint    # manifest and permission check
npx web-ext run     # starts Firefox with the extension loaded temporarily
```

## Scenarios

1. **Load a file** (Story 1)
   Click the toolbar button, load `notes.md`. Expect: file name shown, nothing else changed. Try an image file. Expect: rejected with a message and previous state kept.
2. **Collect clips** (Story 2)
   On any web page, select text and press `Alt+Shift+C`. Expect: notification "Added…" and a `✓` badge. Repeat on a second page. Press the shortcut with nothing selected. Expect: "Nothing selected". Try on `about:preferences`. Expect: "Can't read selection on this page". Also test text selected inside a `<textarea>` and inside an iframe.
3. **Export** (Story 3)
   In the popup click Export. Expect: save dialog pre-filled with `notes-updated.md`. Save. Open the file: original content first, unchanged, then each clip separated by a blank line, even when `notes.md` had no trailing newline. Expect the "Clear clips now?" prompt. Cancel the save dialog in a second run. Expect: no prompt, clips still there. Export with no clips. Expect: refused with a message.
4. **Manage** (Story 4)
   Remove the middle of three clips; the others keep order. Start over and confirm.
5. **Switching files**
   With clips present, load another file. Expect: keep / discard / cancel dialog with the loss warning.
6. **Persistence**
   Install a **signed build** (see README) and restart Firefox. A temporary add-on from `web-ext run` is removed on restart and cannot be used for this check. Expect: loaded file and clips still present.
7. **Shortcut rebinding**
   Rebind in `about:addons` → gear icon → Manage Extension Shortcuts; the new key works.
8. **Privacy**
   Open the browser network monitor / use `web-ext run` with a blocked network; all of the above still works. The original `notes.md` on disk is unchanged throughout.

## Expected outcomes

Map to spec success criteria SC-001 through SC-007. Details of the interfaces are in
[contracts/extension-surface.md](contracts/extension-surface.md), data rules in
[data-model.md](data-model.md).

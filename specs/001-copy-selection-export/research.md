# Research: Copy Selection to Markdown Export

All Technical Context unknowns are resolved below.

## 1. Extension model and manifest version

- **Decision**: WebExtension, Manifest V3, event-page background (`background.scripts`, module type), `strict_min_version` 140.
- **Rationale**: MV3 is the current standard and Firefox keeps non-persistent event pages, which suits a command-driven extension. Version 140 is the first with built-in data-collection consent, which new extensions must declare (`data_collection_permissions: { required: ["none"] }`).
- **Alternatives**: MV2 (being phased out, would age badly). Chromium-only APIs (not a target).

## 2. How the user "loads" a Markdown file

- **Decision**: A file picker (`<input type="file">`) on the extension's toolbar popup page (changed from a tab page after the user asked for a popup; see Amendment below); content is read as UTF-8 text and stored in extension storage.
- **Rationale**: The extension cannot hold a persistent handle to a disk file in Firefox (no File System Access API), so a copy of the content is stored, which matches the spec ("kept exactly as loaded").
- **Amendment (popup)**: The first design used a tab because Firefox popups can close when the OS file picker or save dialog opens. The user chose the popup anyway. **Verified on Firefox (macOS): the file picker closes the popup and the chosen file is lost.** Applied fallback: the popup's "Load file…" button opens `manager.html#load` in a small tab (picker only, then the tab closes itself); everything else stays in the popup. Still to verify: whether the save-as dialog closes the popup, which would lose the "Clear clips now?" prompt. If so, record a completed export in storage so the popup asks the next time it opens.
- **Alternatives**: Tab page (reliable file picker, but a separate page). Native messaging helper (rejected for v1 by the user and by constitution principle V; revisit later for true in-place append).

## 3. Reading the selection from a page

- **Decision**: The command handler calls `scripting.executeScript` in the active tab (all frames) with a self-contained function that returns `window.getSelection().toString()`, falling back to the selected range of the focused `<input>`/`<textarea>`. The first non-blank result wins.
- **Rationale**: The shortcut counts as a user gesture, which grants `activeTab`, so no host permissions are needed. Reading is passive, so the page is not modified (FR-015). All-frames covers selections inside iframes.
- **Alternatives**: Always-on content script on every site (needs broad host permissions, violates principle II). Clipboard read (needs extra permission and loses the "selected only" meaning).

## 4. Keyboard shortcut

- **Decision**: `commands` manifest key with a custom command `collect-selection`, `suggested_key.default = "Alt+Shift+C"`.
- **Rationale**: Users can rebind it in `about:addons` → Manage Extension Shortcuts (FR-013). On macOS, Alt is the Option key. Alt+Shift+C avoids the DevTools Ctrl/Cmd+Shift+C conflict.
- **Note**: If another extension or the OS owns the combination, Firefox leaves the command unbound; the manager page shows a hint pointing to the shortcut settings.

## 5. Persisting state

- **Decision**: One `state` record in `browser.storage.local`: `{ loadedFile, clips }`.
- **Rationale**: Survives restarts (FR-006), needs only the `storage` permission, readable from both the background page and the manager page, and `storage.onChanged` keeps the open manager page in sync.
- **Concurrency**: All state changes (shortcut and manager page) go through the background page's single promise queue, the manager page sending operations by message, so rapid actions never lose a clip.
- **Limits**: Loaded file max 5 MB, clip max 1 MB; over the limit the user is told (spec edge case). Chosen conservatively to avoid hitting storage limits.

## 6. Exporting with a save dialog

- **Decision**: The popup sends an `exportDocument` message; the **background page** builds the document, makes a Blob URL and calls `downloads.download({ url, filename, saveAs: true })`. (Verified: Firefox rejects `data:` URLs with "Access denied", and a Blob URL created by the popup dies with the popup, so the Blob URL is created and revoked in the background page.) The background records the download id and, when `downloads.onChanged` reports `complete` or `interrupted`, stores the result under `exportResult`; the popup shows "Clear clips now?" when it sees it (immediately if still open, otherwise the next time it opens) and then sends `ackExport`.
- **Rationale**: A plain `<a download>` saves silently to the Downloads folder unless the user's Firefox setting says otherwise, so it cannot guarantee a name/location choice (FR-010). `saveAs: true` always opens the dialog with the suggested name pre-filled (`notes-updated.md`). Cancellation of the save dialog makes the `download()` promise reject, which the page treats as "cancelled"; a download that fails later shows as `interrupted` in the download state. Both leave the clips untouched (FR-011).
- **Permission cost**: `downloads` is required for this guarantee. Accepted and justified.

## 7. User feedback on shortcut use

- **Decision**: A system notification (`notifications` permission) with the outcome and reason, plus a short toolbar badge (`✓` or `!`) cleared after ~2 s.
- **Rationale**: FR-007 requires a stated reason when nothing was added ("no selection", "page not readable"). A badge cannot carry text. Injecting an on-page toast would modify the page (FR-015).
- **Alternatives**: Badge only (no reason). In-page overlay (modifies the page).

## 8. Document composition rules

- **Decision**: Pure function `composeDocument(baseText, clips)`. The base is emitted byte-for-byte. Before each clip, add just enough `\n` to get one blank line (two line breaks) after the preceding content. After the last clip add a single `\n`. If there are no clips, return the base unchanged. Separators use `\n`.
- **Rationale**: Meets FR-009 (original unchanged, blank line before each clip, no merged lines even if the base lacks a trailing newline).
- **Alternatives**: Normalizing the base's line endings (alters original, violates FR-009).

## 9. File validation

- **Decision**: Accept `.md`, `.markdown`, `.txt`. Read via `File.text()`; reject if the text contains NUL or U+FFFD (not valid UTF-8 text) or exceeds the size limit.
- **Rationale**: Satisfies FR-014 with a simple deterministic check.

## 10. Testing strategy

- **Decision**: Vitest unit tests for `src/core` (composition, clip operations, validation). Manual cross-OS check of the shortcut, selection reading, file loading and the save dialog per quickstart. `web-ext lint` in CI-like local run.
- **Rationale**: The pure core holds the logic that can silently corrupt data; browser glue is thin and verified by hand, per the constitution's workflow. Automated browser E2E (Selenium/geckodriver) is deferred as YAGNI.

## 11. Distribution

- **Decision**: Develop with `web-ext run` / temporary add-on. For daily use on release Firefox (pacman, macOS), sign as an unlisted add-on via AMO (`web-ext sign`) and install the `.xpi`.
- **Rationale**: Release Firefox only runs signed extensions permanently. Unlisted signing keeps it private and local.

## Permission justification

| Permission | Needed for |
|-----------|------------|
| `storage` | Persisting the loaded file and clips (FR-006) |
| `activeTab` | Reading the selection of the current tab after the shortcut, without host permissions |
| `scripting` | Running the selection-reading function in that tab |
| `downloads` | Guaranteed save-as dialog with pre-filled name and success detection (FR-010, FR-011) |
| `notifications` | Stating the outcome and reason after the shortcut (FR-007) |
| `menus` | The "Add selection to CopyToDoc" right-click item (FR-022). Clicking it grants `activeTab` for that tab like the shortcut does, so no host permission is added. The permission shows no extra install warning |

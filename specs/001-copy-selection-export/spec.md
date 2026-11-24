# Feature Specification: Copy Selection to Markdown Export

**Feature Branch**: `001-copy-selection-export`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "A Firefox extension (macOS and Linux) where the user picks a Markdown file as target. Pressing Alt+Shift+C appends the currently selected page text to that file. Clips contain only the selected text, separated by a line break. The first version works with an export: the user loads an existing Markdown file into the extension, new clips are appended to its content inside the extension, and the export is the old file content plus the new clips."

## Clarifications

### Session 2026-11-24

- Q: After export, what should happen to the collected clips? → A: After a successful export the user is asked "Clear clips now?" (default Yes); declining keeps them.
- Q: When a different file is loaded while clips exist, what happens to the clips? → A: The user is asked each time to keep them (placed after the new content) or discard them; the prompt warns that discarding without having exported loses them permanently.
- Q: What file name should the export suggest by default? → A: The loaded file's name plus "-updated" (e.g. `notes-updated.md`), pre-filled in the save dialog where the user can always change it.
- Q: Should clips keep page formatting converted to Markdown, or be plain text? → A: Plain text only for now; formatting and links are dropped. Markdown conversion may be a later feature.

### Session 2026-11-24 (update: counter and source links)

- Q: Where should the clip counter be shown? → A: On the toolbar button's badge at all times (hidden when there are no clips); the brief ✓ / ! confirmation replaces it for about 2 seconds.
- Q: Can the page URL be included in the exported file? → A: Yes. The page title and URL are stored with each clip when it is collected. The popup has an "Include source links" checkbox next to Export, unchecked by default. When checked, each clip is followed by a Markdown link `[page title](url)`. Firefox's own save dialog cannot hold extra controls, so the checkbox sits in the popup.

### Session 2026-11-24 (update: edit, reorder, undo, right-click)

- Q: How are clips edited? → A: Inline. Each clip has an Edit button that turns it into a text box with Save and Cancel. The source (page title and URL) is kept.
- Q: How are clips moved? → A: Up and Down buttons on each clip; Up is disabled on the first clip and Down on the last.
- Q: What can be undone? → A: Only the last action (remove, edit, move, start over, clear after export), through an Undo button in the popup. Adding a clip or loading a file ends the undo window.
- Q: Should there be a right-click way to add a clip? → A: Yes: "Add selection to CopyToDoc" in the page context menu when text is selected. It needs the extra `menus` permission, accepted and justified in research.md.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load an existing Markdown file as the target (Priority: P1)

The user selects an existing Markdown file from their computer and loads it into the extension. The extension shows which file is loaded and keeps its content as the starting point of the document. All clips collected afterwards are added after this content.

**Why this priority**: The whole purpose is to extend the user's existing document, so the starting document has to come first.

**Independent Test**: Load a Markdown file and confirm the extension shows its file name and that the document starts with the file's exact content.

**Acceptance Scenarios**:

1. **Given** no file is loaded, **When** the user selects a Markdown file to load, **Then** the extension shows the file name and holds the file's content unchanged as the start of the document.
2. **Given** a file is loaded, **When** the user closes and reopens Firefox, **Then** the loaded file and any collected clips are still there.
3. **Given** a file is loaded and clips exist, **When** the user loads a different file, **Then** the user is asked whether to keep the clips (placed after the new file's content) or discard them, and the prompt states that discarding clips that were not exported loses them permanently. Nothing changes until the user answers, and cancelling keeps the previous file and clips.
4. **Given** the user selects a file that is not readable text (for example an image), **When** loading, **Then** the file is rejected with a clear message and the previously loaded file is kept.
5. **Given** the loaded file on disk changes later, **When** the user continues collecting, **Then** the extension keeps using the content as loaded.

---

### User Story 2 - Collect selected text with a shortcut (Priority: P1)

While reading a web page, the user selects some text and presses Alt+Shift+C. The text is added to the end of the document, after the loaded file's content and any earlier clips. The page is not changed and the user stays where they are.

**Why this priority**: This is the core interaction of the product.

**Independent Test**: With a file loaded, select text on any page, press Alt+Shift+C, open the extension and confirm the text is the last clip. Repeat on a second page and confirm both clips are present in order.

**Acceptance Scenarios**:

1. **Given** a file is loaded and text is selected on a page, **When** the user presses Alt+Shift+C, **Then** the selected text is added after the existing content and the user sees a brief confirmation.
2. **Given** earlier clips exist, **When** the user adds another clip, **Then** earlier clips and the loaded content are unchanged and the new clip comes last.
3. **Given** no text is selected, **When** the user presses Alt+Shift+C, **Then** nothing is added and the user sees a message that there is no selection.
4. **Given** no file is loaded, **When** the user presses Alt+Shift+C with text selected, **Then** the clip is still collected into an empty document and the user can load a file later (the loaded content then goes first).
5. **Given** clips exist, **When** the user looks at the toolbar button, **Then** its badge shows the number of clips; with no clips the badge is empty; after the brief ✓ / ! confirmation the count returns.
6. **Given** text is selected on a page, **When** the user adds it, **Then** the page title and URL are stored with the clip (never sent anywhere).
7. **Given** text is selected on a page, **When** the user right-clicks and chooses "Add selection to CopyToDoc", **Then** it is added exactly as with the shortcut (same confirmation, source and badge). The menu item appears only when text is selected.

---

### User Story 3 - Export the original content plus new clips (Priority: P1)

The user exports the document. They receive a `.md` file containing the loaded file's original content followed by every collected clip in order, each separated from the preceding content by a line break. The original file on their disk is never modified. The user can choose the name of the exported file.

**Why this priority**: The export is the only way the result leaves the extension, so without it the feature delivers nothing usable.

**Independent Test**: Load a file, collect three clips, export, open the result in a text editor and confirm it equals the original content followed by the three clips in order, separated by line breaks.

**Acceptance Scenarios**:

1. **Given** a file is loaded and clips are collected, **When** the user exports, **Then** a Markdown file is saved containing the original content unchanged, followed by each clip in order, separated by line breaks.
2. **Given** a file is loaded but no clips were collected, **When** the user exports, **Then** the user is told there is nothing new to export and no file is created.
3. **Given** the export was saved successfully, **When** the export finishes, **Then** the user is asked "Clear clips now?" with Yes as the default; choosing Yes removes the clips, choosing No keeps them.
4. **Given** the user cancels the save dialog, **When** returning to the extension, **Then** the loaded content and clips are unchanged.
5. **Given** the exported file is saved, **When** the user checks the original file on disk, **Then** it is unchanged.
6. **Given** "Include source links" is checked, **When** the user exports, **Then** each clip that has a source is followed by a blank line and a Markdown link `[page title](url)`; with the box unchecked (the default) no links are written.

---

### User Story 4 - Review and manage clips (Priority: P2)

The user can see the clips collected since loading, remove a single clip added by mistake, and start over (discarding all clips, and optionally the loaded file) after confirming.

**Why this priority**: Helps correct mistakes, but the product works without it.

**Independent Test**: Collect three clips, remove the middle one and confirm the other two remain in order, then start over and confirm no clips remain.

**Acceptance Scenarios**:

1. **Given** clips exist, **When** the user opens the extension, **Then** the clips are listed in order, clearly separate from the loaded file content.
2. **Given** the list is shown, **When** the user removes one clip, **Then** only that clip is removed and the loaded content cannot be removed this way.
3. **Given** clips exist, **When** the user chooses to start over and confirms, **Then** all clips are discarded.
4. **Given** a clip is listed, **When** the user chooses Edit, changes the text and saves, **Then** that clip shows the new text at the same position with its source unchanged; Cancel leaves it as it was; saving blank text or text over 1 MB is refused with a message.
5. **Given** several clips, **When** the user presses Up or Down on a clip, **Then** it swaps places with its neighbour and the export uses the new order; Up is unavailable on the first clip and Down on the last.
6. **Given** the user just removed, edited or moved a clip, started over, or cleared the clips after an export, **When** they press Undo, **Then** the state from before that action returns (including the loaded file if start over removed it) and Undo disappears.
7. **Given** an undoable action was done, **When** the user adds a clip or loads a file, **Then** Undo is no longer offered, so it can never silently drop a newer change.

---

### Edge Cases

- No text selected when the shortcut is pressed: nothing is added, the user is informed.
- Selection that is only whitespace: treated as no selection.
- Loaded file does not end with a line break: the first clip is still separated from it by a line break, so lines are not merged.
- Loaded file is empty: the document consists only of the clips.
- Loaded file is very large, or a very large selection is clipped: content is not silently truncated. If a limit exists it MUST be communicated to the user.
- File is not in a Markdown-style text format (e.g. a binary file): rejected with a clear message.
- Selected text inside an input field on a page: collected like any other selection.
- Pages where the selection cannot be read (for example browser-internal pages): the user is told.
- Another program or Firefox already uses Alt+Shift+C: the user can assign a different shortcut.
- Selected text containing Markdown special characters or multiple lines: kept exactly as selected.
- Export interrupted or cancelled: the loaded content and clips are kept.
- Undo after the popup was closed and reopened: still available until the next clip is added or file loaded.
- Right-click on a page where the selection cannot be read: same message as with the shortcut.
- Editing a clip while a new clip is collected: the edit applies to the clip with that identity, nothing is lost.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to select an existing Markdown file from their computer and load it into the extension as the starting content of the document.
- **FR-002**: The system MUST show which file is currently loaded and keep its content exactly as loaded, without modifying the original file on disk.
- **FR-003**: Users MUST be able to add the currently selected page text to the end of the document by pressing Alt+Shift+C.
- **FR-004**: The system MUST store each clip as plain text containing only the selected text, with no formatting, added page title, link or timestamp.
- **FR-005**: The system MUST keep clips in the order they were added, after the loaded file's content.
- **FR-006**: The system MUST keep the loaded file content and the clips after the browser is closed and reopened, until the user discards them.
- **FR-007**: The system MUST give the user visible feedback when a clip is added and when nothing could be added, including the reason.
- **FR-008**: Users MUST be able to export the document as one Markdown (`.md`) file containing the original loaded content followed by all clips in order.
- **FR-009**: In the exported file each clip MUST be preceded by one blank line (a blank line separates it from the preceding content, even if that content does not end with a line break), and the original content MUST appear unchanged.
- **FR-010**: Users MUST be able to choose the name and location of the exported file in a save step before the file is written. The suggested name MUST be the loaded file's name plus "-updated" (e.g. `notes-updated.md`), or a generic name if no file is loaded.
- **FR-011**: Exporting MUST NOT change or delete the loaded content or the clips by itself. Only after a successful save MUST the system ask the user whether to clear the clips (default Yes); clips MUST NOT be cleared if the save fails or is cancelled.
- **FR-012**: Users MUST be able to view the collected clips, remove a single clip, and start over after confirmation.
- **FR-013**: Users MUST be able to change the shortcut to a different key combination.
- **FR-014**: The system MUST reject files that cannot be read as text, with a clear message, and keep the previous state.
- **FR-015**: The system MUST NOT send file content, selected text or usage data over the network, and MUST NOT modify the web page.
- **FR-016**: The system MUST work in Firefox on macOS and Linux.
- **FR-017**: The toolbar button MUST show the number of collected clips as a badge (empty when there are none); the brief confirmation badge temporarily replaces it.
- **FR-018**: The system MUST store the page title and URL with each clip, keep them local (FR-015), and write them to the export only when the user checks "Include source links" (unchecked by default), as a Markdown link `[page title](url)` after the clip.

- **FR-019**: Users MUST be able to edit the text of a single clip (blank text and text over 1 MB are refused); the clip keeps its position and source.
- **FR-020**: Users MUST be able to move a clip one place up or down; the export MUST follow the displayed order.
- **FR-021**: Users MUST be able to undo the last remove, edit, move, start over or clear-after-export. Only one step is kept, and adding a clip or loading a file discards it.
- **FR-022**: The system MUST offer "Add selection to CopyToDoc" in the page context menu when text is selected, behaving like the shortcut (FR-003, FR-007, FR-018). It uses the `menus` permission and nothing else new.

### Key Entities

- **Loaded File**: The existing Markdown file the user chose. Attributes: file name and its content as it was when loaded. Never modified.
- **Clip**: A piece of text the user selected on a page. Attributes: the text, optionally the page title and URL it came from, and its position among the clips.
- **Undo snapshot**: The clips (and loaded file, if it was removed) as they were before the last undoable action. One at most; stored locally.
- **Document**: The loaded file's content followed by all clips in order. This is what gets exported.
- **Export**: The Markdown file produced from the document at a moment in time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a clip with one key press after selecting text, and sees confirmation within 1 second.
- **SC-002**: A user can go from loading a file to saving an export containing 5 new clips in under 2 minutes.
- **SC-003**: In 100% of exports, the original file content is unchanged and every collected clip appears after it in order, with no text lost or altered.
- **SC-004**: 100% of the loaded content and clips remain available after the browser is restarted.
- **SC-005**: The original file on disk is never modified in any normal use.
- **SC-006**: A first-time user completes "load a file, collect one clip, export" without instructions in under 5 minutes.
- **SC-007**: No file content, selected text or usage data leaves the user's computer during normal use.

## Assumptions

- The first version does not write directly into the user's file on disk. The result is delivered as an exported file, and the user decides whether to replace the original with it. Writing straight into the chosen file is deferred to a later version.
- "Separated by a line break" means one blank line between the preceding content and each clip, so each reads as its own paragraph in Markdown.
- Clips contain only the selected text; source page information is out of scope for now.
- Selected text is taken as plain text. Formatting such as bold or links from the page is not preserved.
- There is one loaded file and one set of clips at a time. Multiple named documents are out of scope.
- When loading a new file while clips exist, the user always decides between keeping and discarding the clips; no default action is taken silently.
- Files are treated as UTF-8 text.
- Target users run a current Firefox on macOS or Linux. Windows and other browsers are out of scope.
- The default shortcut is Alt+Shift+C and can be changed in Firefox's own shortcut settings.
- Project principles (local-only, minimal permissions, non-destructive behavior, plain-text output) from the project constitution apply.

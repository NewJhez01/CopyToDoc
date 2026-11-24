---

description: "Task list for Copy Selection to Markdown Export"
---

# Tasks: Copy Selection to Markdown Export

**Input**: Design documents from `/specs/001-copy-selection-export/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included for `src/core` (constitution: core logic, including error handling, MUST have automated tests, written before implementation). Browser glue is verified manually per quickstart.md.

**Organization**: Grouped by user story so each can be implemented and verified independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1 Load file, US2 Collect clips, US3 Export, US4 Manage clips
- Field citations point to [data-model.md](data-model.md) as the canonical constraint source
- Tasks that edit `tests/unit/clips.test.js`, `src/core/clips.js`, `src/background/background.js` or `src/manager/manager.js` are never marked [P] against each other

## Path Conventions

Single project at the repository root: `manifest.json`, `src/`, `tests/`, `icons/` (see plan.md).

---

## Phase 1: Setup

**Purpose**: Project initialization

- [X] T001 Create the directory structure from plan.md: `src/core`, `src/background`, `src/storage`, `src/manager`, `icons`, `tests/unit`
- [X] T002 Create `package.json` (`"type": "module"`, dev dependencies `vitest` and `web-ext`, scripts `test`, `lint`, `start`, `build`) and run `npm install`
- [X] T003 [P] Create `manifest.json` per [contracts/extension-surface.md](contracts/extension-surface.md): MV3, fixed gecko ID `copytodoc@harper-jones.local` (change it before the first signing if you prefer another, it must never change afterwards), `strict_min_version` 140.0, `data_collection_permissions` `required: ["none"]`, the five permissions, no host permissions, module background script, toolbar `action`, `collect-selection` command with `Alt+Shift+C`, CSP `'self'`
- [X] T004 [P] Add a simple `icons/icon.svg` and reference it in `manifest.json`
- [X] T005 [P] Create `.gitignore` (`node_modules/`, `web-ext-artifacts/`)

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: Shared validation, state shape, storage and the single write path

**⚠️ CRITICAL**: No user story work starts until this phase is complete

- [X] T006 [P] Write failing tests in `tests/unit/validate.test.js`: accepts `.md`/`.markdown`/`.txt`, rejects other extensions, rejects text containing NUL or U+FFFD, rejects over-limit content, rejects blank or over-limit clip text
- [X] T007 Implement `src/core/validate.js` (`validateFile`, `validateClipText`, size constants). Constraints come from data-model.md `LoadedFile.name`, `LoadedFile.content` and `Clip.text`; return user-readable error reasons (makes T006 pass)
- [X] T008 [P] Write failing tests in `tests/unit/clips.test.js` for `createEmptyState` and `normalizeState` (missing or malformed stored value becomes the default `{ version: 1, loadedFile: null, clips: [] }`, per [contracts/storage-schema.md](contracts/storage-schema.md))
- [X] T009 Implement `createEmptyState` and `normalizeState` in `src/core/clips.js` (makes T008 pass)
- [X] T010 [P] Implement `src/storage/store.js`: `readState()`, `writeState()` and `onStateChanged(callback)` over `browser.storage.local` key `state`, using `normalizeState`
- [X] T011 Implement the single write path in `src/background/background.js`: a serialized promise queue `mutate(fn)` (read, apply pure function, write), a `runtime.onMessage` handler that dispatches named operations (handlers added by later tasks), and a toolbar `action.onClicked` handler that opens or focuses the manager tab
- [X] T012 [P] Create the manager page shell: `src/manager/manager.html`, `src/manager/manager.css` and `src/manager/manager.js` that render current state from `store.js`, re-render on `onStateChanged`, provide a status message area, and expose a `send(op, args)` helper that messages the background page

**Checkpoint**: Foundation ready, user stories can begin

---

## Phase 3: User Story 1 - Load an existing Markdown file (Priority: P1) 🎯 MVP

**Goal**: User loads a `.md` file; its exact content becomes the start of the document.

**Independent Test**: Load a Markdown file and confirm the name is shown and the stored content equals the file; an image file is rejected and the previous state is kept (quickstart scenario 1).

### Tests for User Story 1

- [X] T013 [US1] Write failing tests in `tests/unit/clips.test.js` for `setLoadedFile(state, file, { keepClips })`: replaces the file, keeps clips when `keepClips` is true, discards them when false, never alters the content (data-model.md `LoadedFile.content`, `LoadedFile.name`, `LoadedFile.loadedAt`)

### Implementation for User Story 1

- [X] T014 [US1] Implement `setLoadedFile` in `src/core/clips.js`, setting `LoadedFile.name`, `LoadedFile.content` and `LoadedFile.loadedAt` per data-model.md (makes T013 pass)
- [X] T015 [US1] Add the `loadFile` operation to `src/background/background.js` using `mutate` and `setLoadedFile`
- [X] T016 [US1] In `src/manager/manager.js` add the file picker: read the file with `File.text()`, run `validateFile`, show the error and keep previous state on rejection, show the loaded file name on success, send `loadFile`
- [X] T017 [US1] In `src/manager/manager.js` add the dialog (an HTML `<dialog>`, not `window.confirm`) shown **only when a file is already loaded and clips exist**: keep clips (placed after the new content) / discard clips / cancel, with the warning that discarding clips that were not exported loses them permanently; cancel changes nothing. When no file was loaded before, load directly and keep any existing clips with no prompt (spec Story 2 scenario 4)
- [ ] T018 [US1] Manually verify quickstart.md scenario 1 in Firefox

**Checkpoint**: A file can be loaded, validated and shown

---

## Phase 4: User Story 2 - Collect selected text with a shortcut (Priority: P1)

**Goal**: `Alt+Shift+C` appends the selected text of the active tab as a clip, with feedback.

**Independent Test**: Select text on a page, press the shortcut, see the confirmation, repeat on a second page and confirm order (quickstart scenario 2).

### Tests for User Story 2

- [X] T019 [US2] Write failing tests in `tests/unit/clips.test.js` for `addClip(state, text)`: appends at the end, preserves earlier clips and the loaded file, assigns a unique `Clip.id`, rejects blank or over-limit `Clip.text` (data-model.md `Clip.id`, `Clip.text`)
- [X] T020 [P] [US2] Write failing tests in `tests/unit/outcome.test.js` for `resolveSelection(frameResults)`: returns the first non-blank frame text, `nothing-selected` when all results are empty or whitespace, `not-readable` when the script call failed, `too-large` when the text exceeds the clip limit (data-model.md `Clip.text`), and the message text for each outcome from [contracts/extension-surface.md](contracts/extension-surface.md)

### Implementation for User Story 2

- [X] T021 [US2] Implement `addClip` in `src/core/clips.js` using `validateClipText`; per data-model.md `Clip.id` (unique random UUID via `crypto.randomUUID()`) and `Clip.text` (makes T019 pass)
- [X] T022 [P] [US2] Implement `src/core/outcome.js` (`resolveSelection`, outcome messages) (makes T020 pass)
- [X] T023 [P] [US2] Create `src/background/selection.js`: a self-contained function (no imports, no DOM changes) returning `window.getSelection().toString()`, falling back to the selected range of a focused `<input>`/`<textarea>`
- [X] T024 [US2] In `src/background/background.js` handle `commands.onCommand` for `collect-selection`: run `scripting.executeScript` with `allFrames: true` and the function from T023 on the active tab, pass the results (or the failure) to `resolveSelection`, and on success add the clip via `mutate(addClip)`
- [X] T025 [US2] In `src/background/background.js` add feedback per the outcomes table in [contracts/extension-surface.md](contracts/extension-surface.md): `notifications.create` with the reason and a toolbar badge (`✓` or `!`) cleared after about 2 seconds, covering added, nothing selected, page not readable, too large, and storage failure
- [ ] T026 [US2] Manually verify quickstart.md scenario 2 in Firefox (including textarea, iframe and an `about:` page) and that the confirmation appears within 1 second of the key press (spec SC-001)

**Checkpoint**: Loading and collecting both work

---

## Phase 5: User Story 3 - Export original content plus new clips (Priority: P1)

**Goal**: Export a `.md` file with the original content unchanged followed by every clip.

**Independent Test**: Load a file, collect three clips, export, and compare the saved file with the expected content (quickstart scenario 3).

### Tests for User Story 3

- [X] T027 [P] [US3] Write failing tests in `tests/unit/document.test.js`: base content emitted unchanged (data-model.md `LoadedFile.content`), exactly one blank line before each clip whether or not the base ends with a newline, document of clips only, empty base, single trailing `\n`, multi-line and Markdown-character clips kept exactly (`Clip.text`), and `suggestExportName` (`notes.md` becomes `notes-updated.md`, no file becomes `copytodoc-export.md`)
- [X] T028 [US3] Write failing tests in `tests/unit/clips.test.js` for `clearClips(state, { clearFile })`: clears all clips, keeps the loaded file unless `clearFile` is true

### Implementation for User Story 3

- [X] T029 [P] [US3] Implement `composeDocument` and `suggestExportName` in `src/core/document.js` following the composition rules in data-model.md (makes T027 pass)
- [X] T030 [US3] Implement `clearClips` in `src/core/clips.js` (makes T028 pass) and add the `clearClips` operation to `src/background/background.js` using `mutate`
- [X] T031 [US3] In `src/manager/manager.js` add the Export action: refuse with a message when there are no clips, build a Blob from `composeDocument`, call `downloads.download({ url, filename, saveAs: true })`, revoke the object URL afterwards, and catch a rejected promise (user cancelled the dialog) by showing a "cancelled, nothing changed" message and leaving clips untouched
- [X] T032 [US3] In `src/manager/manager.js` watch `downloads.onChanged` for the started download: on `complete` ask "Clear clips now?" (default Yes) and send `clearClips` if confirmed; on `interrupted` show a message and leave clips untouched
- [ ] T033 [US3] Manually verify quickstart.md scenario 3 in Firefox (files with and without a trailing newline, cancelled dialog, empty export, original file unchanged)

**Checkpoint**: The full flow works: load, collect, export

---

## Phase 6: User Story 4 - Review and manage clips (Priority: P2)

**Goal**: See clips, remove one, start over.

**Independent Test**: Collect three clips, remove the middle one, start over (quickstart scenario 4).

### Tests for User Story 4

- [X] T034 [US4] Write failing tests in `tests/unit/clips.test.js` for `removeClip(state, id)`: removes only that `Clip.id`, order of the others kept, unknown id is a no-op, loaded file untouched (data-model.md `Clip.id`)

### Implementation for User Story 4

- [X] T035 [US4] Implement `removeClip` in `src/core/clips.js` (makes T034 pass)
- [X] T036 [US4] Add the `removeClip` operation to `src/background/background.js`; "Start over" reuses `clearClips` from T030
- [X] T037 [US4] In `src/manager/manager.js` and `manager.css` render the clip list in order, visually separate from the loaded file content, with a per-clip remove button and an empty state
- [X] T038 [US4] In `src/manager/manager.js` add "Start over" with confirmation and an option to also remove the loaded file
- [ ] T039 [US4] Manually verify quickstart.md scenarios 4 and 5 in Firefox

**Checkpoint**: All user stories work independently

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T040 [P] Add the shortcut hint to `src/manager/manager.html` pointing to Firefox's Manage Extension Shortcuts (FR-013, quickstart scenario 7)
- [X] T041 [P] Create `README.md`: purpose, `npm install`, `npm test`, `npm start`, how to sign as an unlisted add-on with `web-ext sign` and install the `.xpi` on release Firefox (macOS and Arch)
- [X] T042 Confirm all size-limit messages (5 MB file, 1 MB clip) are shown to the user and nothing is truncated silently
- [X] T043 Verify the privacy rules: search `src/` for `fetch(`, `XMLHttpRequest`, `WebSocket` and `http://`/`https://` URLs and confirm none exist; run `npm run lint` (`web-ext lint`) with no errors
- [ ] T044 Run `npm test` and the full quickstart.md on macOS and on Linux. Test persistence (scenario 6) with a **signed build installed in Firefox**, because a temporary add-on is removed on restart. Also run the offline check (scenario 8)

---

## Phase 8: Change request - show the manager in the toolbar popup

**Goal**: Clicking the toolbar button shows the manager in a popup instead of opening a tab.

- [X] T045 Update `manifest.json`: set `action.default_popup` to `src/manager/manager.html`; remove the `action.onClicked` handler and the tab open/focus code (and the now-unused `tabs` lookups) from `src/background/background.js`
- [X] T046 [P] Make `src/manager/manager.css` and `manager.html` fit a popup: fixed width (about 25rem), max height with scrolling for the clip list, compact `<dialog>` layout
- [X] T047 Update `README.md` usage text (popup instead of tab) and bump `manifest.json` `version` to 0.1.1
- [X] T048 Run `npm test` and `npm run lint`
- [ ] T049 Manually verify in Firefox (macOS and Linux): load a file, export through the save-as dialog, and the "Clear clips now?" prompt. Record which of these close the popup. Result so far: the file picker closes the popup (see T050); export still to check
- [X] T050 Fallback for loading: the popup's "Load file…" button opens `src/manager/manager.html#load` in a tab (file picker only, `tab-mode` hides the clip section), shows the keep/discard dialog if needed, then closes the tab after a successful load
- [X] T051 Restyle the manager page: card layout, clip count badge, primary/secondary/danger buttons, empty state, light and dark theme via `prefers-color-scheme`
- [X] T052 Export from the popup failed because the Blob URL died with the popup. Moved export to the background page (`exportDocument` and `ackExport` operations, Blob URL, `pendingExport` and `exportResult` keys in `store.js`); the popup shows the "Clear clips now?" prompt when it sees `exportResult`, including on its next open
- [ ] T053 Manually verify the new load flow, export, the clear prompt (also after closing and reopening the popup) and the styling in Firefox (macOS and Linux)

---

## Phase 9: Clip counter and source links (FR-017, FR-018)

- [X] T054 [P] Write failing tests in `tests/unit/clips.test.js` for `addClip(state, text, { url, title })`: stores `Clip.url` and `Clip.title` when valid, omits a missing or over-long `Clip.url`, collapses newlines and truncates `Clip.title` (data-model.md `Clip.url`, `Clip.title`), and `normalizeState` keeps string `url`/`title` and drops non-string ones
- [X] T055 [P] Write failing tests in `tests/unit/document.test.js` for `composeDocument(base, clips, { includeSources })`: link `[title](url)` after the clip only when the option is true and a `url` exists, URL used as link text without a title, escaping of `[`, `]`, `\` in the text and of spaces and parentheses in the URL, strings still accepted as clips
- [X] T056 Implement `Clip.url` and `Clip.title` handling in `src/core/clips.js` (`addClip` third argument, `normalizeState`) and the `includeSources` option in `src/core/document.js` (makes T054 and T055 pass)
- [X] T057 In `src/background/background.js` pass the active tab's `url` and `title` to `addClip`, and make `exportDocument` accept `includeSources`
- [X] T058 In `src/background/background.js` keep the toolbar badge equal to the clip count (empty at zero) on start-up and on every state change; the ✓ / ! confirmation overrides it for about 2 seconds and then the count is restored
- [X] T059 In `src/manager/manager.html`, `manager.css` and `manager.js` add the "Include source links" checkbox (unchecked by default, remembered between popup openings), send it with the export, and show each clip's source below its text
- [X] T060 Update `README.md` usage, run `npm test` and `npm run lint`
- [X] T061 Manually verify in Firefox: badge count after adding and removing clips, confirmation then count again, export with the box unchecked and checked, a page with no title

---

## Phase 10: Integration tests

**Approach (decided after a spike):** selenium-webdriver drives a real Firefox through geckodriver. Firefox's own Alt+Shift+C handler and the native save dialog cannot be driven by automation, so the tests build a temporary copy of the extension (the production files are untouched) that adds `host_permissions: ["<all_urls>"]` (stands in for the `activeTab` grant that the shortcut gives), a `test:collect` message that calls `collectSelection()`, and a wrapper that makes `downloads.download` use `saveAs: false` so the file lands in a temporary download folder. The extension page is opened in a tab via Firefox's browser (chrome) context, because WebDriver cannot navigate to `moz-extension://` URLs. The shortcut binding itself stays a manual check (T018).

- [X] T062 Add dev dependencies `selenium-webdriver` and `geckodriver`, an `npm run test:integration` script with `vitest.config.js` (unit only, used by `npm test`) and `vitest.integration.config.js` (Firefox required for the integration run)
- [X] T063 Create `tests/integration/helpers.js`: build the test copy of the extension into a temp dir, start a local HTTP page server, start Firefox (fixed extension UUID, temp download dir, `--allow-system-access`), install the add-on, open the manager page in a tab, and select text on the page
- [X] T064 [P] Write `tests/integration/collect.test.js`: collecting adds a clip with text, page title and URL; the popup shows the count; removing a clip and Start over update the list
- [X] T065 [P] Write `tests/integration/export.test.js`: load a `.md` file, collect two clips, export with and without "Include source links", and check the saved file content, that the original file is unchanged, and that the "Clear clips now?" prompt appears
- [X] T066 Update `README.md` (how to run integration tests), run `npm test`, `npm run test:integration` and `npm run lint`, then commit

---

## Phase 11: Edit, reorder, undo and right-click (FR-019 to FR-022)

**Order**: tests first (T067, T068), then core (T069), background (T070, T071), popup (T072), integration tests (T073), docs and checks (T074). T070 to T072 all touch shared files, so run them in order.

- [ ] T067 [P] Write failing tests in `tests/unit/clips.test.js` for pure functions `editClip(state, id, text)` (replaces only `text`; refuses blank, over 1 MB and unknown id; keeps id, url, title and position), `moveClip(state, id, direction)` (swaps with the neighbour; refuses past the ends and unknown id) and the undo helpers: `removeClip`, `editClip`, `moveClip` and `clearClips` each set `state.undo = { label, clips }` (and `loadedFile` when start over removes it), `undo(state)` restores and drops `undo` (refuses when absent), `addClip` and loading a file drop `undo` (data-model.md `UndoSnapshot`)
- [ ] T068 [P] Write failing test in `tests/unit/clips.test.js` that `normalizeState` keeps a well-formed `undo` and drops a malformed one
- [ ] T069 Implement T067 and T068 in `src/core/clips.js`
- [ ] T070 In `src/background/background.js` add the operations `editClip`, `moveClip` and `undo` through the serialized `mutate` queue, and make `removeClip`, `clearClips` and `loadFile` use the new undo rules
- [ ] T071 Add the context-menu item (`menus.create` on install with `contexts: ["selection"]`, `title: "Add selection to CopyToDoc"`, `onClicked` calling the shared `collectSelection(tab)`); change `collectSelection` to accept the tab it is given (shortcut: active tab). Add `"menus"` to `manifest.json` `permissions`
- [ ] T072 In `src/manager/manager.html`, `manager.css` and `manager.js`: per-clip Edit (inline textarea, Save, Cancel, error message on refusal), Up and Down buttons (disabled at the ends), and an "Undo <action>" button shown while `state.undo` exists
- [ ] T073 Extend `tests/integration/collect.test.js`: move a clip down and up, edit a clip, undo a remove, undo start over; check the order is used in the exported file. (The context menu cannot be driven by WebDriver; check it manually in T074.)
- [ ] T074 Update `README.md`, bump `manifest.json` version, run `npm test`, `npm run test:integration`, `npm run lint`; manually verify in Firefox: right-click item (appears only with a selection, adds the clip, badge and notification), edit, move, undo, and the add-on permission list; then commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none
- **Foundational (Phase 2)**: needs Setup, blocks all stories
- **US1, US2, US3, US4**: need Phase 2 only; no hard dependency between stories. They all edit `src/core/clips.js`, `background.js` and `manager.js`, so run them one after another in priority order (US1, US2, US3, US4) to avoid file conflicts.
- **Polish (Phase 7)**: after the stories you want to ship

### Task-level notes

- T007 depends on T006; T009 on T008; T011 on T009 and T010; T012 on T010
- T014 on T013; T021 on T019 and T007; T022 on T020; T024 on T021, T022, T023; T029 on T027; T030 on T028; T032 on T030 and T031; T035 on T034
- Within each story, the test task comes before its implementation task

### Parallel Opportunities

- Setup: T003, T004, T005 together
- Foundational: T006, T008, T010 can start together (different files); T012 after T010
- US2: T020 with T019 (different test files), then T022 and T023 together
- US3: T027 with T028 (different test files), then T029
- Polish: T040, T041 together

## Parallel Example: US2

```text
Task: "Write failing tests in tests/unit/outcome.test.js"   (T020)
Task: "Implement src/core/outcome.js"                       (T022)
Task: "Create src/background/selection.js"                  (T023)
```

## Implementation Strategy

### MVP first

1. Phase 1, then Phase 2
2. Phase 3 (US1), Phase 4 (US2), then Phase 5 (US3). The product is only useful once all three P1 stories work, so treat US1 to US3 as the MVP.
3. Stop and run quickstart scenarios 1 to 3 in real Firefox

### Incremental delivery

1. Setup and Foundational
2. US1 load, check
3. US2 collect, check
4. US3 export, check (usable MVP)
5. US4 manage, then Polish

## Notes

- Commit after each task or small group, and keep the constitution's rules in mind: no network, minimal permissions, never overwrite the user's original file
- Verify each unit test fails before implementing its function

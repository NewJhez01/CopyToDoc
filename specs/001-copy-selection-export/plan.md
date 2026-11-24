# Implementation Plan: Copy Selection to Markdown Export

**Branch**: `001-copy-selection-export` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-copy-selection-export/spec.md`

## Summary

A Firefox WebExtension (Manifest V3) that holds one loaded Markdown file plus a list of clips in
its own local storage. A keyboard command (default `Alt+Shift+C`) reads the current selection and
appends it as a clip. A management page, shown in the toolbar button's popup, loads a `.md` file,
lists and removes clips, and exports "original content + clips" through the browser's
save-as dialog. Every state change goes through the background page, which keeps the stored data
consistent. Everything is local; no native helper, no network, no runtime dependencies. See
[research.md](research.md) for the decisions behind this.

## Technical Context

**Language/Version**: JavaScript (ES2022 modules), no transpilation or bundler

**Primary Dependencies**: None at runtime. Dev only: `vitest` (unit tests), `web-ext` (run, lint, build, sign)

**Storage**: `browser.storage.local` (one `state` record, see [data-model.md](data-model.md))

**Testing**: Vitest for pure core logic; `web-ext lint` for the manifest; manual verification in real Firefox on each OS using [quickstart.md](quickstart.md)

**Target Platform**: Firefox 140+ desktop on macOS and Linux (Arch via pacman). Windows later.

**Project Type**: Browser extension (WebExtension, MV3)

**Performance Goals**: Clip confirmation within 1 s of the shortcut (SC-001); export of a 5 MB document without UI freeze

**Constraints**: Offline and local-only; minimal permissions; MUST NOT modify page DOM; loaded file max 5 MB, single clip max 1 MB (limits are shown to the user, never silent truncation)

**Scale/Scope**: One loaded file, up to a few thousand clips, three UI surfaces (command, manager popup, notifications)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How the plan satisfies it |
|-----------|--------|---------------------------|
| I. Privacy-first, local-only | PASS | No host permissions, no `fetch` or remote code, CSP restricted to `'self'`, `data_collection_permissions: none` |
| II. Minimal permissions | PASS (justified) | `storage`, `activeTab`, `scripting`, `downloads`, `notifications`, `menus`; each justified in [research.md](research.md). No host permissions. |
| III. Non-destructive writes | PASS | Original file is only read; export is a new file via save-as; clips cleared only after confirmed save; all failures notify the user |
| IV. Rebindable shortcut | PASS | Declared via `commands` with suggested key `Alt+Shift+C`; no key handling in content code |
| V. Simplicity & plain text | PASS | No native helper, no bundler, no runtime dependency, plain-text clips, `.md` output |

**Post-design re-check**: still PASS. No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-copy-selection-export/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── extension-surface.md
│   └── storage-schema.md
├── checklists/requirements.md
└── tasks.md              # created later by /speckit-tasks
```

### Source Code (repository root)

```text
manifest.json
package.json
src/
├── core/                     # pure functions, no browser APIs, unit-tested
│   ├── document.js           # composeDocument, suggestExportName
│   ├── clips.js              # addClip, removeClip, clearClips, setLoadedFile
│   ├── outcome.js            # resolveSelection: page result to outcome and message
│   └── validate.js           # file and clip validation (text check, size limits)
├── background/
│   ├── background.js         # command handler, serialized state updates, notifications
│   └── selection.js          # function injected into the page to read the selection
├── storage/
│   └── store.js              # thin wrapper around browser.storage.local
└── manager/
    ├── manager.html          # toolbar popup (action.default_popup)
    ├── manager.js
    └── manager.css
icons/
tests/
└── unit/
    ├── document.test.js
    ├── clips.test.js
    ├── outcome.test.js
    └── validate.test.js
```

**Structure Decision**: Single-project extension. Logic that can be wrong lives in `src/core`
as pure functions so it can be tested without a browser; the `background` and `manager` folders
only wire browser APIs to those functions. This is the platform-specific boundary the constitution
asks for: nothing in `core` depends on Firefox or the OS, so Windows support later is packaging
only.

## Complexity Tracking

No constitution violations. Table intentionally empty.

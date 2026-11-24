<!--
Sync Impact Report
Version change: 1.0.0 → 1.0.1 (PATCH: wording of Principles I and III aligned with the export-based design)
Modified principles: I (local storage allowed, still never leaves the device), III (original is only read, output is a new file)
Added sections: none
Removed sections: none
Deferred items: none
-->
<!-- Previous: 1.0.0 initial adoption -->
# CopyToDoc Constitution

## Core Principles

### I. Privacy-First, Local-Only (NON-NEGOTIABLE)
The extension MUST NOT make network requests, send telemetry, or transmit copied content
anywhere. Copied text MUST stay on the user's device: it MAY be kept in the extension's local
storage until the user discards it, and MUST only otherwise be written to files the user
explicitly saves.
Rationale: users copy arbitrary, possibly sensitive page content; trust depends on this guarantee.

### II. Minimal Permissions
The extension MUST request only the permissions required by a shipped feature. Every permission
in the manifest MUST be justified in the spec or plan. Broad host permissions MUST NOT be
requested when `activeTab` or equivalent narrower access suffices.
Rationale: smaller attack surface and easier store review.

### III. Predictable, Non-Destructive Writes
Saving a result MUST never overwrite or truncate the user's original file content: the original
is only read, and output goes to a new file the user names. Failure cases (no
target file selected, file missing or unwritable, nothing selected on the page) MUST give the
user visible feedback and MUST NOT silently lose or discard data.
Rationale: the user's document is the source of truth; data loss is the worst failure.

### IV. User Control & Rebindable Shortcut
The default shortcut is `Alt+Shift+C`, declared through the WebExtension `commands` key so users
can rebind it. The shortcut MUST NOT be hardcoded in content scripts. Defaults MUST NOT shadow
built-in Firefox shortcuts.
Rationale: avoids conflicts (e.g. Cmd/Ctrl+Shift+C opens DevTools) and respects user preference.

### V. Simplicity & Plain-Text Output
Output format is Markdown (`.md`). Features beyond select → shortcut → append MUST be justified
in a spec before being built (YAGNI). Complexity, such as any native helper process, MUST be
justified in the plan's complexity-tracking section.
Rationale: keeps the project small, testable and maintainable.

## Platform & Technical Constraints

- Target browser: Firefox. Supported platforms: macOS and Linux (including Firefox installed via
  pacman on Arch). Windows is out of scope until a spec adds it.
- Platform-specific code MUST be isolated behind a clear boundary so adding Windows later does
  not require rewriting core logic.
- Dependencies MUST be kept minimal; each added dependency MUST be justified in the plan.
- How the file is written (native messaging host vs. extension-managed export) is decided in
  `/speckit-clarify` and `/speckit-plan`, not here.

## Development Workflow

- Spec-driven order: specify → clarify → plan → tasks → analyze → implement. Code MUST trace
  back to a requirement in a spec.
- Core logic (formatting a clip, appending, error handling) MUST have automated tests. Tests for
  a behavior SHOULD be written before the implementation.
- Manual verification in real Firefox on each supported OS MUST be performed before a release.
- Specs describe what and why; technology choices belong in plans.

## Governance

This constitution supersedes other project practices. Amendments MUST be made by editing this
file with a changelog note in the Sync Impact Report, a version bump, and an update to any
affected specs or plans. Versioning follows semantic versioning: MAJOR for removed or redefined
principles, MINOR for added or materially expanded principles, PATCH for wording clarifications.
Each plan MUST include a constitution check, and reviews MUST verify compliance; violations
MUST be justified in writing or the design changed.

**Version**: 1.0.1 | **Ratified**: 2026-11-24 | **Last Amended**: 2026-11-24

# Contract: Extension Surface

User-facing and browser-facing interfaces of the extension.

## Manifest essentials

| Key | Value |
|-----|-------|
| `manifest_version` | 3 |
| `browser_specific_settings.gecko.id` | fixed add-on ID (required for stable storage and signing) |
| `browser_specific_settings.gecko.strict_min_version` | `140.0` |
| `browser_specific_settings.gecko.data_collection_permissions` | `{ "required": ["none"] }` |
| `permissions` | `storage`, `activeTab`, `scripting`, `downloads`, `notifications` |
| `host_permissions` | none |
| `background` | `{ "scripts": ["src/background/background.js"], "type": "module" }` |
| `action` | toolbar button with `default_popup` showing the manager page |
| `content_security_policy` | `script-src 'self'; object-src 'self'` |

## Keyboard command

| Name | Default | Behavior |
|------|---------|----------|
| `collect-selection` | `Alt+Shift+C` (rebindable in Firefox shortcut settings) | Read selection in active tab (all frames), append as clip, give feedback |

### Outcomes and feedback

| Situation | Result | Notification text (summary) |
|-----------|--------|-----------------------------|
| Non-blank selection | Clip appended | "Added to document (N clips)" + badge `✓` |
| No or whitespace selection | Nothing added | "Nothing selected" + badge `!` |
| Page not readable (e.g. `about:` pages) | Nothing added | "Can't read selection on this page" |
| Selection over 1 MB | Nothing added | "Selection too large (max 1 MB)" |
| Storage failure | Nothing added | "Could not save the clip" |

Badge clears after about 2 seconds.

## Manager page (shown in the toolbar popup)

| Control | Behavior | Spec |
|---------|----------|------|
| Load file | File picker for `.md`, `.markdown`, `.txt`; validates; shows name | FR-001, FR-002, FR-014 |
| Load with existing clips | Dialog: keep clips / discard clips / cancel; warns that discarding unexported clips loses them | Clarification 2 |
| Clip list | Clips in order, visually separate from loaded content; per-clip remove | FR-012 |
| Export | Save-as dialog with pre-filled `<name>-updated.md`; refused with message if no clips | FR-008 to FR-010 |
| After successful save | Prompt "Clear clips now?" default Yes | FR-011 |
| Start over | Confirm; clears clips, optionally the loaded file | FR-012 |
| Shortcut hint | Text pointing to Firefox's Manage Extension Shortcuts | FR-013 |

## Exported file format

Plain UTF-8 `.md`: the loaded content unchanged, then each clip preceded by a blank line
(see [data-model.md](../data-model.md) for exact rules), ending with one `\n`.

## Network

None. The extension performs no network requests and contains no remote code.

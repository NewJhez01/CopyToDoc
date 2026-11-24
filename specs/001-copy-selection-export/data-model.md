# Data Model: Copy Selection to Markdown Export

Stored as one record under the key `state` in `browser.storage.local` (see
[contracts/storage-schema.md](contracts/storage-schema.md)).

## Entities

### LoadedFile
The Markdown file the user loaded. Never changed after loading; replaced wholesale when a new file is loaded.

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Original file name, e.g. `notes.md`. Used for display and the export name. |
| `content` | string | Exact UTF-8 text at load time. Max 5 MB. Must not contain NUL or U+FFFD. |
| `loadedAt` | ISO-8601 string | When it was loaded (display only). |

`state.loadedFile` is `null` when nothing is loaded.

### Clip
One piece of selected text.

| Field | Type | Rules |
|-------|------|-------|
| `id` | string | Unique (random UUID); used for removal. |
| `text` | string | Exactly the selected text, plain, max 1 MB. Not blank (whitespace-only is rejected). |
| `url` | string, optional | Address of the page the text came from (top-level tab). Max 2048 characters; omitted if missing or longer. Stored locally only. |
| `title` | string, optional | Page title. Newlines collapsed to spaces, max 300 characters. Used as the link text; the URL is used if there is no title. |

Position is the array index in `state.clips`; new clips are appended at the end (FR-003, FR-005).

### UndoSnapshot
`state.undo`, optional. One level only.

| Field | Type | Rules |
|-------|------|-------|
| `label` | string | Short action name shown on the button: `remove`, `edit`, `move`, `start over`, `clear`. |
| `clips` | Clip[] | The clips as they were before the action. |
| `loadedFile` | LoadedFile or null, optional | Present only when the action removed the loaded file (start over with the file box ticked). |

Set by remove, edit, move, start over and clear; removed by undo, by adding a clip and by loading a file.

### Document (derived, not stored)
`composeDocument(loadedFile?.content ?? "", clips, { includeSources })`. Rules:
- Base content is emitted unchanged.
- Each clip is preceded by enough line breaks to leave one blank line after the previous content.
- With `includeSources` true and a clip that has a `url`, a blank line and the link `[title](url)` follow the clip text. In the link text `\`, `[` and `]` are escaped; in the URL spaces, `(`, `)`, `<` and `>` are percent-encoded. Clips without a `url` get no link.
- A single trailing `\n` follows the last clip (or its link).
- With zero clips the result equals the base content (but export is refused, see below).

### Export (transient)
A Blob created from the Document at click time, saved as a new file. Suggested name:
`<loaded name without extension>-updated.md`, or `copytodoc-export.md` if no file is loaded.

## State and transitions

| Action | Precondition | Effect |
|--------|--------------|--------|
| Add clip | Non-blank selection, size OK | Append clip. Removes `undo`. |
| Remove clip | Clip exists | Remove only that clip. Loaded content cannot be removed this way. Sets `undo`. |
| Edit clip | Clip exists; new text non-blank and at most 1 MB | Replace `text` only (`id`, `url`, `title`, position unchanged). Sets `undo`. |
| Move clip | Clip exists; target position inside the list | Swap with the neighbour above or below. Sets `undo`. |
| Undo | `undo` present | Restore `clips` (and `loadedFile` if present in the snapshot), then remove `undo`. |
| Load file | Valid text file within limit | Set `loadedFile` and remove `undo`. If clips exist, the user chooses keep (clips stay, now after the new content) or discard; cancel changes nothing. |
| Export | At least one clip | Save Document. On confirmed save, ask "Clear clips now?" (default Yes). |
| Start over | User confirms | Clear all clips; optionally clear `loadedFile`. Sets `undo`. |

## Validation summary

| Rule | Source |
|------|--------|
| Reject blank selection | FR-007, edge cases |
| Reject non-text file, size over limit | FR-014, edge cases |
| Refuse export with no clips | Story 3, scenario 2 |
| Clear clips only after confirmed save | FR-011 |

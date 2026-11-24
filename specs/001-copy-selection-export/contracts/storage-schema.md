# Contract: Storage Schema

Single key `state` in `browser.storage.local`. **All writes go through the background page**: the
manager page sends named operations (`loadFile`, `removeClip`, `clearClips`) by message, and the
background page applies them through its single serialized queue, so a clip added by the shortcut
can never be lost to a simultaneous change. The manager page only reads state (via
`src/storage/store.js`) and refreshes on `storage.onChanged`.

```json
{
  "version": 1,
  "loadedFile": {
    "name": "notes.md",
    "content": "# Notes\n...",
    "loadedAt": "2026-11-24T10:30:00.000Z"
  },
  "clips": [
    { "id": "7b1f6c0e-...", "text": "first selected text", "url": "https://example.com/a", "title": "Example A" },
    { "id": "c3d2a9f4-...", "text": "second selected text" }
  ]
}
```

## Rules

- `version` is `1`; any future shape change increments it and adds a migration.
- `loadedFile` may be `null`.
- `clips` is always an array, possibly empty; order is the document order.
- Missing `state` is treated as `{ version: 1, loadedFile: null, clips: [] }`.
- All writes read-modify-write the whole record through a single serialized queue in the
  background page. The manager page never writes directly and reacts to `storage.onChanged`.
- Size limits: `loadedFile.content` ≤ 5 MB, each `clips[].text` ≤ 1 MB.
- Two small bookkeeping keys, written only by the background page: `pendingExport` (id of the
  download in progress) and `exportResult` (`"complete"` or `"interrupted"`, removed by the
  `ackExport` operation after the popup has shown it).

# CopyToDoc

Firefox extension (macOS and Linux). Load a Markdown file, press **Alt+Shift+C** on any page to collect the selected text as a clip, then export the original content plus all clips as a new `.md` file. Everything stays local; the extension makes no network requests.

## Develop

```sh
npm install
npm test        # unit tests
npm run lint    # web-ext lint
npm start       # run in a temporary Firefox profile (removed on restart)
```

## Install permanently (release Firefox, macOS or Arch)

Release Firefox only keeps signed extensions. Sign as an unlisted add-on:

```sh
npx web-ext sign --channel=unlisted --api-key=<JWT issuer> --api-secret=<JWT secret>
```

Get the keys at https://addons.mozilla.org/developers/addon/api/key/. Then open the generated `.xpi` in Firefox. Change the `gecko.id` in `manifest.json` first if you want your own ID.

## Usage

1. Click the toolbar button to open the CopyToDoc popup. **Load file…** opens a small tab with the file picker (Firefox closes popups when a picker opens) and closes it after loading. Accepts a `.md`, `.markdown` or `.txt` file (max 5 MB).
2. Select text on a page and press Alt+Shift+C (rebind under `about:addons` → gear → Manage Extension Shortcuts).
3. In the popup choose **Export…**; the saved name defaults to `<name>-updated.md`.

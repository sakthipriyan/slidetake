# Slidetake plan

Markdown to finished video: a spatial deck that records itself, take by take. The lineage it continues: reveal.js (slides in the browser) → Slidev (slides as code) → Slidetake (the deck directs the video).

*Status as of 0.4.0 (31 October 2026).* ✅ done · 🟡 partly · ⬜ not started.

## Two views on one core

The **core** is shared: parsing (headings, `+++`, reveal.js), layouts, camera moves, fragments and rendering.

| | Studio | Embed (for hugo-continuum and any site) |
|---|---|---|
| Lives at | slidetake.com, or `npx slidetake` locally | Inside a page: `window.SLIDETAKE = {markdown, settings, …}` and `slidetake.js` |
| Has | Editor, four layouts, minimap, keys, **● Studio**: record in the browser (easy mode) or with OBS (pro mode), takes, Preview, Download, Chapters, the ffmpeg cut | The deck, read-only: layouts, light/dark, Keys, Fullscreen, a progress bar |
| Theme | Its own palette, or the deck's `accent:` | The site's colours (`colors`, `themeKey`) |
| Recording | ● Studio (or R) | None: a viewer only. Record the same markdown on slidetake.com or with `npx slidetake` |
| Size | Full app | The same app (`dist/slidetake.js`, about 230 KB); ECharts, Viz.js, D2, OBS and recording code load only when used |

## Phases

### 1. Restructure the repo
- ✅ The single file split into `src/`: the HTML shell, styles, the app, and pure `core/` modules (parsing, camera steps, takes → cut → chapters → ffmpeg, loudness, the take board, text helpers).
- ✅ esbuild builds a single-file `dist/index.html`, still with no install needed to *use* it.
- ✅ Types for the deck model (JSDoc, checked by TypeScript) and tests (`node --test`) for the pure core.
- ✅ Decks in `examples/` as fixtures.
- ⬜ Carve the stateful app (`src/app.js`, about 3,500 lines) into `core/` (layout, camera, render) and `studio/` (editor, recording, Studio) modules.

### 2. Embed view and the Hugo integration
- 🟡 The embed: `window.SLIDETAKE = {markdown, settings, base, trail, themeKey, colors}` before `slidetake.js`. Not done: a `Slidetake.mount(el, …)` call and an auto-mounting `<div class="slidetake">`, for several decks on one page or a deck inside an article.
- ✅ hugo-continuum: a slides layout for decks with `engine: slidetake`, handing the page's markdown to the embed, with a pinned copy of `slidetake.js` checked against its npm release.
- ✅ The three decks on sakthipriyan.com moved over.

### 3. Hosted Studio at slidetake.com
- ✅ An assets-only Cloudflare Worker on slidetake.com; any path serves the app, so short links need no redirect rules.
- ✅ `/gh/owner/repo[@ref]/path` and `/gist/<id>` short links, `?src=` for any URL; ⇣ Load turns pasted GitHub and gist page links into those; Share (never with `?obs=`); the landing deck; favicon, link previews.
- ✅ Released from a version tag only: the tag publishes to npm, then deploys the site with that release's app.

### 4. npm and `npx slidetake`
- ✅ `npm i slidetake`: `dist/slidetake.js` (the embed) and `dist/index.html` (the whole app), published with provenance.
- ✅ `npx slidetake deck.md` serves the deck's folder locally: local images, reload on save, edits saved to the file.

### 5. Polish (ongoing)
- ✅ Docs, Features, Showcase and Privacy decks, `llms.txt` for AI tools, versioned releases with a changelog.
- ✅ A browser-based recorder, no OBS needed: easy mode, shipped in 0.4.0.
- 🟡 Themes: a deck's `accent:`, `brand:` and `logo:`, and the site's colours when embedded; no theme presets beyond that.
- ⬜ An example gallery of real decks.
- ⬜ Code highlighting (highlight.js, in the deck's colours).
- ⬜ Easy mode in Safari and Firefox, a constant frame rate, and saving next to the deck under `npx slidetake`.
- ⬜ Portrait recording, for Shorts and Reels.
- ⬜ Download for pro mode: cut the OBS recording in the browser, so ffmpeg isn't needed.
- ⬜ YouTube info cards and end screens.

## Recording from the hosted site

- Easy mode needs nothing else: the deck records itself in Chrome, Edge and other Chromium browsers.
- Pro mode: OBS on the same computer, reached at `localhost`; browsers let a secure page talk to it.

## Decks: read-only sources, one working copy

Every deck opened is read-only: home `/`, the docs, templates from `/new`, GitHub `/gh/…`, gists `/gist/…`, `?src=` URLs and shared links `/share#deflate:…`. Typing in one forks it, silently with a toast, into the working copy at `/edit`, kept in the browser with its origin (`src/core/doc.js`). One copy at a time; replacing one with unsaved edits asks first. Save (a file) and Share (a link) clear the *edited* mark; Reset to original goes back to the origin.

## Decisions so far

- Name: **Slidetake** (Traverse → Markcast → Slidetake). Repo: github.com/slidetake/slidetake (the slidetake organization; moved from sakthipriyan/slidetake, which redirects), public, Apache 2.0.
- Recording lives in Studio, on slidetake.com and `npx slidetake`: ● Studio, in easy mode (the browser) or pro mode (OBS, also from `?obs=host:port[:password]`). Embedded decks are viewers only.
- Plain JavaScript (no Rust/Wasm): the work is DOM, CSS, animation and browser APIs.
- Domain: slidetake.com, registered at Spaceship, DNS on Cloudflare.
- One release path: a version tag publishes to npm and deploys slidetake.com from that release; merging deploys nothing.

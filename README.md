# Slidetake

Markdown in, a spatial deck and a finished video out.

Slidetake turns a markdown file into a deck you move through like a map, and, when you are recording, drives the camera and OBS from the deck itself: every slide is a take, a slide spoken badly is retaken on the spot, and at the end you get a frame-exact ffmpeg cut and the YouTube chapters.

The built app is a single HTML file, [`dist/index.html`](dist/index.html): open it, copy it or host it anywhere. Every feature: [slidetake.com/features](https://slidetake.com/features); step by step: [slidetake.com/docs](https://slidetake.com/docs).

## Three places to use it

| Where | What it's for |
|---|---|
| **slidetake.com** | write in the editor, view a deck from a GitHub file, gist or URL, and share a link with the deck inside it |
| **Your computer** | the same with `npx slidetake deck.md`: your files and the images beside them, offline, reloading as you save, so an AI agent can write `deck.md` while you watch ([llms.txt](https://slidetake.com/llms.txt) tells it how) |
| **Your website** | `slidetake.js` on your pages ([below](#embed-in-a-site)): a viewer for your readers, in your site's colours; the hugo-continuum theme does it for `engine: slidetake` |

### On your computer

```sh
npx slidetake deck.md          # or a folder: its index.md, deck.md, slides.md or README.md
```

Opens on `http://localhost:4300` (`--port` to change, `--open` to open the browser). Files next to the deck are served beside it, so `![](diagram.png)` works. Saving the file reloads the deck where you are; typing in the browser's editor saves to the file. Node 20+.

## Examples

[`examples/`](examples) holds the decks to look at and start from: [`showcase.md`](examples/showcase.md) has everything a card can hold (steps, Graphviz, D2, SVG, ECharts, images, galleries, YouTube, camera) and is what [slidetake.com/showcase](https://slidetake.com/showcase) shows; the starter templates sit beside it.

## Develop Slidetake

`npm run dev` builds, rebuilds on change and serves the site at `http://localhost:8787` (Cloudflare's local runtime, with slidetake.com's routes). Or serve the repo statically:

```sh
python3 -m http.server 8765
```

Then open:

- `http://localhost:8765/dist/` for the sample deck and the editor
- `http://localhost:8765/dist/?src=https://…/deck.md` for a deck on the web, including GitHub raw URLs (relative images load from next to it)
- `?edit=0` hides the editor, `?layout=focus|path|radial|tree` picks the layout, `?mode=light` the light theme

## Open a deck from a link

On [slidetake.com](https://slidetake.com), press **✎ Editor**, then **⇣ Load**, and paste a GitHub file or folder link, a gist, or any URL that lets other sites read it. Or link straight to it:

```
https://slidetake.com/gh/owner/repo/path/deck.md          a file on GitHub (default branch)
https://slidetake.com/gh/owner/repo@branch/path/deck.md   another branch or tag
https://slidetake.com/gist/<id>                           a gist
https://slidetake.com/?src=https://…/deck.md              anything else
```

**Share** copies the short link to the deck and slide you're on (never the OBS address).

Every deck you open is read-only. Typing in one makes **your copy** at `/edit`, kept in this browser and marked *edited* until you **Save** (a .md file) or **Share** it. A changed deck is shared inside the link itself, like edotor.net: `https://slidetake.com/share#deflate:<compressed markdown>`, never sent to a server. **Reset to original** goes back to the deck you started from, and `/new` starts from a template.

For AI tools: the guide is plain markdown at [slidetake.com/docs.md](https://slidetake.com/docs.md), indexed by [llms.txt](https://slidetake.com/llms.txt).

## Recording

**● Studio** (R), beside ✎ Editor in the header, opens Slidetake Studio: record in the browser or with OBS, review the takes, download the video. The bottom bar has **Keys** (K), **Camera** (C) and **Fullscreen** (F), each lit while it's on. The camera is off until someone turns it on, and until then the deck's camera settings are ignored, so the same deck works for readers.

For OBS, Studio's ⚙ Setup asks where OBS is, or fill it in from the address (the same format the reveal.js slides use):

```
?obs=localhost:4455
?obs=192.168.1.10:4455:password
```

In Chrome, Edge and other Chromium browsers the deck records itself, nothing to install: slides and camera in a 16:9 frame, one file per take, and ↓ Download joins the picked takes into an MP4. In any browser, [OBS Studio](https://obsproject.com) (free, with its WebSocket server on) can record while Slidetake drives it; Setup checks the screen is 16:9, so the video fits YouTube without bars.

Recording is on slidetake.com and `npx slidetake`; decks embedded with `slidetake.js` are view-only.

OBS runs on the same computer as the deck (`localhost`).

## Decks

Plain markdown (each heading is a card), the older `+++` format, and reveal.js decks (`---` and `--` separators) all open as they are. The docs are themselves a deck: [slidetake.com/docs](https://slidetake.com/docs) ([src/docs.md](src/docs.md)). In the app, `K` or `?` shows the keys.

## Embed in a site

`dist/slidetake.js` is the same app as one script for other sites' pages. Describe the deck, then load it:

```html
<script>
window.SLIDETAKE = {
  markdown: "# My deck\n\n## A section\n…",          // the deck, without its frontmatter
  settings: {title: "My deck", duration: "10m"},      // the frontmatter as data
  base: location.href,                                // where relative images resolve
  trail: [{label: "My site", url: "/"},               // the header: the site, down to the deck's section
          {label: "Talks", url: "/talks/"}],
  themeKey: "my-site-theme",                          // optional: the site's light/dark/auto key
  colors: {                                           // optional: the site's colours instead of Slidetake's green
    light: {accent: "#7a5c12", line: "#f5c542", header: "linear-gradient(135deg,#f5c542,#d4af37)", headerText: "#1a1408"},
    dark:  {accent: "#e0b024", line: "#966f04"}
  },
  recording: false                                    // optional: true brings back ● Studio, for your own preview
};
</script>
<script src="https://cdn.jsdelivr.net/npm/slidetake@0.4.3/dist/slidetake.js"></script>
```

`colors` takes any CSS colour per token, for both modes or under `light` / `dark`: `accent` (text and the current slide), `accentSoft` (smaller headings), `line` (borders and the active path), `ring` (the current slide's outline), `header` and `headerText` (a band of colour behind the header). A deck can also set its own with `accent:` in its top block.

Load it from npm through a CDN (pin the version, as above), or copy `dist/slidetake.js` into your site, or `npm install slidetake` and serve `node_modules/slidetake/dist/slidetake.js`.

The page then shows that deck as a viewer: read-only, with no editor, camera or Studio, and no bottom bar. The header carries Slidetake, the layouts, light/dark, Keys and Fullscreen. See [examples/embed.html](examples/embed.html); the [hugo-continuum](https://github.com/sakthipriyan/hugo-continuum) theme uses it for slide pages with `engine: slidetake`.

To record a video of an embedded deck, open its markdown on slidetake.com or with `npx slidetake`, or set `recording: true` on a page only you see, such as your site's local preview: the page gets ● Studio, Camera and the bottom bar, as on slidetake.com. hugo-continuum does this under `hugo server`, so the live site stays a viewer. `accent:`, `brand:` and `logo:` in a deck's top block give the video your site's look.

## Develop

```sh
npm install
npm run dev        # http://127.0.0.1:8787, rebuilt on every change in src/, served like slidetake.com
npm run check      # type check, tests, build
```

| Path | What |
|---|---|
| `src/index.html`, `src/styles.css` | The page shell and styles |
| `src/app.js` | The app: layouts, camera, presenting, recording, review |
| `src/embed.js` | The entry for `dist/slidetake.js`, the app for other sites' pages |
| `src/core/` | Pure modules with types and tests: parsing, camera steps, takes → cut → chapters → ffmpeg |
| `test/` | `node --test` tests for `src/core/` |
| `examples/` | Decks used as fixtures |

`dist/index.html` is committed so the app works straight from the repo; rebuild it with `npm run build` before committing.

Two workflows. **Check PR** runs on every pull request: the changelog check, `npm run check` and `wrangler deploy --dry-run`. **Publish** runs on a version tag on `main` (`v0.4.0`, matching `package.json`, with a `## [0.4.0]` changelog section): it publishes the package to npm, waits until npm serves it, then deploys [slidetake.com](https://slidetake.com) as an assets-only Cloudflare Worker (`wrangler.jsonc`) with the app taken from that npm release, and creates the GitHub release. Merging to `main` deploys nothing, so the site and the package are always the same release. Run **Publish** by hand (Actions → Publish → Run workflow) to only redeploy the site for a released version, the latest on npm unless you give one: to retry a deploy or roll back. Nothing is published then.

## Status

Released and in use: see [docs/PLAN.md](docs/PLAN.md) for what's done and what's next.

## License

Apache License 2.0. See [LICENSE](LICENSE).

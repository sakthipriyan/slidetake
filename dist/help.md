---
title: Slidetake Docs
description: "How to use Slidetake, step by step: get started, write a deck, present it, record a video in the browser or with OBS, and share it."
brand: slidetake
pip: none
---

# ![](/favicon.svg) Slide<span class="st-take">take</span> Docs

Everything in order: **get started → write → present → record → share**. Press → to walk it, ↓ ↑ to go into a step and back out, **O** for the map.

## 1️⃣ Get started

Three places to use Slidetake, one deck format for all of them: a markdown file. And any AI can write the deck.

| Where | Best for |
|---|---|
| **slidetake.com** | writing in the Editor, viewing any deck from a link, sharing |
| **Your computer** | the same on your own files and images, offline, with an AI agent writing alongside |
| **Your website** | decks your readers view |

### On slidetake.com

Open a deck straight from a link: a GitHub file, a gist or any markdown URL. Or press **✎ Editor** and type: the first keystroke makes it [your copy](#your-copy), kept in this browser.

| Link | Opens |
|---|---|
| `/gh/owner/repo/path/deck.md` | a GitHub file, default branch |
| `/gh/owner/repo@branch/deck.md` | another branch or tag |
| `/gist/<id>` | a gist's first markdown file |
| `/?src=https://…/deck.md` | anything else |
| `/new` | a template: blank, talk or recording |

### On your computer

Keep the deck and its images together in a folder, and run one command there:

```sh
npx slidetake deck.md
```

It opens on `http://localhost:4300` with the files next to the deck served beside it, so `![](diagram.png)` just works. Save the file in any editor and the deck reloads where you are; type in the browser's editor and it saves to the file. Nothing leaves your machine. Needs Node 20 or later.

`npx slidetake` in a folder opens its `index.md`, `deck.md`, `slides.md` or `README.md`. `--open` opens the browser; `--port 5000` picks the port.

### On your website

`slidetake.js` turns a deck on any page into a Slidetake deck. Describe the deck, then load the script:

```html
<script>
window.SLIDETAKE = {
  markdown: "# My deck\n\n## A section",
  settings: {title: "My deck"},
  base: location.href,         // for images
  trail: [{label: "My site", url: "/"}],
  themeKey: "my-theme",        // your light/dark key
  colors: {accent: "#2563eb"}  // your colours
};
</script>
<script src="https://cdn.jsdelivr.net/npm/slidetake/dist/slidetake.js"></script>
```

A viewer for your readers. To record, open the deck's markdown here or with `npx slidetake`, or add `recording: true` on a page only you see, such as your site's local preview. The hugo-continuum theme writes this for pages with `engine: slidetake`, with recording under `hugo server`.

### With AI

Any AI can write a deck: point it at [slidetake.com/llms.txt](/llms.txt) and say what the talk is about.

- **An agent** (Claude Code and the like): *"Write a Slidetake deck about X in talk/deck.md, following slidetake.com/llms.txt"*, then `npx slidetake talk/deck.md`. The deck reloads as it edits.
- **A chat**: ask for one markdown block, then paste it into **✎ Editor** here.
- **Images**: beside the file for an agent; full URLs in a chat.

### A prompt to copy

Paste this into any AI and change the first line:

```text
Write a Slidetake deck about <topic>, a 10-minute talk.
Follow https://slidetake.com/llms.txt.
A # title card, then 4–6 ## sections of 1–3 ### cards.
<!-- steps --> before lists; a ```dot or ```d2 diagram
where a picture helps. Reply with one markdown block.
```

## 2️⃣ Write a deck

A deck is an ordinary markdown file. **Every heading becomes a card**, and a heading branches off the nearest shallower heading above it.

```md
# Product          ← the first card
Intro text.

## Pricing         ← from Product
### Enterprise     ← from Pricing
## Roadmap {#plan} ← from Product, id "plan"

See the [roadmap](#plan).
```

### Cards

- Text before the first heading becomes a card of its own.
- Headings inside fenced code blocks are ignored.
- A card's id is its heading slugified (`## Moving around` → `moving-around`), or set one with `{#id}` at the end of the heading.
- A link to `#id` flies to that card.
- Cards widen for wide tables, columns, diagrams and embeds; anything wider still is scaled to fit.

### What a card can hold

Plain markdown, and the layout follows from what's on the card. [See every one in the showcase →](/showcase)

| Write | Get |
|---|---|
| `<!-- steps -->` | what follows, one press each, to the end of the card or a `<!-- steps: off -->` |
| ` ```dot `, ` ```d2 ` | a Graphviz or D2 diagram, in the deck's colours |
| ` ```echarts ` with JSON options | a chart, in the deck's colours |
| ` ```svg ` | an SVG drawing: `currentColor` and `var(--text)`, `var(--accent)` follow dark and light |
| a YouTube link alone on a line | the video: the next press plays it |
| `<!-- view: full -->` | a 16:9 card for a big image |

The first and last cards animate in on their own.

### Images

The layout follows from where the images are. The alt text is the caption.

| Write | Get |
|---|---|
| an image alone | an image card, laid out by its shape: phone, landscape or 16:9 |
| an image and text | a split card, the image on the side written first |
| a list of images, diagrams or charts | a gallery; after `<!-- steps -->`, a carousel |
| images in one paragraph | a grid, up to four a row |
| `![](drawing.svg)` | an SVG image, as drawn |

### Deck settings

An optional block at the top of the file:

```yaml
---
title: My talk        ← page and video title
duration: 10m         ← for the timer
accent: "#3b82f6"     ← the deck's colour
mode: light           ← open in light mode
brand: example.com    ← top-right corner text
brand_style: chip     ← the brand as a pill
logo: https://…/l.png ← image beside it
base: https://…/deck/ ← where images live
site: https://…/      ← where /images live
---
```

`accent` is one colour; Slidetake makes it bright for dark mode and deep enough to read on white for light mode, and uses it for text accents, lines, charts and diagrams. Camera and recording settings are in [step 4](#4-record-a-video).

### Decks from elsewhere

**reveal.js** decks open as they are: `---` starts a slide and `--` a vertical one beneath it. Fragments (`fade-up`, `grow`, …), `r-stack`, `<!-- .element: … -->`, `<section>` slides, `data-autoslide`, `data-gsap` entrances and `title-scramble` all work.

**Older `+++` decks**, with `id`, `parent`, `x`, `y` frontmatter, still load.

## 3️⃣ Present

Click a card to fly to it. Drag to pan; scroll or pinch to zoom. On a touch screen, the bottom bar adds ← → buttons.

| Key | Does |
|---|---|
| → ← Space | next / previous step, in document order (PgDn and PgUp too: what clickers send) |
| Home End | first / last slide |
| ↓ ↑ | first child / parent |
| O | the whole map; **O** again or Esc goes back |
| F | fullscreen; **F** again or Esc leaves |
| K or ? | these keys; again closes them |
| 1 2 3 4 | focus, path, radial, tree |
| + − | bigger / smaller slides (remembered) |
| E · L | editor · light / dark |
| C · V · R | camera · camera layouts · Studio (record) |

### Layouts

**Focus** doesn't travel at all: the next slide fades in where the last one was.

**Path**, the default, is made for presenting and video: a staircase in presenting order. Each section is a row, and the next one starts just below where the last ended, so every move is a short step right or down.

**Radial** rings out from the first card, and **tree** is a top-down chart.

The layout you pick is remembered in this browser, for every deck.

### On screen

Text keeps one size within a section and only changes when the section does; charts and diagrams are fitted on their own.

`<!-- view: overview -->` on a slide pulls back to the whole map for a beat before flying in: a good start to a chapter.

### Progress and timer

In fullscreen the cursor and controls hide after two seconds without the mouse moving, and a thin bar along the bottom fills with every press.

With `duration: 10m` (or `90s`, `1h`, `12:30`), a lighter layer of the same colour grows behind it with the clock: if it shows past the solid fill, you're behind; if it reaches the end, the bar pulses. The timer is for you, so recordings show progress only, unless the deck says `timer: always`. `progress: off` hides the bar.

## 4️⃣ Record a video

Two modes, both slide by slide, so there's no timeline to edit afterwards. **● Studio** (beside ✎ Editor, or **R**) opens **Slidetake Studio** in the mode you used last; ⚙ Setup switches between them.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 330" font-family="IBM Plex Sans, system-ui, sans-serif">
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>

  <!-- lanes -->
  <rect x="10" y="20" width="940" height="140" rx="18" style="fill:var(--accent);fill-opacity:.04"/>
  <rect x="10" y="176" width="940" height="140" rx="18" style="fill:var(--accent);fill-opacity:.04"/>
  <text x="30" y="80" font-size="20" font-weight="700" style="fill:var(--accent)">Easy mode</text>
  <text x="30" y="104" font-size="13" style="fill:var(--text-muted)">needs nothing</text>
  <text x="30" y="122" font-size="13" style="fill:var(--text-muted)">to install</text>
  <text x="30" y="236" font-size="20" font-weight="700" style="fill:var(--accent)">Pro mode</text>
  <text x="30" y="260" font-size="13" style="fill:var(--text-muted)">needs OBS</text>
  <text x="30" y="278" font-size="13" style="fill:var(--text-muted)">and ffmpeg</text>

  <g font-size="15" font-weight="600" text-anchor="middle" fill="currentColor">
    <rect x="180" y="50" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="255" y="84">Chrome or Edge</text>
    <rect x="374" y="50" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="449" y="84">records the</text><text x="449" y="104">16:9 frame</text>
    <rect x="568" y="50" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="643" y="84">takes kept</text><text x="643" y="104">in the browser</text>
    <rect x="762" y="50" width="150" height="80" rx="14" style="fill:var(--node-bg)"/>
    <rect x="762" y="50" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2"/>
    <text x="837" y="84">↓ Download</text><text x="837" y="104" font-weight="400" font-size="13" style="fill:var(--text-muted)">one MP4</text>

    <rect x="180" y="206" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="255" y="240">any browser</text><text x="255" y="260" font-weight="400" font-size="13" style="fill:var(--text-muted)">Safari, Firefox too</text>
    <rect x="374" y="206" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="449" y="240">OBS records</text><text x="449" y="260">the screen</text>
    <rect x="568" y="206" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="643" y="240">one recording,</text><text x="643" y="260">every take in it</text>
    <rect x="762" y="206" width="150" height="80" rx="14" style="fill:var(--node-bg)"/>
    <rect x="762" y="206" width="150" height="80" rx="14" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2"/>
    <text x="837" y="240">⧉ ffmpeg</text><text x="837" y="260" font-weight="400" font-size="13" style="fill:var(--text-muted)">the frame-exact cut</text>
  </g>
  <g fill="none" style="stroke:var(--accent)" stroke-width="2.5" marker-end="url(#head)">
    <path d="M332 90 H372"/><path d="M526 90 H566"/><path d="M720 90 H760"/>
    <path d="M332 246 H372"/><path d="M526 246 H566"/><path d="M720 246 H760"/>
  </g>
</svg>
```

### Which mode?

| | Easy mode: in the browser | Pro mode: with OBS |
|---|---|---|
| Install | nothing | [OBS Studio](https://obsproject.com) and [ffmpeg](https://ffmpeg.org), both free; a virtual display if your screen isn't 16:9 |
| Browser | Chrome, Edge or another Chromium browser | any: Safari and Firefox too |
| Screen | any shape: the deck is recorded in a 16:9 frame | a 16:9 screen, physical or virtual |
| Quality | 1080p, or 720p on a smaller screen | whatever OBS records |
| Final video | **Download** joins the picked takes, in the browser | an ffmpeg command |

### Easy mode: record in the browser

**● Studio** shows every slide of the deck, with every take of it from every recording.

1. **⚙ Setup**, the first time: pick your camera (or **No camera**) and microphone. ● Record turns the camera on and off by itself.
2. **● Record**, and share **this tab** when the browser asks. Only the 16:9 frame is recorded: slides and camera.

For 1080p the frame needs 1920×1080 real pixels (a Retina laptop has them); 1280×720 makes 720p. Smaller: use pro mode.

### Retake slides later

Tick slides (shift-click for a range): **● Record** records just those, then stops.

A take starts with the move in from the slide before it. So when you edit a slide, its takes and the next slide's are marked *outdated*: kept, but not picked until you record them again.

To drop a slide, delete it, then record the slide after it again.

### Takes stay in this browser

Each take is a file in this browser's private storage until you purge it, in ⚙ Setup → Files:

| Purge | Removes |
|---|---|
| **Unused takes** | takes the video doesn't use |
| **All takes** | this deck's takes |
| **Every deck's takes…** | everything Slidetake keeps here; it says how much first |

### Pro mode: set up OBS

1. In OBS: Tools → WebSocket Server Settings, turn it on.
2. In **● Studio**: **⚙ Setup → Use pro mode (OBS)**, enter host, port and password, then **Connect**. Tick *Remember*.
3. Present on a 16:9 screen, physical or virtual (say 1920×1080). Setup checks it.

Studio opens in the mode you used last. The line beside ⚙ Setup shows what a take uses: `Pro · OBS · 1080p · camera`.

### A 16:9 screen

YouTube is 16:9. If your screen isn't (a MacBook is 16:10, an ultrawide 21:9), add a virtual 1920×1080 display, present there with **F**, and point OBS at it:

| System | Virtual display |
|---|---|
| macOS | [BetterDisplay](https://github.com/waydabber/BetterDisplay) |
| Windows | [Virtual Display Driver](https://github.com/VirtualDrivers/Virtual-Display-Driver) |
| Linux | `xrandr` (X11), or a dummy HDMI plug |

A dummy HDMI plug works on any system.

### Connect from the address

`?obs=localhost:4455` (or `?obs=localhost:4455:password`) in the address connects to OBS as the page opens. OBS runs on the same computer as the deck.

### Add your camera

**C** (or **Camera**) turns your webcam on in its box while presenting. A recording doesn't depend on it: it turns on the camera chosen for the deck (or none) by itself. The camera is off every time the page opens; until it's on, the deck's camera settings are ignored, so readers get slides using the whole screen.

```yaml
---
pip: bottom-right      ← corner, or none
pip_size: 24%          ← box width
pip_shape: rect        ← or circle
pip_mirror: yes        ← mirror the webcam
camera: 24%, full, off ← what V cycles
---
```

Slides are always placed clear of the brand and the camera box.

### Move the camera per slide

A comment in a slide changes the camera from that slide on:

```md
## Intro
<!-- camera: full -->     ← fills the screen

## Pricing
<!-- camera: 18% flip --> ← small, other side
```

Words you can combine: `on`, `off`, `full`, a size like `30%`, a corner, `flip`, `circle` / `rect`, `mirror` / `unmirror`. List them with commas to step through them on one slide: `full, on` opens on you, and the next → shrinks the camera to its corner and shows the slide.

**V** steps through the deck's `camera:` list by hand.

### Take by take

**● Record** counts down and starts. From then on → drives everything: slides, reveals and camera moves (a Bluetooth clicker works).

- **←** takes the slide again. The deck goes back and replays the slide's entry, so whichever take you pick joins smoothly
- **B** (or **.**, a clicker's blank-screen key) pauses and resumes
- one press past the last step ends the take; **Esc** ends it early

### Slidetake Studio

When the take ends you're back in Studio, the same in both modes:

- the player, with **● Record** and **▶ Preview** under it
- every slide and its takes on the right: click one to preview it
- **⧉ Chapters** copies the chapters (`0:00 Intro`, one per section) for the YouTube description. YouTube needs at least three, each 10 seconds or more

### Download (easy mode)

**▶ Preview** plays the picked takes back to back.

**↓ Download** joins them into one MP4 in seconds, without re-encoding the video, in a folder you pick once: `deck 2026-10-30 20-04-49.mp4`. Pressed again with nothing changed, it says where the video already is.

### The ffmpeg cut (pro mode)

Studio shows the deck's latest OBS recording; recording again replaces it here (the old file stays in your OBS folder).

Previews come from the OBS file: open it once, or, in Chrome and Edge, pick your OBS folder and later recordings load by themselves.

**⧉ ffmpeg** copies a command that cuts the picked takes, frame-exact. ⚙ Setup → Video sets how it encodes.

### Sound

In ⚙ Setup → Microphone:

| Setting | Does |
|---|---|
| **Raw** (default) | the mic as it is: for a good mic in a quiet room |
| **Voice** | Chrome's noise suppression: fans, hum, steady noise |
| **🔊 Volume boost** (on) | raises the voice to YouTube's −14 LUFS, never past a −1.5 dB peak |
| **Peak limiter** (off) | catches the few loud peaks, so the boost goes all the way |

YouTube turns loud videos down but not quiet ones up, so without the boost your voice sounds quiet. With OBS, Volume boost adds `loudnorm` to the ffmpeg command.

## 5️⃣ Share and keep

Every deck you open is **read-only**: Slidetake's own decks, templates, files on the web and shared links. Viewing one never changes anything.

### Your copy

**Type in a deck**, and it becomes your copy, at `/edit`. It lives in this browser, remembers where it came from, and is there whenever you come back: **Your copy →** in the editor takes you to it.

- There's one copy at a time; the editor bar says whose it is, and marks **edited** while it has changes you haven't saved or shared.
- **Reset to original** throws your edits away.
- Starting a new copy asks first if the old one has edits you haven't kept.

### Save and share

**Save** downloads the markdown. **Share** copies a link: the short link while your copy still matches an online original, otherwise a `/share#deflate:…` link with the whole deck compressed inside it. That part of a link never reaches a server. **Open** loads a markdown file from your computer into your copy, and **⇣ Load** a deck from a link: a GitHub file, a gist or any markdown URL.

### Address options

| Option | Does |
|---|---|
| `?edit=1` | opens the editor |
| `?layout=focus` (path, radial, tree) | picks the layout; path is the default |
| `?mode=light` | light theme |
| `?duration=10m` | talk length for the timer |
| `#card-id` | opens at a card |

## 🔒 Your data

No accounts, and no decks kept. Recording stays on your device.

Next, everything that leaves your browser, and where it goes: **[Privacy →](/privacy)**

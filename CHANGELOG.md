# Changelog

All notable changes to Slidetake are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Two things ship from this repository: the app at slidetake.com and the npm
package `slidetake` (`dist/slidetake.js` for other sites, `dist/index.html`,
and the `npx slidetake` command).
An entry here is anything a deck author, a reader or a site embedding the
package can notice. Tests, CI and tooling do not belong here.

## [Unreleased]

### Added

- The home deck's second section, **AI writes it, you watch it**: the loop of an
  AI agent, `deck.md`, `npx slidetake` and Chrome, drawn as an SVG in the
  deck's colours, with why it's fast (only content to write; diagrams and
  charts as text).
- Diagrams explain the flow, in the deck's colours: on the home deck, takes
  becoming one video and one deck in three places (SVG), and the headings'
  hierarchy (Graphviz, written in the deck); in the Docs, easy and pro mode
  side by side, with the comparison table on its own slide, Which mode?

### Changed

- Pro mode is for OBS on the same computer. The docs no longer describe OBS on
  another computer, and the message for an address other than localhost says
  to run OBS on this computer.

## [0.4.3] - 2026-10-31

### Added

- slidetake.com's own pages (home, Features, Showcase, Docs, Privacy) carry
  their deck as text, with their own title and description, so search engines
  and AI tools that don't run JavaScript read the real page. Without
  JavaScript the page shows it.
- Docs → A prompt to copy: a short prompt that has any AI write a Slidetake
  deck, following llms.txt.

### Fixed

- The no-JavaScript message no longer mentions the removed YouTube
  description.
- On a site's page (read-only, no editor) the keys panel no longer lists
  **E** for the editor.

## [0.4.2] - 2026-10-31

### Fixed

- On a site's page, the site's colours (`colors` in `window.SLIDETAKE`) win over
  the deck's own `accent:`, which only applies on slidetake.com and with
  `npx slidetake`.
- The privacy page link in the Privacy & analytics dialog is in the accent
  colour, readable in dark mode (it was the browser's default dark blue).
- The Privacy & analytics dialog's ✕ Close is the small button, in scale
  with its heading.

## [0.4.1] - 2026-10-31

### Added

- `recording: true` in `window.SLIDETAKE` brings ● Studio, Camera and the
  bottom bar back to an embedded deck, for a page only its author sees, such
  as a site's local preview. Without it an embedded deck stays a viewer.

## [0.4.0] - 2026-10-31

### Added

- **Easy mode: record in the browser**, with nothing to install. In Chrome,
  Edge and other Chromium browsers on a computer, the deck records itself:
  only its 16:9 frame (slides and camera), at 1080p or 720p, with your
  microphone, each take its own file in the browser's private storage.
- **Slidetake Studio**, one screen for both modes, opened by **● Studio**
  beside ✎ Editor (or R). Every slide with every take from every recording,
  the newest picked; click one to preview it. **▶ Preview** plays the final
  cut, **⧉ Chapters** copies the YouTube chapters, and in easy mode
  **↓ Download** joins the picked takes into one MP4 without re-encoding the
  video, in a folder picked once. A line beside **⚙ Setup** shows what a take
  uses (`Easy · Chrome · 1080p · camera · mic`).
- **Retake any slide later**: tick slides (shift-click for a range) and
  ● Record records just those. A take starts with the entry from the slide
  before it, so editing a slide, or the one before it, marks its takes
  outdated, and every final cut stays seamless.
- **Pro mode: OBS**, for Safari, Firefox or any browser, in the same Studio:
  the deck's latest OBS recording, and **⧉ ffmpeg** copies the command that
  cuts it. ⚙ Setup switches modes; Studio opens in the one used last.
- **Purge takes** in ⚙ Setup → Files: unused takes, all of this deck's, or
  every deck's (it says the total size first).
- The bottom bar is Keys, Camera and Fullscreen, each in the accent colour
  while it's on; Studio is hidden on phones and tablets.
- Recording turns the camera on by itself: the camera chosen for the deck in
  Setup (or **No camera**), on before the countdown and back to how it was
  afterwards, so a forgotten **C** no longer costs a take. If fullscreen
  doesn't stick (a share prompt can take it away), the countdown asks for **F**.
- The microphone list shows each microphone once, the system default marked
  "(system default)", rather than listing it twice.
- The microphone's sound, in Setup: **Sound: Raw** (no processing, the
  default) or **Voice** (Chrome's noise suppression). **🔊 Volume boost** (on
  by default) measures the final cut the way YouTube does (ITU-R BS.1770
  integrated loudness) and raises it towards -14 LUFS, stopping where its
  loudest peak would reach -1.5 dB and saying so. **Peak limiter** (off by
  default) catches those few peaks (a click, a plosive) with a look-ahead
  limiter so the boost reaches -14, measured again so it lands there. Only the
  sound is re-encoded; the ffmpeg command gets `loudnorm`.

### Changed

- A retake (←) replays the slide's entry: the deck goes back to where the slide
  before ended and flies in again, camera moves included, so every take starts
  with the entry and picking a retake no longer cuts straight to the slide
  already in place. The take that was redone ends where ← was pressed. The
  jump back shows that slide exactly as it ended (no entrance replayed, nothing
  easing into place), so a retake joins without a flicker.
- Studio's player is larger, with the takes beside it at the same height and
  every take labelled (Take 1 included); the final length and expected size
  sit under it, and lengths read as `1m 09s`, not `1:09`.
- Device names drop their USB ids (`(1377:1100)`).
- A card widens for its code, as it does for a table, so a code block only
  scrolls when it's wider than the widest card.
- Graphviz diagrams are drawn in the deck's own colours for dark and light,
  as D2 is, instead of on a light panel; colours a diagram sets itself still win.
- Slidetake's own decks write the name as in the header, the logo and
  Slide*take* in two colours, wherever it appears in a card's text.

### Fixed

- An image (or video) with text beside it is a split card again, the image on
  the side it was written on; it had been laid out above the text.
- Image cards use one heading and caption size: a square or tall image's card
  no longer has larger text than the rest.
- An image card for a square or tall image no longer pushes its caption past
  the bottom of the card.
- A full-screen card (`view: full`) with an image nearly 16:9, such as a
  1200×630 link preview, fills the frame instead of showing grey bars above and
  below it in light mode; images further from 16:9 sit on black.
- Closing Studio (a click outside it, ✕ or Esc) stops a preview that is
  playing, instead of leaving its sound running.
- With OBS, a retake's cut no longer starts with a moment of the attempt
  before it and the jump back. OBS reports its time as encoded, a few hundred
  ms behind the screen; a retake now holds still for 0.6 s before its entry,
  and the cut starts inside that hold.
- With OBS, the last slide's cut ends where Stop was pressed, so the browser
  leaving full screen and the Studio opening are no longer at the end.
- In Safari and Firefox, the “Use my OBS recordings folder…” button (which
  they can't use) is hidden, and it no longer warns when the file isn't in the
  chosen folder.

### Removed

- The Record dialog: its OBS connection, camera choice and take layout moved
  into Studio's ⚙ Setup.
- The review's YouTube section (title, description, tags) and the publish
  pack download; ⧉ Chapters copies the chapters. The deck keys `summary`,
  `related`, `tags` and `permalink` are no longer read for it.
- The list of earlier OBS recordings: Studio shows the latest one.
- Recording from embedded decks: `slidetake.js` is now only a viewer, and
  `?obs` and `recording: true` no longer bring Camera and Studio to a site's
  page. Record the deck's markdown on slidetake.com or with `npx slidetake`
  (`?obs=host:port` still connects OBS there).

## [0.3.4] - 2026-10-28

### Fixed

- On a site page in light mode, the "Made with Slidetake" credit's logo and
  "take" use the header's ink instead of the accent, which was the band's own
  colour (navy on navy, gold on gold) and made them invisible.

## [0.3.3] - 2026-10-28

### Changed

- ` ```svg ` drawings are drawn inline instead of as images, so they can use
  the deck's colours: `currentColor` is the text colour, and `var(--text)`,
  `var(--text-muted)` and `var(--accent)` switch with dark and light. Only
  drawing elements are kept: scripts, `<style>`, links, `<foreignObject>`,
  images, animation, event handlers and external `url()` references are
  removed, and each drawing's ids are made its own. `![](drawing.svg)` is
  unchanged, an image as drawn.

## [0.3.2] - 2026-10-28

### Added

- Carousels for diagrams and charts as well as images: a list of Graphviz, D2,
  SVG or ECharts blocks is a gallery, and a carousel under `<!-- steps -->`.
  After `<!-- steps -->`, two or more images, diagrams or charts in a row are
  a carousel on their own, one per press, without writing them as a list.

### Changed

- `<!-- steps -->` reveals everything after it on the card, not just the next
  list: a list item by item, and a paragraph, quote, table or diagram as one
  press each, so a closing line no longer shows before the points it sums up.
  `<!-- steps: off -->` ends the steps early; what follows it shows from the
  start.

### Fixed

- On a site page, the header trail and the active layout button stay in the
  header's text colour instead of the accent, which could vanish into a header
  in the same colour (gold on gold). The current page is underlined instead.

## [0.3.1] - 2026-10-28

### Fixed

- The header's layout switch and Editor are exactly as tall as its icon buttons
  (32px) whatever the font, so they line up on every machine.
- No false "image(s) use relative paths" warning for images addressed from the
  site's root, such as the logo in Slidetake's own decks.
- The keys card's link to the docs works on embedded decks too: it points at
  slidetake.com/docs rather than the host site's /docs.

## [0.3.0] - 2026-10-27

### Added

- `npx slidetake deck.md`: Slidetake on your own computer. It serves the deck
  and its folder on localhost, so images next to the markdown load as they
  are; saving the file reloads the deck where you are, and typing in the
  browser's editor saves back to the file, so an AI agent can write the deck
  while you watch. A folder opens its `index.md`, `deck.md`, `slides.md` or
  `README.md`; `--port` and `--open` as expected. Needs Node 20 or later.
- `/features`, every feature on one line; `/showcase`, one deck that shows
  them all working, with blue, coral and violet versions of itself in share
  links; `/privacy`, what slidetake.com collects and which services a deck can
  reach. `/examples` still opens the showcase.
- A **Privacy & analytics** button on slidetake.com: Google Analytics stays on
  by default and can be turned off, which stops it and removes its cookies.
- The header's left side links Features, Showcase, Docs and GitHub.
- Camera messages (no camera found, waiting for permission) show inside the
  camera box.

### Changed

- Slidetake's own colour is seafoam, calmer than the earlier neon green, and
  dimmer in dark mode; the logo, favicon, icon and link preview match.
- The guide moves to `/docs` and reads step by step: get started, write,
  present, record, share. `/help` still opens it.
- The home deck covers OBS recording, camera moves, the special comments,
  colours and logo, and the three places Slidetake runs.
- Layouts are offered in alphabetical order, with keys 1–4 following it, and
  **path** is the default until you pick one; a deck no longer chooses.
- The header: name, then the links, then layouts, analytics, light/dark and
  Editor, all one height; the tagline is gone from it.
- A full-screen card is a 16:9 frame placed like any other slide, keeping the
  same margins in the window and when presenting.

### Fixed

- Editing a deck updates it as you type again. Since 0.2.3, re-reading the deck
  stopped at the camera check for full-screen cards, so no edit showed until
  the page was reloaded.
- D2 diagrams no longer sit on a black box in dark mode.
- Pie and donut labels no longer bleed in dark mode.
- A camera message keeps its look after going fullscreen and back.
- HTML in a heading no longer reaches a card's title or address.

## [0.2.4] - 2026-10-27

### Changed

- slidetake.com's header, left to right: the name and tagline (now *plain
  markdown → spatial deck → video, no timeline editing*), then layouts,
  **Docs**, **Editor**, GitHub and light/dark. **Docs** opens the guide and
  replaces the **?** button; **?** and **K** still show the keys.
- **Your copy →** moves from the header into the editor's toolbar.

## [0.2.3] - 2026-10-27

### Added

- A GitHub button beside light/dark on slidetake.com, linking to the
  repository. Embedded decks don't show it.

### Changed

- A full-screen card whose image leaves room beside it (a screenshot or photo
  narrower than 16:9) puts the image on the right and the heading and caption
  in that room, as a portrait card does, rather than over the image. Images
  close to 16:9 still fill the card with the text over them.
- A full-screen card is a 16:9 frame placed like every other slide, with the
  same margins in the window and when presenting, instead of filling the screen
  edge to edge (which left it touching the top and bottom, under the
  breadcrumbs).
- A full-screen card turns the camera off while it's on screen, unless the
  card has its own `<!-- camera: … -->`; **V** still brings the camera back,
  and the slides after it keep their camera as before.

### Fixed

- D2 diagrams sit on their card: the colour D2 paints behind a diagram is now
  the card's own, not the page's near-black.
- A camera layout picked with **V** shows the camera even on a slide whose
  `<!-- camera: … -->` turns it off; before, a size such as `24%` stayed hidden.

## [0.2.2] - 2026-10-27

### Changed

- A full-screen card (`<!-- view: full -->`) fits its image whole, with bars
  where its shape differs from the screen's, instead of cropping it to fill.
  A screenshot keeps every edge.

## [0.2.1] - 2026-10-27

### Fixed

- **K** (or **?**) again closes the keys card, as **O** returns from the map and
  **F** leaves fullscreen; before, only **Esc** closed it.

## [0.2.0] - 2026-10-27

### Added

- Themeable colours. Every colour comes from a few tokens, and two things can
  set them: `window.SLIDETAKE.colors` for a site embedding a deck (`accent`,
  `accentSoft`, `line`, `ring`, `header`, `headerText`, for both modes or under
  `light` / `dark`), and `accent:` in a deck's top block, one colour that
  Slidetake sets bright for dark mode and deep for light mode.
- A host's `header` colour is a band behind the deck's header, with
  `headerText` for the trail and buttons on it, so a deck can wear its site's
  header.
- Charts and D2 diagrams take the deck's colours: the accent leads the chart
  palette and tints D2's shapes, whatever it is.

### Changed

- Slidetake's own colour is terminal green (`#4ade80` on dark, `#15803d` on
  light), replacing gold: the logo, favicon, link preview and every default.
  Decks and sites that set their own colours are unaffected.

## [0.1.1] - 2026-10-26

### Added

- Plain markdown, richer cards: `<!-- steps -->` before a list reveals one item
  per press, and ` ```d2 ` and ` ```svg ` blocks join ` ```dot ` and
  ` ```echarts `. Charts and D2 diagrams use the deck's palette and redraw when
  the theme flips between dark and light.
- Image cards laid out by the image's shape: a phone or near-square screenshot
  sits beside the heading and caption, a wider image spans the card between
  them, and a 16:9 image fills the card with the text over it.
- A list of images is a gallery, and under `<!-- steps -->` a carousel that
  shows one image per press, captioned **1 / N**. Several images in one
  paragraph form a grid of up to four a row.
- A YouTube link alone on a line embeds the video (youtube-nocookie.com); the
  next press plays it and leaving the slide pauses it.
- `<!-- view: full -->` makes a card fill the whole screen.
- The first and last cards animate in on their own.
- `examples/`: a showcase deck of every feature, served at `/examples`, and the
  starter templates.
- Embeds open as a viewer: the host site's trail, layouts and light/dark in the
  header, no bottom bar. `?obs` brings back the camera and recording controls.

### Changed

- `type: slides` alone no longer forces the reveal.js parser; a deck without
  `---` or `--` separators is read by its headings.
- Published from GitHub Actions with npm provenance, linking the package to the
  commit and build that made it.

## [0.1.0] - 2026-10-25

First release on npm: `dist/slidetake.js` turns a markdown deck on any page into
a Slidetake deck (`window.SLIDETAKE = {markdown, …}`), and `dist/index.html` is
the whole app in one file.

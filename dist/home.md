---
title: Slidetake — write in markdown with AI, record without timeline editing
description: "Write a deck in markdown, with AI, present it on a spatial canvas, and record it slide by slide: retake any slide, pick the best take, download the video. Open source."
brand: slidetake
pip: bottom-right
---

<!-- camera: on, full, on -->

# ![](/favicon.svg) Slide<span class="st-take">take</span>

**Write in markdown, with AI. Present on a spatial canvas. Record without timeline editing.**

Any AI writes the deck for you: it's plain markdown. For developers and technical educators who explain things on video. You're inside a Slidetake deck right now. Press → to walk it, **O** for the map.

## ⏱️ Hours, not days

A video that takes two or three days to script, record and edit takes a couple of hours: an AI writes the deck, you record it slide by slide, and pick the best take of each in Studio. What comes out is ready to upload.

## ✂️ Record without timeline editing

**Every slide is a take.** Stumbled on a slide? Press ← and say it again: every attempt is kept, and recording carries on. The slide is the timeline marker, so a fumbled line costs one press, not an editing session.

### Record right here, nothing to install

Press **● Studio**, then **<span class="st-rec">● Record</span>**, and the deck records itself, in Chrome, Edge or another Chromium browser: your slides and camera in one 16:9 frame, at 1080p. Or let **[OBS Studio](https://obsproject.com)** record while the deck drives it, from any browser. No scenes to switch, no recording to watch.

### Pick the best take

Choose the best take of each slide in **● Studio**. It joins them into the final video in seconds (or writes the **[ffmpeg](https://ffmpeg.org)** cut for OBS), at YouTube's loudness, with the **chapters** to paste.

## 🗺️ A map, not a stack

<!-- view: overview -->

Your headings are the hierarchy: zoom out for the whole system, zoom in for one part. This slide just showed you the map.

### Headings become cards

`#` is the first card, `##` branches from it, `###` goes a level deeper. No layout to draw.

### A path your viewer can follow

→ always walks the same order, and **path** lays it out as a staircase, so the audience never loses its place.

## 🎥 The camera is part of the deck

<!-- camera: on, full, on -->

A comment in a slide moves you: corner, full screen, or off. Turn on **Camera** and watch this slide do it.

## ✍️ Plain markdown in

**Pure text, so an AI iterates fast.** Ask for a change and the whole deck is rewritten in seconds: no layouts to drag, no files to export.

Markdown you already know: headings, lists, tables, code, steps, diagrams (Graphviz, D2, SVG), charts, images and YouTube links. [See them all in the showcase →](/showcase)

### A few comments do the rest

Markdown has no word for "reveal one at a time" or "move the camera", so a handful of HTML comments say it. They stay invisible anywhere else markdown is read:

```md
<!-- steps -->            ← one press each
<!-- camera: full, on --> ← move the camera
<!-- view: overview -->   ← the map first
<!-- view: full -->       ← a big image
```

## 🎨 Your colours

One line, `accent: "#3b82f6"`, gives a deck its own colour, shaded for dark and light. On your website, decks wear your site's palette.

`brand:` and `logo:` put your name and logo in the corner of every slide, so every frame of the video carries them.

## 🌐 Run it anywhere

Three places, one deck format: a markdown file.

### slidetake.com: write, record, share

Write a deck in the **✎ Editor**, or view one straight from a link: a GitHub file, a gist or any markdown URL. Record it and cut the video in **● Studio**, in the same tab. **Share** a link with the deck inside it. Nothing to install.

### Your computer: all that, plus AI

The same app on your own files, offline:

```sh
npx slidetake deck.md
```

Images next to the markdown load as they are. Save in any editor and the deck reloads where you are; type in the browser and it saves to the file. So an AI agent can write `deck.md` while you watch it take shape.

### Your website: a viewer for your readers

`slidetake.js` puts decks inside your own pages, in your site's colours: a clean viewer, nothing else to set up. Record the same markdown here or with `npx slidetake`.

## <span class="st-heart" aria-hidden="true"></span> Open source

Open source, Apache 2.0: [github.com/slidetake/slidetake](https://github.com/slidetake/slidetake). Nothing to sign up for, and your decks stay yours: [Privacy](/privacy).

Next, every feature and what it saves you: **[Features →](/features)**

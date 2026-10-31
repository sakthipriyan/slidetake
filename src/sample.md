---
title: Slidetake — write in markdown with AI, record without timeline editing
description: "Write a deck in markdown, with AI, present it on a spatial canvas, and record it slide by slide: retake any slide, pick the best take, download the video. Open source."
brand: slidetake
pip: bottom-right
---

<!-- camera: on, full, on -->

# ![](/favicon.svg) Slide<span class="st-take">take</span>

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 300" font-family="IBM Plex Sans, system-ui, sans-serif">
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>

  <!-- three panels -->
  <g style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5">
    <rect x="12" y="12" width="290" height="276" rx="20"/>
    <rect x="335" y="12" width="290" height="276" rx="20"/>
    <rect x="658" y="12" width="290" height="276" rx="20"/>
  </g>
  <g fill="none" style="stroke:var(--accent)" stroke-width="2.5" marker-end="url(#head)">
    <path d="M304 120 H331"/><path d="M627 120 H654"/>
  </g>

  <!-- 1. write: a markdown file, and the AI writing it -->
  <rect x="97" y="40" width="128" height="150" rx="12" style="fill:var(--node-bg);stroke:var(--accent)" stroke-width="2"/>
  <g font-family="IBM Plex Mono, monospace" font-size="14" font-weight="600" style="fill:var(--accent)">
    <text x="111" y="68">#</text><text x="111" y="124">##</text>
  </g>
  <g style="fill:var(--text-muted)" opacity=".55">
    <rect x="127" y="58" width="66" height="10" rx="5" style="fill:currentColor"/>
    <rect x="111" y="80" width="98" height="7" rx="3.5"/><rect x="111" y="94" width="74" height="7" rx="3.5"/>
    <rect x="135" y="114" width="58" height="10" rx="5" style="fill:currentColor"/>
    <rect x="111" y="136" width="98" height="7" rx="3.5"/><rect x="111" y="150" width="84" height="7" rx="3.5"/><rect x="111" y="164" width="62" height="7" rx="3.5"/>
  </g>
  <path d="M232 34 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6z" style="fill:var(--accent)"/>

  <!-- 2. present: cards on a path, the one on screen framed -->
  <g fill="none" style="stroke:var(--accent);stroke-opacity:.6" stroke-width="2">
    <path d="M412 76 H426 M476 76 H490 M515 92 V112 M540 128 H554"/>
  </g>
  <g style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent);stroke-opacity:.7" stroke-width="1.5">
    <rect x="362" y="60" width="50" height="32" rx="7"/><rect x="426" y="60" width="50" height="32" rx="7"/>
    <rect x="490" y="60" width="50" height="32" rx="7"/><rect x="490" y="112" width="50" height="32" rx="7"/>
    <rect x="554" y="112" width="50" height="32" rx="7"/>
  </g>
  <rect x="478" y="100" width="74" height="56" rx="10" fill="none" style="stroke:var(--accent)" stroke-width="3"/>
  <rect x="490" y="112" width="50" height="32" rx="7" style="fill:var(--accent);fill-opacity:.45"/>
  <g style="fill:var(--text-muted)" font-size="12">
    <text x="372" y="182">→ walks the path</text><text x="372" y="200">O zooms out to all</text>
  </g>

  <!-- 3. record: takes, the picked one, one video -->
  <g font-size="13" text-anchor="middle">
    <rect x="690" y="48" width="104" height="30" rx="8" fill="none" style="stroke:var(--text-muted);stroke-opacity:.6" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="742" y="68" style="fill:var(--text-muted)">Take 1</text>
    <rect x="690" y="90" width="104" height="30" rx="8" style="fill:var(--node-bg)"/>
    <rect x="690" y="90" width="104" height="30" rx="8" style="fill:var(--accent);fill-opacity:.15;stroke:var(--accent)" stroke-width="2"/>
    <text x="742" y="110" fill="currentColor">Take 2 ✓</text>
  </g>
  <path d="M796 105 C830 105 830 132 846 132" fill="none" style="stroke:var(--accent)" stroke-width="2.5" marker-end="url(#head)"/>
  <rect x="822" y="138" width="104" height="66" rx="10" style="fill:var(--node-bg);stroke:var(--accent)" stroke-width="2"/>
  <path d="M866 158 l18 13 -18 13z" style="fill:var(--accent)"/>
  <circle cx="704" cy="182" r="7" style="fill:#ef4444"/>
  <text x="718" y="187" font-size="12" style="fill:var(--text-muted)">every take kept</text>

  <!-- the three promises -->
  <g text-anchor="middle" fill="currentColor">
    <text x="157" y="232" font-size="19" font-weight="700">Write</text>
    <text x="157" y="258" font-size="14" style="fill:var(--text-muted)">in markdown, with AI</text>
    <text x="480" y="232" font-size="19" font-weight="700">Present</text>
    <text x="480" y="258" font-size="14" style="fill:var(--text-muted)">on a spatial canvas</text>
    <text x="803" y="232" font-size="19" font-weight="700">Record</text>
    <text x="803" y="258" font-size="14" style="fill:var(--text-muted)">without timeline editing</text>
  </g>
</svg>
```

For developers and technical educators who explain things on video. You're inside a Slidetake deck right now.

### ⏱️ Hours, not days

A video that takes two or three days to script, record and edit takes a couple of hours: an AI writes the deck, you record it slide by slide, and pick the best take of each in Studio. What comes out is ready to upload.

## 🤖 AI writes it, you watch it {#ai}

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 380" font-family="IBM Plex Sans, system-ui, sans-serif">
  <defs>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>

  <!-- the four steps -->
  <g>
    <rect x="16" y="40" width="196" height="150" rx="18" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <path d="M114 70 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7z" style="fill:var(--accent)"/>
    <text x="114" y="150" text-anchor="middle" font-size="19" font-weight="600" fill="currentColor">Claude Code</text>
    <text x="114" y="173" text-anchor="middle" font-size="13" style="fill:var(--text-muted)">or any AI agent</text>
  </g>
  <g>
    <rect x="262" y="34" width="196" height="162" rx="18" style="fill:var(--accent)" filter="url(#glow)" opacity=".1"/>
    <rect x="262" y="40" width="196" height="150" rx="18" style="fill:var(--node-bg)"/>
    <rect x="262" y="40" width="196" height="150" rx="18" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2.5"/>
    <path d="M343 66 h26 l12 12 v34 h-38z" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M369 66 v12 h12" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="360" y="150" text-anchor="middle" font-size="19" font-weight="600" font-family="IBM Plex Mono, monospace" fill="currentColor">deck.md</text>
    <text x="360" y="173" text-anchor="middle" font-size="13" style="fill:var(--text-muted)">text, dot, d2, echarts, svg</text>
  </g>
  <g>
    <rect x="508" y="40" width="196" height="150" rx="18" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <rect x="577" y="68" width="58" height="44" rx="7" fill="none" style="stroke:var(--accent)" stroke-width="2.5"/>
    <path d="M588 82 l9 8 -9 8 M601 99 h12" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="606" y="150" text-anchor="middle" font-size="19" font-weight="600" font-family="IBM Plex Mono, monospace" fill="currentColor">npx slidetake</text>
    <text x="606" y="173" text-anchor="middle" font-size="13" style="fill:var(--text-muted)">serves it, watches the file</text>
  </g>
  <g>
    <rect x="754" y="40" width="190" height="150" rx="18" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <rect x="818" y="66" width="62" height="46" rx="7" fill="none" style="stroke:var(--accent)" stroke-width="2.5"/>
    <path d="M818 78 h62" style="stroke:var(--accent)" stroke-width="2.5"/>
    <circle cx="826" cy="72" r="1.8" style="fill:var(--accent)"/><circle cx="833" cy="72" r="1.8" style="fill:var(--accent)"/>
    <rect x="828" y="86" width="22" height="16" rx="3" style="fill:var(--accent);fill-opacity:.55"/>
    <text x="849" y="150" text-anchor="middle" font-size="19" font-weight="600" fill="currentColor">Chrome</text>
    <text x="849" y="173" text-anchor="middle" font-size="13" style="fill:var(--text-muted)">redraws the slide you're on</text>
  </g>

  <!-- forward: write, save, reload -->
  <path d="M214 115 H256" fill="none" style="stroke:var(--accent)" stroke-width="3" marker-end="url(#head)"/>
  <path d="M460 115 H502" fill="none" style="stroke:var(--accent)" stroke-width="3" marker-end="url(#head)"/>
  <path d="M706 115 H748" fill="none" style="stroke:var(--accent)" stroke-width="3" marker-end="url(#head)"/>
  <text x="237" y="104" text-anchor="middle" font-size="12" style="fill:var(--text-muted)">writes</text>
  <text x="483" y="104" text-anchor="middle" font-size="12" style="fill:var(--text-muted)">saved</text>
  <text x="729" y="104" text-anchor="middle" font-size="12" style="fill:var(--text-muted)">reloads</text>

  <!-- back: you ask for a change -->
  <path d="M849 196 C849 300 780 330 480 330 C180 330 114 300 114 202" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-dasharray="7 7" marker-end="url(#head)"/>
  <rect x="300" y="306" width="360" height="48" rx="24" style="fill:var(--node-bg)"/>
  <rect x="300" y="306" width="360" height="48" rx="24" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="1.5"/>
  <text x="480" y="336" text-anchor="middle" font-size="16" fill="currentColor">You: <tspan font-style="italic">“make the chart a donut”</tspan></text>
  <text x="480" y="22" text-anchor="middle" font-size="13" font-weight="600" letter-spacing="2" style="fill:var(--accent)">EACH ROUND TRIP TAKES SECONDS</text>
</svg>
```

Ask your AI for a change, and see it on the slide you're on in seconds.

### Fewer tokens, nothing to fix

The AI writes only content: headings, text and a few comments. Slidetake does the rest: card sizes, the map, the camera moves. No CSS or layout code to generate, and none to repair.

### Real diagrams and charts, as text

AI already writes **Graphviz**, **D2**, **ECharts** and **SVG** well, so they arrive in the same reply as the words, drawn in your deck's colours for dark and light, and changed by asking. The diagram before this slide is one: SVG inside the markdown.

## ✂️ Record without timeline editing

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 360" font-family="IBM Plex Sans, system-ui, sans-serif">
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" style="fill:var(--accent)"/>
    </marker>
  </defs>
  <text x="480" y="20" text-anchor="middle" font-size="13" font-weight="600" letter-spacing="2" style="fill:var(--accent)">EVERY ATTEMPT IS KEPT · PICK ONE PER SLIDE</text>

  <!-- slide headers -->
  <g font-size="15" font-weight="600" text-anchor="middle" fill="currentColor">
    <text x="140" y="56">Slide 1</text><text x="380" y="56">Slide 2</text><text x="620" y="56">Slide 3</text><text x="860" y="56">Slide 4</text>
  </g>

  <!-- takes: picked ones in the accent, the rest faded -->
  <g font-size="14" text-anchor="middle">
    <rect x="55" y="72" width="170" height="40" rx="10" style="fill:var(--node-bg)"/>
    <rect x="55" y="72" width="170" height="40" rx="10" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2"/>
    <text x="140" y="97" fill="currentColor">Take 1 ✓</text>

    <rect x="295" y="72" width="170" height="40" rx="10" fill="none" style="stroke:var(--text-muted);stroke-opacity:.5" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="380" y="97" style="fill:var(--text-muted)">Take 1</text>
    <text x="380" y="134" font-size="13" font-weight="600" style="fill:var(--accent)">← again</text>
    <rect x="295" y="146" width="170" height="40" rx="10" style="fill:var(--node-bg)"/>
    <rect x="295" y="146" width="170" height="40" rx="10" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2"/>
    <text x="380" y="171" fill="currentColor">Take 2 ✓</text>

    <rect x="535" y="72" width="170" height="40" rx="10" style="fill:var(--node-bg)"/>
    <rect x="535" y="72" width="170" height="40" rx="10" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2"/>
    <text x="620" y="97" fill="currentColor">Take 1 ✓</text>

    <rect x="775" y="72" width="170" height="40" rx="10" fill="none" style="stroke:var(--text-muted);stroke-opacity:.5" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="860" y="97" style="fill:var(--text-muted)">Take 1</text>
    <text x="860" y="134" font-size="13" font-weight="600" style="fill:var(--accent)">← again</text>
    <rect x="775" y="146" width="170" height="40" rx="10" fill="none" style="stroke:var(--text-muted);stroke-opacity:.5" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="860" y="171" style="fill:var(--text-muted)">Take 2</text>
    <text x="860" y="208" font-size="13" font-weight="600" style="fill:var(--accent)">← again</text>
    <rect x="775" y="220" width="170" height="40" rx="10" style="fill:var(--node-bg)"/>
    <rect x="775" y="220" width="170" height="40" rx="10" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2"/>
    <text x="860" y="245" fill="currentColor">Take 3 ✓</text>
  </g>

  <!-- the picked takes, joined -->
  <g fill="none" style="stroke:var(--accent)" stroke-width="2" marker-end="url(#head)">
    <path d="M140 114 V292"/><path d="M380 188 V292"/><path d="M620 114 V292"/><path d="M860 262 V292"/>
  </g>
  <rect x="20" y="298" width="920" height="44" rx="12" style="fill:var(--accent);fill-opacity:.18;stroke:var(--accent)" stroke-width="2"/>
  <g style="stroke:var(--accent)" stroke-width="2"><path d="M260 298 V342 M500 298 V342 M740 298 V342"/></g>
  <g font-size="14" fill="currentColor" font-family="IBM Plex Mono, monospace">
    <text x="36" y="325">0:00 Slide 1</text><text x="276" y="325">Slide 2</text><text x="516" y="325">Slide 3</text><text x="756" y="325">Slide 4</text>
  </g>
  <text x="924" y="325" text-anchor="end" font-size="13" font-weight="600" style="fill:var(--accent)">one video</text>
</svg>
```

**Every slide is a take.** Stumbled? Press ← and say it again: every attempt is kept, and recording carries on.

**Pick the best of each** in ● Studio: it joins them into one video in seconds, at YouTube's loudness, with the **chapters** to paste.

### Record right here, nothing to install

Press **● Studio**, then **<span class="st-rec">● Record</span>**, and the deck records itself, in Chrome, Edge or another Chromium browser: your slides and camera in one 16:9 frame, at 1080p. Or let **[OBS Studio](https://obsproject.com)** record while the deck drives it, from any browser, and get the **[ffmpeg](https://ffmpeg.org)** cut. No scenes to switch, no recording to watch.

## 🗺️ A map, not a stack

<!-- view: overview -->

```dot
digraph {
  rankdir=LR  nodesep=0.25  ranksep=0.7
  node [shape=box style=rounded margin="0.3,0.1" fontsize=16 fontname="IBM Plex Mono"]
  edge [arrowsize=0.7]
  talk [label="# Talk"]  why [label="## Why"]  how [label="## How"]
  demo [label="## Demo"]  detail [label="### Detail"]
  talk -> {why how demo}
  why -> detail
}
```

Your headings are the hierarchy: `#` is the first card, `##` branches from it, `###` goes a level deeper. Slidetake lays it out as a map you move through: → walks the path, and **O** zooms out to the whole talk, as this slide just did. The diagram is Graphviz, written as text in the deck.

## 🎥 The camera is part of the deck

<!-- camera: on, full, on -->

A comment in a slide moves you: corner, full screen, or off. Turn on **Camera** and watch this slide do it.

## ✍️ Plain markdown in

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

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 320" font-family="IBM Plex Sans, system-ui, sans-serif">
  <defs>
    <marker id="head" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" style="fill:var(--accent)"/>
    </marker>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>

  <!-- one file -->
  <rect x="40" y="104" width="230" height="112" rx="18" style="fill:var(--accent)" filter="url(#glow)" opacity=".1"/>
  <rect x="40" y="110" width="230" height="100" rx="18" style="fill:var(--node-bg)"/>
  <rect x="40" y="110" width="230" height="100" rx="18" style="fill:var(--accent);fill-opacity:.12;stroke:var(--accent)" stroke-width="2.5"/>
  <path d="M74 136 h22 l10 10 v30 h-32z M96 136 v10 h10" fill="none" style="stroke:var(--accent)" stroke-width="2.5" stroke-linejoin="round"/>
  <text x="122" y="160" font-size="21" font-weight="600" font-family="IBM Plex Mono, monospace" fill="currentColor">deck.md</text>
  <text x="122" y="184" font-size="13" style="fill:var(--text-muted)">one markdown file</text>

  <g fill="none" style="stroke:var(--accent)" stroke-width="2.5" marker-end="url(#head)">
    <path d="M272 150 C380 150 400 62 498 62"/>
    <path d="M272 160 H498"/>
    <path d="M272 170 C380 170 400 258 498 258"/>
  </g>

  <g>
    <rect x="504" y="20" width="430" height="84" rx="16" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="526" y="54" font-size="18" font-weight="600" fill="currentColor">slidetake.com</text>
    <text x="526" y="80" font-size="13" style="fill:var(--text-muted)">write, open from a link, record in ● Studio, share</text>
    <rect x="504" y="118" width="430" height="84" rx="16" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="526" y="152" font-size="18" font-weight="600" fill="currentColor">Your computer · <tspan font-family="IBM Plex Mono, monospace" font-size="16">npx slidetake</tspan></text>
    <text x="526" y="178" font-size="13" style="fill:var(--text-muted)">the AI loop, local images, edits saved to the file</text>
    <rect x="504" y="216" width="430" height="84" rx="16" style="fill:var(--accent);fill-opacity:.06;stroke:var(--accent);stroke-opacity:.45" stroke-width="1.5"/>
    <text x="526" y="250" font-size="18" font-weight="600" fill="currentColor">Your website · <tspan font-family="IBM Plex Mono, monospace" font-size="16">slidetake.js</tspan></text>
    <text x="526" y="276" font-size="13" style="fill:var(--text-muted)">a viewer for your readers, in your site's colours</text>
  </g>
</svg>
```

### slidetake.com: write, record, share

Write a deck in the **✎ Editor**, or view one straight from a link: a GitHub file, a gist or any markdown URL. Record it and cut the video in **● Studio**, in the same tab. **Share** a link with the deck inside it. Nothing to install.

### Your computer: all that, plus AI

The same app on your own files, offline:

```sh
npx slidetake deck.md
```

Images next to the markdown load as they are. Save in any editor and the deck reloads where you are; type in the browser and it saves to the file. That's [the AI loop](#ai): an agent writes `deck.md` while you watch it take shape.

### Your website: a viewer for your readers

`slidetake.js` puts decks inside your own pages, in your site's colours: a clean viewer, nothing else to set up. Record the same markdown here or with `npx slidetake`.

## <span class="st-heart" aria-hidden="true"></span> Open source

Open source, Apache 2.0: [github.com/slidetake/slidetake](https://github.com/slidetake/slidetake). Nothing to sign up for, and your decks stay yours: [Privacy](/privacy).

Next, every feature and what it saves you: **[Features →](/features)**

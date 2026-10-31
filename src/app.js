import SAMPLE_MD from './sample.md';
import DOCS_MD from './docs.md';
import FEATURES_MD from './features.md';
import PRIVACY_MD from './privacy.md';
import BLANK_MD from '../examples/blank.md';
import TALK_MD from '../examples/talk.md';
import RECORDING_MD from '../examples/recording.md';
import SHOWCASE_MD from '../examples/showcase.md';
import {slugify, escapeHtml, attrsOf, parseDuration, fmtTime, fmtLength} from './core/text.js';
import {parseDeck as parseDeckCore, cameraDirective, mapDirective, settingsBlock} from './core/parse.js';
import {CORNERS, clampPipSize, applyPreset, cameraPresets, stepsFor} from './core/steps.js';
import {normalizeSource, shortLink} from './core/source.js';
import {encodeDeck, decodeDeck, parseHash, deckHash} from './core/share.js';
import {routeOf, originLabel, makeCopy, isEdited, matchesOrigin, parseCopy} from './core/doc.js';
import {youtubeVideo, embedUrl} from './core/media.js';
import {QUALITIES, AUDIO_BITRATE, FPS, bestQuality, recordingType, clipExt, bytesPerMinute, clipPlan, afterPrevious, deviceName, sizeName} from './core/record.js';
import {YOUTUBE_LUFS, MAX_BOOST_DB, loudnessMeter, gainToTarget, dbToGain, peakLimiter} from './core/loudness.js';
import {fingerprint, deckSlides, takesFromRun, boardRows, boardSession, selectedInOrder, rangeOf} from './core/board.js';
import {takesOf, pickedRanges, mergedRanges, sessionFps, baseName, sectionChapters as sectionChaptersCore,
  finalChapters as finalChaptersCore, ffmpegScript as ffmpegScriptCore} from './core/cut.js';

"use strict";
// Embedded in another site's page (see src/embed.js): window.SLIDETAKE = {markdown, settings, base, back,
// themeKey}. The page shows that one deck, read-only: no editor, links or copies.
const EMBED = window.SLIDETAKE || null;
// a built-in page carries its deck as text for readers without JavaScript (build.mjs); the app shows the deck
document.getElementById('deck-text')?.remove();
// served by `npx slidetake` (bin/slidetake.mjs): {deck, file, events, save}, a deck file on this computer
const LOCAL = window.SLIDETAKE_LOCAL || null;
// the logo, read once from the header (which an embed replaces): the corner mark and the credit reuse it
const LOGO = document.querySelector('header .mark .logo').outerHTML;
document.documentElement.classList.toggle('embed', !!EMBED);
// Camera and Studio are for making a video: on slidetake.com and `npx slidetake`. Embedded in a site,
// Slidetake is a viewer, unless the page opts in with recording: true (a site's own preview, such as
// hugo-continuum under `hugo server`, so its author records where they write).
const RECORDING_UI = !EMBED || EMBED.recording === true;
document.documentElement.classList.toggle('no-record', !RECORDING_UI);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Slidetake's own read-only decks
const BUILTIN = {home: SAMPLE_MD, docs: DOCS_MD, features: FEATURES_MD, privacy: PRIVACY_MD, showcase: SHOWCASE_MD, 'template:blank': BLANK_MD, 'template:talk': TALK_MD, 'template:recording': RECORDING_MD};

// ---------- DOM refs ----------
const editor = document.getElementById('editor');
const stage = document.getElementById('stage');
const world = document.getElementById('world');
const svg = document.getElementById('connectors');
const breadcrumbs = document.getElementById('breadcrumbs');
const statusCount = document.getElementById('status-count');
const statusErr = document.getElementById('status-err');
const mmSvg = document.getElementById('mm-svg');
const mmLabel = document.getElementById('mm-label');
const editorPane = document.getElementById('editor-pane');

// ---------- layout constants ----------
// cards are NODE_W wide unless their content needs more (wide tables, columns, diagrams, embeds)
const BLEED_H = 540, BLEED_BANDS = 96;   // an image card's height (16:9 at the widest card), less the heading and caption bands
const NODE_W = 440, WIDE_W = 720, XWIDE_W = 960, NODE_H_EST = 180, SPACING_X = 540,
      VERTICAL_GAP = 100, RADIAL_GAP = 110, RADIAL_MIN_STEP = 420;

// how much of the screen the current slide fills; +/- adjust it, remembered per browser
const SLIDE_FILL_MIN = 0.35, SLIDE_FILL_MAX = 1;
let slideFill = parseFloat(load('slidetake:slideSize')) || 0.92;

let nodes = new Map();   // id -> node
let order = [];          // DFS pre-order of node ids
let roots = [];
let currentId = null;
// layouts in the order they're offered (alphabetical; keys 1–4 follow it). The one shown is ?layout=, else the
// reader's own choice, else path, made for presenting and video. A deck doesn't pick: the reader does.
const LAYOUTS = ['focus', 'path', 'radial', 'tree'];
let layoutMode = 'path';
let presenting = false;
let deck = {};           // settings from the deck's frontmatter: brand, logo, pip, pip_size, pip_shape, title
// global camera switch (◉ Camera / C): when off, camera comments are ignored, camera-only steps are
// skipped and slides get the whole screen. Every page load starts with it off; it comes on only by hand.
let cameraOff = true;
// Camera, Record and Fullscreen are always there. The camera is off until someone turns it on, and until
// then the deck's camera settings are ignored, so readers get slides using the whole screen. ?obs=host:port
// only fills in where OBS is (see loadObsSettings).
let cameraStream = null; // live webcam shown in the PIP box (◉ Camera)
const brandEl = document.getElementById('brand');
const pipEl = document.getElementById('pip');
const stageWrap = document.getElementById('stage-wrap');

// camera: looks at (x, y, z); zoom is the on-screen scale of things at that point
const cam = {x:0, y:0, zoom:0.6};
let camTween = null;

// ---------- storage (per-viewer convenience only) ----------
// Slidetake was called Traverse, then Markcast: settings saved under an old prefix are still read
function load(k){
  try {
    const v = localStorage.getItem(k);
    if (v !== null || !k.startsWith('slidetake:')) return v;
    const rest = k.slice(10);
    return localStorage.getItem('slidetake:' + rest) ?? localStorage.getItem('traverse:' + rest);
  }
  catch(e){ return null; }
}
function save(k, v){ try { localStorage.setItem(k, v); } catch(e){} }

function renderMd(body){
  try { return {html: window.marked ? window.marked.parse(body) : '<pre>'+escapeHtml(body)+'</pre>', err:null}; }
  catch(e){ return {html:'<p>(could not render)</p>', err:'render error'}; }
}





// Slidetake's own decks (brand: slidetake) write the name as the logo and the two-tone word, as the
// header does, wherever it appears in a card's text (not in code, or in italics: a quoted prompt)
const NAME_MARK = '<span class="st-name">' + LOGO + 'Slide<span class="st-take">take</span></span>';
/** @param {HTMLElement} body */
function markName(body){
  const walk = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {acceptNode: t=>
    /Slidetake/.test(t.nodeValue || '') && !t.parentElement?.closest('code, pre, kbd, svg, em, .st-name') ? 1 : 2});
  const hits = [];
  while (walk.nextNode()) hits.push(walk.currentNode);
  hits.forEach(t=>{
    const span = document.createElement('span');
    span.innerHTML = escapeHtml(t.nodeValue || '').replace(/Slidetake/g, NAME_MARK);
    t.replaceWith(...span.childNodes);
  });
}

function applyDeckSettings(){
  const name = deck.brand || '', logo = deck.logo || '';
  const chip = /^chip$/i.test(deck.brand_style || '');
  // brand: slidetake is Slidetake's own mark, the logo and the two-tone name, as in the header
  const html = /^slidetake$/i.test(name)
    ? '<span class="st-mark">' + LOGO + '<span class="word">Slide<span>take</span></span></span>'
    : (logo ? '<img alt="" src="'+escapeHtml(logo)+'">' : '') + (name ? '<span' + (chip ? ' class="chip"' : '') + '>'+escapeHtml(name)+'</span>' : '');
  if (brandEl.dataset.html !== html){
    brandEl.dataset.html = html;
    brandEl.innerHTML = html;
    const img = brandEl.querySelector('img');
    if (img) img.onload = img.onerror = ()=>refocus(true);
  }
  brandEl.hidden = !html;

  applyPipState();
  document.title = deck.title || 'Slidetake';
  applyColors();
  applyMode();
}

// ---------- colours ----------
// Everything is drawn from a few colour tokens (styles.css); Slidetake's own are seafoam green. Two
// things can replace them, the later winning:
//   window.SLIDETAKE.colors  a host site's: {accent, accentSoft, line, ring, header, headerText} for both
//                            modes, and/or {light: {…}, dark: {…}}; any CSS colour, gradients for header
//   accent: in a deck        one colour; both modes' shades come from its hue, set to the lightness each
//                            mode needs (bright on dark, deep enough to read on white)
const COLOR_TOKENS = {accent: '--accent', accentSoft: '--accent-teal', line: '--accent-line', ring: '--accent-ring',
  header: '--header-bg', headerText: '--header-ink', onAccent: '--on-accent'};
function deckColors(){
  const a = String(deck.accent || '').trim();
  if (!a || !window.CSS || !CSS.supports('color', a)) return null;
  if (!CSS.supports('color', 'oklch(from red l c h)')) return {accent: a, line: a};
  const at = l=>'oklch(from ' + a + ' ' + l + ' c h)';
  return {dark: {accent: at(0.80), accentSoft: at(0.87), line: at(0.50)},
    light: {accent: at(0.45), accentSoft: at(0.40), line: at(0.75), ring: at(0.70)}};
}
function applyColors(){
  let css = '';
  const rule = (sel, o)=>{
    const decl = Object.entries(o || {}).filter(([k, v])=>COLOR_TOKENS[k] && v && typeof v !== 'object')
      .map(([k, v])=>COLOR_TOKENS[k] + ':' + String(v).replace(/[;{}<>]/g, '')).join(';');
    if (decl) css += sel + '{' + decl + '}\n';
  };
  // what a source leaves out follows from the accent it gives, never from Slidetake's green. Embedded,
  // the site's colours come last and win over the deck's accent:, which is for slidetake.com and
  // `npx slidetake` (so a recording made there matches the site)
  [deckColors(), EMBED && EMBED.colors].filter(Boolean).forEach(c=>{
    ['dark', 'light'].forEach(mode=>{
      const m = {...c, ...(c[mode] || {})}, dark = mode === 'dark';
      if (m.accent && typeof m.accent === 'string'){
        m.accentSoft = m.accentSoft || m.accent;
        m.line = m.line || 'color-mix(in srgb, ' + m.accent + (dark ? ' 45%, #09090b)' : ' 55%, #fff)');
        m.ring = m.ring || (dark ? m.accent : m.line);
        m.onAccent = m.onAccent || (dark ? 'color-mix(in srgb, ' + m.accent + ' 15%, #000)' : '#fff');
      }
      rule(dark ? 'body:not([data-mode="light"])' : 'body[data-mode="light"]', m);
    });
  });
  let el = document.getElementById('st-colors');
  if (!el){ el = document.createElement('style'); el.id = 'st-colors'; document.head.appendChild(el); }
  if (el.textContent !== css) el.textContent = css;
  document.body.classList.toggle('st-header-color', css.includes('--header-bg'));
}
// a colour token as #rrggbb, read back from one drawn pixel: D2 and ECharts want plain hex, and a token can
// be any CSS colour (oklch, color-mix, a var)
let pixel = null;
function tokenHex(name){
  const probe = document.createElement('span');
  probe.style.color = 'var(' + name + ')';
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  pixel = pixel || Object.assign(document.createElement('canvas'), {width: 1, height: 1}).getContext('2d', {willReadFrequently: true});
  pixel.clearRect(0, 0, 1, 1);
  pixel.fillStyle = '#000';
  pixel.fillStyle = c;
  pixel.fillRect(0, 0, 1, 1);
  return '#' + [...pixel.getImageData(0, 0, 1, 1).data.slice(0, 3)].map(x=>x.toString(16).padStart(2, '0')).join('');
}
// t of colour a over b, both #rrggbb
function mixHex(a, b, t){
  const p = h=>[1, 3, 5].map(i=>parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return '#' + x.map((v, i)=>Math.round(v * t + y[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}

// ---------- light / dark ----------
const urlMode = new URLSearchParams(location.search).get('mode');
function currentMode(){
  // embedded: the host site's own choice (light, dark, or auto = the system's)
  if (EMBED && EMBED.themeKey && !urlMode){
    const v = load(EMBED.themeKey);
    if (v === 'light' || v === 'dark') return v;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  const m = String(urlMode || load('slidetake:mode') || deck.mode || 'dark').toLowerCase();
  return m === 'light' ? 'light' : 'dark';
}
function applyMode(){
  const light = currentMode() === 'light';
  if (light) document.body.dataset.mode = 'light'; else delete document.body.dataset.mode;
  const b = document.getElementById('btn-mode');
  if (b){
    b.innerHTML = light
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    b.title = (light ? 'Dark theme' : 'Light theme') + ' (L)';
    b.setAttribute('aria-label', b.title);
  }
}
function toggleMode(){
  const next = currentMode() === 'light' ? 'dark' : 'light';
  if (EMBED && EMBED.themeKey){ save(EMBED.themeKey, next); document.documentElement.classList.toggle('dark', next === 'dark'); }
  else save('slidetake:mode', next);
  applyMode();
  // charts and diagrams are drawn for one mode; redraw them for the other
  if (world.querySelector('.echarts-container, .diagram.d2, .diagram.dot')) rebuild(true);
}

// ---------- camera layouts ----------
// A preset is a few words applied on top of the deck's pip settings:
//   off · on · full · 18% (size) · top-left … bottom-right · flip (other side) · circle · rect · mirror · unmirror
function cameraList(){
  const raw = (deck.camera || '').replace(/^\[|\]$/g, '');
  const list = raw.split(',').map(x=>x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  return list.length ? list : ['on', 'full', 'off'];
}
// a slide's directive can list several layouts, "full, on": → steps through them before leaving the slide
function cameraSteps(n){
  return !cameraOff && n ? cameraPresets(n.camera) : [];
}
// A slide's steps are its camera layouts and its fragments (reveal-one-at-a-time items). Camera layouts
// up to the first one that shows the slide come first, then the fragments, then any remaining layouts,
// so "full, on" opens on camera and "on, full" ends on camera after everything is revealed.
let stepPos = 0;         // which of the current slide's steps is showing
function slideSteps(n){
  return stepsFor(cameraSteps(n), n && n.frags ? n.frags.length : 0);
}
function currentStep(){
  const steps = slideSteps(nodes.get(currentId));
  return steps[Math.min(stepPos, steps.length - 1)] || {cam:0, frag:0};
}
// the layout in force for the current slide: its own current step, otherwise the final step
// of the nearest directive before it in document order. A full-screen card is the slide alone, so the
// camera stays off it unless the card has its own directive (V still brings the camera back), and the
// slides after it carry on with the camera as before.
function slideCameraPreset(){
  if (!currentId) return null;
  const n = nodes.get(currentId);
  const own = cameraSteps(n);
  if (own.length) return own[Math.min(currentStep().cam, own.length - 1)];
  // (a re-read deck has its cards before they're built: no element yet, so nothing to check)
  if (n && n.el && n.el.classList.contains('card-full')) return 'off';
  for (let i = order.indexOf(currentId) - 1; i >= 0; i--){
    const steps = cameraSteps(nodes.get(order[i])); // order can be stale for a moment while the deck re-parses
    if (steps.length) return steps[steps.length - 1];
  }
  return null;
}
let camManual = null;    // preset picked with V; cleared when the slide changes
let camCycle = -1;
let pipState = null;
function computePipState(){
  const st = {
    corner: (deck.pip || 'none').toLowerCase(),
    size: clampPipSize(parseFloat(deck.pip_size) || 24),
    circle: (deck.pip_shape || '').toLowerCase() === 'circle',
    mirror: !/^(no|false|off)$/i.test(deck.pip_mirror || ''),
    full: false, off: false, flip: false, used: false
  };
  applyPreset(st, slideCameraPreset());
  // a layout picked with V shows the camera unless it is "off" itself, even on a slide that turns it off
  if (camManual && !/\b(off|hide)\b/i.test(camManual)) st.off = false;
  applyPreset(st, camManual);
  // a live camera or a camera preset needs somewhere to go even if the deck didn't set a corner
  if (!CORNERS.includes(st.corner) && (cameraStream || st.used)) st.corner = 'bottom-right';
  if (st.flip && CORNERS.includes(st.corner))
    st.corner = st.corner.includes('left') ? st.corner.replace('left', 'right') : st.corner.replace('right', 'left');
  return st;
}
function applyPipState(){
  const first = (!pipEl.hidden && pipEl.offsetWidth) ? pipEl.getBoundingClientRect() : null;
  const st = pipState = computePipState();
  const valid = CORNERS.includes(st.corner);
  // (a message showing in the box keeps its class through a re-layout: fullscreen, resizing, a new slide)
  pipEl.className = valid ? [st.corner, st.circle && 'circle', cameraStream && 'live', st.mirror && 'mirror', st.full && 'full', pipEl.classList.contains('msg') && 'msg'].filter(Boolean).join(' ') : '';
  pipEl.style.width = st.size + '%';
  pipEl.hidden = !valid || cameraOff || st.off;
  stageWrap.dataset.pip = pipEl.hidden || st.full ? 'none' : st.corner;
  if (pipEl.hidden || reduceMotion || !pipEl.animate) return;
  const ease = 'cubic-bezier(.65,0,.35,1)';
  if (!first){
    pipEl.animate([{opacity:0}, {opacity:1}], {duration:300, easing:'ease-out'});
    return;
  }
  // FLIP: start from where the box was and glide to where it is now (full ↔ corner, resize, flip)
  const last = pipEl.getBoundingClientRect();
  if (Math.abs(first.left - last.left) + Math.abs(first.top - last.top) + Math.abs(first.width - last.width) + Math.abs(first.height - last.height) < 2) return;
  pipEl.animate([
    {transformOrigin:'0 0', transform:'translate('+(first.left - last.left)+'px,'+(first.top - last.top)+'px) scale('+(first.width / last.width)+','+(first.height / last.height)+')'},
    {transformOrigin:'0 0', transform:'none'}
  ], {duration:600, easing:ease});
}
// where the PIP box will be once its CSS transition finishes, in stage coordinates
function pipRect(){
  const st = pipState;
  if (!st || pipEl.hidden || st.full) return null;
  const vw = stage.clientWidth, vh = stage.clientHeight, m = 16;
  const w = vw * st.size / 100, h = st.circle ? w : w * 9/16;
  const x0 = st.corner.includes('left') ? m : vw - m - w;
  const y0 = st.corner.includes('top') ? m : vh - m - h;
  return {x0, y0, x1:x0 + w, y1:y0 + h};
}
function cycleCamera(){
  if (!RECORDING_UI) return;
  if (cameraOff){ setCameraEnabled(true); return; }
  const list = cameraList();
  camCycle = (camCycle + 1) % list.length;
  camManual = list[camCycle];
  applyPipState();
  if (!presenting) showPipMsg('Camera: ' + camManual);
  if (!cameraStream && !pipEl.hidden) startWebcam(); // first visible layout opens the webcam
  else refocus();
}

function parseDeck(src){
  const parsed = parseDeckCore(src, {render: renderMd});
  deck = parsed.deck; nodes = parsed.nodes;
  applyDeckSettings();
  const format = {'+++': '+++ format', reveal: 'reveal.js format', headings: 'headings'}[parsed.format];
  statusCount.textContent = nodes.size + (nodes.size===1?' card':' cards') + ' · ' + format;
  statusErr.textContent = parsed.errCount ? (parsed.errCount + ' card(s) had errors') : '';
}

// ---------- topology (depth, leaf slots, DFS order) ----------
function computeTopology(){
  roots = [...nodes.values()].filter(n=>!n.parent).map(n=>n.id);
  let leafCounter = 0;
  function assign(id, depth){
    const n = nodes.get(id);
    n.depth = depth;
    if (n.children.length === 0){
      n._slot = leafCounter++;
    } else {
      n.children.forEach(c=>assign(c, depth+1));
      const slots = n.children.map(c=>nodes.get(c)._slot);
      n._slot = (Math.min(...slots) + Math.max(...slots)) / 2;
    }
  }
  roots.forEach(r=>assign(r, 0));
  order = [];
  function dfs(id){ order.push(id); nodes.get(id).children.forEach(dfs); }
  roots.forEach(dfs);
  return Math.max(1, leafCounter);
}

// ---------- layouts: every layout sets each node's centre (cx, cy, cz) ----------
function depthStats(){
  const maxH = [], maxW = [], count = [];
  nodes.forEach(n=>{
    maxH[n.depth] = Math.max(maxH[n.depth] || 0, n._h);
    maxW[n.depth] = Math.max(maxW[n.depth] || 0, n._w);
    count[n.depth] = (count[n.depth] || 0) + 1;
  });
  return {maxH, maxW, count, maxDepth: maxH.length - 1};
}
function applyManual(n){
  if (n.x !== null && !isNaN(n.x)) n.cx = n.x + n._w/2;
  if (n.y !== null && !isNaN(n.y)) n.cy = n.y + n._h/2;
}

// Top-down tree with cards of different widths: leaves are packed left to right per row, each parent
// is centred over its children, and a subtree slides right when it would overlap its row neighbour.
function layoutTree(){
  const {maxH, maxDepth} = depthStats();
  const rowTop = [0];
  for (let d=1; d<=maxDepth; d++) rowTop[d] = rowTop[d-1] + maxH[d-1] + VERTICAL_GAP;
  const GAP = SPACING_X - NODE_W;
  const rightEdge = [];   // rightmost card edge placed so far in each row
  const shift = (id, dx)=>{ const n = nodes.get(id); n.cx += dx; n.children.forEach(c=>shift(c, dx)); };
  const mark = id=>{ const n = nodes.get(id); rightEdge[n.depth] = Math.max(rightEdge[n.depth] ?? -Infinity, n.cx + n._w/2); n.children.forEach(mark); };
  function place(id){
    const n = nodes.get(id);
    const minLeft = rightEdge[n.depth] !== undefined ? rightEdge[n.depth] + GAP : -Infinity;
    if (!n.children.length){
      n.cx = (minLeft === -Infinity ? 0 : minLeft) + n._w/2;
    } else {
      n.children.forEach(place);
      n.cx = (nodes.get(n.children[0]).cx + nodes.get(n.children[n.children.length - 1]).cx) / 2;
      if (n.cx - n._w/2 < minLeft) shift(id, minLeft - (n.cx - n._w/2));
    }
    mark(id);
  }
  roots.forEach(place);
  nodes.forEach(n=>{
    n.cy = rowTop[n.depth] + n._h/2;
    applyManual(n);
  });
}

function layoutRadial(totalLeaves){
  const angleStep = (Math.PI * 2) / totalLeaves;
  // place ring by ring, each starting just outside the last and growing in small steps until none of
  // its cards overlap anything placed so far: the tightest rings the slot angles allow
  const GAP = 32;
  const placed = [];
  const overlaps = (a, b)=>Math.abs(a.cx - b.cx) < (a._w + b._w)/2 + GAP && Math.abs(a.cy - b.cy) < (a._h + b._h)/2 + GAP;
  const maxDepth = Math.max(0, ...[...nodes.values()].map(n=>n.depth));
  let prevR = 0;
  for (let d=0; d<=maxDepth; d++){
    const ring = [...nodes.values()].filter(n=>n.depth === d);
    if (!ring.length) continue;
    let radius = (d === 0) ? (roots.length > 1 ? RADIAL_MIN_STEP * 0.5 : 0) : prevR + RADIAL_GAP;
    for (let tries = 0; tries < 400; tries++){
      ring.forEach(n=>{
        const angle = (n._slot + 0.5) * angleStep - Math.PI/2;
        n.cx = radius * Math.cos(angle);
        n.cy = radius * Math.sin(angle);
        applyManual(n);
      });
      const clash = ring.some((n, i)=>ring.some((m, j)=>j > i && overlaps(n, m)) || placed.some(m=>overlaps(n, m)));
      if (!clash) break;
      radius = radius * 1.02 + 10;
    }
    prevR = radius;
    placed.push(...ring);
  }
}

// ---------- reveal.js markup inside a card ----------
// "<!-- .element: class=… -->" applies to the element just before it, or to its parent when nothing is
function applyElementComments(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const list = [];
  while (walker.nextNode()) list.push(walker.currentNode);
  list.forEach(c=>{
    const m = c.data.match(/^\s*\.element:\s*([\s\S]*)$/);
    if (!m) return;
    let prev = c.previousSibling;
    while (prev && prev.nodeType === 3 && !prev.data.trim()) prev = prev.previousSibling;
    const target = (prev && prev.nodeType === 1) ? prev : c.parentElement;
    if (!target) return;
    Object.entries(attrsOf(m[1])).forEach(([k, v])=>{
      if (k === 'class') target.classList.add(...v.split(/\s+/).filter(Boolean));
      else if (k === 'style') target.style.cssText += ';' + v;
      else target.setAttribute(k, v);
    });
  });
}
// fragments in reveal order: by data-fragment-index when given, otherwise document order
// ---------- images and YouTube in plain markdown ----------
// A card's media decides its layout, with no classes to write (the alt text is the caption):
//   one image or video alone        → media card: the image fills the card, caption below
//   one image + text                → split: the image on one side (the side it was written on), text on the other;
//                                     a YouTube video stays full width with its text above or below
//   a list of images or diagrams    → gallery; under <!-- steps --> a carousel, one per press
//   (under <!-- steps -->, two or more images or diagrams in a row are such a list)
//   several images in one paragraph → grid
//   a YouTube link alone on a line  → the video (next press plays it; leaving the slide pauses it)
// An SVG drawing kept to what draws: shapes, text, gradients, markers and filters. Scripts, styles, links,
// foreign content, animation and external references are dropped, and its ids are made its own.
const SVG_TAGS = new Set(('svg g defs symbol use path rect circle ellipse line polyline polygon text tspan textPath ' +
  'title desc marker linearGradient radialGradient stop clipPath mask pattern filter feGaussianBlur feOffset ' +
  'feBlend feFlood feComposite feMerge feMergeNode feColorMatrix feDropShadow').split(' '));
let svgCount = 0;
function inlineSvg(src){
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length) return null;
  const ns = root.namespaceURI;
  const clean = el=>{
    [...el.children].forEach(c=>{ if (c.namespaceURI !== ns || !SVG_TAGS.has(c.localName)) c.remove(); else clean(c); });
    [...el.attributes].forEach(a=>{
      const name = a.name.toLowerCase(), v = a.value;
      if (name.startsWith('on') || /javascript:|expression\(/i.test(v) || /url\(\s*['"]?(?!#)/i.test(v) ||
          ((name === 'href' || name === 'xlink:href') && !v.trim().startsWith('#'))) el.removeAttribute(a.name);
    });
  };
  clean(root);
  // two drawings on one page must not pick up each other's markers or gradients
  const pre = 'st-svg' + (++svgCount) + '-';
  [root, ...root.querySelectorAll('*')].forEach(e=>[...e.attributes].forEach(a=>{
    let v = a.name === 'id' ? pre + a.value : a.value.replace(/url\(\s*(['"]?)#/g, 'url($1#' + pre);
    if ((a.name === 'href' || a.name === 'xlink:href') && v.startsWith('#')) v = '#' + pre + v.slice(1);
    if (v !== a.value) a.value = v;
  }));
  return document.importNode(root, true);
}
// a block swapped for what it renders as (a diagram, a figure) keeps its place in the card's steps
function replaceBlock(old, neu){
  const stepped = old.classList.contains('fragment');
  ['fragment', 'fade-up', 'visible', 'current-fragment'].forEach(c=>{ if (old.classList.contains(c)){ neu.classList.add(c); old.classList.remove(c); } });
  if (old.dataset.fragmentIndex !== undefined){ neu.dataset.fragmentIndex = old.dataset.fragmentIndex; delete old.dataset.fragmentIndex; }
  old.replaceWith(neu);
  if (stepped) nodes.forEach(n=>n.frags && n.frags.forEach(g=>{ const i = g.indexOf(old); if (i >= 0) g[i] = neu; }));
}
function figureFor(img){
  const fig = document.createElement('figure');
  fig.className = 'media';
  replaceBlock(img, fig);
  fig.appendChild(img);
  const alt = img.getAttribute('alt');
  if (alt) fig.insertAdjacentHTML('beforeend', '<figcaption>' + escapeHtml(alt) + '</figcaption>');
  return fig;
}
function youtubeFigure(v, caption){
  const fig = document.createElement('figure');
  fig.className = 'media yt fragment yt-play' + (v.portrait ? ' portrait' : '');
  fig.innerHTML = '<div class="frame"><iframe src="' + embedUrl(v) + '" title="' + escapeHtml(caption || 'YouTube video') +
    '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>' +
    (caption ? '<figcaption>' + escapeHtml(caption) + '</figcaption>' : '');
  return fig;
}
// up to four images a row, each row sharing the card's height, so a long set stays on the slide
function gridSize(el, n){
  const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
  el.style.setProperty('--cols', cols);
  el.style.setProperty('--rows', Math.ceil(n / cols));
}
// a paragraph holding only images (and line breaks), or only one link
const onlyImages = p=>p.querySelector('img') && !p.textContent.trim() && [...p.children].every(c=>/^(IMG|BR)$/.test(c.tagName));
function applyMedia(el, body){
  // ```svg: drawn inline, so it can use the deck's colours (currentColor, var(--text), var(--accent) …) and
  // switch with dark and light; only drawing elements survive, so nothing inside it can run script
  body.querySelectorAll('pre > code.language-svg').forEach(code=>{
    const svg = inlineSvg(code.textContent.trim());
    const box = document.createElement('div');
    box.className = svg ? 'diagram svg' : 'diagram err';
    if (svg) box.appendChild(svg); else box.textContent = 'SVG error: not a valid <svg> drawing';
    replaceBlock(code.parentElement, box);
  });
  // YouTube: a link alone on its line, or written as an image ![caption](https://youtu.be/…)
  body.querySelectorAll(':scope > p').forEach(p=>{
    const only = p.children.length === 1 ? p.children[0] : null;
    if (!only) return;
    const href = only.tagName === 'A' && p.textContent.trim() === only.textContent.trim() ? only.getAttribute('href')
      : only.tagName === 'IMG' ? only.getAttribute('src') : null;
    const v = href && youtubeVideo(href);
    if (v) replaceBlock(p, youtubeFigure(v, only.tagName === 'IMG' ? only.getAttribute('alt') : ''));
  });
  // lists whose items are each just an image or a diagram or chart: a gallery
  body.querySelectorAll(':scope > ul, :scope > ol').forEach(list=>{
    const items = [...list.children];
    if (!items.length || !items.every(li=>isImageItem(li) || isDiagramItem(li))) return;
    list.classList.add('gallery');
    if (items.some(li=>!isImageItem(li))) list.classList.add('diagrams');
    items.forEach(li=>{ if (!isImageItem(li)) return; const img = li.querySelector('img'); li.innerHTML = ''; li.appendChild(img); figureFor(img); });
    // under <!-- steps -->: a carousel, one visual at a time and large; the first is up before any press
    if (items.length > 1 && items.every(li=>li.classList.contains('fragment'))){
      list.classList.add('carousel');
      items[0].classList.remove('fragment', 'fade-up');
      items.forEach((li, i)=>{
        li.classList.replace('fade-up', 'current-visible');
        const cap = li.querySelector('figcaption');
        if (cap) cap.dataset.count = (i + 1) + ' / ' + items.length;
      });
    } else gridSize(list, items.length);
  });
  // paragraphs of images: one image is a figure, several a grid
  body.querySelectorAll(':scope > p').forEach(p=>{
    if (!onlyImages(p)) return;
    const imgs = [...p.querySelectorAll('img')];
    if (imgs.length === 1){ replaceBlock(p, imgs[0]); figureFor(imgs[0]); return; }
    const grid = document.createElement('div');
    grid.className = 'gallery grid';
    replaceBlock(p, grid);
    imgs.forEach(img=>{ grid.appendChild(img); figureFor(img); });
    gridSize(grid, imgs.length);
  });
  // the card's layout, from what's left beside its heading
  const parts = [...body.children].filter(c=>!/^H[1-6]$/.test(c.tagName) && !(c.nodeType === 1 && c.tagName === 'HR'));
  const media = parts.filter(c=>c.matches('figure.media'));
  if (media.length === 1 && parts.length === 1) el.classList.add('card-media');
  // <!-- view: full --> makes the card a 16:9 frame for its image, placed like any other slide
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_COMMENT);
  while (walker.nextNode()) if (/^\s*view\s*:\s*full\s*$/i.test(walker.currentNode.data)) el.classList.add('card-full');
  // an image or a carousel alone runs edge to edge, the heading and caption laid over it; one image with
  // text beside it makes a split card (a YouTube video stays full width, under its text)
  if (parts.length === 1 && (parts[0].matches('figure.media:not(.yt)') || parts[0].matches('.gallery.carousel:not(.diagrams)'))) el.classList.add('card-bleed');
  else if (media.length === 1 && parts.length > 1 && !media[0].matches('.yt')){
    el.classList.add('card-split', parts.indexOf(media[0]) === 0 ? 'media-first' : 'media-last');
    const text = document.createElement('div');
    text.className = 'split-text';
    parts.filter(c=>c !== media[0]).forEach(c=>text.appendChild(c));
    media[0].after(text);
    if (parts.indexOf(media[0]) !== 0) text.after(media[0]);
  }
  if (body.querySelector('.gallery')) el.classList.add('card-gallery');
}
// next press plays a slide's YouTube video; leaving or stepping back pauses it
function youtubeCommand(fig, func){
  const f = fig.querySelector('iframe');
  if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({event: 'command', func, args: []}), '*');
}

// <!-- steps --> reveals what follows it one press at a time, to the end of the card or a <!-- steps: off -->:
// a list one item per press, anything else (a paragraph, a quote, a table, a diagram) as one press
function applyStepsComments(root){
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const found = [];
  while (walker.nextNode()) if (/^\s*steps\s*$/i.test(walker.currentNode.data)) found.push(walker.currentNode);
  found.forEach(c=>{
    for (let next = c.nextSibling; next; next = next.nextSibling){
      if (next.nodeType === 8 && /^\s*steps\s*:\s*off\s*$/i.test(next.data)) break;
      if (next.nodeType !== 1 || next.classList.contains('fragment')) continue;
      if (/^(UL|OL)$/.test(next.tagName)) next.querySelectorAll(':scope > li').forEach(li=>li.classList.add('fragment', 'fade-up'));
      else next.classList.add('fragment', 'fade-up');
    }
  });
}
// visual blocks: what renders as a picture, so it can sit in a gallery or a carousel
const DIAGRAM_CODE = ['dot', 'd2', 'echarts', 'svg'].map(l=>':scope > code.language-' + l).join(', ');
const isImageItem = e=>!!e.querySelector('img') && !e.textContent.trim();
const isDiagramItem = e=>e.children.length === 1 &&
  ((e.children[0].tagName === 'PRE' && !!e.children[0].querySelector(DIAGRAM_CODE)) || e.children[0].matches('div.diagram'));
// under <!-- steps -->, two or more visuals in a row become a list, so they show as one carousel rather than a stack
function groupVisualRuns(root){
  const visual = e=>e.classList.contains('fragment') && (
    (e.tagName === 'P' && e.children.length === 1 && e.children[0].tagName === 'IMG' && !e.textContent.trim()
      && !youtubeVideo(e.children[0].getAttribute('src') || '')) ||
    (e.tagName === 'PRE' && !!e.querySelector(DIAGRAM_CODE)));
  const runs = [];
  let run = [];
  [...root.children].forEach(e=>{
    if (visual(e)) run.push(e);
    else { if (run.length > 1) runs.push(run); run = []; }
  });
  if (run.length > 1) runs.push(run);
  runs.forEach(r=>{
    const list = document.createElement('ul');
    r[0].before(list);
    r.forEach(e=>{
      const li = document.createElement('li');
      li.className = 'fragment fade-up';
      e.classList.remove('fragment', 'fade-up');
      li.appendChild(e);
      list.appendChild(li);
    });
  });
}
function collectFragments(root){
  const items = [...root.querySelectorAll('.fragment')].map((e, i)=>({e, i, k:e.dataset.fragmentIndex}));
  if (items.every(x=>x.k === undefined)) return items.map(x=>[x.e]);
  let next = 0;
  items.forEach(x=>{ x.k = x.k === undefined ? next : parseFloat(x.k); next = Math.max(next, x.k) + 1; });
  items.sort((a, b)=>a.k - b.k || a.i - b.i);
  const groups = [];
  items.forEach((x, j)=>{
    if (j && items[j-1].k === x.k) groups[groups.length-1].push(x.e);
    else groups.push([x.e]);
  });
  return groups;
}
function applyFragments(n, count, snap){
  if (!n || !n.frags) return;
  if (snap) n.el.classList.add('snap');
  n.frags.forEach((g, i)=>g.forEach(e=>{
    const was = e.classList.contains('visible');
    e.classList.toggle('visible', i < count);
    e.classList.toggle('current-fragment', i === count - 1);
    if (e.classList.contains('yt-play') && was !== (i < count) && !snap) youtubeCommand(e, i < count ? 'playVideo' : 'pauseVideo');
  }));
  if (snap){ void n.el.offsetWidth; n.el.classList.remove('snap'); }
}
// relative image and link paths resolve against the deck's own location (?src= or base:)
let deckBase = null;
function deckBaseUrl(){
  try { return deck.base ? new URL(deck.base, deckBase || location.href) : (deckBase ? new URL(deckBase) : null); }
  catch(e){ return null; }
}
function resolveUrls(root){
  const base = deckBaseUrl();
  let unresolved = 0;
  root.querySelectorAll('img[src], source[src], video[src], iframe[src], a[href]').forEach(el=>{
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    const v = el.getAttribute(attr);
    if (!v || /^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(v)) return;
    // with no base, a path from the site's root (/favicon.svg) loads as it is; only a relative one can't
    if (!base){ if (attr === 'src' && !v.startsWith('/')) unresolved++; return; }
    let site = base;
    try { if (deck.site) site = new URL(deck.site, base); } catch(e){}
    el.setAttribute(attr, new URL(v, v.startsWith('/') ? site : base).href);
  });
  return unresolved;
}
// width the card needs: wide tables and code, columns, logo grids, diagrams, charts and embeds get more room
function sizeCard(n){
  const el = n.el, b = el.querySelector('.body');
  el.classList.add('measuring');
  b.style.zoom = '';
  let w = NODE_W;
  // a chart, diagram or embed is a picture: its zoom shouldn't set the section's text size
  n.visual = !!b.querySelector('iframe, .echarts-container, pre > code.language-dot, pre > code.language-d2, pre > code.language-echarts, .diagram, figure.media');
  if (n.visual) w = XWIDE_W;
  // an image card takes its layout from the image's shape (the widest image, for a carousel):
  //   portrait or near-square → image on the right at the card's height, the heading and caption beside it
  //   wider     → image edge to edge across the card, the heading above it and the caption below
  //   16:9 → the image fills the card, the heading and caption over it
  // A <!-- view: full --> card is 16:9 and fits its image whole (one nearly 16:9 just fills it): an image narrow enough to leave
  // room beside it sits on the right with the text in that room, as a portrait card does; a wider one fills
  // the card with the text over it.
  const full = el.classList.contains('card-full');
  el.classList.remove('img-portrait', 'img-landscape', 'img-overlay', 'img-cover');
  if (full) w = XWIDE_W;
  if (el.classList.contains('card-bleed')){
    const aspect = Math.max(0, ...[...b.querySelectorAll('img')].map(i=>i.naturalWidth && i.naturalHeight ? i.naturalWidth / i.naturalHeight : 0)) || 16 / 9;
    const roomBeside = XWIDE_W - BLEED_H * aspect >= 260;
    if (full && roomBeside){
      el.classList.add('img-portrait');
      el.style.setProperty('--img-w', Math.round(BLEED_H * aspect) + 'px');
      w = XWIDE_W;
    }
    else if (full || Math.abs(aspect - 16 / 9) < 0.08){
      el.classList.add('img-overlay'); w = XWIDE_W;
      // nearly 16:9 (a 1200×630 link preview, say): fill the frame, losing a sliver at the sides, rather
      // than leave thin bars above and below
      if (aspect >= 16 / 9 && aspect <= 16 / 9 * 1.15) el.classList.add('img-cover');
    }
    else if (aspect < 1.3){
      const iw = Math.min(Math.round(BLEED_H * aspect), XWIDE_W - 300);   // leave the text at least 300px
      el.classList.add('img-portrait');
      el.style.setProperty('--img-w', iw + 'px');
      w = Math.min(XWIDE_W, Math.max(WIDE_W, iw * 2));
    } else {
      el.classList.add('img-landscape');
      w = Math.round(Math.max(NODE_W, Math.min(XWIDE_W, (BLEED_H - BLEED_BANDS) * aspect)));
      el.style.setProperty('--img-h', Math.round(w / aspect) + 'px');
    }
  }
  else if (b.querySelector('[style*="flex"], [style*="grid"], .r-hstack') || b.querySelectorAll('img').length >= 4) w = WIDE_W;
  // tables get the width they naturally need (laid out with the widest card's room), not a tier by
  // column count, so a compact table doesn't leave a third of the card empty
  const tables = b.querySelectorAll('table');
  if (tables.length){
    el.style.width = XWIDE_W + 'px';
    const pad = el.offsetWidth - b.clientWidth;   // card padding and border
    // long cell text wraps rather than stretching the card past WIDE_W; real overflow is handled below
    // (+12: offsetWidth rounds down, and a table at its exact width starts wrapping)
    tables.forEach(t=>{ w = Math.max(w, Math.min(WIDE_W, Math.ceil(t.offsetWidth) + pad + 12)); });
  }
  // code gets the width its longest line needs, so it doesn't scroll unless it's wider than the widest card
  const codes = b.querySelectorAll('pre');
  if (codes.length){
    el.style.width = XWIDE_W + 'px';
    const pad = el.offsetWidth - b.clientWidth;
    codes.forEach(p=>{
      p.style.width = 'max-content';
      w = Math.max(w, Math.min(XWIDE_W, Math.ceil(p.offsetWidth) + pad + 2));
      p.style.width = '';
    });
  }
  // a "grow" fragment ends up 1.3x its size; leave room so its last step stays inside the card
  const growers = b.querySelectorAll('.fragment.grow');
  if (growers.length){
    el.style.width = w + 'px';
    const pad = el.offsetWidth - b.clientWidth;
    growers.forEach(g=>{ w = Math.max(w, Math.min(XWIDE_W, Math.ceil(g.offsetWidth * 1.3) + pad)); });
  }
  el.style.width = w + 'px';
  if (el.scrollWidth > w + 2) el.style.width = (w = Math.min(XWIDE_W, el.scrollWidth + 24)) + 'px';
  if (b.scrollWidth > b.clientWidth + 2) b.style.zoom = (b.clientWidth / b.scrollWidth).toFixed(3);
  n._w = w;
  n._h = el.offsetHeight || NODE_H_EST;
  el.classList.remove('measuring');
}
// images arrive after the first layout; re-measure once they settle
let relayoutTimer = null;
function relayoutSoon(){
  clearTimeout(relayoutTimer);
  relayoutTimer = setTimeout(()=>{ nodes.forEach(sizeCard); position(); refocus(true); }, 200);
}

// ---------- diagrams (Graphviz dot) and charts (ECharts), loaded only when a deck uses them ----------
const VIZ_URL = 'https://cdn.jsdelivr.net/npm/@viz-js/viz@3.4.0/lib/viz-standalone.js';
const ECHARTS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js';
// charts in the deck's palette, its accent first, redrawn when the theme flips; a chart that sets its own
// colors keeps them
const ECHARTS_THEME = {
  dark: {palette: ['#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#facc15', '#a1a1aa'],
    text: '#e4e4e7', muted: '#a1a1aa', line: '#3f3f46', split: '#27272a', tip: '#18181b'},
  light: {palette: ['#2563eb', '#db2777', '#7c3aed', '#ea580c', '#ca8a04', '#71717a'],
    text: '#27272a', muted: '#71717a', line: '#d4d4d8', split: '#e4e4e7', tip: '#ffffff'},
};
// one theme per mode and accent, so a deck in another accent (or the other mode) gets its own; light mode
// fills with the ring colour, the deep accent being dark enough for text and heavy as a bar
function chartTheme(){
  const mode = currentMode() === 'light' ? 'light' : 'dark', accent = tokenHex(mode === 'light' ? '--accent-ring' : '--accent');
  const name = 'slidetake-' + mode + '-' + accent.slice(1);
  if (!chartThemes.has(name)){ registerChartTheme(name, ECHARTS_THEME[mode], accent); chartThemes.add(name); }
  return name;
}
const chartThemes = new Set();
function registerChartTheme(name, t, accent){
  const axis = {axisLine: {lineStyle: {color: t.line}}, axisTick: {lineStyle: {color: t.line}},
    axisLabel: {color: t.muted}, splitLine: {lineStyle: {color: t.split}}, nameTextStyle: {color: t.muted}};
  echarts.registerTheme(name, {
    color: [accent, ...t.palette], backgroundColor: 'transparent',
    textStyle: {color: t.text, fontFamily: "'IBM Plex Sans', sans-serif"},
    title: {textStyle: {color: t.text}, subtextStyle: {color: t.muted}},
    legend: {textStyle: {color: t.text}},
    tooltip: {backgroundColor: t.tip, borderColor: t.line, textStyle: {color: t.text}},
    categoryAxis: axis, valueAxis: axis, logAxis: axis, timeAxis: axis,
    line: {symbolSize: 6, lineStyle: {width: 2.5}},
    // ECharts' own pie labels are #333 with a white outline: a dark smudge in a white halo on a dark card
    pie: {label: {color: t.text, textBorderWidth: 0}, labelLine: {lineStyle: {color: t.muted}}},
    funnel: {label: {color: t.text, textBorderWidth: 0}},
  });
}
// D2 (https://d2lang.com) ships as an ES module; it loads only when a deck has a ```d2 block
const D2_URL = 'https://esm.sh/@terrastruct/d2@0.1.33';
let d2 = null;
// D2's palette slots, per mode: N = neutrals (text to page), B = the deck's accent and its tints over the card
const D2_NEUTRALS = {
  dark: {N1:'#e4e4e7', N2:'#a1a1aa', N3:'#a1a1aa', N4:'#323238', N5:'#27272a', N6:'#18181b', N7:'#09090b'},
  light: {N1:'#27272a', N2:'#71717a', N3:'#71717a', N4:'#e4e4e7', N5:'#e4e4e7', N6:'#f4f4f5', N7:'#ffffff'}
};
function d2Theme(){
  const mode = currentMode() === 'light' ? 'light' : 'dark', card = tokenHex('--node-bg');
  // dark tints the bright accent into the card; light tints the line colour, the deep accent being for text
  const tint = mode === 'dark' ? tokenHex('--accent') : tokenHex('--accent-line');
  const steps = mode === 'dark' ? [0.58, 0.38, 0.25, 0.18, 0.12] : [0.7, 0.45, 0.25, 0.15, 0.08];
  // N7 is the colour D2 paints behind the whole diagram: the card's own, so the diagram sits on the card
  const t = {...D2_NEUTRALS[mode], N7: card, B1: tokenHex('--accent')};
  steps.forEach((x, i)=>{ t['B' + (i + 2)] = mixHex(tint, card, x); });
  return t;
}
// Graphviz in the deck's colours, for dark or light: written at the top of the diagram, so anything the
// diagram sets itself (a colour, a background) comes after and wins
function dotTheme(){
  const text = tokenHex('--text'), muted = tokenHex('--text-muted'), accent = tokenHex('--accent');
  const font = '"Helvetica,Arial,sans-serif"';
  return ' graph [bgcolor=transparent color="' + muted + '" fontcolor="' + text + '" fontname=' + font + ']' +
    ' node [color="' + accent + '" fontcolor="' + text + '" fontname=' + font + ']' +
    ' edge [color="' + muted + '" fontcolor="' + muted + '" fontname=' + font + '] ';
}
/** @param {string} code @param {string} theme */
const withDotTheme = (code, theme)=>code.replace('{', '{' + theme);
// ELK lays out D2's containers more cleanly than the default; a deck's own d2-config still wins
const withD2Defaults = code=>/d2-config\s*:/.test(code) ? code : 'vars: {\n  d2-config: {\n    layout-engine: elk\n  }\n}\n' + code;
const scripts = {};
function loadScript(url){
  return scripts[url] || (scripts[url] = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = url; s.onload = resolve;
    s.onerror = ()=>{ delete scripts[url]; reject(new Error('could not load ' + url)); };
    document.head.appendChild(s);
  }));
}
let buildGen = 0, viz = null;
async function renderRich(){
  const gen = buildGen;
  const dots = [...world.querySelectorAll('.node pre > code.language-dot')];
  // ```echarts fences (as on sakthipriyan.com's blogs) become the same chart boxes as the HTML form
  world.querySelectorAll('.node pre > code.language-echarts').forEach(code=>{
    const div = document.createElement('div');
    div.className = 'echarts-container';
    div.dataset.chart = code.textContent;
    replaceBlock(code.parentElement, div);
  });
  const charts = [...world.querySelectorAll('.node .echarts-container[data-chart]')];
  const d2s = [...world.querySelectorAll('.node pre > code.language-d2')];
  if (!dots.length && !charts.length && !d2s.length) return;
  const problems = [];
  if (dots.length){
    try {
      await loadScript(VIZ_URL);
      viz = viz || await Viz.instance();
      if (gen !== buildGen) return;
      const theme = dotTheme();
      dots.forEach(code=>{
        const box = document.createElement('div');
        box.className = 'diagram dot';
        try { box.appendChild(viz.renderSVGElement(withDotTheme(code.textContent, theme))); }
        catch(e){ box.className = 'diagram err'; box.textContent = 'Diagram error: ' + e.message; }
        replaceBlock(code.parentElement, box);
      });
    } catch(e){ problems.push('diagrams'); }
  }
  if (d2s.length){
    try {
      if (!d2){ const mod = await import(/* runtime, not bundled */ D2_URL); d2 = new mod.D2(); }
      if (gen !== buildGen) return;
      const theme = d2Theme();
      for (const code of d2s){
        const box = document.createElement('div');
        box.className = 'diagram d2';
        try {
          const result = await d2.compile(withD2Defaults(code.textContent));
          box.innerHTML = await d2.render(result.diagram, {...(result.renderOptions || {}), themeOverrides: theme, darkThemeOverrides: theme});
        } catch(e){ box.className = 'diagram err'; box.textContent = 'Diagram error: ' + (e.message || e); }
        if (gen !== buildGen) return;
        replaceBlock(code.parentElement, box);
      }
    } catch(e){ problems.push('D2 diagrams'); }
  }
  if (charts.length){
    try {
      await loadScript(ECHARTS_URL);
      if (gen !== buildGen) return;
      const theme = chartTheme();
      charts.forEach(div=>{
        let opt;
        try { opt = JSON.parse(div.dataset.chart); }
        catch(e){ div.textContent = 'Chart data is not valid JSON.'; return; }
        // SVG stays sharp however far the camera zooms in
        echarts.init(div, theme, {renderer:'svg'}).setOption(Object.assign({backgroundColor:'transparent', animation:!reduceMotion}, opt));
      });
    } catch(e){ problems.push('charts'); }
  }
  if (gen !== buildGen) return;
  if (problems.length) statusErr.textContent = 'Could not load the ' + problems.join(' and ') + ' renderer (offline?)';
  // diagrams and charts change card sizes
  nodes.forEach(sizeCard);
  position();
  refocus(true);
}

// Path: a staircase in presenting order. Each section is one row read left to right (1 → 1.1 → 1.2);
// the next section starts on a new row directly beneath where the last one ended (1.2 ↓ 2 → 2.1 → 2.2),
// so every move is a short step right or a short step down.
function sectionRuns(){
  const runs = [];
  order.forEach(id=>{
    const sec = sectionOf(id), last = runs[runs.length - 1];
    if (last && last.sec === sec) last.ids.push(id); else runs.push({sec, ids:[id]});
  });
  return runs;
}
function layoutPath(){
  const GAP = 90, ROW_GAP = 120;
  let y = 0, startX = 0, prevH = 0;
  sectionRuns().forEach((run, ri)=>{
    const h = Math.max(...run.ids.map(id=>nodes.get(id)._h));
    if (ri) y += prevH / 2 + ROW_GAP + h / 2;
    let x = startX, lastCx = startX;
    run.ids.forEach((id, i)=>{
      const n = nodes.get(id);
      // the row's first card is centred under the previous row's last card
      if (i) x += GAP + n._w / 2;
      n.cx = x; n.cy = y;
      lastCx = x;
      x += n._w / 2;
    });
    startX = lastCx;
    prevH = h;
  });
}
// Focus: every card in the same place; only the current one is shown
function layoutFocus(){
  nodes.forEach(n=>{ n.cx = 0; n.cy = 0; });
}

// ---------- render ----------
function build(){
  buildGen++;
  if (window.echarts) world.querySelectorAll('.echarts-container').forEach(d=>{ const c = echarts.getInstanceByDom(d); if (c) c.dispose(); });
  world.querySelectorAll('div.node').forEach(el=>el.remove());
  const totalLeaves = computeTopology();
  let unresolved = 0;
  nodes.forEach(n=>{
    const el = document.createElement('div');
    el.className = 'node';
    el.tabIndex = 0;
    el.dataset.id = n.id;
    const crumb = n.parent ? breadcrumbPath(n.id).slice(0,-1).map(id=>nodes.get(id).title).join(' / ') : '';
    el.innerHTML =
      (crumb ? '<div class="crumb">'+escapeHtml(crumb)+'</div>' : '') +
      '<div class="body">'+n.html+'</div>' +
      (n.err ? '<div class="err-badge">!</div>' : '');
    const body = el.querySelector('.body');
    applyElementComments(body);
    applyStepsComments(body);
    groupVisualRuns(body);
    applyMedia(el, body);
    if (/^slidetake$/i.test(deck.brand || '')) markName(body);
    // a markdown table needs a header row; a blank one (| | |) is only there to satisfy the syntax
    body.querySelectorAll('thead').forEach(h=>{ if (!h.textContent.trim()) h.remove(); });
    unresolved += resolveUrls(body);
    n.frags = collectFragments(body);
    body.querySelectorAll('img').forEach(img=>{ if (!img.complete) img.addEventListener('load', relayoutSoon, {once:true}); });
    el.querySelectorAll('a[href]').forEach(a=>{
      const href = a.getAttribute('href');
      if (href.startsWith('#')){
        const target = decodeURIComponent(href.slice(1));
        if (nodes.has(target)){
          a.classList.add('xlink');
          a.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); if (!rec.active) navigate(target); });
        }
      } else {
        a.target = '_blank'; a.rel = 'noopener';
        a.addEventListener('click', e=>e.stopPropagation());
      }
    });
    el.addEventListener('click', ()=>{ if (!rec.active) navigate(n.id); });
    el.addEventListener('keydown', e=>{ if (e.key === 'Enter' && e.target === el) navigate(n.id); });
    world.appendChild(el);
    n.el = el;
    // cards that aren't the current slide show their finished state
    applyFragments(n, n.frags.length);
  });
  if (unresolved && !statusErr.textContent) statusErr.textContent = unresolved + ' image(s) use relative paths: add base: to the deck, or open it with ?src=';
  // measure real card sizes before laying out, so spacing clears actual content
  nodes.forEach(sizeCard);
  position(totalLeaves);
  renderRich();
}

function position(totalLeaves){
  if (totalLeaves === undefined) totalLeaves = computeTopology();
  if (layoutMode === 'radial') layoutRadial(totalLeaves);
  else if (layoutMode === 'path') layoutPath();
  else if (layoutMode === 'focus') layoutFocus();
  else layoutTree();
  world.classList.toggle('focus', layoutMode === 'focus');
  nodes.forEach(n=>{
    const s = n.el.style;
    s.setProperty('--cx', n.cx); s.setProperty('--cy', n.cy);
  });
  drawEdges();
  updateActivePath();
  updateMinimap();
}

function drawEdges(){
  let path = '';
  if (layoutMode === 'focus'){ svg.innerHTML = ''; return; }
  if (layoutMode === 'path'){
    for (let i = 1; i < order.length; i++){
      const a = nodes.get(order[i - 1]), b = nodes.get(order[i]);
      path += '<path data-from="'+a.id+'" data-to="'+b.id+'" d="M '+a.cx+' '+a.cy+' L '+b.cx+' '+b.cy+'"/>';
    }
    svg.innerHTML = path;
    return;
  }
  nodes.forEach(n=>{
    if (!n.parent) return;
    const p = nodes.get(n.parent);
    if (layoutMode === 'radial'){
      path += '<path data-from="'+p.id+'" data-to="'+n.id+'" d="M '+p.cx+' '+p.cy+' L '+n.cx+' '+n.cy+'"/>';
    } else {
      const py = p.cy + p._h/2, cy = n.cy - n._h/2, my = py + (cy - py) / 2;
      path += '<path data-from="'+p.id+'" data-to="'+n.id+'" d="M '+p.cx+' '+py+' L '+p.cx+' '+my+' L '+n.cx+' '+my+' L '+n.cx+' '+cy+'"/>';
    }
  });
  svg.innerHTML = path;
}


function breadcrumbPath(id){
  const p = [];
  let cur = id;
  while (cur){ p.unshift(cur); cur = nodes.get(cur).parent; }
  return p;
}

// ---------- camera ----------
function applyCamera(){
  const vw = stage.clientWidth, vh = stage.clientHeight;
  world.style.transform = 'translate('+vw/2+'px,'+vh/2+'px) scale('+cam.zoom+') translate('+(-cam.x)+'px,'+(-cam.y)+'px)';
  updateMinimapViewport();
}

function stopCamera(){ if (camTween){ camTween.kill(); camTween = null; } }

// Fly to a target. Far jumps pull the camera back mid-flight so both ends stay in view.
function flyTo(t, instant){
  stopCamera();
  if (instant || reduceMotion || !window.gsap){ Object.assign(cam, t); applyCamera(); return; }
  const vw = stage.clientWidth;
  const dist = Math.hypot(t.x - cam.x, t.y - cam.y);
  const endZoom = t.zoom;
  const tl = gsap.timeline({onUpdate:applyCamera, onComplete:()=>{ camTween = null; }});
  const {zoom, ...rest} = t;
  // short hops are quick, long journeys take longer; only long ones pull back to keep both ends in view
  const travel = dist * Math.min(cam.zoom, endZoom);
  const dur = Math.max(0.55, Math.min(1.3, 0.55 + travel / vw * 0.3));
  tl.to(cam, {...rest, duration:dur, ease:'power2.inOut'}, 0);
  if (travel > vw * 1.2){
    const dip = Math.max(0.06, Math.min(cam.zoom, endZoom, (vw * 0.9) / (dist + NODE_W)));
    tl.to(cam, {zoom:dip, duration:dur / 2, ease:'sine.out'}, 0)
      .to(cam, {zoom:endZoom, duration:dur / 2, ease:'sine.in'}, dur / 2);
  } else {
    tl.to(cam, {zoom:endZoom, duration:dur, ease:'power2.inOut'}, 0);
  }
  camTween = tl;
}

// ---------- safe area: the screen minus toolbars, the brand mark and the PIP camera ----------
function obstacles(){
  const sr = stage.getBoundingClientRect(), pad = 14, out = [];
  if (!brandEl.hidden && brandEl.offsetWidth){
    const r = brandEl.getBoundingClientRect();
    out.push({x0:r.left-sr.left-pad, y0:r.top-sr.top-pad, x1:r.right-sr.left+pad, y1:r.bottom-sr.top+pad});
  }
  const p = pipRect();
  if (p) out.push({x0:p.x0-pad, y0:p.y0-pad, x1:p.x1+pad, y1:p.y1+pad});
  return out;
}
// free rectangles left after cutting each obstacle out of the usable area
function safeRegions(){
  const vw = stage.clientWidth, vh = stage.clientHeight;
  let regions = [{x0:16, y0:presenting ? 20 : 56, x1:vw-16, y1:vh - (presenting ? 20 : 74)}];
  obstacles().forEach(o=>{
    const next = [];
    regions.forEach(r=>{
      if (o.x1 <= r.x0 || o.x0 >= r.x1 || o.y1 <= r.y0 || o.y0 >= r.y1){ next.push(r); return; }
      [{...r, x1:Math.min(r.x1, o.x0)}, {...r, x0:Math.max(r.x0, o.x1)},
       {...r, y1:Math.min(r.y1, o.y0)}, {...r, y0:Math.max(r.y0, o.y1)}]
        .forEach(s=>{ if (s.x1 - s.x0 > 80 && s.y1 - s.y0 > 80) next.push(s); });
    });
    if (next.length) regions = next;
  });
  return regions;
}
// the region that lets content of size w×h appear largest; sx/sy is its centre's offset from screen centre
function fitInSafe(w, h, fill){
  const vw = stage.clientWidth, vh = stage.clientHeight;
  let best = null;
  safeRegions().forEach(r=>{
    const zoom = fill * Math.min((r.x1 - r.x0) / w, (r.y1 - r.y0) / h);
    if (!best || zoom > best.zoom) best = {zoom, sx:(r.x0 + r.x1)/2 - vw/2, sy:(r.y0 + r.y1)/2 - vh/2};
  });
  return best;
}
// camera target that puts world point (x, y) at screen offset (sx, sy) at a given zoom
function aimAt(x, y, f, zoom){
  return {x:x - f.sx / zoom, y:y - f.sy / zoom};
}

function focusOn(id, instant){
  const n = nodes.get(id);
  if (!n) return;
  // scale the card up until it fills slideFill of the safe area in its tighter dimension, but keep
  // text one size across a section: cards share the section's typical zoom, and only a card that
  // wouldn't fit at it (a big table or chart) goes smaller. Charts and embeds don't vote: a section
  // of two charts and a list would otherwise show the list at the charts' small zoom
  const f = fitInSafe(n._w, n._h, slideFill);
  const sec = sectionOf(id);
  const peers = order.filter(x=>sectionOf(x) === sec && !nodes.get(x).visual).map(x=>{ const m = nodes.get(x); return fitInSafe(m._w, m._h, slideFill).zoom; }).sort((a, b)=>a - b);
  const steady = peers.length ? peers[Math.floor((peers.length - 1) / 2)] : f.zoom;
  const zoom = Math.max(0.2, Math.min(5, f.zoom, steady));
  flyTo(Object.assign(aimAt(n.cx, n.cy, f, zoom), {zoom}), instant);
}

function fitAll(instant){
  const all = [...nodes.values()];
  if (!all.length) return;
  const vw = stage.clientWidth, vh = stage.clientHeight;
  const minX = Math.min(...all.map(n=>n.cx - n._w/2)), maxX = Math.max(...all.map(n=>n.cx + n._w/2));
  const minY = Math.min(...all.map(n=>n.cy - n._h/2)),  maxY = Math.max(...all.map(n=>n.cy + n._h/2));
  const f = fitInSafe(maxX-minX, maxY-minY, 0.94);
  const zoom = Math.max(0.05, Math.min(1, f.zoom));
  flyTo(Object.assign(aimAt((minX+maxX)/2, (minY+maxY)/2, f, zoom), {zoom}), instant);
}

function refocus(instant){ if (currentId && nodes.has(currentId)) focusOn(currentId, instant); else fitAll(instant); }

// ---------- active path / dimming ----------
function updateActivePath(){
  const path = currentId ? breadcrumbPath(currentId) : [];
  nodes.forEach(n=>{
    const el = n.el;
    el.classList.toggle('current', n.id === currentId);
    el.classList.toggle('active-path', path.includes(n.id));
  });
  world.querySelectorAll('#connectors path').forEach(p=>{
    const lit = (layoutMode === 'path')
      ? !!currentId && order.indexOf(p.dataset.to) <= order.indexOf(currentId)
      : path.includes(p.dataset.from) && path.includes(p.dataset.to);
    p.classList.toggle('active', lit);
  });
  renderBreadcrumbs(path);
  updateProgress();
}

// shown while presenting in the path and focus layouts; it counts every press (reveals and camera
// steps as well as slides), so it moves evenly with the talk rather than jumping per slide
const progressEl = document.getElementById('progress');
progressEl.innerHTML = '<b></b><i></i>';
const talk = {start:0, timer:null};
function talkLength(){ return parseDuration(new URLSearchParams(location.search).get('duration') ?? deck.duration); }
// the timer is for the presenter: a take's footage shows progress only, unless the deck says timer: always
function timerVisible(){ return presenting && talkLength() > 0 && (!rec.active || /^always$/i.test(deck.timer || '')); }
function updateTimer(){
  const on = timerVisible() && talk.start > 0;
  progressEl.classList.toggle('timed', on);
  if (!on){ progressEl.classList.remove('over'); return; }
  const elapsed = rec.active && rec.t0 ? recNow() : performance.now() - talk.start;
  const frac = elapsed / talkLength();
  progressEl.firstChild.style.width = Math.min(100, frac * 100) + '%';
  progressEl.classList.toggle('over', frac >= 1);
}
function startTalkClock(){
  talk.start = performance.now();
  clearInterval(talk.timer);
  talk.timer = setInterval(updateTimer, 1000);
  updateTimer();
}
function stopTalkClock(){
  clearInterval(talk.timer);
  talk.timer = null; talk.start = 0;
  updateTimer();
}
function updateProgress(){
  const on = presenting && order.length > 1 && !/^(off|no|false)$/i.test(deck.progress || '');
  progressEl.classList.toggle('show', on);
  if (!on) return;
  updateTimer();
  const at = order.indexOf(currentId);
  let total = 0, done = 0;
  order.forEach((id, i)=>{
    const n = slideSteps(nodes.get(id)).length;
    total += n;
    if (i < at) done += n;
    else if (i === at) done += Math.min(stepPos, n - 1) + 1;
  });
  progressEl.lastChild.style.width = (total ? done / total * 100 : 0) + '%';
}
function renderBreadcrumbs(path){
  breadcrumbs.innerHTML = path.map((id,i)=>{
    const sep = i>0 ? '<span class="sep">›</span>' : '';
    return sep + '<button class="crumb-btn'+(id===currentId?' here':'')+'" data-id="'+escapeHtml(id)+'">'+escapeHtml(nodes.get(id).title)+'</button>';
  }).join('');
  breadcrumbs.querySelectorAll('.crumb-btn').forEach(b=>b.addEventListener('click', ()=>{ if (!rec.active) navigate(b.dataset.id); }));
}

// ---------- what the current slide shows: fragments, camera, entrance animations, autoslide ----------
function applyStepState(snap){
  const n = nodes.get(currentId);
  if (!n) return;
  applyFragments(n, currentStep().frag, snap);
  applyPipState();
  // entrance animations wait until the slide is actually on screen, not behind a full-screen camera
  if (pipEl.hidden || !pipState || !pipState.full) playEntrances(n);
  scheduleAutoslide(n);
}
// data-gsap='{"from":{…},"duration":1,"delay":2,"ease":"…"}' and .title-scramble, as on the site
const TRANSFORM_PROPS = ['x','y','xPercent','yPercent','scale','scaleX','scaleY','rotation','rotate','skewX','skewY'];
// The first and last cards animate in by themselves: the title scrambles, then each line fades up in turn.
// A deck that writes its own data-gsap entrances keeps them instead.
function autoEntrance(n){
  if (!order.length || (n.id !== order[0] && n.id !== order[order.length - 1])) return null;
  if (n.el.querySelector('[data-gsap], .title-scramble')) return null;
  return [...n.el.querySelector('.body').children].filter(el=>!el.classList.contains('fragment'));
}
function playEntrances(n){
  if (n._played || !window.gsap || reduceMotion) return;
  n._played = true;
  const auto = autoEntrance(n);
  if (auto && auto.length){
    n._auto = auto;
    const [head, ...rest] = auto;
    // a plain-text title scrambles; one with an icon or link in it just fades up with the rest
    if (/^H[1-3]$/.test(head.tagName) && !head.children.length){ head.classList.add('auto-scramble'); scramble(head); }
    else rest.unshift(head);
    gsap.from(rest, {opacity:0, y:24, duration:0.7, ease:'power2.out', delay:0.5, stagger:0.45});
  }
  n.el.querySelectorAll('[data-gsap]').forEach(el=>{
    let cfg;
    try { cfg = JSON.parse(el.dataset.gsap); } catch(e){ return; }
    const timing = {duration:cfg.duration ?? 1, delay:cfg.delay ?? 0, ease:cfg.ease || 'power2.out'};
    if (cfg.to) gsap.fromTo(el, cfg.from || {}, Object.assign({}, cfg.to, timing));
    else if (cfg.from) gsap.from(el, Object.assign({}, cfg.from, timing));
  });
  n.el.querySelectorAll('.title-scramble').forEach(scramble);
}
function resetEntrances(n){
  if (!n || !n._played) return;
  n._played = false;
  if (!window.gsap) return;
  if (n._auto){
    n._auto.forEach(el=>{ gsap.killTweensOf(el); gsap.set(el, {clearProps:'opacity,transform'}); });
    n._auto = null;
  }
  n.el.querySelectorAll('[data-gsap]').forEach(el=>{
    gsap.killTweensOf(el);
    let cfg = {};
    try { cfg = JSON.parse(el.dataset.gsap); } catch(e){}
    const props = new Set(Object.keys(Object.assign({}, cfg.from, cfg.to)).map(k=>TRANSFORM_PROPS.includes(k) ? 'transform' : k));
    // clear only what the animation touched, so the element keeps its own inline styles
    if (props.size) gsap.set(el, {clearProps:[...props].join(',')});
  });
  n.el.querySelectorAll('.title-scramble, .auto-scramble').forEach(el=>{
    if (el._scramble) el._scramble.kill();
    if (el.dataset.text) el.textContent = el.dataset.text;
  });
}
function scramble(el){
  const text = el.dataset.text || (el.dataset.text = el.textContent);
  const chars = Array.from(text), pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?';
  const st = {p:0};
  el._scramble = gsap.to(st, {p:1, duration:1.4, ease:'none',
    onUpdate(){
      const done = Math.floor(st.p * chars.length);
      el.textContent = chars.map((c, i)=>i < done || /\s/.test(c) ? c : pool[(Math.random() * pool.length) | 0]).join('');
    },
    onComplete(){ el.textContent = text; }});
}
// <section data-autoslide="2500"> / <!-- .slide: data-autoslide="5000" --> advance on their own while presenting
let autoTimer = null;
function scheduleAutoslide(n){
  clearTimeout(autoTimer);
  if (!presenting || !n || !n.autoslide || (rec.active && (!rec.t0 || rec.paused))) return;
  autoTimer = setTimeout(()=>{ if (currentId === n.id) step(1); }, n.autoslide);
}

// ---------- navigation ----------
// On /share the deck itself is in the hash (#deflate:…), and the slide goes after it (~id)
function setHash(id){
  const slide = id && id !== order[0] ? id : '';
  try {
    if (view && view.kind === 'share') history.replaceState(null, '', location.pathname + location.search + deckHash(view.data, slide));
    else history.replaceState(null, '', id ? '#' + encodeURIComponent(id) : location.pathname + location.search);
  } catch(e){}
}
function navigate(id, instant, atLastStep){
  if (!nodes.has(id)) return;
  if (id !== currentId){
    camManual = null; camCycle = -1;
    stepPos = atLastStep ? slideSteps(nodes.get(id)).length - 1 : 0;
    // in Focus the slide being left fades out under the incoming one
    const prev = nodes.get(currentId);
    if (prev && layoutMode === 'focus' && !instant){
      prev.el.classList.add('leaving');
      setTimeout(()=>prev.el.classList.remove('leaving'), 600);
    }
    leaveSlide();
  }
  const arriving = id !== currentId;
  if (arriving) arrivedFrom = currentId;
  currentId = id;
  clearTimeout(mapTimer); mapTimer = null;
  if (arriving && layoutMode === 'focus' && !instant && !reduceMotion){
    // start a touch small, then settle while it fades in
    const el = nodes.get(id).el;
    el.classList.add('entering'); void el.offsetWidth; el.classList.remove('entering');
  }
  applyStepState(arriving);
  if (arriving && !quietArrival) logTake('slide', id);
  const n = nodes.get(id);
  if (arriving && n.mapFirst && !atLastStep && !instant && layoutMode !== 'focus'){
    // a map moment: show the whole deck for a beat, then fly in
    fitAll();
    mapTimer = setTimeout(()=>{ mapTimer = null; if (currentId === id) focusOn(id); }, 1900);
  } else focusOn(id, instant);
  updateActivePath();
  updateMinimap();
  setHash(id);
}
let mapTimer = null;
// the slide the current one was reached from, and a move that is not a new take (a retake replaying its entry)
let arrivedFrom = null, quietArrival = false;
// the slide being left goes back to its finished state
function leaveSlide(){
  const prev = nodes.get(currentId);
  if (!prev) return;
  prev.el.querySelectorAll('figure.yt').forEach(f=>youtubeCommand(f, 'pauseVideo'));
  applyFragments(prev, prev.frags.length, true);
  resetEntrances(prev);
}
// the slide the overview was opened from, so Esc (or O again) can go back to it
let overviewFrom = null;
function overview(){
  if (!currentId && overviewFrom && nodes.has(overviewFrom)){ backFromOverview(); return; }   // O again
  if (currentId) overviewFrom = currentId;
  if (layoutMode === 'focus'){ setMode('path'); }
  leaveSlide();
  clearTimeout(autoTimer);
  currentId = null;
  updateActivePath();
  updateMinimap();
  fitAll();
  setHash(null);
}
// Esc during either overview: the map moment flies on into its slide, O's overview returns to the slide it left
function backFromOverview(){
  if (mapTimer){ clearTimeout(mapTimer); mapTimer = null; focusOn(currentId); return true; }
  if (!currentId && overviewFrom && nodes.has(overviewFrom)){ const id = overviewFrom; overviewFrom = null; navigate(id); return true; }
  return false;
}
function step(dir){
  if (!currentId){ if (order.length) navigate(order[dir > 0 ? 0 : order.length-1]); return; }
  // a press during a map moment finishes it, flying into the slide, rather than skipping past the slide
  if (mapTimer && dir > 0){ clearTimeout(mapTimer); mapTimer = null; focusOn(currentId); return; }
  const steps = slideSteps(nodes.get(currentId));
  const ns = Math.min(stepPos, steps.length - 1) + dir;
  if (ns >= 0 && ns < steps.length){
    stepPos = ns; camManual = null; camCycle = -1;
    applyStepState();
    if (!cameraStream && !pipEl.hidden && pipState.used) startWebcam(); else refocus();
    updateActivePath();
    return;
  }
  const ni = order.indexOf(currentId) + dir;
  if (ni >= 0 && ni < order.length) navigate(order[ni], false, dir < 0);
}
function toParent(){
  const n = nodes.get(currentId);
  if (n && n.parent) navigate(n.parent);
}
function toChild(){
  const n = nodes.get(currentId);
  if (n && n.children.length) navigate(n.children[0]);
  else if (!currentId && order.length) navigate(order[0]);
}

// ---------- minimap ----------
let mm = null;
function updateMinimap(){
  const all = [...nodes.values()];
  if (!all.length){ mmSvg.innerHTML=''; mm = null; return; }
  mmLabel.textContent = 'map';
  const px = n=>n.cx, py = n=>n.cy;
  const minX = Math.min(...all.map(px)) - NODE_W/2, maxX = Math.max(...all.map(px)) + NODE_W/2;
  const minY = Math.min(...all.map(py)) - NODE_H_EST/2, maxY = Math.max(...all.map(py)) + NODE_H_EST/2;
  const pad = 16, W = 180, H = 130;
  const s = Math.min((W-2*pad)/Math.max(1, maxX-minX), (H-2*pad-6)/Math.max(1, maxY-minY));
  const ox = W/2 - (minX+maxX)/2*s, oy = H/2 + 5 - (minY+maxY)/2*s;
  const path = currentId ? breadcrumbPath(currentId) : [];
  let out = '';
  all.forEach(n=>{
    if (!n.parent) return;
    const p = nodes.get(n.parent);
    out += '<line x1="'+(px(p)*s+ox)+'" y1="'+(py(p)*s+oy)+'" x2="'+(px(n)*s+ox)+'" y2="'+(py(n)*s+oy)+'" stroke="var(--panel-line)" stroke-width="1"/>';
  });
  all.forEach(n=>{
    const color = n.id===currentId ? 'var(--accent)' : (path.includes(n.id) ? 'var(--accent-teal)' : 'var(--node-border)');
    out += '<circle data-id="'+escapeHtml(n.id)+'" cx="'+(px(n)*s+ox)+'" cy="'+(py(n)*s+oy)+'" r="'+(n.id===currentId?4:3)+'" fill="'+color+'"><title>'+escapeHtml(n.title)+'</title></circle>';
  });
  out += '<rect id="mm-viewport" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.7"/>';
  mmSvg.innerHTML = out;
  mm = {s, ox, oy};
  updateMinimapViewport();
}
function updateMinimapViewport(){
  const rect = document.getElementById('mm-viewport');
  if (!rect || !mm) return;
  const ww = stage.clientWidth / cam.zoom, wh = stage.clientHeight / cam.zoom;
  rect.setAttribute('x', (cam.x - ww/2)*mm.s + mm.ox);
  rect.setAttribute('y', (cam.y - wh/2)*mm.s + mm.oy);
  rect.setAttribute('width', Math.max(2, ww*mm.s));
  rect.setAttribute('height', Math.max(2, wh*mm.s));
}
mmSvg.addEventListener('click', e=>{
  const c = e.target.closest('circle');
  if (c && !rec.active) navigate(c.dataset.id);
});

// ---------- pipeline ----------
let debounceTimer = null;
function rebuild(instant){
  parseDeck(editor.value);
  if (currentId && !nodes.has(currentId)) currentId = null;
  build();
  if (currentId) navigate(currentId, instant);
  else if (order.length) navigate(order[0], instant);
  else { currentId = null; fitAll(true); }
}
// a read-only deck forks into the working copy on the first keystroke; the copy is kept as you type
editor.addEventListener('input', ()=>{
  // the local deck file: typing saves to it, no browser copy
  if (isLocalDeck()){
    view.text = editor.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>{ saveLocal(editor.value); rebuild(true); }, 300);
    return;
  }
  if (view.kind !== 'copy' && !forkToCopy()) return;
  copy.text = editor.value;
  updateDocState();
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(()=>{ saveCopy(); rebuild(true); }, 300);
});

// ---------- layout switching ----------
function setMode(mode, instant){
  layoutMode = mode;
  save('slidetake:layout', mode);
  document.querySelectorAll('#layout-toggle .seg-btn').forEach(x=>x.classList.toggle('active', x.dataset.mode === mode));
  if (!nodes.size) return;
  if (!instant && !reduceMotion){
    world.classList.add('morph');
    setTimeout(()=>world.classList.remove('morph'), 700);
  }
  position();
  applyCamera();
  if (currentId) focusOn(currentId, instant);
  else fitAll(instant);
}
document.querySelectorAll('#layout-toggle .seg-btn').forEach(b=>{
  b.addEventListener('click', ()=>{ if (b.dataset.mode !== layoutMode) setMode(b.dataset.mode); });
});

// ---------- pointer: drag to pan / orbit, pinch to zoom ----------
(function(){
  const ptrs = new Map();
  let moved = 0, dragged = false, pinch = null;
  const pinchDist = ()=>{ const [a,b] = [...ptrs.values()]; return Math.hypot(a.x-b.x, a.y-b.y) || 1; };
  stage.addEventListener('pointerdown', e=>{
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (rec.active || e.target.closest('a, pre, code, input, textarea')) return;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    moved = 0; dragged = false;
    if (ptrs.size === 2) pinch = {d:pinchDist(), zoom:cam.zoom};
  });
  window.addEventListener('pointermove', e=>{
    const prev = ptrs.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    moved += Math.abs(dx) + Math.abs(dy);
    if (!dragged && moved > 5){ dragged = true; stopCamera(); stage.classList.add('dragging'); }
    if (!dragged) return;
    if (ptrs.size === 2 && pinch){
      cam.zoom = clampZoom(pinch.zoom * pinchDist() / pinch.d);
    } else {
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
    }
    applyCamera();
  });
  const end = e=>{
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!ptrs.size) stage.classList.remove('dragging');
  };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  // a drag must not also count as a click on the card it started on
  stage.addEventListener('click', e=>{ if (dragged){ e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
})();

function clampZoom(z){ return Math.max(0.04, Math.min(5, z)); }
function setSlideFill(f){
  slideFill = Math.round(Math.max(SLIDE_FILL_MIN, Math.min(SLIDE_FILL_MAX, f)) * 100) / 100;
  save('slidetake:slideSize', slideFill);
  if (currentId) focusOn(currentId);
}
// +/- resize the slide when one is selected, and zoom the map in the overview
function sizeStep(dir){
  if (currentId) setSlideFill(slideFill + dir * 0.1);
  else zoomBy(dir > 0 ? 1.2 : 1/1.2);
}
function zoomBy(f, clientX, clientY){
  stopCamera();
  const nz = clampZoom(cam.zoom * f);
  if (clientX !== undefined){
    // keep the point under the cursor fixed
    const r = stage.getBoundingClientRect();
    const px = clientX - r.left - r.width/2, py = clientY - r.top - r.height/2;
    cam.x += px/cam.zoom - px/nz;
    cam.y += py/cam.zoom - py/nz;
  }
  cam.zoom = nz;
  applyCamera();
}
stage.addEventListener('wheel', e=>{
  e.preventDefault();
  if (rec.active) return;
  zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX, e.clientY);
}, {passive:false});

// ---------- controls ----------
document.getElementById('nav-prev').onclick = ()=>step(-1);
document.getElementById('nav-next').onclick = ()=>step(1);

document.getElementById('btn-open').onclick = ()=>document.getElementById('file-input').click();
document.getElementById('file-input').addEventListener('change', e=>{
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  // a file from this computer goes straight to the working copy, already saved (it's a file)
  reader.onload = ()=>{
    if (!confirmReplaceCopy('a copy of ' + f.name)) return;
    copy = makeCopy(String(reader.result), {kind: 'file', name: f.name}, {exported: true});
    saveCopy();
    deckBase = null; currentId = null;
    showCopy();
  };
  reader.readAsText(f);
  e.target.value = '';
});
document.getElementById('btn-save').onclick = ()=>{
  const blob = new Blob([editor.value], {type:'text/markdown'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (roots[0] ? slugify(nodes.get(roots[0]).title) : 'deck') + '.md';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  if (view.kind === 'copy'){ copy.exported = copy.text; saveCopy(); updateDocState(); }
};
document.getElementById('btn-reset').onclick = ()=>{
  if (view.kind !== 'copy' || matchesOrigin(copy)) return;
  if (!confirm('Discard your edits and go back to ' + originLabel(copy.origin) + ' as it was?')) return;
  copy.text = copy.originText; saveCopy();
  editor.value = copy.text; currentId = null; rebuild(true); updateDocState();
};

function toggleEditor(){
  if (EMBED) return;
  editorPane.classList.toggle('collapsed');
  document.getElementById('btn-edit-toggle').classList.toggle('active', !editorPane.classList.contains('collapsed'));
}
document.getElementById('btn-edit-toggle').onclick = toggleEditor;
// drag the handle on the editor's left edge to resize it; the width is remembered
const mainEl = document.querySelector('main');
const editorResizer = document.getElementById('editor-resizer');
const savedEditorW = parseFloat(load('slidetake:editorWidth'));
if (savedEditorW) editorPane.style.setProperty('--editor-w', savedEditorW + 'px');
editorResizer.addEventListener('pointerdown', e=>{
  e.preventDefault();
  editorResizer.setPointerCapture(e.pointerId);
  mainEl.classList.add('resizing');
  const right = mainEl.getBoundingClientRect().right;
  const move = ev=>{
    const w = Math.round(Math.max(280, Math.min(window.innerWidth * 0.75, right - ev.clientX)));
    editorPane.style.setProperty('--editor-w', w + 'px');
  };
  const up = ()=>{
    mainEl.classList.remove('resizing');
    editorResizer.removeEventListener('pointermove', move);
    save('slidetake:editorWidth', String(editorPane.getBoundingClientRect().width));
  };
  editorResizer.addEventListener('pointermove', move);
  editorResizer.addEventListener('pointerup', up, {once: true});
});
editorResizer.addEventListener('dblclick', ()=>{ editorPane.style.removeProperty('--editor-w'); try { localStorage.removeItem('slidetake:editorWidth'); } catch(e){} });
document.getElementById('btn-mode').onclick = toggleMode;

function setPresent(on){
  presenting = on;
  document.body.classList.toggle('presenting', on);
  lightUp(document.getElementById('btn-present'), on);
  markActive();
  const de = document.documentElement;
  if (on && de.requestFullscreen && !document.fullscreenElement) de.requestFullscreen().catch(()=>{});
  if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(()=>{});
  if (on && !currentId && order.length) navigate(order[0]);
  // decks that script the camera get the webcam as soon as presenting starts
  const usesCamera = deck.camera || [...nodes.values()].some(n=>n.camera);
  if (on && usesCamera && !cameraStream && !cameraOff) startWebcam();
  if (on) scheduleAutoslide(nodes.get(currentId)); else clearTimeout(autoTimer);
  if (on) startTalkClock(); else stopTalkClock();
  updateProgress();
}
document.getElementById('btn-present').onclick = ()=>setPresent(!presenting);

// ---------- recording a take: OBS only records, the deck drives everything ----------
const OBS_URL = 'https://cdn.jsdelivr.net/npm/obs-websocket-js@5.0.5/dist/obs-ws.min.js';
const NEXT_KEYS = ['ArrowRight', 'PageDown', ' ', 'ArrowDown', 'Enter'];
const BACK_KEYS = ['ArrowLeft', 'PageUp', 'ArrowUp', 'r', 'R'];
const PAUSE_KEYS = ['b', 'B', '.'];
const reviewDialog = document.getElementById('review');
const countdownEl = document.getElementById('rec-countdown'), pausedEl = document.getElementById('rec-paused');
const obsHost = document.getElementById('obs-host'), obsPort = document.getElementById('obs-port'), obsPass = document.getElementById('obs-pass');
const obsRemember = document.getElementById('obs-remember'), obsStatus = document.getElementById('obs-status');
let obs = null, obsConnected = false, recStartResolve = null, obsFps = null, obsSize = '';
// t0/pausedMs give "time into the recording"; log holds slide arrivals and retakes; cuts are the bad parts
// t0/pausedMs give "time into the recording"; every slide start (first attempt or retake) is an event,
// stamped with OBS's own recording time when OBS is connected so cut points match the file exactly
const rec = {active:false, withObs:false, counting:false, paused:false, finishing:false, t0:0, pauseAt:0, pausedMs:0, events:[], outputPath:null, browser:null};
const wait = ms=>new Promise(r=>setTimeout(r, ms));
// two painted frames (so an overlay is really gone), but never hang if the tab isn't painting
const nextFrame = ()=>Promise.race([new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))), wait(100)]);
function recNow(){ return (rec.paused ? rec.pauseAt : performance.now()) - rec.t0 - rec.pausedMs; }

function openModal(m){ m.classList.add('open'); }

// ---------- analytics: Google Analytics on slidetake.com, which a reader can turn off ----------
// index.html loads the tag only on slidetake.com and only while this browser hasn't chosen off. Turning it
// off stops a running tag at once and removes the _ga cookies it set; turning it back on counts from the
// next page.
const GA_ID = 'G-3S9FY4MQLS';
const analyticsDialog = document.getElementById('analytics-dialog');
const analyticsOn = ()=>load('slidetake:analytics') !== 'off';
function setAnalytics(on){
  save('slidetake:analytics', on ? 'on' : 'off');
  if (!on){
    window['ga-disable-' + GA_ID] = true;
    const domains = ['', '; Domain=' + location.hostname, '; Domain=.' + location.hostname.replace(/^www\./, '')];
    document.cookie.split(';').map(c=>c.split('=')[0].trim()).filter(n=>n === '_ga' || n.startsWith('_ga_'))
      .forEach(n=>domains.forEach(d=>{ document.cookie = n + '=; Max-Age=0; Path=/' + d; }));
  }
  showAnalyticsChoice();
}
function showAnalyticsChoice(){
  analyticsDialog.querySelectorAll('[data-analytics]').forEach(b=>b.setAttribute('aria-checked', String((b.dataset.analytics === 'on') === analyticsOn())));
}
analyticsDialog.querySelectorAll('[data-analytics]').forEach(b=>b.onclick = ()=>setAnalytics(b.dataset.analytics === 'on'));
// only slidetake.com runs analytics, so only there is there a choice to make: elsewhere (localhost,
// npx slidetake, a self-hosted copy) the button stays hidden
const analyticsBtn = document.getElementById('btn-analytics');
analyticsBtn.hidden = !/^(www\.)?slidetake\.com$/.test(location.hostname);
analyticsBtn.onclick = ()=>{ showAnalyticsChoice(); openModal(analyticsDialog); };
function closeModals(){ document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open')); }
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('click', e=>{ if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('open'); });
});

// OBS connection settings: ?obs=host:port[:password], else what was remembered
function loadObsSettings(){
  const fromUrl = new URLSearchParams(location.search).get('obs');
  if (fromUrl){
    const [host, port, ...rest] = fromUrl.split(':');
    obsHost.value = host || 'localhost'; obsPort.value = port || '4455'; obsPass.value = rest.join(':');
    return true;
  }
  try {
    const saved = JSON.parse(load('slidetake:obs') || 'null');
    if (saved){ obsHost.value = saved.host || 'localhost'; obsPort.value = saved.port || '4455'; obsPass.value = saved.password || ''; obsRemember.checked = true; }
  } catch(e){}
  return false;
}
function saveObsSettings(){
  if (obsRemember.checked) save('slidetake:obs', JSON.stringify({host:obsHost.value.trim(), port:obsPort.value.trim(), password:obsPass.value}));
  else { try { localStorage.removeItem('slidetake:obs'); } catch(e){} }
}
// a short status beside Connect; what went wrong and what to do, when it failed, on the lines below
function setObsStatus(text, kind, detail){
  obsStatus.textContent = text; obsStatus.className = kind || ''; obsStatus.title = detail || text;
  const d = document.getElementById('obs-detail');
  d.textContent = detail || ''; d.hidden = !detail;
}
// A secure (https) page may only open plain ws:// connections to this computer: browsers block them to any
// other address, and OBS has no secure WebSocket of its own. Say so instead of failing with a vague error.
const isLoopback = host=>/^(localhost|127(\.\d+){3}|\[?::1\]?)$/i.test(host);
function obsBlockedHere(host){ return location.protocol === 'https:' && !isLoopback(host); }
const OBS_HTTPS_HELP = 'This page is served over https, and browsers block it from reaching OBS on another computer ' +
  '(OBS only offers plain ws://). Run OBS on this computer and use localhost, or open Slidetake from a local copy: ' +
  'download dist/index.html from github.com/slidetake/slidetake and serve it with python3 -m http.server.';
async function connectObs(){
  const host = obsHost.value.trim() || 'localhost';
  const url = 'ws://' + host + ':' + (obsPort.value.trim() || '4455');
  if (obsBlockedHere(host)){
    obsConnected = false;
    setObsStatus('Blocked here', 'err', OBS_HTTPS_HELP);
    return;
  }
  setObsStatus('Connecting…');
  obsStatus.title = 'Connecting to ' + url;
  try {
    await loadScript(OBS_URL);
    const Ctor = window.OBSWebSocket && (window.OBSWebSocket.default || window.OBSWebSocket);
    if (obs){ try { await obs.disconnect(); } catch(e){} }
    obs = new Ctor();
    obs.on('ConnectionClosed', ()=>{
      obsConnected = false;
      setObsStatus('Disconnected', 'err');
    });
    obs.on('RecordStateChanged', e=>{
      if (e.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED' && recStartResolve){ recStartResolve(); recStartResolve = null; }
      if (e.outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED' && rec.active && rec.withObs && !rec.finishing) finishTake('Stopped in OBS');
    });
    const info = await obs.connect(url, obsPass.value || undefined);
    obsConnected = true;
    // cut points snap to OBS's exact frame rate
    try {
      const v = await obs.call('GetVideoSettings');
      if (v && v.fpsNumerator && v.fpsDenominator) obsFps = v.fpsNumerator / v.fpsDenominator;
      obsSize = v && v.outputWidth && v.outputHeight ? sizeName(v.outputWidth, v.outputHeight) : '';   // what OBS records at
    } catch(e){}
    setObsStatus('Connected', 'ok', '');
    obsStatus.title = 'Connected' + (info && info.obsWebSocketVersion ? ' · OBS WebSocket ' + info.obsWebSocketVersion : '');
    saveObsSettings();
    if (reviewDialog.classList.contains('open') && obsMode()){ say('Connected to OBS. Press ● Record.'); setupSummary(); }
  } catch(e){
    obsConnected = false;
    const why = e && e.message && e.message !== 'Error' ? e.message + '.' : 'Nothing answered at ' + url + '.';
    setObsStatus('Could not connect', 'err', why + ' Is OBS running with its WebSocket server on, and are the port and password right?');
  }
}
document.getElementById('obs-connect').onclick = connectObs;
obsRemember.addEventListener('change', saveObsSettings);

// YouTube is 16:9; a take recorded on a 16:10 MacBook screen gets bars or a crop. Fullscreen fills the
// whole screen, so it's the screen's shape that matters.
function showScreenAdvice(){
  const el = document.getElementById('rec-screen');
  const w = screen.width, h = screen.height;
  if (Math.abs(w / h - 16 / 9) < 0.02){ el.innerHTML = '<span class="ok">This screen is 16:9 (' + w + '×' + h + '), right for YouTube.</span>'; return; }
  // name the nearest familiar shape (a MacBook's 1512×982 is "about 3:2"), not a ratio like 756:491
  const shapes = [['16:10', 1.6], ['3:2', 1.5], ['4:3', 4 / 3], ['21:9', 21 / 9], ['16:9', 16 / 9]];
  const [name, r] = shapes.reduce((a, b)=>Math.abs(b[1] - w / h) < Math.abs(a[1] - w / h) ? b : a);
  const shape = Math.abs(r - w / h) < 0.005 ? name : 'about ' + name;
  el.innerHTML = '<span class="warn">This screen is ' + shape + ' (' + w + '×' + h + '), not 16:9, so the video will have bars or be cropped. ' +
    'Move this window to a 16:9 screen, physical or virtual (say 1920×1080), then press F there.</span>';
}
// ---------- recording in the browser: this tab's 16:9 frame plus the mic, a recorder per take ----------
// Chromium only for now: it captures one element of the current tab (Element Capture, or Region Capture
// before Chrome 132) and records MP4. Takes go to the browser's private storage, one file each.
const MEDIABUNNY_URL = 'https://cdn.jsdelivr.net/npm/mediabunny@1.64.0/+esm';
const recCam = document.getElementById('rec-cam'), recMic = document.getElementById('rec-mic'), recQuality = document.getElementById('rec-quality');
const recMeter = document.getElementById('rec-meter'), recCheck = document.getElementById('rec-browser-check');
let recMode = load('slidetake:rec-mode') || '';
let recNote = '';   // why the last start failed, shown in place of the check once
let meter = null;   // the mic preview while the dialog is open: {stream, ctx, raf}
function browserRecording(){
  const md = navigator.mediaDevices;
  if (!window.isSecureContext || !md || !md.getDisplayMedia) return {why:'This page can’t capture itself here. Open Slidetake in Chrome or Edge on a computer.'};
  if (!window.RestrictionTarget && !window.CropTarget) return {why:'Recording in the browser needs Chrome or Edge (or another Chromium browser) on a computer.'};
  const type = window.MediaRecorder ? recordingType(t=>MediaRecorder.isTypeSupported(t)) : '';
  if (!type || !navigator.storage || !navigator.storage.getDirectory) return {why:'This browser can’t record video here. Use a recent Chrome or Edge.'};
  // in fullscreen the frame is the largest 16:9 area of the screen
  const {quality, device} = bestQuality(screen.width, screen.height, devicePixelRatio || 1);
  if (!quality) return {why:'This screen gives a ' + device[0] + '×' + device[1] + ' frame, less than 720p. Use pro mode (OBS), or a larger screen.'};
  return {ok:true, type, quality};
}
let meterToken = 0;   // only the latest start keeps its microphone
async function stopMeter(){
  meterToken++;
  if (!meter) return;
  cancelAnimationFrame(meter.raf);
  meter.stream.getTracks().forEach(t=>t.stop());
  meter.ctx.close().catch(()=>{});
  meter = null;
  recMeter.value = 0;
}
async function startMeter(){
  await stopMeter();
  const token = meterToken;
  try {
    const id = recMic.value;
    const stream = await navigator.mediaDevices.getUserMedia({audio:micConstraints(id)});   // the meter hears what the recording will
    if (token !== meterToken){ stream.getTracks().forEach(t=>t.stop()); return; }
    const ctx = new AudioContext(), an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const m = meter = {stream, ctx, raf:0};
    const loop = ()=>{
      if (meter !== m) return;             // stopped, or a newer meter took over
      an.getFloatTimeDomainData(buf);
      let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
      recMeter.value = Math.max(peak, recMeter.value * 0.85);
      m.raf = requestAnimationFrame(loop);
    };
    loop();
  } catch(e){ recCheck.innerHTML = '<span class="warn">The microphone isn’t available: ' + escapeHtml(e.message || e.name) + '. Allow it in the site settings.</span>'; }
}
// withMeter: the mic's level shows (Setup is open in the browser); it also lets the browser name the devices
async function fillDevices(withMeter = true){
  try {
    // labels are only listed once the page may use a device, so ask for the mic first
    if (withMeter && !meter) await startMeter();
    const devs = await navigator.mediaDevices.enumerateDevices();
    // Chrome lists the system default (and on Windows the communications device) again as extra entries:
    // drop them, and mark the device they stand for instead
    const opts = (kind, saved)=>{
      const all = devs.filter(d=>d.kind === kind), def = all.find(d=>d.deviceId === 'default');
      const defLabel = def ? def.label.replace(/^Default - /, '') : '';
      const list = all.filter(d=>d.deviceId !== 'default' && d.deviceId !== 'communications');
      const isDef = d=>!!def && (d.label === defLabel || (!!def.groupId && d.groupId === def.groupId && !list.some(x=>x !== d && x.label === defLabel)));
      // names without Chrome's USB ids; two devices that would then read the same are numbered
      const names = list.map((d, i)=>deviceName(d.label) || (kind === 'audioinput' ? 'Microphone ' : 'Camera ') + (i + 1));
      names.forEach((n, i)=>{ const k = names.slice(0, i).filter(m=>m === n).length; if (k) names[i] = n + ' ' + (k + 1); });
      const pick = list.some(d=>d.deviceId === saved) || saved === 'none' ? saved : (list.find(isDef) || list[0] || {}).deviceId;
      return list.map((d, i)=>'<option value="' + escapeHtml(d.deviceId) + '"' + (d.deviceId === pick ? ' selected' : '') + '>' +
        escapeHtml(names[i] + (isDef(d) ? ' (system default)' : '')) + '</option>').join('');
    };
    const cam = camChoice();
    recCam.innerHTML = '<option value="none"' + (cam === 'none' ? ' selected' : '') + '>No camera</option>' + opts('videoinput', cam);
    const mic = load('slidetake:mic') || '';
    recMic.innerHTML = opts('audioinput', mic);
    if (mic && recMic.value === mic && meter && meter.stream.getAudioTracks()[0].getSettings().deviceId !== mic) startMeter();
  } catch(e){}
}
recMic.onchange = ()=>{ save('slidetake:mic', recMic.value); startMeter(); setupSummary(); };
recCam.onchange = ()=>{
  setCamChoice(recCam.value);
  if (recCam.value !== 'none' && cameraStream){ stopWebcam(); startWebcam(); }
  setupSummary();
};
// ---------- the camera in a recording: chosen once per deck, turned on by Record ----------
// The C button is for presenting; a recording uses the setup's choice, so a forgotten C never costs a take.
// The default: your camera when the deck has a camera box or camera moves, otherwise none.
const deckUsesCamera = ()=>(deck.pip || 'none').toLowerCase() !== 'none' || !!deck.camera || [...nodes.values()].some(n=>n.camera);
const camChoiceKey = ()=>'slidetake:rec-cam:' + sessionKey();
/** 'none', 'default' (the browser's camera) or a device id */
function camChoice(){
  const c = load(camChoiceKey());
  return c ? c : deckUsesCamera() ? (load('slidetake:cam') || 'default') : 'none';
}
function setCamChoice(c){
  save(camChoiceKey(), c);
  if (c !== 'none' && c !== 'default') save('slidetake:cam', c);   // the device the webcam opens
}
// before a recording's countdown: the camera as chosen, so you see your framing during 3-2-1
function cameraForRecording(){
  rec.camWas = !cameraOff;
  const want = camChoice() !== 'none';
  if (want !== !cameraOff) setCameraEnabled(want, true);
}
// after it: back to how it was (a camera that was off goes off again)
function restoreCamera(){
  if (rec.camWas == null) return;
  if (rec.camWas !== !cameraOff) setCameraEnabled(rec.camWas, true);
  rec.camWas = null;
}
recQuality.onchange = ()=>{ save('slidetake:quality', recQuality.value); setupSummary(); };
async function showBrowserCheck(){
  const b = browserRecording();
  if (!b.ok){ recCheck.innerHTML = '<span class="warn">' + escapeHtml(b.why) + '</span>'; return b; }
  if (recNote){ recCheck.innerHTML = '<span class="warn">' + escapeHtml(recNote) + '</span>'; recNote = ''; }
  const best = QUALITIES.indexOf(b.quality), saved = load('slidetake:quality');
  recQuality.innerHTML = QUALITIES.slice(best).map(q=>'<option' + (q.name === saved ? ' selected' : '') + '>' + q.name + '</option>').join('');
  let room = '';
  try {
    const {quota, usage} = await navigator.storage.estimate();
    const q = QUALITIES.find(x=>x.name === recQuality.value) || b.quality;
    room = ' Room for about ' + Math.floor((quota - usage) / bytesPerMinute(q)) + ' minutes of takes.';
  } catch(e){}
  if (!recCheck.querySelector('.warn')) recCheck.innerHTML = '<span class="ok">Ready: this screen records up to ' + b.quality.name + ' in fullscreen.' + escapeHtml(room) + '</span>';
  return b;
}
// Record opens the takes screen, in the mode last used: takes recorded in this browser (a board of every take
// of every slide), or one OBS recording (its takes, cut from the file by ffmpeg)
function setRecMode(mode){
  recMode = mode;
  save('slidetake:rec-mode', mode);
  if (reviewDialog.classList.contains('open')) openTakes({setup:true});
}
const obsMode = ()=>reviewDialog.classList.contains('obs');
function openTakes(opts = {}){
  if (!RECORDING_UI) return;
  // a browser that can't record itself (Safari, Firefox) always opens with OBS
  if (browserRecording().ok && (recMode || 'browser') === 'browser') openBoard(opts);
  else openObsTakes(opts);
}
// OBS: the deck's latest recording, the one video being edited; a new recording takes its place
function openObsTakes(opts = {}){
  const last = loadSessions().find(x=>x.key === sessionKey() && x.withObs && !x.inBrowser);
  openReview(last || {key:sessionKey(), deckTitle:deck.title || (order[0] ? nodes.get(order[0]).title : 'Deck'), date:new Date().toISOString(),
    withObs:true, outputPath:null, reason:'', total:0, totalObs:null, fps:obsFps, events:[], picks:{}, empty:true}, opts);
}
document.getElementById('btn-studio').onclick = ()=>openTakes();

// the takes of each session live in the browser's private storage, in a folder named after the session
async function takesDir(id, create){
  const root = await navigator.storage.getDirectory();
  const all = await root.getDirectoryHandle('slidetake-takes', {create:true});
  return all.getDirectoryHandle(id, {create:!!create});
}
async function deleteTakes(id){
  try { const root = await navigator.storage.getDirectory(); await (await root.getDirectoryHandle('slidetake-takes')).removeEntry(id, {recursive:true}); } catch(e){}
}
// The recorded size. The 16:9 shape is asked for outright: Chrome keeps the shape of the page as it measured it
// when the tab was shared, and the page can still be mid-layout then (going fullscreen), which came out
// 1828×1080 instead of 1920×1080. With the shape fixed, Chrome crops to it and the size is exact.
const outputSize = q=>({width:q.w, height:q.h, aspectRatio:16 / 9, frameRate:FPS, resizeMode:'crop-and-scale'});
async function attachCapture(track){
  if (window.RestrictionTarget && track.restrictTo) await track.restrictTo(await RestrictionTarget.fromElement(stageWrap));
  else await track.cropTo(await CropTarget.fromElement(stageWrap));
}
async function reattachCapture(b){
  try {
    if (window.RestrictionTarget && b.track.restrictTo) await b.track.restrictTo(null); else await b.track.cropTo(null);
    await attachCapture(b.track);
  } catch(e){}
  await b.track.applyConstraints(outputSize(b.quality)).catch(()=>{});
  await nextFrame();
}
// called from the Start click, before anything else: sharing the tab needs that click
async function beginBrowserCapture(){
  const b = browserRecording();
  if (!b.ok) throw new Error(b.why);
  const quality = QUALITIES.find(q=>q.name === recQuality.value) || b.quality;
  document.body.classList.add('rec-frame');   // the frame must exist (and be capturable) before the capture is cut to it
  const display = await navigator.mediaDevices.getDisplayMedia({video:{frameRate:FPS}, audio:false,
    preferCurrentTab:true, selfBrowserSurface:'include', surfaceSwitching:'exclude', monitorTypeSurfaces:'exclude'});
  const track = display.getVideoTracks()[0];
  const stopAll = ()=>display.getTracks().forEach(t=>t.stop());
  if (!track.restrictTo && !track.cropTo){ stopAll(); throw new Error('Share “this tab” to record the slides.'); }
  try { await attachCapture(track); }
  catch(e){ stopAll(); throw new Error('Chrome could not record just the slides (' + (e.message || e.name) + ').'); }
  await track.applyConstraints(outputSize(quality)).catch(()=>{});
  let mic;
  try {
    const id = load('slidetake:mic');
    mic = await navigator.mediaDevices.getUserMedia({audio:micConstraints(id)});
  } catch(e){ stopAll(); throw new Error('The microphone isn’t available (' + (e.message || e.name) + ').'); }
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  rec.browser = {id, display, mic, track, quality, type:b.type, stream:new MediaStream([track, ...mic.getAudioTracks()]),
    dir:await takesDir(id, true), clips:[], cur:null, chain:Promise.resolve(), error:null};
  // stopping the share from Chrome's bar ends the take like Esc
  track.addEventListener('ended', ()=>{ if (rec.active && !rec.finishing) finishTake('Sharing stopped'); });
}
function endBrowserCapture(){
  const b = rec.browser;
  if (!b) return;
  b.display.getTracks().forEach(t=>t.stop());
  b.mic.getTracks().forEach(t=>t.stop());
  document.body.classList.remove('rec-frame');
}
// a new take: its own recorder and file. The new one starts first and the one before stops once it is
// running, so no moment is missed; the take's start is stamped when its recorder actually starts.
function startClip(ev){
  const b = rec.browser;
  const name = 'take-' + b.clips.length + '.' + clipExt(b.type);
  const clip = {name, rec:null, done:null};
  b.clips.push(clip);
  ev.clip = b.id + '/' + name;   // the recording's folder and the file: takes from many recordings sit side by side
  b.chain = b.chain.then(async ()=>{
    const file = await (await b.dir.getFileHandle(name, {create:true})).createWritable();
    const r = new MediaRecorder(b.stream, {mimeType:b.type, videoBitsPerSecond:b.quality.bitrate, audioBitsPerSecond:AUDIO_BITRATE});
    let writes = Promise.resolve();
    r.ondataavailable = e=>{ if (e.data.size) writes = writes.then(()=>file.write(e.data)).catch(err=>{ b.error = err; }); };
    clip.done = new Promise(res=>{ r.onstop = async ()=>{ await writes; await file.close().catch(()=>{}); res(); }; });
    await new Promise(res=>{ r.onstart = res; r.start(1000); });
    ev.t = Math.round(recNow());
    if (ev.cutAt != null) ev.lead = Math.max(0, Math.round(ev.t - ev.cutAt));
    const prev = b.cur;
    b.cur = clip; clip.rec = r;
    if (prev && prev.rec.state !== 'inactive') prev.rec.stop();
  }).catch(err=>{ b.error = err; });
}

// kind: 'obs' (OBS records), 'browser' (this tab records itself) or 'rehearse' (nothing is recorded)
// only: the slides to record (ticked on the board), in deck order; without it, the whole deck
async function startTake(kind, only){
  if (rec.active || !order.length) return;
  const withObs = kind === 'obs';
  stopMeter();
  if (kind === 'browser'){
    if (!presenting) setPresent(true);        // fullscreen first, while the click still counts
    try { await beginBrowserCapture(); }
    catch(e){
      document.body.classList.remove('rec-frame');
      if (presenting) setPresent(false);
      recNote = e.name === 'NotAllowedError' ? 'Recording needs this tab shared: press ● Record again and choose Share.' : e.message;
      openBoard({setup:true});
      return;
    }
  }
  closeModals();
  const pick = only && only.length ? only.filter(id=>order.includes(id)) : null;
  const firstId = pick ? pick[0] : order[0];
  const beforeId = order[order.indexOf(firstId) - 1] || null;   // a selection starts with its entry from the slide before
  Object.assign(rec, {active:true, withObs, counting:true, paused:false, finishing:false, t0:0, pausedMs:0, events:[], outputPath:null,
    only:pick ? new Set(pick) : null});
  if (kind !== 'browser') rec.browser = null;
  document.body.classList.add('recording');
  hidePipMsg();
  const lay = document.getElementById('rec-layout').value;
  if (lay !== 'current' && lay !== layoutMode) setMode(lay, true);
  if (!presenting) setPresent(true);          // this click allows fullscreen
  cameraForRecording();
  if (beforeId){
    // the slide before, finished, for the countdown; the take then starts with the flight in
    document.body.classList.add('no-anim');
    nodes.get(beforeId)._played = true;
    quietArrival = true; navigate(beforeId, true, true); quietArrival = false;
    pipEl.getAnimations().forEach(a=>a.finish());
    await nextFrame();
    document.body.classList.remove('no-anim');
  } else {
    if (currentId === firstId){ stepPos = 0; camManual = null; camCycle = -1; }
    navigate(firstId, true);                  // step 0 of the first slide, its camera layout included
  }
  // 3-2-1 on screen; OBS only starts after it, so the countdown is never in the footage
  // fullscreen: asked for with the click, but a browser's share prompt can take it away; one more try, and
  // if that is refused, F during the countdown (a key press is allowed to ask)
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen().catch(()=>{});
  const hint = countdownEl.querySelector('.hint');
  for (let i = 3; i > 0; i--){
    hint.textContent = (document.fullscreenElement ? '' : 'Press F for fullscreen · ') + 'recording starts after the countdown · Esc to cancel';
    countdownEl.querySelector('.num').textContent = i;
    countdownEl.classList.add('show');
    await wait(1000);
    if (!rec.active) return;
  }
  countdownEl.classList.remove('show');
  await nextFrame();
  if (withObs){
    const started = new Promise(r=>{ recStartResolve = r; setTimeout(()=>{ if (recStartResolve){ recStartResolve(); recStartResolve = null; } }, 2500); });
    try { await obs.call('StartRecord'); }
    catch(e){ abortTake('OBS could not start recording: ' + ((e && e.message) || e)); return; }
    await started;
    if (!rec.active) return;
  }
  // the frame has settled (fullscreen, 16:9): attach the capture to it again. Chrome takes the frame's place and
  // size when the capture is attached and doesn't follow it after; attached while the page was still going
  // fullscreen, the video showed part of the frame, enlarged and cut off (and 1828×1080 instead of 1920×1080).
  if (rec.browser) await reattachCapture(rec.browser);
  rec.counting = false;
  rec.t0 = performance.now();
  const first = nodes.get(firstId);
  if (beforeId){
    logTake('slide', firstId);
    if (rec.browser) await rec.browser.chain;  // its recorder is running before the flight starts
    resetEntrances(first);
    quietArrival = true; navigate(firstId); quietArrival = false;
    return;
  }
  // the first slide starts now: replay its entrances on camera and log chapter 0:00
  resetEntrances(first);
  applyStepState(true);
  logTake('slide', currentId);
}
function abortTake(message){
  rec.active = false; rec.counting = false;
  if (rec.browser){
    const b = rec.browser;
    b.chain.then(()=>{ if (b.cur && b.cur.rec.state !== 'inactive') b.cur.rec.stop(); }).then(()=>deleteTakes(b.id));
    endBrowserCapture();
    rec.browser = null;
  }
  countdownEl.classList.remove('show');
  document.body.classList.remove('recording');
  if (presenting) setPresent(false);
  restoreCamera();
  showPipMsg(message);
}

// cutAt: for a retake, when ← was pressed; the take being redone ends there
function logTake(kind, id, cutAt){
  if (!rec.active || !rec.t0 || rec.finishing) return;
  const n = nodes.get(id);
  const ev = {id, title:n ? n.title : id, retake:kind === 'retake', t:Math.round(recNow()), obsT:null};
  // in the browser a take's recorder starts a moment after the press, while the deck is already moving:
  // the take before ends at the press, so it never shows the start of the next move
  if (cutAt == null && rec.browser) cutAt = ev.t;
  if (cutAt != null){ ev.cutAt = cutAt; ev.lead = Math.max(0, Math.round(ev.t - cutAt)); }
  rec.events.push(ev);
  if (rec.browser) startClip(ev);
  if (rec.withObs && obsConnected){
    obs.call('GetRecordStatus').then(r=>{ if (r && typeof r.outputDuration === 'number') ev.obsT = r.outputDuration; }).catch(()=>{});
    // OBS 30.2+ also writes these into Hybrid MP4 recordings; other setups ignore them
    if (n) obs.call('CreateRecordChapter', {chapterName:(ev.retake ? 'RETAKE · ' : '') + n.title}).catch(()=>{});
  }
}

function takeKey(e){
  const k = e.key;
  const handled = NEXT_KEYS.includes(k) || BACK_KEYS.includes(k) || PAUSE_KEYS.includes(k) || k === 'Escape';
  if (handled) e.preventDefault();
  if (k === 'Escape'){ if (rec.counting) abortTake('Take cancelled'); else finishTake('Stopped early'); return; }
  if ((k === 'f' || k === 'F') && !document.fullscreenElement && document.documentElement.requestFullscreen){
    e.preventDefault();
    document.documentElement.requestFullscreen().catch(()=>{});
    return;
  }
  if (rec.counting || rec.finishing || retaking) return;
  if (PAUSE_KEYS.includes(k)){ togglePause(); return; }
  if (rec.paused) return;
  if (NEXT_KEYS.includes(k)) takeForward();
  else if (BACK_KEYS.includes(k)) retake();
}
function takeForward(){
  const steps = slideSteps(nodes.get(currentId));
  const lastStep = Math.min(stepPos, steps.length - 1) >= steps.length - 1;
  const i = order.indexOf(currentId);
  if (!lastStep){ step(1); return; }
  if (!rec.only){ if (i === order.length - 1) finishTake(); else step(1); return; }
  // recording ticked slides: the next ticked one, jumping over any in between as a retake jumps back
  const next = order.slice(i + 1).find(id=>rec.only.has(id));
  if (!next) finishTake();
  else if (order[i + 1] === next) step(1);
  else enterFresh(order[order.indexOf(next) - 1], next, 'slide');
}
// ← during a take: the slide starts over as a new take, its entry included. The deck goes back to where the
// slide before it ended, instantly and outside any take; then the new take starts and the entry (the flight,
// the camera moving) plays as it did the first time. Whichever take is picked, the join into it flows. The
// earlier attempt is kept to choose from, cut where ← was pressed.
let retaking = false;
async function retake(){
  const n = nodes.get(currentId);
  if (!n || retaking) return;
  const target = currentId, from = arrivedFrom;
  if (!from || from === target || !nodes.has(from)){ restartSlide(n); return; }   // the first slide has no entry
  enterFresh(from, target, 'retake');
}
// The deck goes to `from` exactly as it ended, outside any take; then a new take of `target` starts and its
// entry plays. A retake does this from the slide before; recording ticked slides, from the slide before the
// next ticked one, so the slides in between are skipped without a seam.
async function enterFresh(from, target, kind){
  const n = nodes.get(target);
  if (!n || retaking) return;
  retaking = true;
  const cutAt = recNow();
  // the slide before, exactly as it ended: finished, its entrance not played again, nothing easing into place
  document.body.classList.add('no-anim');
  const prev = nodes.get(from);
  quietArrival = true;
  prev._played = true;
  navigate(from, true, true);
  pipEl.getAnimations().forEach(a=>a.finish());
  quietArrival = false;
  await nextFrame();
  document.body.classList.remove('no-anim');
  logTake(kind, target, cutAt);
  if (rec.browser) await rec.browser.chain;      // its recorder is running before the entry plays
  if (rec.withObs) await obsHold();
  resetEntrances(n);
  quietArrival = true;
  navigate(target);
  quietArrival = false;
  if (!cameraStream && !pipEl.hidden && pipState.used) startWebcam();
  retaking = false;
}
// With OBS, where a take starts is known only to within a few hundred ms (OBS reports its time as encoded,
// behind the screen). So a new take holds still for a moment, the cut starting halfway into it: early or
// late, the first frame is the same still picture the take before ended on.
const OBS_HOLD = 600;
async function obsHold(){
  const ev = rec.events[rec.events.length - 1];
  if (ev) ev.skip = OBS_HOLD / 2;
  await wait(OBS_HOLD);
}
async function restartSlide(n){
  retaking = true;
  stepPos = 0; camManual = null; camCycle = -1;
  resetEntrances(n);
  applyStepState(true);
  if (!cameraStream && !pipEl.hidden && pipState.used) startWebcam(); else refocus();
  updateActivePath();
  logTake('retake', currentId);
  if (rec.withObs) await obsHold();
  retaking = false;
}
async function togglePause(){
  if (!rec.t0) return;
  if (!rec.paused){
    rec.paused = true; rec.pauseAt = performance.now();
    clearTimeout(autoTimer);
    if (rec.withObs) await obs.call('PauseRecord').catch(()=>{});
    if (rec.browser){ const b = rec.browser; b.chain = b.chain.then(()=>{ if (b.cur && b.cur.rec.state === 'recording') b.cur.rec.pause(); }); }
    pausedEl.classList.add('show');
  } else {
    pausedEl.classList.remove('show');
    await nextFrame();                      // the pause screen must be gone before OBS resumes
    if (rec.withObs) await obs.call('ResumeRecord').catch(()=>{});
    if (rec.browser){ const b = rec.browser; b.chain = b.chain.then(()=>{ if (b.cur && b.cur.rec.state === 'paused') b.cur.rec.resume(); }); }
    rec.pausedMs += performance.now() - rec.pauseAt;
    rec.paused = false;
    scheduleAutoslide(nodes.get(currentId));
  }
}
async function finishTake(reason){
  if (!rec.active || rec.finishing) return;
  if (rec.counting){ abortTake('Take cancelled'); return; }
  rec.finishing = true;
  clearTimeout(autoTimer);
  if (rec.paused){ rec.pausedMs += performance.now() - rec.pauseAt; rec.paused = false; pausedEl.classList.remove('show'); }
  let total = Math.round(recNow()), totalObs = null;
  if (rec.withObs){
    // the take ends at the press: what follows (Esc leaving full screen, the Studio opening) is never in the cut
    try { const st = await obs.call('GetRecordStatus'); if (st && typeof st.outputDuration === 'number') totalObs = st.outputDuration; } catch(e){}
    await wait(1200);                       // OBS keeps recording a moment past the cut, so the end is surely in the file
    try { const r = await obs.call('StopRecord'); rec.outputPath = r && r.outputPath; }
    catch(e){ reason = (reason ? reason + '. ' : '') + 'OBS did not confirm the stop (' + ((e && e.message) || e) + ')'; }
  }
  const b = rec.browser;
  if (b){
    await wait(600);                        // hold the last frame a moment
    await b.chain;
    total = Math.round(recNow());
    if (b.cur && b.cur.rec && b.cur.rec.state !== 'inactive') b.cur.rec.stop();
    await Promise.all(b.clips.map(c=>c.done));
    endBrowserCapture();
    rec.browser = null;
    if (b.error) reason = (reason ? reason + '. ' : '') + 'Some of the take could not be saved (' + (b.error.message || b.error.name) + ')';
  }
  rec.active = false; rec.finishing = false;
  document.body.classList.remove('recording');
  if (presenting) setPresent(false);
  restoreCamera();
  const session = {
    key:sessionKey(), deckTitle:deck.title || nodes.get(order[0]).title, date:new Date().toISOString(),
    withObs:rec.withObs, outputPath:rec.outputPath, reason:reason || '', total, totalObs, fps:b ? FPS : obsFps,
    ...(b ? {inBrowser:true, takesId:b.id, quality:b.quality.name, type:b.type} : {}),
    events:rec.events.map(e=>({id:e.id, title:e.title, retake:e.retake, t:e.t, obsT:e.obsT, ...(e.lead ? {lead:e.lead} : {}), ...(e.skip ? {skip:e.skip} : {}), ...(e.clip ? {clip:e.clip} : {})})), picks:{}
  };
  if (session.inBrowser){ addToBoard(session); return; }
  saveSession(session);
  openReview(session, {note:(reason ? reason + '. ' : '') + takesOf(session).size + ' slides recorded with OBS.'});
}

// ---------- sessions: kept in this browser so a take can be reviewed (and re-picked) later ----------
function sessionKey(){ return slugify(deck.title || (order[0] ? nodes.get(order[0]).title : 'deck')); }
function loadSessions(){ try { return JSON.parse(load('slidetake:sessions') || '[]'); } catch(e){ return []; } }
function saveSession(sess){
  const all = loadSessions().filter(x=>x.date !== sess.date);
  all.unshift(sess);
  // a session that drops off the list takes its recorded takes with it
  all.slice(12).forEach(x=>{ if (x.takesId) deleteTakes(x.takesId); });
  save('slidetake:sessions', JSON.stringify(all.slice(0, 12)));
}

// the picked take of each slide (default: the last attempt), as ranges of the recording, in order
// cut points sit on frame boundaries, so video and audio are cut at exactly the same moments
// the section a slide belongs to: its ancestor just below the root (chapters, review rows, text size)
function sectionOf(id){
  const path = nodes.has(id) ? breadcrumbPath(id) : [id];
  return path[Math.min(1, path.length - 1)];
}

// ---------- ffmpeg ----------
let reviewFileName = '';
// the section a slide belongs to (its top-level ancestor below the root) and that section's title
function sectionInfo(id, fallbackTitle){
  const sec = sectionOf(id);
  return {sec, title: nodes.has(sec) ? nodes.get(sec).title : fallbackTitle};
}
const sectionChapters = sess=>sectionChaptersCore(sess, sectionInfo);
const finalChapters = sess=>finalChaptersCore(sess, sectionInfo);
const ffmpegScript = (sess, mode)=>ffmpegScriptCore(sess, mode, {
  input: sess.outputPath || reviewFileName || 'recording.mov',
  outputName: sessionKey() + '-final.mp4',
  sectionOf: sectionInfo,
  loudness: loudOn()
});
// bring the sound to YouTube's level when the video is made (on unless turned off)
const loudBtns = document.querySelectorAll('.rv-loud');   // in the board's setup, and by the ffmpeg command
const loudOn = ()=>load('slidetake:loudness') !== 'off';
const showLoud = ()=>loudBtns.forEach(b=>{ b.setAttribute('aria-pressed', String(loudOn())); b.classList.toggle('on', loudOn()); });
// the peak limiter, off unless chosen: with it, Volume boost goes all the way to -14 LUFS
const limiterBtn = document.getElementById('rv-limiter');
const limiterOn = ()=>load('slidetake:limiter') === 'on';
const showLimiter = ()=>{ limiterBtn.setAttribute('aria-pressed', String(limiterOn())); limiterBtn.classList.toggle('on', limiterOn()); };
showLimiter();
limiterBtn.onclick = ()=>{ save('slidetake:limiter', limiterOn() ? 'off' : 'on'); showLimiter(); };
// the mic's sound: raw (no processing), or voice (the browser's noise suppression)
const micSound = ()=>load('slidetake:mic-sound') === 'voice' ? 'voice' : 'raw';
const micConstraints = id=>({...(id ? {deviceId:{ideal:id}} : {}), echoCancellation:false, autoGainControl:false, noiseSuppression:micSound() === 'voice'});
const soundBtns = document.querySelectorAll('[data-sound]');
const showSound = ()=>soundBtns.forEach(b=>{ const on = b.dataset.sound === micSound(); b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
showSound();
soundBtns.forEach(b=>b.onclick = ()=>{ save('slidetake:mic-sound', b.dataset.sound); showSound(); if (meter) startMeter(); });
showLoud();
loudBtns.forEach(b=>b.onclick = ()=>{ save('slidetake:loudness', loudOn() ? 'off' : 'on'); showLoud(); if (reviewing) renderReview(); });

// ---------- the review screen ----------
let reviewing = null, playlist = null;
const rvVideo = document.getElementById('rv-video'), rvNow = document.getElementById('rv-now');
// the board's one line of news, beside Preview: the newest message wins, on one line, in full on hover
/** @param {string} text @param {{warn?: boolean, html?: string, title?: string}} [opts] */
function say(text, {warn = false, html = '', title = ''} = {}){
  rvNow.classList.toggle('warn', warn);
  if (html) rvNow.innerHTML = html; else rvNow.textContent = text;
  rvNow.title = title || rvNow.textContent;
  const again = document.getElementById('rv-save-again');
  if (again) again.onclick = ()=>downloadVideo(true);
}
let lastTicked = -1;
const selNote = ()=>{
  const n = selectedInOrder(order, selected).length;
  return n ? n + '/' + order.length + ' slide' + (n === 1 ? '' : 's') + ' up for a take' : '';
};
function openReview(sess, opts = {}){
  closeModals();
  reviewing = sess;
  playlist = null;
  const retakes = sess.events.filter(e=>e.retake).length;
  // what the recording is, said once as it opens
  const about = sess.empty ? '' : takesOf(sess).size + ' slides, ' + (retakes ? retakes + ' retake' + (retakes > 1 ? 's' : '') : 'no retakes') +
    ', recorded ' + fmtLength(sess.totalObs ?? sess.total) + '. ';
  reviewDialog.classList.remove('in-browser', 'board');
  reviewDialog.classList.add('obs');
  const recBtn = document.getElementById('rv-rec');
  recBtn.title = 'Records the deck with OBS: a new video in place of this one';
  recBtn.disabled = false;   // OBS records, whatever this browser can do (the board turns it off where it can't)
  document.getElementById('rv-use-browser').style.display = browserRecording().ok ? '' : 'none';
  document.getElementById('rv-render-btn').disabled = document.getElementById('rv-clean').disabled = !!sess.cleaned;
  document.getElementById('rv-file').textContent = sess.outputPath ? ' (' + baseName(sess.outputPath) + ')' : '';
  // pick the listed rate nearest to the take's (OBS reports e.g. 60000/1001 for 59.94)
  const fps = sessionFps(sess);
  fpsSel.value = [...fpsSel.options].reduce((a, o)=>Math.abs(o.value - fps) < Math.abs(a.value - fps) ? o : a).value;
  if (rvVideo.src && (sess.inBrowser || reviewFileName !== baseName(sess.outputPath) && sess.outputPath)){
    rvVideo.removeAttribute('src'); rvVideo.load(); reviewFileName = '';
  }
  document.getElementById('rv-novideo').hidden = !!rvVideo.src || !!sess.empty;
  playlist = null; clipList = null;
  resetPreview();
  renderReview();
  openModal(reviewDialog);
  setupEl.open = !!opts.setup || !obsConnected || !!sess.empty;
  if (setupEl.open) refreshSetup(); else fillDevices(false).then(setupSummary);
  say(opts.note || (sess.empty ? (obsConnected ? 'Press ● Record: OBS records the deck.' : 'Connect to OBS in Setup, then press ● Record.')
    : about + (rvVideo.src ? 'Click a take to preview it.' : 'Open the recording to preview it.')));
  if (!sess.empty) autoLoadRecording(sess);
}
function renderReview(){
  if (reviewing && reviewing.board){ renderBoard(); return; }
  const sess = reviewing, list = document.getElementById('rv-list');
  let lastSec = null;
  list.innerHTML = [...takesOf(sess).values()].map(slide=>{
    const pick = sess.picks[slide.id] ?? slide.takes.length, sec = sectionOf(slide.id);
    const isSec = sec !== lastSec; lastSec = sec;
    const chips = slide.takes.map(t=>'<button class="rv-chip' + (pick === t.no ? ' on' : '') + '" data-id="' + escapeHtml(slide.id) + '" data-take="' + t.no + '">' +
      'Take ' + t.no + ' · ' + fmtLength(t.end - t.start) + '</button>').join('');
    return '<div class="rv-row' + (isSec ? ' sec' : '') + '"><div class="t">' + escapeHtml(slide.title) +
      '<small>' + fmtTime(slide.takes[0].start) + '</small></div><div class="rv-chips">' + chips + '</div></div>';
  }).join('');
  list.querySelectorAll('.rv-chip').forEach(b=>b.onclick = ()=>{
    sess.picks[b.dataset.id] = +b.dataset.take;
    saveSession(sess);
    renderReview();
    const slide = takesOf(sess).get(b.dataset.id), t = slide && slide.takes[+b.dataset.take - 1];
    if (!t) return;
    const title = slide.title + (slide.takes.length > 1 ? ' · take ' + t.no : '');
    if (sess.inBrowser){
      const ev = sess.events.filter(e=>e.id === b.dataset.id)[t.no - 1];
      if (ev && ev.clip) playClips([{clip:ev.clip, keep:(t.end - t.start) / 1000, title}]);
    } else playRange([{start:t.start, end:t.end, title}]);
  });
  document.getElementById('rv-ffmpeg-copy').disabled = document.getElementById('rv-play-final').disabled = !sess.events.length;
  showChapters(sess);
  showFinalSize(sess);
}
// ⧉ Chapters: YouTube's chapter list for the final cut, ready to paste into the description
let cutChapters = '';
function showChapters(sess){
  const ch = finalChapters(sess), btn = document.getElementById('rv-chapters');
  cutChapters = ch.lines.join('\n');
  btn.disabled = ch.lines.length < 3;
  btn.title = ch.lines.length < 3 ? 'YouTube needs at least three chapters of 10 seconds or more'
    : 'Copies the ' + ch.lines.length + ' chapters, to paste into the YouTube description';
}
// copies text, saying so on the button for a moment
function copyWith(btn, text){
  const label = btn.dataset.label || (btn.dataset.label = btn.textContent);
  (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(()=>{});
  btn.textContent = '✓ Copied';
  clearTimeout(+btn.dataset.timer);
  btn.dataset.timer = String(setTimeout(()=>{ btn.textContent = label; }, 1500));
}
document.getElementById('rv-chapters').onclick = e=>copyWith(e.currentTarget, cutChapters);
document.getElementById('rv-ffmpeg-copy').onclick = e=>{
  if (!reviewing || !reviewing.events.length) return;
  copyWith(e.currentTarget, ffmpegScript(reviewing, document.getElementById('rv-mode').value));
  say('Copied the ffmpeg command: run it in a terminal, in the folder with ' + (baseName(reviewing.outputPath) || 'the recording') + '.');
};
// the final cut's length, and for takes kept in this browser about how big the downloaded file will be
// a take's file never changes, so its size is read once
const clipSizes = new Map();
let finalSizeToken = 0;
async function showFinalSize(sess){
  const el = document.getElementById('rv-final'), token = ++finalSizeToken;
  const ms = pickedRanges(sess).reduce((a, r)=>a + r.end - r.start, 0);
  const line = bytes=>(!bytes ? 'Final cut ' : 'about ' + (bytes > 1e9 ? (bytes / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(bytes / 1e6)) + ' MB') + ' · ') + fmtLength(ms);
  if (!sess.inBrowser || sess.cleaned){ el.textContent = line(null); return; }
  try {
    let bytes = 0;
    for (const part of clipPlan(sess)){
      if (!clipSizes.has(part.clip)) clipSizes.set(part.clip, (await clipFile(part.clip)).size);
      bytes += clipSizes.get(part.clip);
    }
    // written once, whole: the line never shows without its size in between
    if (token === finalSizeToken) el.textContent = line(bytes);
  } catch(e){ if (token === finalSizeToken) el.textContent = line(null); }
}
const fpsSel = document.getElementById('rv-fps');
fpsSel.onchange = ()=>{ if (!reviewing) return; reviewing.fps = parseFloat(fpsSel.value); saveSession(reviewing); renderReview(); };

// preview: play ranges of the recording back to back
// a take clicked while the recording is still opening plays as soon as it is ready
let pendingPlay = null;
function playRange(ranges){
  if (!rvVideo.src){
    pendingPlay = ranges;
    say(rvOpening ? 'Opening the recording… it plays when ready.' : 'Open the recording to preview.');
    return;
  }
  pendingPlay = null;
  playlist = {ranges, i:0};
  say('▶ ' + ranges[0].title);
  // seeking before the metadata has loaded is ignored, so wait for it
  const go = ()=>{
    rvVideo.currentTime = ranges[0].start / 1000;
    rvVideo.play().catch(e=>{ if (e && e.name !== 'AbortError') say('Could not play: ' + e.message, {warn:true}); });
  };
  if (rvVideo.readyState >= 1) go(); else rvVideo.addEventListener('loadedmetadata', go, {once:true});
}
rvVideo.addEventListener('timeupdate', ()=>{
  if (!playlist) return;
  const r = playlist.ranges[playlist.i];
  if (rvVideo.currentTime * 1000 < r.end) return;
  playlist.i++;
  if (playlist.i >= playlist.ranges.length){ rvVideo.pause(); playlist = null; say(''); return; }
  const next = playlist.ranges[playlist.i];
  rvVideo.currentTime = next.start / 1000;
  say('▶ ' + next.title);
});
// Preview: the picked takes back to back. Right after a take was played on its own it continues from there (the
// next slide, or the same one if that take was stopped partway); after anything else, from the start. While it
// plays the button pauses it, and the take list follows the slide playing.
const previewBtn = document.getElementById('rv-play-final');
let previewFrom = null;
function resetPreview(){ previewFrom = null; }
previewBtn.onclick = ()=>{
  if (!reviewing) return;
  if (!reviewing.inBrowser){ playRange(pickedRanges(reviewing).map(r=>({start:r.start, end:r.end, title:r.title}))); return; }
  if (clipList && !clipList.single){                 // the preview is running: pause, or go on
    if (rvVideo.paused) rvVideo.play().catch(()=>{}); else rvVideo.pause();
    return;
  }
  const plan = clipPlan(reviewing);
  const start = Math.max(0, previewFrom ? plan.findIndex(p=>p.id === previewFrom) : 0);
  previewFrom = null;
  playClips(plan.slice(start));
};
function showPreviewState(){
  const running = clipList && !clipList.single && !rvVideo.paused;
  previewBtn.textContent = running ? '❚❚ Pause' : '▶ Preview';
  document.querySelectorAll('#rv-list .rv-row.playing').forEach(r=>r.classList.remove('playing'));
  const part = clipList && clipList.parts[clipList.i];
  const row = part && part.id && document.querySelector('#rv-list .rv-row[data-id="' + CSS.escape(part.id) + '"]');
  if (row){ row.classList.add('playing'); row.scrollIntoView({block:'nearest'}); }
}
rvVideo.addEventListener('play', showPreviewState);
rvVideo.addEventListener('pause', ()=>{
  // a take played on its own and stopped partway: Preview starts with that slide
  if (clipList && clipList.single && rvVideo.currentTime < clipList.parts[0].keep - 0.05){
    previewFrom = clipList.parts[0].id;
    say('Preview starts from ' + clipList.parts[0].title.replace(/ · take \d+$/, '') + '.');
  }
  showPreviewState();
});
// a take played on its own has finished: Preview goes on from the next slide
function singleTakeDone(part){
  const plan = reviewing ? clipPlan(reviewing) : [];
  const i = plan.findIndex(p=>p.id === part.id), next = i >= 0 ? plan[i + 1] : null;
  previewFrom = next ? next.id : null;
  say(next ? 'Preview continues from ' + next.title + '.' : 'That was the last slide: Preview plays from the start.');
}

// a decoded audio sample as one float array per channel
function planesOf(smp){
  return Array.from({length:smp.numberOfChannels}, (_, c)=>{
    const p = new Float32Array(smp.numberOfFrames);
    smp.copyTo(p, {planeIndex:c, format:'f32-planar'});
    return p;
  });
}
// a browser session's takes are files of their own: play each from its start for as long as it is kept
let clipList = null;
// a take's clip, by its path: '<recording>/<file>'
async function clipFile(path){ const [run, name] = path.split('/'); return (await (await takesDir(run)).getFileHandle(name)).getFile(); }
// single: one take played on its own (from the take list), after which Preview continues from it
async function playClips(parts, i = 0, single = false){
  if (!reviewing || reviewing.cleaned || !parts.length) return;
  playlist = null;
  clipList = {parts, i, single};
  try {
    const file = await clipFile(parts[i].clip);
    if (!reviewDialog.classList.contains('open')) return;   // Studio closed while the take was loading
    if (rvVideo.src) URL.revokeObjectURL(rvVideo.src);
    rvVideo.src = URL.createObjectURL(file);
    say('▶ ' + parts[i].title);
    await rvVideo.play();
  } catch(e){
    if (e && e.name === 'AbortError') return;
    clipList = null;
    say(e && e.name === 'NotFoundError' ? 'This take is no longer in the browser.' : 'Could not play this take: ' + ((e && e.message) || e), {warn:true});
  }
}
function clipDone(){
  const c = clipList;
  if (c.i + 1 < c.parts.length){ playClips(c.parts, c.i + 1, c.single); return; }
  clipList = null;
  rvVideo.pause();
  if (c.single) singleTakeDone(c.parts[0]); else say('');
  showPreviewState();
}
rvVideo.addEventListener('timeupdate', ()=>{ if (clipList && rvVideo.currentTime >= clipList.parts[clipList.i].keep) clipDone(); });
rvVideo.addEventListener('ended', ()=>{ if (clipList) clipDone(); });

// Render: the picked takes joined into one file, packets copied as they are (no decoding or re-encoding).
// Every take starts on a keyframe and shares the recorder's settings, so the joins need nothing else.
const renderBtn = document.getElementById('rv-render-btn');
renderBtn.onclick = ()=>downloadVideo(false);
// while a video is made, its progress is the button's label: nothing else on the board moves
let renderDone = 0;
const renderLabel = /** @param {string} [t] */ t=>{ clearTimeout(renderDone); renderBtn.textContent = t || '↓ Download'; };
// where a saved video is, in words: the folder's name and the file's (browsers don't tell pages the full path)
const savedWhere = d=>d.where ? '“' + d.where + '” as ' + d.name : 'your downloads as ' + d.name;
// the last video saved, if it is still in its folder (a plain download can't be checked: assume it is)
async function stillSaved(d){
  if (!d.where) return true;
  try {
    const dir = await kvGet('video-folder');
    if (!dir || dir.name !== d.where || (await dir.queryPermission({mode:'readwrite'})) !== 'granted') return true;
    await dir.getFileHandle(d.name);
    return true;
  } catch(e){ return false; }
}
async function downloadVideo(force){
  const sess = reviewing;
  if (!sess || !sess.inBrowser || sess.cleaned) return;
  const plan = clipPlan(sess);
  if (!plan.length){ say('No slide has a take yet: nothing to save.', {warn:true}); return; }
  // the same final cut as last time: nothing to make again
  const sig = JSON.stringify([plan.map(c=>[c.clip, Math.round(c.keep * 1000)]), loudOn(), limiterOn(), sess.type]);
  const last = sess.board && board.lastDownload;
  if (!force && last && last.sig === sig && await stillSaved(last)){
    say('', {html:'<button class="btn small" id="rv-save-again">Save another copy</button> Already saved in ' + escapeHtml(savedWhere(last)) + '.',
      title:'Already saved in ' + savedWhere(last) + '. A new video is made only when a take or the sound settings change.'});
    return;
  }
  const mp4 = clipExt(sess.type || '') === 'mp4';
  // like OBS: a new file each time, named by the date, in your videos folder (asked once, then remembered)
  const name = sessionKey() + ' ' + fileStamp(new Date()) + '.' + (mp4 ? 'mp4' : 'webm');
  let file = null, where = '';
  try {
    const dir = await videoFolder(false);
    if (dir){ file = await (await dir.getFileHandle(name, {create:true})).createWritable(); where = dir.name; }
  } catch(e){ if (e && e.name === 'AbortError') return; }
  const btn = renderBtn;
  btn.disabled = true;
  renderLabel('Preparing…');
  try {
    const MB = await import(MEDIABUNNY_URL);
    const target = file ? new MB.StreamTarget(file) : new MB.BufferTarget();
    const out = new MB.Output({format:mp4 ? new MB.Mp4OutputFormat({fastStart:file ? false : 'in-memory'}) : new MB.WebMOutputFormat(), target});
    // loudness: measure the final cut, gain it to YouTube's level, then measure what that gain and the limiter
    // actually give and correct for it. A few loud clicks carry much of the energy the first measure counts,
    // and once the limiter tames them the voice would come out short of the target.
    // Without the peak limiter the boost stops where the loudest peak would clip, and says so when that holds it
    // back from -14.
    let gain = 1, loudNote = '';
    const useLimiter = loudOn() && limiterOn();
    if (loudOn()){
      const first = await measureCut(MB, plan, 1, false, 'Measuring');
      if (first && isFinite(first.integrated)){
        let db = gainToTarget(first, {limit:useLimiter});
        if (useLimiter && Math.abs(db) >= 0.05){
          const then = await measureCut(MB, plan, dbToGain(db), true, 'Checking');
          if (then && isFinite(then.integrated)) db = Math.min(db + (YOUTUBE_LUFS - then.integrated), MAX_BOOST_DB);
        }
        gain = dbToGain(db);
        const reached = useLimiter ? YOUTUBE_LUFS : first.integrated + db;
        const heldBack = !useLimiter && gainToTarget(first, {limit:true}) - db > 0.5;
        loudNote = ' · loudness ' + first.integrated.toFixed(1) + (Math.abs(db) < 0.05 ? ' LUFS, left as is' : ' → ' + reached.toFixed(1) + ' LUFS') +
          (heldBack ? '; a loud peak held it back, turn on Peak limiter to reach ' + YOUTUBE_LUFS : '');
      }
    }
    const reencode = gain !== 1 || useLimiter;
    await checkJoinable(MB, plan);
    let vSrc = null, aSrc = null, offset = 0, lastV = -1, lastA = -1, limiter = null;
    const limited = [];   // pieces of sound waiting for the limiter: their time and length
    const sendLimited = async ()=>{
      while (limited.length && limiter.ready() >= limited[0].n){
        const piece = limited.shift(), planes = limiter.take(piece.n), data = new Float32Array(piece.n * piece.ch);
        planes.forEach((p, c)=>data.set(p, c * piece.n));
        await aSrc.add(new MB.AudioSample({data, format:'f32-planar', numberOfChannels:piece.ch, sampleRate:piece.rate, timestamp:piece.t}));
      }
    };
    for (const [i, part] of plan.entries()){
      renderLabel('Joining ' + (i + 1) + '/' + plan.length);
      const input = new MB.Input({source:new MB.BlobSource(await clipFile(part.clip)), formats:MB.ALL_FORMATS});
      const vt = await input.getPrimaryVideoTrack(), at = await input.getPrimaryAudioTrack();
      if (!vt) throw new Error(part.title + ' has no video');
      if (!vSrc){
        vSrc = new MB.EncodedVideoPacketSource(await vt.getCodec());
        out.addVideoTrack(vSrc, {frameRate:FPS});
        if (at){
          aSrc = reencode ? new MB.AudioSampleSource({codec:mp4 ? 'aac' : 'opus', bitrate:AUDIO_BITRATE}) : new MB.EncodedAudioPacketSource(await at.getCodec());
          out.addAudioTrack(aSrc);
        }
        await out.start();
      }
      const vMeta = {decoderConfig:await vt.getDecoderConfig()};
      // the take ends where the next one began; frames after that belong to the next take
      let end = 0, first = true;
      for await (const pk of new MB.EncodedPacketSink(vt).packets()){
        if (pk.timestamp >= part.keep) continue;
        lastV = afterPrevious(lastV, offset + pk.timestamp);
        await vSrc.add(pk.clone({timestamp:lastV}), first && i === 0 ? vMeta : undefined);
        first = false;
        end = Math.max(end, pk.timestamp + pk.duration);
      }
      // the sound stops with the picture, so the next take's sound starts where its picture does
      if (at && aSrc && reencode){
        for await (const smp of new MB.AudioSampleSink(at).samples(0, end)){
          if (smp.timestamp + smp.duration > end + 1e-4){ smp.close(); continue; }
          lastA = afterPrevious(lastA, offset + smp.timestamp);
          const planes = planesOf(smp);
          planes.forEach(p=>{ for (let k = 0; k < p.length; k++) p[k] *= gain; });
          if (useLimiter){
            // the limiter catches the peaks the gain pushes past the ceiling; its output runs a few ms behind,
            // so each piece waits until its frames are ready and keeps its own time
            limiter = limiter || peakLimiter(smp.sampleRate, planes.length);
            limiter.push(planes);
            limited.push({t:lastA, n:smp.numberOfFrames, rate:smp.sampleRate, ch:planes.length});
            smp.close();
            await sendLimited();
          } else {
            const n = smp.numberOfFrames, data = new Float32Array(n * planes.length);
            planes.forEach((p, c)=>data.set(p, c * n));
            await aSrc.add(new MB.AudioSample({data, format:'f32-planar', numberOfChannels:planes.length, sampleRate:smp.sampleRate, timestamp:lastA}));
            smp.close();
          }
        }
      } else if (at && aSrc){
        const aMeta = {decoderConfig:await at.getDecoderConfig()};
        let aFirst = true;
        for await (const pk of new MB.EncodedPacketSink(at).packets()){
          if (pk.timestamp + pk.duration > end + 1e-4) continue;
          lastA = afterPrevious(lastA, offset + pk.timestamp);
          await aSrc.add(pk.clone({timestamp:lastA}), aFirst && i === 0 ? aMeta : undefined);
          aFirst = false;
        }
      }
      offset += end;
    }
    if (limiter){
      limiter.end();
      await sendLimited();
      if (limiter.events) loudNote += ', ' + limiter.events + ' peak' + (limiter.events === 1 ? '' : 's') + ' limited';
    }
    renderLabel('Finishing…');
    await out.finalize();
    if (!file){
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([target.buffer], {type:mp4 ? 'video/mp4' : 'video/webm'}));
      a.download = name;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href), 10000);
    }
    const saved = {sig, name, where};
    if (sess.board){ board.lastDownload = saved; saveBoard(); }
    say('Saved in ' + savedWhere(saved) + ' (' + fmtLength(offset * 1000) + loudNote + ').');
    renderLabel('✓ Saved');
    renderDone = setTimeout(()=>renderLabel(), 2500);
  } catch(e){
    renderLabel();
    say('Could not save the video: ' + ((e && e.message) || e), {warn:true});
    if (file) file.abort().catch(()=>{});
  } finally { btn.disabled = !!sess.cleaned; }
}
// How loud the final cut is, as it will be joined: as recorded, or with a gain and the limiter after it.
// null when there is no sound.
async function measureCut(MB, plan, gain, limit, label){
  let meter = null, limiter = null;
  for (const [i, part] of plan.entries()){
    renderLabel(label + ' ' + (i + 1) + '/' + plan.length);
    const at = await new MB.Input({source:new MB.BlobSource(await clipFile(part.clip)), formats:MB.ALL_FORMATS}).getPrimaryAudioTrack();
    if (!at) continue;
    for await (const smp of new MB.AudioSampleSink(at).samples(0, part.keep)){
      const planes = planesOf(smp);
      meter = meter || loudnessMeter(smp.sampleRate, planes.length);
      if (gain !== 1 && limit){
        planes.forEach(p=>{ for (let k = 0; k < p.length; k++) p[k] *= gain; });
        limiter = limiter || peakLimiter(smp.sampleRate, planes.length);
        limiter.push(planes);
        if (limiter.ready()) meter.add(limiter.take(limiter.ready()));
      } else meter.add(planes);
      smp.close();
    }
  }
  if (limiter){ limiter.end(); if (limiter.ready()) meter.add(limiter.take(limiter.ready())); }
  return meter ? meter.result() : null;
}
// Takes join without re-encoding only when they share the picture size and encoder settings. The odd ones
// out (against the most common) are named, to be recorded again, rather than written into a broken file.
async function checkJoinable(MB, plan){
  const keys = [];
  for (const part of plan){
    const vt = await new MB.Input({source:new MB.BlobSource(await clipFile(part.clip)), formats:MB.ALL_FORMATS}).getPrimaryVideoTrack();
    const c = vt && await vt.getDecoderConfig();
    keys.push(c ? c.codec + ' ' + c.codedWidth + '×' + c.codedHeight + ' ' + (c.description ? [...new Uint8Array(c.description)].join('.') : '') : 'none');
  }
  const count = new Map();
  keys.forEach(k=>count.set(k, (count.get(k) || 0) + 1));
  const main = [...count.entries()].sort((a, b)=>b[1] - a[1])[0][0];
  const odd = plan.filter((_, i)=>keys[i] !== main);
  if (odd.length) throw new Error(odd.map(p=>p.title).join(', ') + (odd.length === 1 ? ' was' : ' were') +
    ' recorded at a different size (' + keys[plan.indexOf(odd[0])].split(' ')[1] + ', not ' + main.split(' ')[1] + '). Tick ' + (odd.length === 1 ? 'it' : 'them') + ' and record again');
}
// 2026-10-30 20-04-49, as OBS names its recordings
const fileStamp = d=>{ const p2 = n=>String(n).padStart(2, '0'); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + '-' + p2(d.getMinutes()) + '-' + p2(d.getSeconds()); };
// where videos are saved: a folder picked once (starting in Movies / Videos) and remembered. null where the
// browser can't keep a folder: the video is downloaded instead. ask: pick again.
async function videoFolder(ask){
  if (!window.showDirectoryPicker) return null;
  let dir = ask ? null : await kvGet('video-folder');
  if (dir){
    let perm = await dir.queryPermission({mode:'readwrite'});
    if (perm === 'prompt') perm = await dir.requestPermission({mode:'readwrite'});
    if (perm === 'granted') return dir;
  }
  dir = await window.showDirectoryPicker({id:'slidetake-videos', mode:'readwrite', startIn:'videos'});
  kvSet('video-folder', dir);
  return dir;
}
document.getElementById('rv-folder-change').onclick = async ()=>{
  try { const dir = await videoFolder(true); if (dir) say('Videos now go to ' + dir.name + '.'); }
  catch(e){}
};

// ---------- the take board: every take of every slide, from every recording made in this browser ----------
// One per deck. Takes from a later recording join their slide's row; a slide edited since has its old takes
// marked outdated. ● Record records the deck, or only the ticked slides (shift-click ticks a range).
let board = null, boardKey = '', selAnchor = null;
const selected = new Set();
const boardStoreKey = ()=>'slidetake:board:' + sessionKey();
function loadBoard(){
  const key = boardStoreKey();
  if (board && boardKey === key) return board;
  boardKey = key;
  try { board = JSON.parse(load(key) || 'null'); } catch(e){ board = null; }
  if (!board || !Array.isArray(board.takes)) board = {takes:[], picks:{}, type:'', quality:''};
  return board;
}
const saveBoard = ()=>save(boardStoreKey(), JSON.stringify(board));
// what a slide says now; a take recorded when it said something else is outdated
const slideFp = id=>{ const n = nodes.get(id); return n ? fingerprint(n.title + '\n' + n.html) : ''; };
// the deck as the board compares it: each slide's fingerprint and the slide before it
const boardDeck = ()=>deckSlides(order, id=>({title:nodes.get(id).title, fp:slideFp(id)}));
function addToBoard(sess){
  loadBoard();
  const takes = takesFromRun(sess, sess.takesId, boardDeck());
  takes.forEach(t=>{ delete board.picks[t.id]; });   // a slide recorded again plays its newest take
  board.takes.push(...takes);
  Object.assign(board, {type:sess.type, quality:sess.quality});
  saveBoard();
  selected.clear();
  openBoard({note:(sess.reason ? sess.reason + '. ' : '') + takes.length + ' new take' + (takes.length === 1 ? '' : 's') + ' on the board.'});
}
// the board as a recording: the picked takes back to back, for preview, chapters and Download
function boardReview(){
  const rows = boardRows(loadBoard(), boardDeck());
  const sess = Object.assign(boardSession(rows), {board:true, inBrowser:true, withObs:false, type:board.type || 'video/mp4', quality:board.quality || '',
    deckTitle:deck.title || (order[0] ? nodes.get(order[0]).title : 'Deck'), date:new Date().toISOString()});
  return {rows, sess};
}
const setupEl = document.getElementById('rv-setup');
const setupBtn = document.getElementById('rv-setup-btn');
setupEl.addEventListener('toggle', ()=>{
  setupBtn.setAttribute('aria-expanded', String(setupEl.open));
  if (setupEl.open) refreshSetup(); else stopMeter();
});
setupBtn.onclick = ()=>{ setupEl.open = !setupEl.open; };
reviewDialog.addEventListener('click', e=>{ if (e.target === reviewDialog || e.target.closest('[data-close]')) stopMeter(); });
function refreshSetup(){
  if (obsMode()){ showScreenAdvice(); fillDevices(false).then(setupSummary); return; }
  recCheck.innerHTML = '';
  showBrowserCheck().then(b=>{ if (b.ok) fillDevices().then(setupSummary); else setupSummary(); });
}
// the browser by its name (Chrome, Edge, Brave…), for the labels that switch between it and OBS
const browserName = (()=>{
  const brands = (navigator.userAgentData && navigator.userAgentData.brands || []).map(b=>b.brand)
    .filter(b=>!/chromium|not.?a.?brand/i.test(b));
  if (brands.length) return brands[0].replace(/^(Google|Microsoft) /, '');
  const ua = navigator.userAgent;
  return /Firefox\//.test(ua) ? 'Firefox' : /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari' : 'this browser';
})();
document.querySelectorAll('.browser-name').forEach(el=>{ el.textContent = browserName; });
// what a take will use, beside ⚙ Setup, so it shows without opening it: the mode, the camera and (in the
// browser) the microphone
function setupSummary(){
  const name = /** @param {HTMLSelectElement} sel */ sel=>{ const o = sel.selectedOptions[0]; return o ? o.textContent.replace(/ \(system default\)$/, '') : ''; };
  const cam = name(recCam) || (camChoice() === 'none' ? 'No camera' : 'Camera');
  const parts = obsMode() ? ['Pro', 'OBS', obsSize, cam].filter(Boolean)
    : browserRecording().ok ? ['Easy', browserName, recQuality.value, cam, name(recMic) || 'Microphone'].filter(Boolean) : ['Easy', browserName + ' can’t record here'];
  const el = document.getElementById('rv-using');
  el.textContent = parts.join(' · ');
  el.title = setupBtn.title = 'Recording with ' + parts.join(' · ');
}
function openBoard(opts = {}){
  if (!RECORDING_UI) return;
  closeModals();
  loadBoard();
  reviewDialog.classList.remove('obs');
  reviewDialog.classList.add('in-browser', 'board');
  document.getElementById('rv-rec').title = 'Records the whole deck, or only the ticked slides (shift-click ticks a range)';
  document.getElementById('rv-novideo').hidden = true;
  if (rvVideo.src){ URL.revokeObjectURL(rvVideo.src); rvVideo.removeAttribute('src'); rvVideo.load(); }
  playlist = null; clipList = null;
  resetPreview();
  lastTicked = -1;
  renderBoard();
  openModal(reviewDialog);
  const ready = browserRecording().ok;
  setupEl.open = !!opts.setup || !ready || !board.takes.length;
  if (setupEl.open) refreshSetup(); else showBrowserCheck().then(()=>fillDevices(false)).then(setupSummary);
  say(opts.note || selNote() || (board.takes.length ? boardState() + '. Click a take to preview it.' : order.length + ' slides, nothing recorded yet. Press ● Record.'));
}
// how far the video is: slides with a take to use, and those to record again
function boardState(){
  const rows = boardRows(loadBoard(), boardDeck());
  const ready = rows.filter(r=>r.pick).length, outdated = rows.filter(r=>r.takes.length && !r.pick).length;
  return ready + ' of ' + rows.length + ' slides ready' + (outdated ? ', ' + outdated + ' to record again' : '');
}
function renderBoard(){
  const {rows, sess} = boardReview();
  reviewing = sess;
  const list = document.getElementById('rv-list');
  let lastSec = null;
  list.innerHTML = rows.map(r=>{
    const sec = sectionOf(r.id), isSec = sec !== lastSec; lastSec = sec;
    const id = escapeHtml(r.id);
    const why = {slide:'Recorded before this slide changed', before:'Starts with the entry from the slide before, which has changed or is gone: record this slide again'};
    const chips = r.takes.length ? r.takes.map(t=>'<button class="rv-chip' + (r.pick === t.uid ? ' on' : '') + (t.outdated ? ' outdated" title="' + why[t.outdated] : '') +
      '" data-id="' + id + '" data-uid="' + escapeHtml(t.uid) + '">Take ' + t.no + ' · ' + fmtLength(t.ms) + '</button>').join('') +
      (r.pick ? '' : '<span class="rv-none">' + (r.takes.some(t=>t.outdated === 'before') && !r.takes.some(t=>t.outdated === 'slide') ? 'The slide before changed: record again' : 'Changed since: record again') + '</span>')
      : '<span class="rv-none">No take yet</span>';
    return '<div class="rv-row with-sel' + (isSec ? ' sec' : '') + (selected.has(r.id) ? ' selected' : '') + '" data-id="' + id + '">' +
      '<input type="checkbox" class="rv-sel" data-id="' + id + '"' + (selected.has(r.id) ? ' checked' : '') + ' aria-label="Select ' + escapeHtml(r.title) + ' to record">' +
      '<div><div class="t">' + escapeHtml(r.title) + '</div><div class="rv-chips">' + chips + '</div></div></div>';
  }).join('');
  list.querySelectorAll('.rv-chip').forEach(b=>b.onclick = ()=>{
    board.picks[b.dataset.id] = b.dataset.uid;
    saveBoard();
    renderBoard();
    const row = rows.find(r=>r.id === b.dataset.id), t = row && row.takes.find(x=>x.uid === b.dataset.uid);
    if (t) playClips([{id:row.id, clip:t.clip, keep:t.ms / 1000, title:row.title + ' · take ' + t.no}], 0, true);
  });
  list.querySelectorAll('.rv-sel').forEach(c=>c.addEventListener('click', e=>{
    const ids = e.shiftKey ? rangeOf(order, selAnchor, c.dataset.id) : [c.dataset.id];
    ids.forEach(i=>{ if (c.checked) selected.add(i); else selected.delete(i); });
    resetPreview();
    selAnchor = c.dataset.id;
    renderBoard();
  }));
  const ticked = selectedInOrder(order, selected), ready = browserRecording().ok;
  document.getElementById('rv-rec').disabled = !ready;
  // ticking or unticking says what Record will do; opening the board leaves its own message
  if (lastTicked >= 0 && ticked.length !== lastTicked) say(selNote() || 'Record takes the whole deck.');
  lastTicked = ticked.length;
  document.getElementById('rv-render-btn').disabled = document.getElementById('rv-play-final').disabled = !sess.events.length;
  showChapters(sess);
  showFinalSize(sess);
}
document.getElementById('rv-rec').onclick = ()=>{
  if (!obsMode()){ startTake('browser', selectedInOrder(order, selected)); return; }
  if (obsConnected){ startTake('obs'); return; }
  setupEl.open = true;
  say('Connect to OBS first: Setup → OBS → Connect.', {warn:true});
};
document.getElementById('rv-use-obs').onclick = ()=>setRecMode('obs');
document.getElementById('rv-use-browser').onclick = ()=>setRecMode('browser');
// deleting takes: the ones no slide plays, or all of them
async function deleteClips(takes){
  for (const t of takes){
    try { const [run, file] = t.clip.split('/'); await (await takesDir(run)).removeEntry(file); } catch(e){}
  }
  const gone = new Set(takes.map(t=>t.uid));
  board.takes = board.takes.filter(t=>!gone.has(t.uid));
  Object.keys(board.picks).forEach(id=>{ if (gone.has(board.picks[id])) delete board.picks[id]; });
  saveBoard();
  if (rvVideo.src){ URL.revokeObjectURL(rvVideo.src); rvVideo.removeAttribute('src'); rvVideo.load(); }
  clipList = null;
  resetPreview();
  renderBoard();
}
// the purge menu closes once a choice is made
document.querySelectorAll('.rv-purge .rv-menu button').forEach(b=>b.addEventListener('click', ()=>{ b.closest('details').open = false; }));
document.getElementById('rv-clean-unused').onclick = async ()=>{
  const {rows} = boardReview(), used = new Set(rows.map(r=>r.pick).filter(Boolean));
  const unused = board.takes.filter(t=>!used.has(t.uid));
  if (!unused.length){ say('Every take is in use.'); return; }
  if (!confirm('Purge ' + unused.length + ' take' + (unused.length === 1 ? '' : 's') + ' the video doesn’t use (earlier attempts and outdated takes)?')) return;
  await deleteClips(unused);
  say('Purged ' + unused.length + ' unused take' + (unused.length === 1 ? '' : 's') + '.');
};
document.getElementById('rv-clean').onclick = async ()=>{
  if (!board.takes.length || !confirm('Purge all ' + board.takes.length + ' takes of this deck from this browser? Download the video first if you need it.')) return;
  const runs = new Set(board.takes.map(t=>t.clip.split('/')[0]));
  board.takes = []; board.picks = {};
  saveBoard();
  for (const r of runs) await deleteTakes(r);
  if (rvVideo.src){ URL.revokeObjectURL(rvVideo.src); rvVideo.removeAttribute('src'); rvVideo.load(); }
  clipList = null;
  resetPreview();
  say('All takes purged.');
  renderBoard();
};
// every deck's takes: the whole takes folder, and every deck's board, including takes no deck shows any more
// (a deck since renamed or deleted)
document.getElementById('rv-clean-every').onclick = async ()=>{
  let root, bytes = 0, files = 0;
  try { root = await navigator.storage.getDirectory(); } catch(e){ return; }
  /** @param {FileSystemDirectoryHandle} dir */
  const walk = async dir=>{
    for await (const h of dir.values()){
      if (h.kind === 'directory') await walk(h); else { files++; bytes += (await h.getFile()).size; }
    }
  };
  try { await walk(await root.getDirectoryHandle('slidetake-takes')); } catch(e){}
  const boards = [];
  try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith('slidetake:board:')) boards.push(k); } } catch(e){}
  const decks = boards.filter(k=>{ try { return JSON.parse(localStorage.getItem(k) || '{}').takes.length > 0; } catch(e){ return false; } }).length;
  if (!files){ say('No takes are kept in this browser.'); return; }
  const size = bytes > 1e9 ? (bytes / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(bytes / 1e6)) + ' MB';
  if (!confirm('Purge ' + size + ' of takes (' + files + ' file' + (files === 1 ? '' : 's') + ') from ' + (decks || 'no') + ' deck' + (decks === 1 ? '' : 's') +
    ' and any left behind? Every deck loses its takes; download the videos you need first.')) return;
  try { await root.removeEntry('slidetake-takes', {recursive:true}); } catch(e){}
  boards.forEach(k=>{ try { localStorage.removeItem(k); } catch(e){} });
  // older recordings kept as sessions lose their takes too
  save('slidetake:sessions', JSON.stringify(loadSessions().map(x=>x.inBrowser ? {...x, cleaned:true} : x)));
  board = null; boardKey = '';
  loadBoard();
  clipSizes.clear();
  if (rvVideo.src){ URL.revokeObjectURL(rvVideo.src); rvVideo.removeAttribute('src'); rvVideo.load(); }
  clipList = null;
  resetPreview();
  renderBoard();
  say('Purged ' + size + ' of takes from every deck.');
};

// the recording: from the remembered OBS folder when the browser allows it, otherwise picked by hand
function idb(name){
  return new Promise((res, rej)=>{
    const r = indexedDB.open(name || 'slidetake', 1);
    r.onupgradeneeded = ()=>r.result.createObjectStore('kv');
    r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error);
  });
}
async function kvGet(k){
  const get = async name=>{ const db = await idb(name); return await new Promise(r=>{ const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = ()=>r(q.result); q.onerror = ()=>r(null); }); };
  // the remembered folder may still be in the database from an earlier name (Markcast, Traverse)
  try { return (await get()) ?? (await get('markcast')) ?? (await get('traverse')) ?? null; }
  catch(e){ return null; }
}
async function kvSet(k, v){ try { const db = await idb(); db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch(e){} }
// a File is a snapshot: once OBS writes to the recording again (it finishes the file a moment after
// StopRecord) the browser refuses to read the old snapshot, which shows up as a playback error.
// With a file handle (the remembered folder, or the file picker) we simply read it again; a File from
// the plain file input has to be picked again.
let rvHandle = null, rvRetries = 0, rvOpening = false;
rvVideo.addEventListener('error', async ()=>{
  if (!rvVideo.getAttribute('src')) return;
  if (rvHandle && rvRetries < 5){
    rvRetries++;
    say('Reloading ' + reviewFileName + ' (OBS was still finishing it)…');
    await new Promise(r=>setTimeout(r, 1500));
    try { useRecording(await stableFile(rvHandle), rvHandle, true); return; } catch(e){}
  }
  say(rvHandle
    ? 'Chrome cannot play ' + reviewFileName + '. In OBS set Recording Format to Hybrid MP4 (or MP4) with H.264 video; the ffmpeg command still works with this file.'
    : 'Could not play ' + (reviewFileName || 'this file') + '. If OBS was still finishing it when you opened it, open it again; if it still fails, set OBS to Hybrid MP4 (or MP4) with H.264 video.', {warn:true});
});
// wait until OBS has stopped writing: same size and time stamp a second apart
async function stableFile(handle){
  rvOpening = true;
  try { return await settle(handle); } finally { rvOpening = false; }
}
async function settle(handle){
  let f = await handle.getFile();
  for (let i = 0; i < 10; i++){
    await new Promise(r=>setTimeout(r, 1000));
    const g = await handle.getFile();
    if (g.size === f.size && g.lastModified === f.lastModified) return g;
    f = g;
  }
  return f;
}
function useRecording(file, handle, retry){
  if (rvVideo.src) URL.revokeObjectURL(rvVideo.src);
  rvHandle = handle || null;
  if (!retry) rvRetries = 0;
  rvVideo.src = URL.createObjectURL(file);
  reviewFileName = file.name;
  document.getElementById('rv-novideo').hidden = true;
  say('Loaded ' + file.name + '. Click a take to preview it.');
  if (pendingPlay) playRange(pendingPlay);
  else if (retry && playlist) playRange(playlist.ranges.slice(playlist.i));
}
const fileInput = document.getElementById('rv-file-input');
fileInput.addEventListener('change', ()=>{ if (fileInput.files[0]) useRecording(fileInput.files[0]); fileInput.value = ''; });
// a file picker must open straight from the click (browsers allow one picker per click), so the file
// and folder options are separate buttons
// where the browser can, pick a file handle rather than a File, so a recording OBS was still finishing
// can be read again
document.getElementById('rv-open').onclick = async ()=>{
  if (!window.showOpenFilePicker) return fileInput.click();
  try {
    const [handle] = await window.showOpenFilePicker({id:'obs-recordings', types:[{description:'Recordings', accept:{'video/*':['.mov','.mp4','.m4v','.mkv','.webm']}}]});
    say('Opening ' + handle.name + '…');
    useRecording(await stableFile(handle), handle);
  } catch(e){ if (!e || e.name !== 'AbortError') say('Could not open that file.', {warn:true}); }
};
const folderBtn = document.getElementById('rv-folder');
if (!window.showDirectoryPicker) folderBtn.style.display = 'none';   // `hidden` loses to .btn's display (Safari, Firefox)
folderBtn.onclick = async ()=>{
  const name = reviewing && baseName(reviewing.outputPath);
  try {
    const dir = await window.showDirectoryPicker({id:'obs-recordings', mode:'read'});
    kvSet('obs-folder', dir);
    if (!name){ say('Folder remembered. This session has no file name from OBS; open the file instead.'); return; }
    const handle = await dir.getFileHandle(name);
    useRecording(await stableFile(handle), handle);
  } catch(e){
    // not there (or unreadable): nothing to say, Open the recording file… is right beside it
  }
};
// a remembered folder that the browser still allows reading loads the take's file without any prompt
async function autoLoadRecording(sess){
  const name = baseName(sess.outputPath);
  if (!name || !window.showDirectoryPicker) return;
  if (reviewFileName === name && rvVideo.src) return;
  try {
    const dir = await kvGet('obs-folder');
    if (!dir || (await dir.queryPermission({mode:'read'})) !== 'granted') return;
    const handle = await dir.getFileHandle(name);
    say('Opening ' + name + '…');
    useRecording(await stableFile(handle), handle);
  } catch(e){}
}

if (loadObsSettings() && new URLSearchParams(location.search).get('obs')) connectObs();

// ---------- webcam in the PIP box ----------
const camBtn = document.getElementById('btn-camera');
const pipMsg = document.getElementById('pip-msg');
let pipMsgTimer = null;
const pipLabel = pipEl.querySelector('span');
// Camera news goes in the camera's own box while it's on screen and empty (no live picture); otherwise in
// a note over the stage. Errors are sticky: they stay until the camera starts or is turned off.
function showPipMsg(text, sticky){
  if (rec.active) return;
  clearTimeout(pipMsgTimer);
  if (!pipEl.hidden && !pipEl.classList.contains('live')){
    pipMsg.classList.remove('show');
    pipLabel.textContent = text;
    pipEl.classList.add('msg');
    if (!sticky) pipMsgTimer = setTimeout(resetPipLabel, 9000);
    return;
  }
  pipMsg.textContent = text;
  pipMsg.classList.add('show');
  if (!sticky) pipMsgTimer = setTimeout(()=>pipMsg.classList.remove('show'), 9000);
}
function resetPipLabel(){ pipLabel.textContent = 'PIP camera'; pipEl.classList.remove('msg'); }
function hidePipMsg(){ clearTimeout(pipMsgTimer); pipMsg.classList.remove('show'); resetPipLabel(); }
// explain the usual reasons a browser refuses the camera
function cameraHelp(){
  let embedded = false;
  try { embedded = window.top !== window.self; } catch(e){ embedded = true; }
  if (embedded) return ' This page is running inside a preview frame that may not allow cameras. Open Slidetake directly in Chrome (from localhost or as a file).';
  if (!window.isSecureContext) return ' Browsers only allow cameras on secure pages. Open it from http://localhost or as a local file in Chrome.';
  return ' Allow camera access for this page in the browser’s site settings (the icon at the left of the address bar), then try again.';
}
function stopWebcam(){
  if (cameraStream) cameraStream.getTracks().forEach(t=>t.stop());
  cameraStream = null;
  const v = pipEl.querySelector('video');
  if (v) v.remove();
}
async function startWebcam(){
  if (cameraStream || cameraOff) return;
  {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      showPipMsg('Camera not available on this page.' + cameraHelp(), true);
      return;
    }
    if (camBtn.disabled) return;
    camBtn.disabled = true;
    showPipMsg('Waiting for camera permission — check the browser prompt near the address bar.', true);
    try {
      const camId = load('slidetake:cam');
      cameraStream = await navigator.mediaDevices.getUserMedia({video:{...(camId ? {deviceId:{ideal:camId}} : {}), width:{ideal:1920}, height:{ideal:1080}, frameRate:{ideal:30}}, audio:false});
      hidePipMsg();
    } catch(e){
      const name = e && e.name;
      showPipMsg(
        name === 'NotAllowedError' || name === 'SecurityError' ? 'Camera access was blocked.' + cameraHelp() :
        name === 'NotFoundError' || name === 'OverconstrainedError' ? 'No camera was found. Check that a webcam is connected.' :
        name === 'NotReadableError' ? 'The camera is busy — close other apps using it (Zoom, OBS, FaceTime) and try again.' :
        'Could not start the camera' + (name ? ' (' + name + ')' : '') + '.' + cameraHelp(), true);
      return;
    } finally {
      camBtn.disabled = false;
      updateCamBtn();
    }
    // the camera can be unplugged or revoked while live
    cameraStream.getVideoTracks().forEach(t=>t.addEventListener('ended', ()=>{ stopWebcam(); applyDeckSettings(); refocus(); }));
    const v = document.createElement('video');
    v.autoplay = true; v.muted = true; v.playsInline = true;
    v.srcObject = cameraStream;
    pipEl.appendChild(v);
  }
  applyDeckSettings();
  refocus();
}
const CAMERA_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10.5 22 7v10l-6-3.5z"/></svg>';
/** a bottom-bar button that is on: in the accent @param {HTMLElement} btn @param {boolean} on */
function lightUp(btn, on){ btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', String(on)); }
function updateCamBtn(){
  if (!camBtn.querySelector('svg')) camBtn.innerHTML = CAMERA_ICON + '<span class="lbl"> Camera</span>';
  camBtn.classList.toggle('on', !cameraOff);
  camBtn.setAttribute('aria-pressed', String(!cameraOff));
  camBtn.title = cameraOff ? 'Camera is off for every slide (C)' : 'Camera is on and follows the deck (C)';
}
function setCameraEnabled(on, quiet){
  if (on && !RECORDING_UI) return;
  cameraOff = !on;
  if (cameraOff){ stopWebcam(); hidePipMsg(); }
  camManual = null; camCycle = -1;
  stepPos = Math.min(stepPos, Math.max(0, slideSteps(nodes.get(currentId)).length - 1));
  updateCamBtn();
  applyDeckSettings();
  applyStepState();
  updateActivePath();
  refocus();
  if (!presenting && !quiet) showPipMsg(on ? 'Camera on — slides follow their camera settings.' : 'Camera off — camera settings are ignored and slides use the whole screen.');
  if (on) startWebcam();
}
camBtn.onclick = ()=>setCameraEnabled(cameraOff);
updateCamBtn();
// while presenting, the cursor and on-screen controls hide after 2s without mouse movement
let idleTimer = null;
function markActive(){
  document.body.classList.remove('idle');
  clearTimeout(idleTimer);
  if (presenting) idleTimer = setTimeout(()=>document.body.classList.add('idle'), 2000);
}
window.addEventListener('pointermove', markActive);
document.addEventListener('fullscreenchange', ()=>{
  if (document.fullscreenElement) return;
  if (rec.active) finishTake('Stopped: the browser left fullscreen');
  else if (presenting) setPresent(false);
});

const help = document.getElementById('help');
// Keys is lit while the keys are open, Studio while it is open, as the Editor is
new MutationObserver(()=>lightUp(document.getElementById('btn-keys'), help.classList.contains('open'))).observe(help, {attributes:true, attributeFilter:['class']});
// closing Studio (✕, Esc or a click outside it) stops a preview that is playing
new MutationObserver(()=>{
  const open = reviewDialog.classList.contains('open');
  document.getElementById('btn-studio').classList.toggle('active', open);
  if (!open && !rvVideo.paused) rvVideo.pause();
}).observe(reviewDialog, {attributes:true, attributeFilter:['class']});
// ? or K shows the keys; Docs (a link in the header) opens the full guide, itself a deck, in a new tab
document.getElementById('btn-keys').onclick = ()=>help.classList.add('open');
document.getElementById('help-close').onclick = ()=>help.classList.remove('open');
help.addEventListener('click', e=>{ if (e.target===help) help.classList.remove('open'); });

window.addEventListener('keydown', e=>{
  // a clicker's "start" button sends F5; never let it reload the page
  if (e.key === 'F5'){ e.preventDefault(); if (!rec.active) openTakes(); return; }
  if (rec.active){ takeKey(e); return; }
  if (document.querySelector('.modal.open')){ if (e.key === 'Escape') closeModals(); return; }
  const tag = document.activeElement && document.activeElement.tagName;
  if (tag === 'TEXTAREA' || tag === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
  // the keys card: K or ? again closes it, as O and F undo themselves
  if (help.classList.contains('open')){ if (/^(Escape|k|K|\?)$/.test(e.key)) help.classList.remove('open'); return; }
  const k = e.key;
  if (k==='ArrowRight' || k===' ' || k==='PageDown'){ e.preventDefault(); step(1); }
  else if (k==='ArrowLeft' || k==='PageUp'){ e.preventDefault(); step(-1); }
  else if (k==='ArrowDown'){ e.preventDefault(); toChild(); }
  else if (k==='ArrowUp'){ e.preventDefault(); toParent(); }
  else if (k==='Home'){ if (order.length) navigate(order[0]); }
  else if (k==='End'){ if (order.length) navigate(order[order.length-1]); }
  else if (k==='o' || k==='O'){ overview(); }
  else if (k==='e' || k==='E'){ toggleEditor(); }
  else if (k==='f' || k==='F' || k==='p' || k==='P'){ setPresent(!presenting); }
  else if (k==='r' || k==='R'){ openTakes(); }
  else if (/^[1-4]$/.test(k)){ setMode(LAYOUTS[+k - 1]); }
  else if (k==='c' || k==='C'){ setCameraEnabled(cameraOff); }
  else if (k==='v' || k==='V'){ cycleCamera(); }
  else if (k==='l' || k==='L'){ toggleMode(); }
  else if (k==='+' || k==='='){ sizeStep(1); }
  else if (k==='-' || k==='_'){ sizeStep(-1); }
  else if (k==='?' || k==='k' || k==='K'){ help.classList.add('open'); }
  else if (k==='Escape'){ if (!backFromOverview() && presenting) setPresent(false); }
});

window.addEventListener('hashchange', ()=>{
  const {data, slide} = parseHash(location.hash);
  if (data && !(view && view.kind === 'share' && data === view.data)){ location.reload(); return; }   // another shared deck was pasted in
  if (slide && slide !== currentId && nodes.has(slide)) navigate(slide);
});

// the stage changes size when the editor collapses, presenting starts, or the window resizes
let lastSize = '';
new ResizeObserver(()=>{
  const size = stage.clientWidth + 'x' + stage.clientHeight;
  if (size === lastSize) return;
  lastSize = size;
  applyCamera();
  refocus(true);
}).observe(stage);

// ---------- open a deck from a link, share a link to it ----------
const toastEl = document.createElement('div');
toastEl.id = 'toast'; toastEl.setAttribute('role', 'status');
document.body.appendChild(toastEl);
let toastTimer = null;
function showToast(text, ms){
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toastEl.classList.remove('show'), ms || 2500);
}
// the address for a deck, keeping this view's settings (layout, editor, theme, OBS) but not the slide
function deckAddress(source, {keepObs = true, keepEdit = true, slide = ''} = {}){
  const link = new URL(shortLink(source), location.origin);
  new URLSearchParams(location.search).forEach((v, k)=>{
    if (k === 'src' || (k === 'obs' && !keepObs) || (k === 'edit' && !keepEdit)) return;
    link.searchParams.set(k, v);
  });
  if (slide) link.hash = slide;
  // URL writes the @ of owner/repo@branch as %40; the short form reads better
  return link.href.replace(link.pathname, link.pathname.replace(/%40/g, '@'));
}
const openDialog = document.getElementById('open-dialog');
const openUrl = document.getElementById('open-url');
const openError = document.getElementById('open-error');
document.getElementById('btn-load').onclick = ()=>{
  openError.hidden = true;
  openModal(openDialog);
  openUrl.focus(); openUrl.select();
};
document.getElementById('open-form').onsubmit = e=>{
  e.preventDefault();
  const source = normalizeSource(openUrl.value);
  if (!source){ openError.textContent = 'That doesn\'t look like a link.'; openError.hidden = false; return; }
  location.href = deckAddress(source);
};
// A shared link never carries the OBS address (it can hold a password) or the editor state. A read-only
// deck shares its own short link; the working copy shares its origin's short link while it still matches
// it, and otherwise the deck itself, inside a /share# link.
async function shareLink(slide){
  const keep = {keepObs: false, keepEdit: false, slide};
  if (view.kind === 'source') return {link: deckAddress(view.source, keep), inside: false};
  const linkable = view.kind === 'copy' && matchesOrigin(copy) && ['url', 'gist', 'builtin'].includes(copy.origin.kind);
  if (linkable) return {link: deckAddress(copy.origin, keep), inside: false};
  const data = view.kind === 'share' ? view.data : await encodeDeck(editor.value);
  const q = new URLSearchParams(location.search); ['src', 'obs', 'edit'].forEach(k=>q.delete(k));
  return {link: location.origin + '/share' + (q.toString() ? '?' + q : '') + deckHash(data, slide), inside: true};
}
document.getElementById('btn-share').onclick = async ()=>{
  const {link, inside} = await shareLink(currentId && currentId !== order[0] ? currentId : '');
  const note = !inside ? 'Link copied.'
    : 'Link copied, with the whole deck inside it (' + (link.length / 1024).toFixed(1) + ' KB)' +
      (link.length > 8000 ? '. Some chat apps cut long links short: a GitHub file or gist makes a shorter one.' : '.');
  try { await navigator.clipboard.writeText(link); showToast(note, 5000); }
  catch(err){ prompt('Copy this link:', link); }
  if (view.kind === 'copy'){ copy.exported = copy.text; saveCopy(); updateDocState(); }
};

// ---------- boot ----------
const savedMode = load('slidetake:layout');
layoutMode = LAYOUTS.includes(savedMode) ? savedMode : 'path';
document.querySelectorAll('#layout-toggle .seg-btn').forEach(x=>x.classList.toggle('active', x.dataset.mode === layoutMode));

// ?src=<url of a .md> loads a deck from the web (relative images resolve next to it),
// ?edit=0 starts with the editor hidden, ?layout=tree|radial|path|focus picks the layout
const params = new URLSearchParams(location.search);
if (LAYOUTS.includes(params.get('layout'))){
  layoutMode = params.get('layout');
  document.querySelectorAll('#layout-toggle .seg-btn').forEach(x=>x.classList.toggle('active', x.dataset.mode === layoutMode));
}
// ---------- embedded: the header is the host site's trail; the credit sits in the control bar ----------
// trail: [{label, url}, …] from the site's home down to this deck's section (back: {label, url} is one step)
if (EMBED){
  const trail = (Array.isArray(EMBED.trail) ? EMBED.trail : EMBED.back ? [EMBED.back] : []).filter(t=>t && t.label);
  const brandBox = document.querySelector('header .brand');
  if (trail.length){
    brandBox.innerHTML = '<nav class="trail" aria-label="Site">' + trail.map((t, i)=>
      (i ? '<span class="sep" aria-hidden="true">|</span>' : '') +
      (t.url ? '<a href="' + escapeHtml(t.url) + '">' + escapeHtml(t.label) + '</a>' : '<span>' + escapeHtml(t.label) + '</span>')).join('') + '</nav>';
  }
  const credit = document.createElement('a');
  credit.id = 'credit'; credit.href = 'https://slidetake.com'; credit.target = '_blank'; credit.rel = 'noopener';
  credit.title = 'Made with Slidetake'; credit.setAttribute('aria-label', 'Made with Slidetake');
  credit.innerHTML = LOGO + '<span class="word">Slide<span>take</span></span>';
  // header, right side: Slidetake | layouts | light/dark, and for viewers Keys and Fullscreen too: a reader's
  // page has no bottom bar. With ?obs= (recording) the bottom bar is back, as on slidetake.com.
  const actions = document.querySelector('header .hdr-actions');
  actions.insertBefore(credit, actions.firstChild);
  if (!RECORDING_UI){
    actions.insertAdjacentHTML('beforeend',
      '<button class="btn" id="hdr-keys" title="Keyboard shortcuts (K)">⌨ Keys</button>' +
      '<button class="btn" id="hdr-full" title="Fullscreen (F)">⛶ Fullscreen</button>');
    document.getElementById('hdr-keys').onclick = ()=>document.getElementById('help').classList.add('open');
    document.getElementById('hdr-full').onclick = ()=>setPresent(!presenting);
  }
}

// ---------- the deck on this page, and the working copy ----------
// view: what this page shows. A read-only source (home, docs, a template, a file on the web), a shared
// deck (/share#…), or the working copy (/edit). Typing in a read-only deck forks it into the copy.
const route = routeOf(location.pathname, location.search, location.hash);
const startId = route.page === 'pick' ? '' : route.slide;
let view = null;
let copy = parseCopy(load('slidetake:copy')) || earlierDraft();
// a draft from before working copies existed becomes the copy
function earlierDraft(){
  const old = load('slidetake:draft');
  if (!old || old === SAMPLE_MD) return null;
  const c = makeCopy(old, {kind: 'file', name: 'your earlier draft'}, {exported: true});
  save('slidetake:copy', JSON.stringify(c));
  try { localStorage.removeItem('slidetake:draft'); } catch(e){}
  return c;
}
function saveCopy(){ save('slidetake:copy', JSON.stringify(copy)); }
// the editor bar says whose deck this is, and whether the copy has edits not yet saved or shared
function updateDocState(){
  if (EMBED) return;
  let html;
  if (isLocalDeck()){
    html = '<span class="mine">' + escapeHtml(LOCAL.file) + '</span> <span class="ro">· on this computer, saved as you type</span>';
  } else if (view.kind === 'copy'){
    html = '<span class="mine">Your copy of ' + escapeHtml(originLabel(copy.origin)) + '</span>' +
      (isEdited(copy) ? ' <span class="edited">· edited</span>' : '');
  } else {
    const name = view.kind === 'share' ? 'a shared deck' : originLabel(view.source);
    html = '<span class="mine">' + escapeHtml(name.charAt(0).toUpperCase() + name.slice(1)) + '</span> <span class="ro">· read-only, typing makes your copy</span>';
  }
  document.getElementById('doc-state').innerHTML = html;
  editorPane.classList.toggle('unsaved', view.kind === 'copy' && isEdited(copy));
  document.getElementById('btn-reset').hidden = !(view.kind === 'copy' && !matchesOrigin(copy));
  const cont = document.getElementById('continue');
  cont.hidden = view.kind === 'copy' || !copy;
  if (copy){ cont.textContent = 'Your copy →'; cont.title = 'Continue your copy of ' + originLabel(copy.origin); }
}
// a working copy with edits that aren't saved or shared is only replaced after asking
function confirmReplaceCopy(what){
  if (!copy || !isEdited(copy)) return true;
  return confirm('Your copy of ' + originLabel(copy.origin) + ' has edits you haven\'t saved or shared. Replace it with ' + what + '?');
}
function editAddress(){
  const q = new URLSearchParams(location.search); q.delete('src'); q.delete('template');
  return '/edit' + (q.toString() ? '?' + q : '');
}
// the first keystroke in a read-only deck: the deck as it was becomes the copy's original, then the edit applies
function forkToCopy(){
  const origin = view.kind === 'share' ? {kind: 'shared'} : view.source;
  if (!confirmReplaceCopy('a copy of ' + originLabel(origin))){ editor.value = view.text; return false; }
  copy = makeCopy(view.text, origin);
  view = {kind: 'copy'};
  history.pushState(null, '', editAddress() + (currentId && currentId !== order[0] ? '#' + encodeURIComponent(currentId) : ''));
  showToast('Editing your own copy of ' + originLabel(origin) + '. The original is unchanged.', 4000);
  return true;
}
// switch this page to the working copy (after opening a file)
function showCopy(){
  view = {kind: 'copy'};
  history.pushState(null, '', editAddress());
  if (editorPane.classList.contains('collapsed')) toggleEditor();
  editor.value = copy.text; rebuild(true); updateDocState();
}
// back and forward move between pages (a deck and your copy of it): load what the address says
window.addEventListener('popstate', ()=>location.reload());

// ---------- npx slidetake: a deck file on this computer, kept in step both ways ----------
function isLocalDeck(){
  return !!(LOCAL && view && view.kind === 'source' && view.source.kind === 'url' &&
    new URL(view.source.url, location.href).pathname === LOCAL.deck);
}
function saveLocal(text){
  fetch(LOCAL.save, {method: 'PUT', body: text}).catch(()=>showToast('Could not save ' + LOCAL.file + ': is npx slidetake still running?', 6000));
}
// a change in the deck's folder: new text rebuilds the deck where you are; a changed image reloads in place
if (LOCAL && window.EventSource){
  new EventSource(LOCAL.events).onmessage = async e=>{
    if (!isLocalDeck()) return;
    const name = (JSON.parse(e.data).file || '').replace(/\\/g, '/');
    if (name === LOCAL.file){
      const text = await (await fetch(LOCAL.deck, {cache: 'no-store'})).text();
      if (text === editor.value) return;
      editor.value = view.text = text;
      rebuild(true);
      return;
    }
    world.querySelectorAll('img').forEach(img=>{
      const u = new URL(img.src);
      if (decodeURIComponent(u.pathname).endsWith('/' + name)){ u.searchParams.set('t', String(Date.now())); img.src = u.href; }
    });
  };
}
async function fetchSource(source){
  if (source.kind === 'builtin') return BUILTIN[source.id === 'help' ? 'docs' : source.id] ?? BUILTIN.home;
  if (source.kind === 'gist'){
    const res = await fetch('https://api.github.com/gists/' + encodeURIComponent(source.id));
    if (!res.ok) throw new Error(res.status === 404 ? 'no such gist' : res.status + ' ' + res.statusText);
    const files = Object.values((await res.json()).files || {});
    const file = files.find(f=>f.filename === source.file) || files.find(f=>/\.(md|markdown)$/i.test(f.filename)) || files[0];
    if (!file) throw new Error('the gist has no files');
    deckBase = file.raw_url;
    return file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
  }
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(res.status === 404 ? 'not found' : res.status + ' ' + res.statusText);
  deckBase = new URL(source.url, location.href).href;
  return await res.text();
}
function showHome(){
  view = {kind: 'source', source: {kind: 'builtin', id: 'home'}, text: BUILTIN.home};
  return view.text;
}
async function loadInitialDeck(){
  // npx slidetake: the address with no deck named is the local file
  if (LOCAL && route.page === 'source' && route.source.kind === 'builtin' && route.source.id === 'home' && location.pathname === '/'){
    route.source = {kind: 'url', url: LOCAL.deck};
  }
  if (EMBED){
    deckBase = EMBED.base || location.href;
    view = {kind: 'source', source: {kind: 'url', url: deckBase}, text: settingsBlock(EMBED.settings || {}) + String(EMBED.markdown || '')};
    return view.text;
  }
  if (route.page === 'edit'){
    if (copy){ view = {kind: 'copy'}; return copy.text; }
    // no copy yet: start one from a template
    history.replaceState(null, '', '/new' + location.search);
    route.page = 'pick';
  }
  if (route.page === 'pick'){
    openModal(document.getElementById('new-dialog'));
    view = {kind: 'source', source: {kind: 'builtin', id: 'template:blank'}, text: BUILTIN['template:blank']};
    return view.text;
  }
  if (route.page === 'share'){
    try { const text = await decodeDeck(route.data); view = {kind: 'share', data: route.data, text}; return text; }
    catch(e){ showToast('This link\'s deck is damaged or cut short, so it could not be opened.', 6000); return showHome(); }
  }
  try { const text = await fetchSource(route.source); view = {kind: 'source', source: route.source, text}; return text; }
  catch(e){
    statusErr.textContent = 'Could not load the deck (' + e.message + ')';
    showToast('Could not load ' + originLabel(route.source) + ': ' + e.message, 6000);
    return showHome();
  }
}
// the editor starts closed, except on your copy; E, the Editor button or ?edit=1 opens it
if (params.get('edit') === '1' || (route.page === 'edit' && copy && params.get('edit') !== '0')) toggleEditor();
loadInitialDeck().then(text=>{
  editor.value = text;
  updateDocState();
  parseDeck(editor.value);
  build();
  // wait for web fonts before measuring card sizes
  return document.fonts ? document.fonts.ready : null;
}).then(()=>{
  nodes.forEach(sizeCard);
  position();
  navigate(nodes.has(startId) ? startId : order[0], true);
});

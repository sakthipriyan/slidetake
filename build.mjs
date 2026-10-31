// Builds two things from src/:
//   dist/index.html    the page shell with the styles and the bundled app inlined: one file you can open,
//                      copy or host anywhere (slidetake.com serves it)
//   dist/features.html (showcase, docs, privacy) the same page for Slidetake's own decks, each carrying its
//                      deck as plain HTML, so search engines and AI tools that don't run JavaScript read it
//   dist/slidetake.js  the same app as one script for other sites' pages (src/embed.js), which adds the
//                      markup, styles and fonts itself; the hugo-continuum theme vendors it
// `node build.mjs --watch` rebuilds both on every change.
import * as esbuild from 'esbuild';
import {readFile, writeFile, mkdir, cp} from 'node:fs/promises';
import {marked} from 'marked';

const watch = process.argv.includes('--watch');

/** @type {import('esbuild').Plugin} */
const inlinePage = {
  name: 'inline-page',
  setup(build){
    build.onEnd(async result=>{
      if (result.errors.length) return;
      const js = result.outputFiles.find(f=>f.path.endsWith('.js')).text;
      const [shell, css] = await Promise.all([readFile('src/index.html', 'utf8'), readFile('src/styles.css', 'utf8')]);
      // a literal "</script" inside the bundle would end the inline script early
      const page = shell
        .replace('<style>/*@styles*/</style>', ()=>'<style>\n' + css + '</style>')
        .replace('<script>/*@app*/</script>', ()=>'<script>\n' + js.replace(/<\/script/gi, '<\\/script') + '</script>');
      await mkdir('dist', {recursive: true});
      // index.html is the home page, and also what any other address gets (a shared deck, a GitHub link)
      for (const [name, md, path] of DECK_PAGES)
        await writeFile('dist/' + name + '.html', withDeckText(page, await readFile(md, 'utf8'), path, name));
      // favicon, preview image and other files served as they are
      await cp('src/public', 'dist', {recursive: true});
      // the guide and the home deck as plain markdown, for people and AI tools (see llms.txt)
      await cp('src/docs.md', 'dist/docs.md');
      await cp('src/features.md', 'dist/features.md');
      await cp('src/privacy.md', 'dist/privacy.md');
      await cp('examples/showcase.md', 'dist/showcase.md');
      await cp('src/docs.md', 'dist/help.md');   // the old address, kept for links already out there
      await cp('src/sample.md', 'dist/home.md');
      console.log('built dist/index.html (' + Math.round(page.length / 1024) + ' KB)');
    });
  }
};

// Slidetake's own decks, each as a page of its own: [file, deck, address]
const DECK_PAGES = [
  ['index', 'src/sample.md', '/'],
  ['features', 'src/features.md', '/features'],
  ['showcase', 'examples/showcase.md', '/showcase'],
  ['docs', 'src/docs.md', '/docs'],
  ['privacy', 'src/privacy.md', '/privacy'],
];
const escapeAttr = (/** @type {string} */ t)=>t.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/**
 * The page with a deck's text in it: its title and description in the head, and the deck as HTML at the top
 * of the body (#deck-text), which the app removes as it starts. Without JavaScript it is the page.
 * @param {string} page @param {string} md @param {string} path @param {string} name
 */
function withDeckText(page, md, path, name){
  const front = md.match(/^---\n([\s\S]*?)\n---\n/);
  const body = front ? md.slice(front[0].length) : md;
  const title = ((front && front[1].match(/^title:\s*(.+)$/m)) || [, 'Slidetake'])[1].replace(/^["']|["']$/g, '');
  // the deck's description: (Slidetake's own decks have one), or its first paragraph of plain text
  const para = body.split(/\n\s*\n/).map(b=>b.trim()).find(b=>b && !/^(#|<!--|```|\||!\[|-|>)/.test(b)) || '';
  const plain = para.replace(/<[^>]+>/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
  const own = ((front && front[1].match(/^description:\s*(.+)$/m)) || [, ''])[1].replace(/^["']|["']$/g, '');
  const description = own || (plain.length > 160 ? plain.slice(0, 157).replace(/\s+\S*$/, '') + '…' : plain);
  const html = marked.parse(body.replace(/<!--[\s\S]*?-->/g, ''), {async: false});
  const url = 'https://slidetake.com' + path;
  const mdFile = name === 'index' ? '/home.md' : '/' + name + '.md';
  const head = '<link rel="canonical" href="' + url + '">\n<link rel="alternate" type="text/markdown" href="' + mdFile + '">';
  return page
    .replace(/<title>[^<]*<\/title>/, ()=>'<title>' + escapeAttr(title) + '</title>')
    .replace(/(<meta name="description" content=")[^"]*/, (_, a)=>a + escapeAttr(description))
    .replace(/(<meta property="og:title" content=")[^"]*/, (_, a)=>a + escapeAttr(title))
    .replace(/(<meta property="og:description" content=")[^"]*/, (_, a)=>a + escapeAttr(description))
    .replace(/(<meta property="og:url" content=")[^"]*/, (_, a)=>a + url)
    .replace('</head>', ()=>head + '\n</head>')
    .replace('<body>', ()=>'<body>\n<article id="deck-text" class="deck-text">\n' + html +
      '<p>This page is a Slidetake deck; its markdown is at <a href="' + mdFile + '">' + mdFile + '</a>.</p>\n</article>');
}

// the embed script carries the page's markup and font links, read from the same src/index.html
/** @type {import('esbuild').Plugin} */
const shellModules = {
  name: 'shell-modules',
  setup(build){
    build.onResolve({filter: /^slidetake:(shell|head)$/}, args=>({path: args.path, namespace: 'slidetake'}));
    build.onLoad({filter: /.*/, namespace: 'slidetake'}, async args=>{
      const page = await readFile('src/index.html', 'utf8');
      const text = args.path === 'slidetake:shell'
        ? page.slice(page.indexOf('<body>') + 6, page.indexOf('<script>/*@app*/</script>'))
        : (page.match(/<link rel="preconnect"[^>]*>\s*<link href="https:\/\/fonts[^>]*>/) || [''])[0];
      return {contents: text, loader: 'text', watchFiles: ['src/index.html']};
    });
  }
};
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
const embed = await esbuild.context({
  entryPoints: ['src/embed.js'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  loader: {'.md': 'text', '.css': 'text'},
  outfile: 'dist/slidetake.js',
  banner: {js: '/* Slidetake ' + pkg.version + ' · https://slidetake.com · Apache-2.0 */'},
  logLevel: 'warning',
  plugins: [shellModules, {name: 'report', setup(b){ b.onEnd(r=>{ if (!r.errors.length) console.log('built dist/slidetake.js'); }); }}]
});

const ctx = await esbuild.context({
  entryPoints: ['src/app.js'],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  loader: {'.md': 'text'},
  outfile: 'dist/app.js',
  write: false,
  logLevel: 'warning',
  plugins: [inlinePage]
});

if (watch){
  await Promise.all([ctx.watch(), embed.watch()]);
  console.log('watching src/ …');
} else {
  await Promise.all([ctx.rebuild(), embed.rebuild()]);
  await Promise.all([ctx.dispose(), embed.dispose()]);
}

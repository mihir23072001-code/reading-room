/* Netlify build script — no external dependencies (Node core only).
   Reads content/*​/*.json (written by /admin via Decap CMS), filters to
   published entries, computes reading time, writes aggregated JSON indexes
   for the client-side pages to fetch, and pre-renders a static HTML page
   per writing/thought entry so individual entries work without JS and are
   crawlable. Runs automatically on every Netlify deploy (see netlify.toml). */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const GEN = path.join(ROOT, 'renaissance-assets', 'generated');

function readCollectionFiles(name) {
  const dir = path.join(CONTENT, name);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json'));
}

function readCollection(name) {
  const dir = path.join(CONTENT, name);
  return readCollectionFiles(name)
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      } catch (e) {
        console.warn('Skipping invalid JSON:', name, f, e.message);
        return null;
      }
    })
    .filter(Boolean);
}

/* Fallback dating for entries with no (or no usable) manual date field —
   currently Books always, and Thoughts saved before the Date field existed
   or left blank. We ask git — the same git Decap CMS commits to on every
   publish — for this file's first and most recent commit timestamps. On
   Netlify that's a full, real history, so this is exact. Locally, before a
   repo exists, there's no history to ask, so we fall back to the file's
   own mtime, which is the best available proxy and still requires nothing
   from the writer. */
function fileTimestamps(absPath) {
  try {
    const out = execFileSync('git', ['log', '--follow', '--format=%aI', '--', absPath], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) {
      const dates = out.split('\n').filter(Boolean);
      return { createdAt: dates[dates.length - 1], updatedAt: dates[0] };
    }
  } catch (e) { /* no git repo yet — fall through to mtime */ }
  const stat = fs.statSync(absPath);
  const iso = new Date(stat.mtimeMs).toISOString();
  return { createdAt: iso, updatedAt: iso };
}

/* Newest-first by default (point 18). If the horizontal direction ever
   reads better the other way round, flip this one constant — nothing
   else about the data or the admin form needs to change. */
const THOUGHTS_REVERSE = false;
function sortThoughts(entries) {
  const sorted = entries.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return THOUGHTS_REVERSE ? sorted.reverse() : sorted;
}

/* --- minimal markdown -> blocks parser -------------------------------
   Body text in /admin is a single markdown box. We support just enough
   syntax for this site's needs, kept intentionally small so the admin
   form stays simple: blank-line-separated paragraphs, "## Heading" for
   sub-headings, and GitHub-style pipe tables. Anything else renders as
   a plain paragraph. */
function parseMarkdown(md) {
  const raw = String(md || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];
  const chunks = raw.split(/\n\s*\n/);
  const blocks = [];
  chunks.forEach(chunk => {
    const c = chunk.trim();
    if (!c) return;
    if (/^#{2,3}\s+/.test(c)) {
      blocks.push({ h: c.replace(/^#{2,3}\s+/, '').trim() });
      return;
    }
    const lines = c.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2 && lines[0].startsWith('|') && /^\|?\s*-{2,}/.test(lines[1].replace(/\|/g, '|'))) {
      const head = lines[0].replace(/^\||\|$/g, '').split('|').map(s => s.trim());
      const rows = lines.slice(2).map(l => l.replace(/^\||\|$/g, '').split('|').map(s => s.trim()));
      blocks.push({ table: { head, rows } });
      return;
    }
    blocks.push({ p: c.replace(/\n/g, ' ') });
  });
  return blocks;
}

function wordCount(entry) {
  const blocks = parseMarkdown(entry.body);
  let n = 0;
  blocks.forEach(b => {
    if (b.p) n += b.p.split(/\s+/).filter(Boolean).length;
    if (b.h) n += b.h.split(/\s+/).filter(Boolean).length;
    if (b.table) {
      (b.table.rows || []).forEach(row => row.forEach(c => { n += String(c).split(/\s+/).filter(Boolean).length; }));
      n += (b.table.head || []).length * 2;
    }
  });
  return n;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBody(md, quote) {
  const blocks = parseMarkdown(md);
  const parts = [];
  let firstPDone = false;
  let quoteInserted = false;
  const nP = blocks.filter(b => b.p).length;
  let pIndex = 0;
  blocks.forEach(b => {
    if (b.h) {
      parts.push(`<h3>${esc(b.h)}</h3>`);
    } else if (b.p) {
      pIndex++;
      const cls = firstPDone ? '' : ' class="dropcap"';
      firstPDone = true;
      parts.push(`<p${cls}>${esc(b.p)}</p>`);
      if (!quoteInserted && quote && pIndex === Math.max(1, Math.floor(nP / 2))) {
        parts.push(`<p class="pull-quote">${esc(quote)}</p>`);
        quoteInserted = true;
      }
    } else if (b.table) {
      const thead = (b.table.head || []).map(h => `<th>${esc(h)}</th>`).join('');
      const rows = (b.table.rows || []).map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
      parts.push(`<div class="article-table-wrap"><table class="jtable"><thead><tr>${thead}</tr></thead><tbody>${rows}</tbody></table></div>`);
    }
  });
  if (quote && !quoteInserted) parts.push(`<p class="pull-quote">${esc(quote)}</p>`);
  return parts.join('\n');
}

/* Same minimal markdown support as renderBody() above (paragraphs, "## "
   headings, pipe tables) but without the dropcap/pull-quote treatment —
   those are article-page conventions, not Journal-modal ones. Used for
   Thoughts' description field so a longer entry (headings, a data table)
   reads exactly as written instead of being flattened to plain text. */
function renderThoughtBody(md) {
  const blocks = parseMarkdown(md);
  const parts = [];
  blocks.forEach(b => {
    if (b.h) {
      parts.push(`<h4>${esc(b.h)}</h4>`);
    } else if (b.p) {
      parts.push(`<p>${esc(b.p)}</p>`);
    } else if (b.table) {
      const thead = (b.table.head || []).map(h => `<th>${esc(h)}</th>`).join('');
      const rows = (b.table.rows || []).map(row => `<tr>${row.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
      parts.push(`<div class="article-table-wrap"><table class="jtable"><thead><tr>${thead}</tr></thead><tbody>${rows}</tbody></table></div>`);
    }
  });
  return parts.join('\n');
}

function pageShell({ title, description, heroImg, heroAlt, eyebrow, heading, desc, meta, body, backHref, backLabel }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)} — Mihir Panchal</title>
<meta name="description" content="${esc(description)}"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="/renaissance-assets/renaissance.css"/>
</head>
<body>
<div class="grain"></div>
<div class="progress-line" id="progressLine"></div>

<nav class="nav">
  <a href="/index.html" class="nav-name">The Reading Room</a>
  <div class="nav-links">
    <a href="/writings.html">Writings</a>
    <a href="/thoughts.html">Thoughts</a>
    <a href="/about.html">About</a>
  </div>
  <button class="nav-menu-btn" aria-label="Open menu"><span class="bars"><span></span><span></span><span></span></span>Menu</button>
</nav>

<div class="menu-overlay">
  <button class="menu-close" aria-label="Close menu">Close ×</button>
  <div class="menu-art"><img src="/renaissance-assets/img/garden-bust.jpg" alt="Marble bust from the garden painting, used as a decorative detail."/></div>
  <div class="menu-links">
    <a href="/writings.html"><span class="mn">01</span>Writings</a>
    <a href="/thoughts.html"><span class="mn">02</span>Thoughts</a>
    <a href="/about.html"><span class="mn">03</span>About</a>
  </div>
  <div class="menu-foot">Notes from a reading desk — Mihir Panchal</div>
</div>

<article>
  <section class="article-hero">
    <div class="article-hero-art"><img src="${heroImg}" alt="${esc(heroAlt)}"/></div>
    <svg class="orn-float orn-reveal orn-articlehero orn-c" viewBox="0 0 200 200" aria-hidden="true" focusable="false" data-orn></svg>
    <div class="article-hero-inner wrap">
      <p class="eyebrow">${esc(eyebrow)}</p>
      <h1>${esc(heading)}</h1>
      <p class="desc">${esc(desc)}</p>
      <div class="ameta">${meta}</div>
    </div>
  </section>

  <div class="article-body">
    ${body}
  </div>

  <div class="article-foot wrap">
    <a href="${backHref}">← ${esc(backLabel)}</a>
    <a href="/index.html">Back to the reading room</a>
  </div>
</article>

<footer class="site">
  <div class="wrap">
    <div class="foot-grid">
      <div class="nav-name" style="font-size:16px;">Mihir Panchal</div>
      <div class="foot-links">
        <a href="/writings.html">Writings</a>
        <a href="/thoughts.html">Thoughts</a>
        <a href="/about.html">About</a>
        <a href="mailto:panchalmihir2911@gmail.com">Email</a>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© Mihir Panchal</span>
      <span>A reading room, not a resume.</span>
    </div>
  </div>
</footer>

<script src="/renaissance-assets/main.js"></script>
</body>
</html>
`;
}

const HERO_FALLBACK = {
  PHILOSOPHY: { img: '/renaissance-assets/img/reader.jpg', alt: 'A vertical Renaissance-style painting of a lone scholar reading by candlelight inside an immense library.' },
  RELIGION: { img: '/renaissance-assets/img/garden.jpg', alt: 'A Renaissance-style garden painting of philosophers and students gathered around a marble rotunda.' },
  HISTORY: { img: '/renaissance-assets/img/garden.jpg', alt: 'A Renaissance-style garden painting of philosophers and students gathered around a marble rotunda.' },
  POLITICS: { img: '/renaissance-assets/img/featured-writings.jpg', alt: 'A dark Renaissance-style painting of scholars debating around a candlelit table at night.' },
  RESEARCH: { img: '/renaissance-assets/img/featured-writings.jpg', alt: 'A dark Renaissance-style painting of scholars debating around a candlelit table at night.' },
};

function buildWritings() {
  const entries = readCollection('writings').filter(e => e.published !== false);
  entries.forEach(e => { e.readingTime = Math.max(2, Math.ceil(wordCount(e) / 200)); });
  entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const outDir = path.join(ROOT, 'writings');
  fs.mkdirSync(outDir, { recursive: true });
  entries.forEach(e => {
    const fallback = HERO_FALLBACK[e.category] || HERO_FALLBACK.PHILOSOPHY;
    const heroImg = e.heroImage || fallback.img;
    const html = pageShell({
      title: e.title,
      description: e.excerpt || '',
      heroImg,
      heroAlt: `Renaissance-style artwork accompanying "${e.title}".`,
      eyebrow: e.category || 'WRITINGS',
      heading: e.title,
      desc: e.excerpt || '',
      meta: `<span>Mihir Panchal</span><span>${esc(e.category || '')}</span><span>${e.readingTime} min read</span><span>${esc((e.date || '').slice(0, 4))}</span>`,
      body: renderBody(e.body, e.excerpt),
      backHref: '/writings.html',
      backLabel: 'All writings',
    });
    fs.writeFileSync(path.join(outDir, e.slug + '.html'), html, 'utf8');
  });

  const index = entries.map(e => ({
    slug: e.slug, title: e.title, category: e.category || '',
    excerpt: e.excerpt || '', date: e.date || '', readingTime: e.readingTime,
    heroImage: e.heroImage || '', featured: !!e.featured,
  }));
  fs.writeFileSync(path.join(GEN, 'writings.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`writings: ${entries.length} published, pages written to /writings/`);
}

/* Thoughts: title, description, image, date — published straight into the
   homepage's vertical Journal with no separate page per entry and no
   frontend edits ever required. New entries just appear as the next band
   because the index this writes is what the Journal renderer reads from.
   Date is a manual field in /admin (so the writer controls where an entry
   sits, not just publish order) — if it's left blank we fall back to git/
   mtime, same as before, so older entries saved before this field existed
   keep working unchanged. */
function buildThoughts() {
  const dir = path.join(CONTENT, 'thoughts');
  const files = readCollectionFiles('thoughts');
  const raw = files.map(f => {
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const ts = fileTimestamps(path.join(dir, f));
      let manualDate = null;
      if (entry.date) {
        const d = new Date(entry.date);
        if (!isNaN(d.getTime())) manualDate = d.toISOString();
      }
      return Object.assign(entry, {
        createdAt: manualDate || ts.createdAt,
        updatedAt: manualDate || ts.updatedAt,
      });
    } catch (e) {
      console.warn('Skipping invalid JSON: thoughts', f, e.message);
      return null;
    }
  }).filter(Boolean).filter(t => t.published !== false);

  const entries = sortThoughts(raw);

  const index = entries.map(t => ({
    id: t.id || t.title, title: t.title || '', explanation: t.explanation || '',
    explanationHtml: renderThoughtBody(t.explanation),
    image: t.image || '',
    // Optional: a clean line-sketch version of the same artwork, shown
    // first — the Journal card crossfades to the full-colour `image`
    // above once the reader scrolls to that entry. Blank until an actual
    // sketch is uploaded through /admin; the frontend falls back to an
    // approximated look on `image` itself when this is empty, so nothing
    // breaks for entries that don't have one yet.
    sketch: t.sketch || '',
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  }));
  fs.writeFileSync(path.join(GEN, 'thoughts.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`thoughts: ${entries.length} published, index written to renaissance-assets/generated/thoughts.json`);
}

/* Books: name + image — nothing else. Powers the animated corridor beneath
   the Reading Desk. One /admin collection, two fields; a new upload just
   becomes the next card in the cycle, no code change required anywhere. */
function buildBooks() {
  const dir = path.join(CONTENT, 'books');
  const files = readCollectionFiles('books');
  const raw = files.map(f => {
    try {
      const entry = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      const ts = fileTimestamps(path.join(dir, f));
      return Object.assign(entry, ts);
    } catch (e) {
      console.warn('Skipping invalid JSON: books', f, e.message);
      return null;
    }
  }).filter(Boolean);

  raw.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const index = raw.map(b => ({
    id: b.id || b.name, name: b.name || '', image: b.image || '', createdAt: b.createdAt,
  }));
  fs.writeFileSync(path.join(GEN, 'books.json'), JSON.stringify(index, null, 2), 'utf8');
  console.log(`books: ${raw.length} published, index written to renaissance-assets/generated/books.json`);
}

/* Pre-Decap-simplification builds wrote a static page per thought under
   /thoughts/ — that concept no longer exists (every thought lives inline
   in its tile), so remove any stale pages a previous build left behind. */
function cleanStaleThoughtPages() {
  const dir = path.join(ROOT, 'thoughts');
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

fs.mkdirSync(GEN, { recursive: true });
buildWritings();
cleanStaleThoughtPages();
buildThoughts();
buildBooks();
console.log('Build complete.');

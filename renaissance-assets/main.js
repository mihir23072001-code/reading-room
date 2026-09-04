/* THE READING ROOM — shared front-end behaviour.
   Mobile-first, no scroll-jacking: almost every animation here is either a
   plain CSS transition/keyframe, or a one-shot IntersectionObserver reveal.
   No external animation library — this file has zero dependencies and
   works the same on a phone as it does on a desktop. Respects
   prefers-reduced-motion throughout (see the sitewide override at the
   bottom of renaissance.css).
   One deliberate exception: the homepage Journal's page-turn (see
   initJournalPageTurn) uses position:sticky to pin a frame in place while
   its entries turn like real book pages — desktop widths and motion
   allowed only (see the mode switch in renderJournal; mobile and Reduce
   Motion both get a plain, unpinned list instead). That's still not
   scroll-jacking in the sense this file otherwise avoids: it's native CSS
   sticky, not a JS wheel/scrollTo hijack, and native scroll physics are
   never touched — main.js only ever reads scroll position and writes
   transform/opacity/currentTime off it, same as every other scroll effect
   on this page. */

(function(){
  const isTouch = matchMedia('(hover:none), (pointer:coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  /* ---------- nav scroll state ---------- */
  const nav = document.querySelector('.nav');
  function onScrollNav(){
    if (!nav) return;
    if (window.scrollY > 70) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScrollNav, { passive:true });
  onScrollNav();

  /* ---------- progress line (article pages) ---------- */
  const progressLine = document.getElementById('progressLine');
  if (progressLine) {
    function onScrollProgress(){
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      progressLine.style.width = Math.min(100, Math.max(0,p)) + '%';
    }
    window.addEventListener('scroll', onScrollProgress, { passive:true });
    onScrollProgress();
  }

  /* ---------- hero scroll cue — fades out once the reader has actually
     started scrolling, rather than being driven by a pinned timeline ---------- */
  const heroCue = document.getElementById('heroCue');
  if (heroCue) {
    function onScrollCue(){
      heroCue.classList.toggle('hide', window.scrollY > window.innerHeight * 0.35);
    }
    window.addEventListener('scroll', onScrollCue, { passive:true });
  }

  /* ---------- full-screen menu ---------- */
  const menuBtn = document.querySelector('.nav-menu-btn');
  const menuClose = document.querySelector('.menu-close');
  function closeMenu(){ document.body.classList.remove('menu-open'); }
  function openMenu(){ document.body.classList.add('menu-open'); }
  if (menuBtn) menuBtn.addEventListener('click', ()=>{
    document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
  });
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeMenu(); });
  document.querySelectorAll('.menu-links a').forEach(a=>a.addEventListener('click', closeMenu));

  /* ---------- ambient cursor dot (native cursor stays visible, desktop only) ---------- */
  if (!isTouch) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);
    window.addEventListener('mousemove', (e)=>{
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
    });
    document.querySelectorAll('a, button').forEach(el=>{
      el.addEventListener('mouseenter', ()=> dot.classList.add('hover'));
      el.addEventListener('mouseleave', ()=> dot.classList.remove('hover'));
    });
    document.querySelectorAll('[data-cursor="read"]').forEach(el=>{
      el.addEventListener('mouseenter', ()=> dot.classList.add('read'));
      el.addEventListener('mouseleave', ()=> dot.classList.remove('read'));
    });
  }

  /* ---------- floating ornaments: generative astrolabe-rete SVG ----------
     Built the same way a mandala generator works — primitive SVG shapes
     assembled and rotated into place by code, not hand-typed paths — but
     deliberately asymmetric rather than a mandala's evenly-repeated rings:
     a real astrolabe's rete carries a handful of star-pointers at
     irregular hand-picked angles/lengths reaching toward named stars, so
     that's what STAR_SETS encodes. Runs once per empty svg[data-orn]
     placeholder; the outer .orn-float/.orn-reveal classes (see CSS) handle
     the ambient drift and scroll-in fade, this only builds and slowly
     spins the instrument face itself. */
  const svgNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs){
    const e = document.createElementNS(svgNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  const ASTROLABE_STAR_SETS = [
    [[15,68],[52,56],[98,78],[140,50],[187,70],[224,58],[268,82],[312,54]],
    [[8,64],[63,74],[110,52],[151,80],[199,58],[241,68],[289,60],[334,76]],
    [[25,76],[71,54],[103,66],[133,88],[176,58],[213,72],[257,50],[300,78]],
  ];
  function buildAstrolabe(svg){
    const c = 100;
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.innerHTML = '';

    // fixed rim: outer circle + 72 degree ticks (every 30° drawn longer/bolder) — does not rotate
    const rim = svgEl('g', { class: 'orn-rim' });
    rim.appendChild(svgEl('circle', { cx: c, cy: c, r: 92, fill: 'none', stroke: 'var(--gold-leaf)', 'stroke-width': 1, opacity: 0.5 }));
    for (let i = 0; i < 72; i++) {
      const angle = i * 5;
      const major = i % 6 === 0;
      const tick = svgEl('line', { x1: c, y1: c - 92, x2: c, y2: c - 92 + (major ? 11 : 6), stroke: 'var(--gold-leaf)', 'stroke-width': major ? 1 : 0.6, opacity: 0.55 });
      tick.setAttribute('transform', `rotate(${angle} ${c} ${c})`);
      rim.appendChild(tick);
    }
    svg.appendChild(rim);

    // rotating rete: offset ecliptic circle + zodiac dots + irregular star-pointers + index arm + pin
    const rete = svgEl('g', { class: 'orn-rete' });
    const ecCx = c, ecCy = c - 12, ecR = 54;
    rete.appendChild(svgEl('circle', { cx: ecCx, cy: ecCy, r: ecR, fill: 'none', stroke: 'var(--burgundy)', 'stroke-width': 0.8, opacity: 0.55 }));
    for (let z = 0; z < 12; z++) {
      const za = (Math.PI * 2 / 12) * z;
      rete.appendChild(svgEl('circle', { cx: ecCx + ecR * Math.sin(za), cy: ecCy - ecR * Math.cos(za), r: 1.6, fill: 'var(--burgundy)', opacity: 0.6 }));
    }

    let variant = 0;
    if (svg.classList.contains('orn-b')) variant = 1;
    else if (svg.classList.contains('orn-c')) variant = 2;
    ASTROLABE_STAR_SETS[variant].forEach(([deg, len]) => {
      const a = deg * Math.PI / 180;
      const x2 = c + len * Math.sin(a), y2 = c - len * Math.cos(a);
      rete.appendChild(svgEl('line', { x1: c, y1: c, x2, y2, stroke: 'var(--gold-leaf)', 'stroke-width': 0.7, opacity: 0.55 }));
      rete.appendChild(svgEl('circle', { cx: x2, cy: y2, r: 2.2, fill: 'var(--gold-leaf)', opacity: 0.85 }));
    });

    // index arm — longer and bolder, like the rete's main pointer
    rete.appendChild(svgEl('line', { x1: c, y1: c, x2: c, y2: c - 86, stroke: 'var(--burgundy)', 'stroke-width': 1.1, opacity: 0.7 }));
    rete.appendChild(svgEl('polygon', { points: `${c},${c - 86} ${c - 4},${c - 76} ${c + 4},${c - 76}`, fill: 'var(--burgundy)', opacity: 0.7 }));
    rete.appendChild(svgEl('circle', { cx: c, cy: c, r: 2.6, fill: 'var(--gold-leaf)' }));

    svg.appendChild(rete);
  }
  document.querySelectorAll('svg[data-orn]').forEach(buildAstrolabe);

  /* ---------- hero: layered parallax ----------
     The hero background is now the desk sketch itself (the astrolabe
     mandala that used to live here is gone). Three layers still move at
     different scroll-tied speeds as the reader scrolls through the hero:
     the drawing itself (slowest, with a faint zoom so it never shows a
     hard edge), the ambient particle field on top of it, and the title,
     which moves least since it's the thing meant to stay put and be read.
     Scroll-tied motion, so — like the Journal's image parallax below —
     it's skipped entirely under Reduce Motion rather than forced. */
  const heroBgImg = document.querySelector('.hero-bg img');
  const heroInnerLayer = document.querySelector('.hero-inner');
  // hero-scene.js (the particle canvas) loads via its own <script> tag after
  // this one, so the canvas doesn't exist yet at this point — re-queried
  // lazily inside the scroll handler below until it shows up, rather than
  // captured once here and silently staying null forever.
  let heroParticleLayer = document.querySelector('.hero-scene');
  if (heroBgImg) {
    const heroReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!heroReduceMotion) {
      const heroSection = document.querySelector('.hero');
      function onScrollHeroBg(){
        if (!heroParticleLayer) heroParticleLayer = document.querySelector('.hero-scene');
        const h = heroSection.offsetHeight || 1;
        const progress = Math.max(0, Math.min(1, window.scrollY / h));
        heroBgImg.style.transform = `scale(1.08) translateY(${(progress * 40).toFixed(1)}px)`;
        if (heroParticleLayer) heroParticleLayer.style.transform = `translateY(${progress * 75}px)`;
        if (heroInnerLayer) heroInnerLayer.style.transform = `translateY(${progress * 20}px)`;
      }
      window.addEventListener('scroll', onScrollHeroBg, { passive:true });
      onScrollHeroBg();
    }
  }

  /* ---------- reveal on scroll — one-shot fade/rise, IntersectionObserver only ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el=> io.observe(el));
  } else {
    revealEls.forEach(el=> el.classList.add('in-view'));
  }

  /* ---------- floating-ornament reveal — same one-shot pattern as above,
     kept separate from .reveal because it's deliberately NOT flattened to
     an instant appearance under reduced motion (see renaissance.css). */
  const ornEls = document.querySelectorAll('.orn-reveal');
  if ('IntersectionObserver' in window && ornEls.length) {
    const ioOrn = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          ioOrn.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    ornEls.forEach(el=> ioOrn.observe(el));
  } else {
    ornEls.forEach(el=> el.classList.add('in-view'));
  }

  /* ---------- Desk seal video — ambient ink-bleed loop, plays only while
     on screen. Treated as exempt-from-reduce-motion territory the OTHER
     way round from the auto-spinning ornaments elsewhere on the site: a
     vivid colour-morphing bloom read as more disruptive than a slow
     rotation, so reduced-motion users never get autoplay at all and just
     see the static poster frame (already a considered mid-bloom still). */
  const deskSealVideo = document.querySelector('.desk-seal-video');
  if (deskSealVideo) {
    const deskReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!deskReduceMotion && 'IntersectionObserver' in window) {
      const ioDesk = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if (entry.isIntersecting) {
            deskSealVideo.play().catch(()=>{});
          } else {
            deskSealVideo.pause();
          }
        });
      }, { threshold: 0.25 });
      ioDesk.observe(deskSealVideo);
    }
  }
})();

/* ============================================================
   Data-driven sections. These are called by each page's own inline
   script once it has fetched the relevant content from
   renaissance-assets/generated/*.json — that keeps this file generic
   and means new content published from /admin needs no code changes.
   Each function renders the DOM for its section AND wires up any
   interaction, so a page only has to: fetch -> call render.
   ============================================================ */
(function(){
  function esc(s){ const d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }

  /* ---------------- Journal cover media ----------------
     Shared by every place a Journal cover shows up (homepage card,
     /thoughts.html archive tile, and — through t.sketch alone — nowhere
     else, since the reading dialog carries no image at all). The sketch
     (`t.sketch`) is the permanent image now; there is no full-colour
     photo anywhere on the site any more, and no crossfade between two
     different pictures. The only "colour" is `t.sunVideo` — an optional
     field, empty until the sketch-to-sun-video pass is uploaded — which,
     when present, swaps the plain <img> for a <video> using that same
     sketch as its poster (so it's pixel-identical to the sketch until it
     plays) and scrubbed by scroll position via initSunVideoScrub below.
     An entry with no sunVideo yet just shows its plain sketch, forever —
     an honest, correct state to sit in while the videos are on their way,
     never a broken image or a dead-end placeholder. */
  function sketchMedia(t, altText){
    const src = t.sketch || t.image; // t.image only as a last-resort fallback for any entry with neither
    if (!src) return '';
    if (t.sunVideo) {
      return `<video class="jimg jvid-sun" muted playsinline preload="auto" poster="${esc(src)}" aria-label="${esc(altText)}">`
        + `<source src="${esc(t.sunVideo)}" type="video/mp4" /></video>`;
    }
    return `<img class="jimg" src="${esc(src)}" alt="${esc(altText)}" loading="lazy" decoding="async"/>`;
  }

  /* ---------------- Journal colour system ----------------
     Used to be six bright/dark card pairings cycled by index — dropped in
     favour of one plain paper card with a single warm accent, so the only
     colour anywhere on the site is the sun-orange the sketch-to-colour
     videos bloom into (see sketchColorMedia above). Kept as a one-entry
     "palette" and applyPalette()/paletteAt() rather than inlining the
     values, so every call site below — cards, tiles, the reading dialog,
     the Journal's decorative motion layer — stays untouched and any of
     them can still be re-varied later without a structural change. */
  const PALETTE = [
    { bg:'var(--paper-deep)', ink:'var(--ink)', soft:'var(--ink-soft)', accent:'var(--sun)' },
  ];
  function paletteAt(index){ return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length]; }
  function applyPalette(el, p){
    el.style.setProperty('--jc-bg', p.bg);
    el.style.setProperty('--jc-ink', p.ink);
    el.style.setProperty('--jc-soft', p.soft);
    el.style.setProperty('--jc-accent', p.accent);
  }

  /* ---------------- Reading dialog — full-screen, coloured, scroll-shrinks ----------------
     Shared by the homepage Journal and the /thoughts.html archive grid.
     Two title elements handle the "shrink and lock" illusion instead of
     one continuously-resized element: a big, plain in-flow `.thought-
     modal-hero` (number + full title + full subhead) that scrolls away
     normally at the top of the dialog's own content, and a small,
     PERMANENTLY-fixed-size `.thought-modal-head` (sticky, top:0) that
     crossfades in underneath it as the reader scrolls, then stays pinned.
     This split exists to avoid a real feedback loop: an earlier version
     shrank ONE sticky header's own padding/font-size directly off
     scrollTop — but a sticky element's rendered size still counts toward
     the scroll container's own scrollHeight, so as the header shrank, the
     container's total scrollable height shrank under the reader's feet,
     the browser clamped scrollTop back down, the header re-expanded, and
     the cycle repeated — a visible snap-back-to-the-top stutter on any
     entry short enough for the shrink distance to approach the entry's
     total scroll room. Splitting the effect in two fixes it structurally:
     the hero's height never changes (so it contributes a fixed, constant
     amount to scrollHeight) and the compact head's padding/font-size are
     plain fixed CSS, never animated — only `opacity`/`transform` move on
     scroll (see syncModalHead), neither of which affects layout at all —
     so scrollHeight can never move out from under the reader no matter
     how short the entry is. `travel`, the scroll distance the crossfade
     spans, comes from the hero block's OWN measured height (a static
     number, fixed once per open), not from the entry's total scrollable
     length, which is what makes this safe for entries of any length. */
  let modalEl = null;
  let modalMetrics = null;
  let modalFrame = 0;
  const modalReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp01(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }
  function mix(a, b, t){ return a + (b - a) * t; }

  function resetModalHead(card){
    ['--tm-hero-opacity','--tm-hero-shift','--tm-hero-scale','--tm-compact-opacity','--tm-compact-shift']
      .forEach(prop => card.style.removeProperty(prop));
    modalMetrics = null;
  }
  function syncModalHead(){
    const card = modalEl && modalEl.querySelector('.thought-modal-card');
    if (!modalMetrics || !card) return;
    const travel = modalMetrics.travel;
    const raw = clamp01((card.scrollTop - 6) / travel, 0, 1);
    const progress = raw * raw * (3 - 2 * raw); // smoothstep ease — the "gradual, not sudden" curve
    // The hero fades/lifts/shrinks away a little faster than the compact
    // head fades in, so there's a brief, deliberate overlap rather than a
    // hard cut — both are still fully driven by the same scroll-linked
    // `progress`, just on slightly offset curves.
    const heroProgress = clamp01(progress / .85, 0, 1);
    const compactProgress = clamp01((progress - .15) / .85, 0, 1);
    card.style.setProperty('--tm-hero-opacity', (1 - heroProgress).toFixed(3));
    card.style.setProperty('--tm-hero-shift', `${(-heroProgress * 18).toFixed(2)}px`);
    card.style.setProperty('--tm-hero-scale', (1 - heroProgress * .08).toFixed(3));
    card.style.setProperty('--tm-compact-opacity', compactProgress.toFixed(3));
    card.style.setProperty('--tm-compact-shift', `${((1 - compactProgress) * 10).toFixed(2)}px`);
  }
  function queueSyncModalHead(){
    if (modalReduceMotion) return; // reduced motion: hero stays put, compact head never takes over — see prepareModalHead
    if (modalFrame) return;
    modalFrame = requestAnimationFrame(() => { modalFrame = 0; syncModalHead(); });
  }
  function prepareModalHead(){
    if (modalReduceMotion) return;
    const card = modalEl.querySelector('.thought-modal-card');
    const hero = modalEl.querySelector('.thought-modal-hero');
    const head = modalEl.querySelector('.thought-modal-head');
    if (!card || !hero || !head) return;
    // A static measurement taken once per open — the hero's own height
    // never changes afterward (see the comment above), so this can never
    // feed back into itself the way an every-frame layout measurement
    // would. Subtract the compact head's height so the crossfade finishes
    // right as the hero's bottom edge would reach the now-pinned compact
    // head, not partway through empty space. Also capped against the
    // entry's actual scrollable room, so a short entry still finishes its
    // crossfade by the time the reader reaches the true bottom instead of
    // leaving hero and compact head both stuck half-visible — safe to base
    // on scrollHeight here (unlike the very first version of this dialog)
    // because nothing in this design ever changes scrollHeight once open,
    // so there's no feedback loop left to reintroduce.
    const maxScroll = Math.max(0, card.scrollHeight - card.clientHeight);
    const idealTravel = hero.offsetHeight - head.offsetHeight * .6;
    const travel = maxScroll > 0
      ? Math.max(90, Math.min(idealTravel, maxScroll * .96))
      : Math.max(120, idealTravel);
    modalMetrics = { travel };
    syncModalHead();
  }

  function ensureModal(){
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'thought-modal';
    modalEl.innerHTML = `
      <div class="thought-modal-card" role="dialog" aria-modal="true" aria-labelledby="thoughtModalTitle">
        <div class="thought-modal-closebar"><button class="thought-modal-close" aria-label="Close">Close <span>×</span></button></div>
        <div class="thought-modal-hero">
          <p class="thought-modal-meta"></p>
          <h2 class="thought-modal-title" id="thoughtModalTitle"></h2>
          <p class="thought-modal-subhead"></p>
        </div>
        <header class="thought-modal-head">
          <p class="thought-modal-head-meta"></p>
          <h3 class="thought-modal-head-title"></h3>
        </header>
        <section class="thought-modal-scroll-body">
          <p class="thought-modal-bodylabel">The full note</p>
          <div class="thought-modal-expl"></div>
        </section>
      </div>
    `;
    document.body.appendChild(modalEl);
    function close(){
      modalEl.classList.remove('open');
      modalEl.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('dialog-open');
    }
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
    modalEl.querySelector('.thought-modal-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalEl.classList.contains('open')) close(); });
    modalEl.querySelector('.thought-modal-card').addEventListener('scroll', queueSyncModalHead, { passive:true });
    modalEl._close = close;
    return modalEl;
  }
  function openThoughtModal(t, index){
    const modal = ensureModal();
    const card = modal.querySelector('.thought-modal-card');
    const p = paletteAt(index == null ? 0 : index);
    applyPalette(card, p);
    resetModalHead(card);
    const metaText = `JOURNAL / ${String((index == null ? 0 : index) + 1).padStart(2, '0')}`;
    modal.querySelector('.thought-modal-meta').textContent = metaText;
    modal.querySelector('.thought-modal-title').textContent = t.title || '';
    modal.querySelector('.thought-modal-subhead').textContent = subtitleOf(t);
    modal.querySelector('.thought-modal-head-meta').textContent = metaText;
    modal.querySelector('.thought-modal-head-title').textContent = t.title || '';
    const explEl = modal.querySelector('.thought-modal-expl');
    const hasExpl = !!(t.explanation && t.explanation.trim());
    explEl.innerHTML = hasExpl ? (t.explanationHtml || `<p>${esc(t.explanation)}</p>`) : '';
    card.scrollTop = 0;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('dialog-open');
    modal.querySelector('.thought-modal-close').focus();
    requestAnimationFrame(() => requestAnimationFrame(prepareModalHead));
  }

  /* One fixed tile template for the /thoughts.html archive grid: image on
     top, near-black title plate below, tinted with the same palette as
     the matching homepage card. */
  function buildTile(t, index){
    const el = document.createElement('div');
    el.className = 'thought-tile';
    applyPalette(el, paletteAt(index));
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Open thought: ${t.title || ''}`);
    el.innerHTML = `
      <div class="ttmedia">${sketchMedia(t, `Pencil sketch accompanying the thought: ${t.title || ''}`)}<span class="tt-num" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span></div>
      <div class="ttbody"><h3 class="tttitle">${esc(t.title)}</h3></div>
    `;
    el.addEventListener('click', () => openThoughtModal(t, index));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThoughtModal(t, index); } });
    return el;
  }

  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function formatDate(iso){
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  /* Both the card preview and the dialog subtitle read from the same first
     real paragraph of the stored explanation (skipping "## heading" and
     table blocks) — the card truncates it to stay scannable, the dialog
     shows it complete. Neither ever edits the stored explanation itself;
     the full, verbatim text always renders in full in the dialog body. */
  function firstParagraph(text){
    const full = String(text || '').trim();
    const para = full.split(/\n\s*\n/).find(p => {
      const t = p.trim();
      return t && !/^#{2,3}\s+/.test(t) && !t.startsWith('|');
    }) || full;
    return para.trim();
  }
  function previewOf(text){
    const clean = firstParagraph(text);
    const full = String(text || '').trim();
    const hasMore = clean.length < full.length;
    if (clean.length <= 230) return clean + (hasMore ? '…' : '');
    const cut = clean.slice(0, 230);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }
  function subtitleOf(t){
    return firstParagraph(t.explanation || t.excerpt || t.subtitle || '');
  }

  /* ---------------- THE JOURNAL — a real page-turn, or a plain list ----------------
     Homepage only. Renders straight from thoughts.json — a new /admin
     entry just becomes the next card. Two modes, decided once per render:

     PIN MODE (desktop widths, motion allowed) — #journalStack becomes a
     tall scroll spacer and #journalList (inside it) pins to the viewport;
     every entry stacks in that exact same rectangle and initJournalPageTurn
     drives which one is showing and how far through its turn it is, purely
     off scroll position. This is what actually delivers "pages turn as you
     scroll" — see the long comment on initJournalPageTurn for the mechanics
     and why an earlier version of this (each card tilting away as it
     scrolled past in normal document flow) read as a flip-card gimmick
     instead: there was no fixed "book" for pages to turn against, and
     barely any time to read a card before it started moving.

     FLOW MODE (mobile, or prefers-reduced-motion: reduce) — nothing pins.
     Entries render in plain, full-height document flow with a one-shot
     fade-in (.reveal/.in-view, IntersectionObserver-driven) and the
     existing image parallax + sun-video scrub as each one scrolls through
     — no turn, since a phone doesn't have the vertical room to safely pin
     a whole card, and Reduce Motion should never scroll-jack. */
  window.renderJournal = function(thoughts){
    const host = document.getElementById('journalList');
    const stackEl = document.getElementById('journalStack');
    if (!host || !stackEl || !thoughts || !thoughts.length) return;
    host.innerHTML = '';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Matches the 700px breakpoint the two-column card layout already
    // uses (see renaissance.css). Decided once, here, same as
    // reduceMotion above — not re-checked on resize, same trade-off the
    // rest of this file already makes.
    const usePin = !reduceMotion && window.innerWidth >= 700;
    stackEl.classList.toggle('journal-stack--pin', usePin);
    stackEl.classList.toggle('journal-stack--flow', !usePin);

    thoughts.forEach((t, i) => {
      const p = paletteAt(i);
      const entry = document.createElement('article');
      entry.className = usePin ? 'journal-entry' : 'journal-entry reveal';
      applyPalette(entry, p);
      const hasExpl = !!(t.explanation && t.explanation.trim());
      entry.innerHTML = `
        <div class="wrap journal-grid">
          <div class="journal-media">
            ${sketchMedia(t, `Pencil sketch accompanying the thought: ${t.title || ''}`)}
            <span class="journal-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          </div>
          <div class="journal-copy">
            <span class="journal-meta"><span class="jd">${esc(formatDate(t.createdAt))}</span><span class="jopen-badge">Open ↗</span></span>
            <h3 class="jtitle">${esc(t.title)}</h3>
            ${hasExpl ? `<p class="jprev">${esc(previewOf(t.explanation))}</p>` : ''}
            <span class="jread" role="button" tabindex="0" aria-label="Open thought: ${esc(t.title)}">Open the full note <span class="arrow">→</span></span>
          </div>
        </div>
      `;
      const openThis = () => openThoughtModal(t, i);
      entry.querySelector('.jread').addEventListener('click', openThis);
      entry.querySelector('.jread').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThis(); } });
      const media = entry.querySelector('.journal-media');
      media.style.cursor = 'pointer';
      media.addEventListener('click', openThis);
      host.appendChild(entry);
    });

    if (!usePin) {
      // reveal-on-scroll only wires up elements present at page load (see
      // the first IIFE above) — these are injected after that runs, so
      // give them their own observer here. Pin mode skips this entirely:
      // initJournalPageTurn owns each entry's visibility/opacity outright.
      const revealEls = host.querySelectorAll('.reveal');
      if ('IntersectionObserver' in window && revealEls.length) {
        const io = new IntersectionObserver((entries)=>{
          entries.forEach(entry=>{
            if (entry.isIntersecting) { entry.target.classList.add('in-view'); io.unobserve(entry.target); }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        revealEls.forEach(el=> io.observe(el));
      } else {
        revealEls.forEach(el=> el.classList.add('in-view'));
      }
    }

    initJournalMotion();

    if (usePin) {
      initJournalPageTurn(stackEl, [...host.querySelectorAll('.journal-entry')]);
    } else {
      initJournalParallax(host);
      initSunVideoScrub(host, '.journal-media');
    }
  };

  /* ---------------- Sun-video scroll scrub ----------------
     For any entry that has a t.sunVideo (see sketchMedia above), this
     scrubs that video's own currentTime directly off scroll position
     instead of just playing it — "the image is sketch, but slowly turning
     coloured as you scroll to it" is a position, not a timer, so the
     video has to be driven the same way the Journal's other scroll
     effects are (see initJournalParallax, and initJournalPageTurn's own
     separate video-scrub for pin mode): read scroll, write a value,
     rAF-throttled, never hijacking scroll itself. Flow mode only — pin
     mode drives its own videos directly off each entry's HOLD phase
     instead (see initJournalPageTurn), not this function. The
     reveal window starts as the card's top crosses the bottom of the
     viewport and finishes once the card is roughly centred — i.e. exactly
     the span of scrolling TO this entry — then holds on the last frame
     once arrived, same one-way "colours in and stays" behaviour as
     before. Reduced motion jumps straight to the final, fully-bloomed
     frame — a one-shot content state, not the ambient motion Reduce
     Motion is meant to suppress. Entries with no sunVideo yet are plain
     <img> tags, untouched by any of this. */
  function initSunVideoScrub(host, selector){
    const videos = [...host.querySelectorAll(`${selector} video.jvid-sun`)];
    if (!videos.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      videos.forEach(v => {
        const jump = () => { try { v.currentTime = v.duration || 0; } catch(e){} };
        if (v.readyState >= 1) jump(); else v.addEventListener('loadedmetadata', jump, { once:true });
      });
      return;
    }
    let ticking = false;
    function update(){
      const vh = window.innerHeight;
      videos.forEach(v => {
        if (!v.duration || isNaN(v.duration)) return;
        const rect = v.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const start = vh;
        const end = vh * 0.4;
        const progress = clamp01((start - rect.top) / (start - end), 0, 1);
        const target = progress * v.duration;
        if (Math.abs(v.currentTime - target) > 0.03) v.currentTime = target;
      });
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive:true });
    videos.forEach(v => { if (v.readyState >= 1) update(); else v.addEventListener('loadedmetadata', update, { once:true }); });
  }

  /* ---------------- Journal image parallax on scroll ----------------
     Adapted from a scroll-driven image-grid technique: rather than pinning
     the section and scrubbing a whole grid through a GSAP/Lenis timeline,
     each entry's own photo just drifts a little against the scroll as its
     band passes through the viewport — a plain scroll listener writing a
     transform, rAF-throttled, no pinning and no animation library, so
     normal scroll physics are never touched. Skipped entirely under
     reduced motion, in which case the image just sits at its normal,
     unzoomed framing. */
  function initJournalParallax(host){
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    const imgs = [...host.querySelectorAll('.journal-media img')];
    if (!imgs.length) return;

    let ticking = false;
    function update(){
      const vh = window.innerHeight;
      imgs.forEach(img => {
        const rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return; // well offscreen — skip the write
        const center = rect.top + rect.height / 2;
        // -1 (band's centre at the very bottom of the viewport) to
        // 1 (band's centre at the very top) as it travels through.
        const progress = (vh / 2 - center) / (vh / 2 + rect.height / 2);
        const clamped = Math.max(-1, Math.min(1, progress));
        img.style.transform = `scale(1.16) translateY(${(clamped * 7).toFixed(2)}%)`;
      });
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------------- Journal page-turn — pinned book stack, right to left ----------------
     Pin mode only (see the mode switch in renderJournal). Every entry sits
     absolutely stacked in the exact same rectangle inside the sticky
     #journalList frame, z-index highest-to-lowest by index (set below), so
     entry 0 starts on top and turning it away reveals entry 1 already
     sitting flat underneath — a real stack, not a card sliding past.

     main.js sizes #journalStack (the spacer that makes the pin possible —
     see .journal-stack in renaissance.css for why it has to be
     position:relative, not the sticky element itself) to
     entries.length × `segment` px of scroll, and splits every entry's own
     segment into two phases:
       HOLD  (the first `HOLD` share of the segment) — the entry sits
             perfectly flat and fully readable. If it has a sunVideo, this
             is also the window its currentTime scrubs across, start to
             end, so the sketch visibly colours in as the reader arrives —
             "user sees first topic and color coming" was the brief this
             replaced the old crossfade-on-scroll version to match.
       TURN  (the remaining share) — the entry rotates away around its own
             left/spine edge (transform-origin), sliding and fading as it
             passes 90°, exactly like a real page turning over. The very
             last entry never turns (nothing needs revealing behind it) —
             it just stays flat until the spacer runs out and .journal-list
             releases from position:sticky like any other sticky element,
             letting the Shelf scroll up over it normally.
     Only the current ACTIVE entry (Math.floor of the overall progress,
     clamped to the last index) is ever visibility:visible — every other
     entry is visibility:hidden, which both hides it and removes it from
     the tab order, so a keyboard user can only ever reach the one page
     actually on screen. Everything here is read-scroll-position/
     write-transform, rAF-throttled, same pattern as every other scroll
     effect on this page — see the file-header comment for why the
     position:sticky this depends on isn't the "scroll-jacking" that
     comment otherwise rules out. .journal-grid has
     backface-visibility:hidden (renaissance.css) so a fully-turned page
     vanishes cleanly rather than showing a mirrored back face. */
  function initJournalPageTurn(stackEl, entries){
    const n = entries.length;
    if (!n) return;

    const HOLD = 0.6; // share of each entry's segment spent flat & readable
    let segment = window.innerHeight * 1.8;

    function sizeStack(){
      segment = window.innerHeight * 1.8;
      stackEl.style.height = (segment * n) + 'px';
      update();
    }

    entries.forEach((entry, i) => {
      entry.style.zIndex = String(n - i);
      const video = entry.querySelector('video.jvid-sun');
      if (video) video.addEventListener('loadedmetadata', update, { once:true });
    });

    let ticking = false;
    function update(){
      const rect = stackEl.getBoundingClientRect();
      const scrolledIn = -rect.top;
      const globalProgress = clamp01(scrolledIn / segment, 0, n);
      const activeIndex = Math.min(n - 1, Math.max(0, Math.floor(globalProgress)));

      entries.forEach((entry, i) => {
        entry.style.visibility = (i === activeIndex) ? 'visible' : 'hidden';
        if (i !== activeIndex) return;

        const local = clamp01(globalProgress - i, 0, 1);
        const isLast = i === n - 1;
        let turnT = 0, readT = 1;
        if (local <= HOLD) {
          readT = local / HOLD;
        } else if (!isLast) {
          const raw = clamp01((local - HOLD) / (1 - HOLD), 0, 1);
          turnT = raw * raw * (3 - 2 * raw); // smoothstep
        }

        const grid = entry.querySelector('.journal-grid');
        if (grid) {
          const tilt = turnT * 118; // past 90deg — backface-hidden lets it vanish cleanly
          const shiftX = turnT * -46; // the spine-opposite edge sweeps left as it turns
          const scale = 1 - turnT * 0.06;
          const fade = 1 - turnT * 0.98;
          grid.style.transformOrigin = 'left center';
          grid.style.transform = `perspective(1500px) rotateY(${tilt.toFixed(2)}deg) translateX(${shiftX.toFixed(1)}px) scale(${scale.toFixed(3)})`;
          grid.style.opacity = fade.toFixed(3);
        }

        const video = entry.querySelector('video.jvid-sun');
        if (video && video.duration && !isNaN(video.duration)) {
          const target = readT * video.duration;
          if (Math.abs(video.currentTime - target) > 0.03) video.currentTime = target;
        }
      });
      ticking = false;
    }

    sizeStack();
    window.addEventListener('resize', sizeStack);
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ---------------- Journal ambient motion — floating shapes behind the cards ----------------
     Rings, glass prisms, drifting particles and one large rotating
     numeral, generated once into a layer behind .journal-head and
     #journalList (z-index puts it beneath both). Ambient drift/spin is
     autonomous — same exemption as the Shelf marquee and the small
     floating ornaments elsewhere on the site — but the extra scroll
     parallax and the desktop pointer-follow are both interactive,
     scroll/pointer-tied motion, so — unlike those autonomous effects —
     this respects Reduce Motion directly, per this feature's own spec:
     shapes stay put and visible, just without any of the three kinds of
     movement layered on top. Touch devices get fewer shapes and no
     pointer-follow (there's no hover pointer to follow), keeping the
     layer light on mid-range Android hardware. */
  let journalMotionBuilt = false;
  function initJournalMotion(){
    if (journalMotionBuilt) return;
    // Anchored to .journal-intro (the short, normal-flow head block), not
    // the section as a whole — .journal-sec now also contains #journalStack,
    // a scroll spacer many screens tall in pin mode (see initJournalPageTurn),
    // and this decorative layer is sized to its own offsetParent via
    // inset:0. Anchoring it there instead of the whole section keeps every
    // ring/prism/numeral positioned exactly where it always was, around the
    // headline, rather than smeared thin across a ten-screen span.
    const sec = document.querySelector('.journal-intro') || document.querySelector('.journal-sec');
    if (!sec) return;
    journalMotionBuilt = true;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

    const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    layer.setAttribute('class', 'journal-motion' + (reduceMotion ? ' is-still' : ''));
    layer.setAttribute('viewBox', '0 0 100 100');
    layer.setAttribute('preserveAspectRatio', 'none');
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('focusable', 'false');

    const NS = 'http://www.w3.org/2000/svg';
    function el(tag, attrs){
      const node = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(k => node.setAttribute(k, attrs[k]));
      return node;
    }

    const defs = el('defs', {});
    PALETTE.forEach((p, i) => {
      const grad = el('linearGradient', { id:`jm-grad-${i}`, x1:'0%', y1:'0%', x2:'100%', y2:'100%' });
      const s1 = el('stop', { offset:'0%', 'stop-color':p.accent, 'stop-opacity':'0.85' });
      const s2 = el('stop', { offset:'100%', 'stop-color':p.accent, 'stop-opacity':'0' });
      grad.appendChild(s1); grad.appendChild(s2);
      defs.appendChild(grad);
    });
    layer.appendChild(defs);

    const rings = [
      { cx:14, cy:22, r:9,  i:0, depth:.5, cls:'jm-ring jm-spin-a' },
      { cx:88, cy:16, r:6,  i:0, depth:.8, cls:'jm-ring jm-spin-b' },
      { cx:92, cy:70, r:11, i:0, depth:.35, cls:'jm-ring jm-spin-a' },
    ];
    rings.forEach(r => {
      layer.appendChild(el('circle', {
        class:r.cls, cx:r.cx, cy:r.cy, r:r.r, fill:'none',
        stroke:`url(#jm-grad-${r.i})`, 'stroke-width':.5,
        'data-depth':r.depth,
      }));
    });

    if (!isTouch) {
      const extraRing = el('circle', { class:'jm-ring jm-spin-b', cx:6, cy:82, r:5, fill:'none', stroke:`url(#jm-grad-0)`, 'stroke-width':.4, 'data-depth':.9 });
      layer.appendChild(extraRing);
    }

    const prisms = [
      { x:80, y:38, s:7, i:0, depth:.65, cls:'jm-prism jm-drift-a' },
      { x:20, y:78, s:5, i:0, depth:.45, cls:'jm-prism jm-drift-b' },
    ];
    prisms.forEach(p => {
      const rect = el('rect', {
        class:p.cls, x:p.x - p.s/2, y:p.y - p.s/2, width:p.s, height:p.s,
        fill:PALETTE[p.i].accent, 'fill-opacity':'0.14', stroke:PALETTE[p.i].accent, 'stroke-width':.3, 'stroke-opacity':.55,
        transform:`rotate(45 ${p.x} ${p.y})`, 'data-depth':p.depth,
      });
      layer.appendChild(rect);
    });

    const numeral = el('text', {
      class:'jm-numeral', x:97, y:96, 'text-anchor':'end',
      'data-depth':.25,
    });
    numeral.textContent = '06';
    layer.appendChild(numeral);

    if (!isTouch) {
      const particleCount = 10;
      for (let i = 0; i < particleCount; i++) {
        const p = PALETTE[i % PALETTE.length];
        const cx = 8 + ((i * 9.3) % 88);
        const cy = 8 + ((i * 17.7) % 86);
        layer.appendChild(el('circle', {
          class:'jm-particle', cx, cy, r:.35 + (i % 3) * .12,
          fill:p.accent, 'data-depth':(.3 + (i % 5) * .12).toFixed(2),
        }));
      }
    }

    sec.insertBefore(layer, sec.firstChild);

    if (reduceMotion) return; // shapes stay visible and static — no scroll or pointer motion

    const shapes = [...layer.querySelectorAll('[data-depth]')];

    let ticking = false;
    function onScroll(){
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const rect = sec.getBoundingClientRect();
        const vh = window.innerHeight;
        const progress = Math.max(-1, Math.min(1, (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2)));
        shapes.forEach(s => {
          const depth = parseFloat(s.dataset.depth) || .5;
          const py = parseFloat(s.dataset.px) || 0;
          s.style.setProperty('--jm-scroll-y', `${(progress * depth * 9).toFixed(2)}px`);
        });
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive:true });
    onScroll();

    if (!isTouch) {
      window.addEventListener('mousemove', (e) => {
        const nx = (e.clientX / window.innerWidth - .5) * 2;
        const ny = (e.clientY / window.innerHeight - .5) * 2;
        shapes.forEach(s => {
          const depth = parseFloat(s.dataset.depth) || .5;
          s.style.setProperty('--jm-pointer-x', `${(nx * depth * 2.2).toFixed(2)}px`);
          s.style.setProperty('--jm-pointer-y', `${(ny * depth * 2.2).toFixed(2)}px`);
        });
      }, { passive:true });
    }
  }

  /* ---------------- Thoughts archive — the same set, laid out to browse ----------------
     Used by /thoughts.html: same tile template, same click-to-open dialog,
     in a plain responsive grid. */
  window.renderThoughtsGrid = function(thoughts){
    const host = document.getElementById('thoughtList');
    if (!host || !thoughts || !thoughts.length) return;
    host.innerHTML = '';
    thoughts.forEach((t, i) => host.appendChild(buildTile(t, i)));
    initSunVideoScrub(host, '.ttmedia');
  };

  /* ---------------- THE SHELF — simple CSS marquee ----------------
     Homepage only. Two rows travelling in opposite directions, each just a
     duplicated list scrolled sideways by a plain CSS animation — no 3D, no
     canvas, no per-frame JS. Splits the published books alternately between
     the two rows so both stay populated as more get added from /admin. */
  window.renderBookMarquee = function(books){
    const sec = document.querySelector('.marquee-sec');
    const trackA = document.getElementById('marqueeTrackA');
    const trackB = document.getElementById('marqueeTrackB');
    if (!trackA || !trackB) return;
    if (!books || !books.length) { if (sec) sec.style.display = 'none'; return; }
    if (sec) sec.style.display = '';

    const rowA = books.filter((_, i) => i % 2 === 0);
    const rowB = books.filter((_, i) => i % 2 === 1);
    // a row needs at least a couple of covers for the 50%-travel loop to
    // read as continuous rather than a single card sliding by
    if (!rowA.length) rowA.push(...books);
    if (!rowB.length) rowB.push(...books);

    function card(b){
      const el = document.createElement('div');
      el.className = 'mq-book';
      el.innerHTML = `
        <div class="mq-cover">${b.image ? `<img src="${esc(b.image)}" alt="Cover of ${esc(b.name)}" loading="lazy" decoding="async"/>` : ''}</div>
        <p class="mq-name">${esc(b.name)}</p>
      `;
      return el;
    }

    function fill(track, list){
      track.innerHTML = '';
      // duplicated once so a translateX(-50%) loop is seamless
      [...list, ...list].forEach(b => track.appendChild(card(b)));
    }
    fill(trackA, rowA);
    fill(trackB, rowB);
  };
})();

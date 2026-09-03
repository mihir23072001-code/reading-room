/* THE READING ROOM — shared front-end behaviour.
   Mobile-first, no scroll-jacking: every animation here is either a plain
   CSS transition/keyframe, or a one-shot IntersectionObserver reveal. There
   is no pinned scroll, no horizontal scroll-hijacking and no external
   animation library — this file has zero dependencies and works the same
   on a phone as it does on a desktop. Respects prefers-reduced-motion
   throughout (see the sitewide override at the bottom of renaissance.css). */

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

  /* ---------- hero: giant astrolabe background, rete turns with scroll ----------
     The hero's background is now this instrument instead of a painting —
     same generator as above, just huge (sized in CSS) and given a fixed
     rim + turning rete like every other instance on the site. The turning
     part here is different in kind from the small ornaments' auto-spin or
     the hero's own particle drift: those are autonomous motion, always
     running, deliberately exempt from Reduce Motion (see renaissance.css).
     This one only moves because the reader is scrolling — it's the same
     category of effect as the Journal image parallax below, which already
     skips itself entirely under Reduce Motion. Motion that's tied to the
     act of scrolling is exactly what that setting exists to suppress, so
     this follows the Journal's example rather than the ambient effects'. */
  const heroAstro = document.querySelector('.hero-astro');
  const heroRete = heroAstro && heroAstro.querySelector('.orn-rete');
  if (heroAstro && heroRete) {
    requestAnimationFrame(() => requestAnimationFrame(() => heroAstro.classList.add('is-in')));
    const heroReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!heroReduceMotion) {
      const heroSection = document.querySelector('.hero');
      const HERO_ROTATE_DEG = 150;
      function onScrollHeroAstro(){
        const h = heroSection.offsetHeight || 1;
        const progress = Math.max(0, Math.min(1, window.scrollY / h));
        heroRete.style.transform = `rotate(${progress * HERO_ROTATE_DEG}deg)`;
      }
      window.addEventListener('scroll', onScrollHeroAstro, { passive:true });
      onScrollHeroAstro();
    }
  }

  /* ---------- hero: blurred background parallax ----------
     Same scroll-tied category as the astrolabe rotation right above and
     the hands transition below — skipped under Reduce Motion rather than
     forced, in which case the background just sits still (still blurred,
     still low-opacity, nothing missing structurally, just no drift). */
  const heroBgImg = document.querySelector('.hero-bg-img');
  if (heroBgImg) {
    const heroBgReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!heroBgReduceMotion) {
      const heroSectionForBg = document.querySelector('.hero');
      function onScrollHeroBg(){
        const h = heroSectionForBg.offsetHeight || 1;
        const progress = Math.max(0, Math.min(1, window.scrollY / h));
        heroBgImg.style.transform = `translateY(${progress * 14}%)`;
      }
      window.addEventListener('scroll', onScrollHeroBg, { passive:true });
      onScrollHeroBg();
    }
  }

  /* ---------- hero → Journal: the hands transition ----------
     Same category of motion as the astrolabe's rotation just above and
     the Journal's own image parallax further down: tied directly to
     scroll position, so it's skipped entirely under Reduce Motion rather
     than forced (renaissance.css collapses the section to a short static
     pair of hands in that case, instead of leaving the tall scroll
     runway sitting there unused). Progress is recomputed from
     getBoundingClientRect() on every scroll rather than cached offsets,
     so it stays correct even if something above it shifts the page's
     layout after load. */
  const handSection = document.querySelector('.hand-transition');
  const handLeft = handSection && handSection.querySelector('.ht-hand-left');
  const handRight = handSection && handSection.querySelector('.ht-hand-right');
  const handSpark = handSection && handSection.querySelector('.ht-spark');
  const handFlood = handSection && handSection.querySelector('.ht-flood');
  if (handSection && handLeft && handRight && handSpark && handFlood) {
    const handReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!handReduceMotion) {
      // Triangular pulse: 0 -> 1 -> 0 between start and end, peaking at `peak`.
      function pulse(p, start, peak, end){
        if (p <= start || p >= end) return 0;
        if (p <= peak) return (p - start) / (peak - start);
        return 1 - (p - peak) / (end - peak);
      }
      // Trapezoid: rises start->rise, holds at 1 through the plateau, falls plateau->end.
      function trapezoid(p, start, rise, plateau, end){
        if (p <= start || p >= end) return 0;
        if (p < rise) return (p - start) / (rise - start);
        if (p <= plateau) return 1;
        return 1 - (p - plateau) / (end - plateau);
      }
      function onScrollHandTransition(){
        const rect = handSection.getBoundingClientRect();
        const sectionTop = window.scrollY + rect.top;
        const total = handSection.offsetHeight - window.innerHeight;
        const progress = total > 0 ? Math.max(0, Math.min(1, (window.scrollY - sectionTop) / total)) : 0;

        const sep = Math.max(0, Math.min(1, progress / 0.55));
        handLeft.style.transform = `translate(calc(-100% - ${sep * 70}vw), -50%)`;
        handRight.style.transform = `translate(${sep * 70}vw, -50%)`;

        const sparkAmt = pulse(progress, 0.05, 0.22, 0.45);
        handSpark.style.opacity = sparkAmt;
        handSpark.style.transform = `translate(-50%,-50%) scale(${0.3 + sparkAmt * 3.2})`;

        handFlood.style.opacity = trapezoid(progress, 0.32, 0.5, 0.62, 0.85);
      }
      window.addEventListener('scroll', onScrollHandTransition, { passive:true });
      onScrollHandTransition();
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

  /* ---------------- Thought modal — explanation shown only on open ----------------
     Shared by the homepage Journal and the /thoughts.html archive grid. The
     open state shows only the title and the full description — no separate
     image panel; the entry's own image becomes a blurred, darkened backdrop
     behind that same text panel instead, so it's still present as
     atmosphere without competing with the words. Built once, reused
     everywhere, opened by click or Enter/Space on focus. */
  let modalEl = null;
  function ensureModal(){
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'thought-modal';
    modalEl.innerHTML = `
      <div class="thought-modal-card" role="dialog" aria-modal="true">
        <button class="thought-modal-close" aria-label="Close">×</button>
        <img class="thought-modal-bg" alt=""/>
        <div class="thought-modal-scrim"></div>
        <div class="thought-modal-body">
          <h3 class="thought-modal-title"></h3>
          <div class="thought-modal-expl"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
    function close(){ modalEl.classList.remove('open'); }
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
    modalEl.querySelector('.thought-modal-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    modalEl._close = close;
    return modalEl;
  }
  function openThoughtModal(t){
    const modal = ensureModal();
    const bg = modal.querySelector('.thought-modal-bg');
    if (t.image) { bg.src = t.image; bg.style.display = ''; }
    else { bg.style.display = 'none'; }
    modal.querySelector('.thought-modal-title').textContent = t.title || '';
    const explEl = modal.querySelector('.thought-modal-expl');
    const hasExpl = !!(t.explanation && t.explanation.trim());
    explEl.innerHTML = hasExpl ? (t.explanationHtml || `<p>${esc(t.explanation)}</p>`) : '';
    explEl.style.display = hasExpl ? '' : 'none';
    modal.classList.add('open');
    modal.querySelector('.thought-modal-card').scrollTop = 0;
  }

  /* One fixed tile template for the /thoughts.html archive grid: image on
     top, near-black title plate below. */
  function buildTile(t){
    const el = document.createElement('div');
    el.className = 'thought-tile';
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `Open thought: ${t.title || ''}`);
    el.innerHTML = `
      <div class="ttmedia">${t.image ? `<img class="ttimg" src="${esc(t.image)}" alt="Renaissance-style artwork accompanying the thought: ${esc(t.title)}" loading="lazy" decoding="async"/>` : ''}</div>
      <div class="ttbody"><h3 class="tttitle">${esc(t.title)}</h3></div>
    `;
    el.addEventListener('click', () => openThoughtModal(t));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThoughtModal(t); } });
    return el;
  }

  const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  function formatDate(iso){
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  /* ---------------- THE JOURNAL — vertical, alternating-colour entries ----------------
     Homepage only. Renders straight from thoughts.json, newest first (the
     order the feed already arrives in) — a new /admin entry just becomes
     the next band. Each entry alternates a light/dark tone and reveals
     with the same plain fade-up every other section on the site uses; no
     pinning, no horizontal travel, nothing scroll-jacked. */
  // The Journal band shows a short preview only; the stored explanation
  // itself is never altered or truncated — the full, verbatim text (every
  // paragraph, exactly as written) always renders in full in the modal
  // opened by "Read the full thought". This just keeps the homepage
  // scannable when an entry runs to several paragraphs.
  function previewOf(text){
    const full = String(text || '').trim();
    // skip "## Heading" and pipe-table blocks — those are structure, not
    // prose — and preview from the first real paragraph instead.
    const firstPara = full.split(/\n\s*\n/).find(p => {
      const t = p.trim();
      return t && !/^#{2,3}\s+/.test(t) && !t.startsWith('|');
    }) || full;
    const clean = firstPara.trim();
    const hasMore = clean.length < full.length;
    if (clean.length <= 230) return clean + (hasMore ? '…' : '');
    const cut = clean.slice(0, 230);
    return cut.slice(0, cut.lastIndexOf(' ')) + '…';
  }

  window.renderJournal = function(thoughts){
    const host = document.getElementById('journalList');
    if (!host || !thoughts || !thoughts.length) return;
    host.innerHTML = '';

    thoughts.forEach((t, i) => {
      const entry = document.createElement('article');
      entry.className = `journal-entry reveal ${i % 2 === 0 ? 'tone-light' : 'tone-dark'}`;
      const hasExpl = !!(t.explanation && t.explanation.trim());
      entry.innerHTML = `
        <div class="wrap journal-grid">
          <div class="journal-media">${t.image ? `<img src="${esc(t.image)}" alt="Renaissance-style artwork accompanying the thought: ${esc(t.title)}" loading="lazy" decoding="async"/>` : ''}</div>
          <div class="journal-copy">
            <span class="jd">${esc(formatDate(t.createdAt))}</span>
            <h3 class="jtitle">${esc(t.title)}</h3>
            ${hasExpl ? `<p class="jprev">${esc(previewOf(t.explanation))}</p>` : ''}
            <span class="jread" role="button" tabindex="0" aria-label="Open thought: ${esc(t.title)}">Read the full thought <span class="arrow">→</span></span>
          </div>
        </div>
      `;
      const trigger = entry.querySelector('.jread');
      trigger.addEventListener('click', () => openThoughtModal(t));
      trigger.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openThoughtModal(t); } });
      host.appendChild(entry);
    });

    // reveal-on-scroll only wires up elements present at page load (see the
    // first IIFE above) — these are injected after that runs, so give them
    // their own observer here.
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

    initJournalParallax(host);
  };

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

  /* ---------------- Thoughts archive — the same set, laid out to browse ----------------
     Used by /thoughts.html: same tile template, same click-to-open modal,
     in a plain responsive grid. */
  window.renderThoughtsGrid = function(thoughts){
    const host = document.getElementById('thoughtList');
    if (!host || !thoughts || !thoughts.length) return;
    host.innerHTML = '';
    thoughts.forEach(t => host.appendChild(buildTile(t)));
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

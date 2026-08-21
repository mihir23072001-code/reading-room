/* THE READING ROOM — shared front-end behaviour.
   Mobile-first, no scroll-jacking: every animation here is either a plain
   CSS transition/keyframe, or a one-shot IntersectionObserver reveal. There
   is no pinned scroll, no horizontal scroll-hijacking and no external
   animation library — this file has zero dependencies and works the same
   on a phone as it does on a desktop. Respects prefers-reduced-motion
   throughout (see the sitewide override at the bottom of renaissance.css),
   with one deliberate exception: the page-transition curtain always plays,
   since it's the site's core page-to-page transition rather than a
   decorative flourish — see the comment at its definition below. */

(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover:none), (pointer:coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  /* ---------- page-transition curtain ----------
     Every page loads with the .pt-overlay markup covering it (see the CSS);
     this reveals it once JS is confirmed running, and re-covers it before
     any internal link actually navigates, so every page-to-page jump on the
     site shares the same open/close curtain instead of a plain hard cut.
     Deliberate exception to prefers-reduced-motion: this curtain is the
     site's core page-to-page transition, not a decorative flourish, so it
     always plays — even with Reduce Motion on at the OS level. (Every other
     animation on the site still respects that setting; see renaissance.css,
     which also restores this feature's own transition timings inside the
     reduced-motion media query so the effect isn't clipped there either.) */
  const ptOverlay = document.querySelector('.pt-overlay');
  if (ptOverlay) {
    // One Renaissance object, chosen at random each page load, shown
    // centred over the curtain while it covers the screen (see the
    // fade timing on .pt-image-wrap in renaissance.css).
    const ptImg = ptOverlay.querySelector('.pt-image');
    if (ptImg) {
      const PT_IMAGES = [
        ['/renaissance-assets/img/pt-hourglass.jpg', 'An hourglass resting on a stack of leather-bound books.'],
        ['/renaissance-assets/img/pt-armillary.jpg', 'A brass armillary sphere on a carved wooden stand.'],
        ['/renaissance-assets/img/pt-quill.jpg', 'A quill resting against an inkwell beside a rolled scroll.'],
        ['/renaissance-assets/img/pt-candle.jpg', 'A candle burning at the spine of an open book.'],
      ];
      const [src, alt] = PT_IMAGES[Math.floor(Math.random() * PT_IMAGES.length)];
      ptImg.src = src;
      ptImg.alt = alt;
    }
    const PT_DURATION = 700; // longest transition-delay (.2s) + transition duration (.5s), in ms
    // two rAFs so the browser paints the "covered" state at least once
    // before the class flips — otherwise the very first page load can
    // skip straight to "open" with no transition to see.
    requestAnimationFrame(() => requestAnimationFrame(() => ptOverlay.classList.add('pt-open')));
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      let url;
      try { url = new URL(href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return; // same-page anchor — let it jump normally
      e.preventDefault();
      ptOverlay.classList.remove('pt-open');
      setTimeout(() => { window.location.href = url.href; }, PT_DURATION);
    });
  }

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

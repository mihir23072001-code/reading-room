/* THINGS WORTH SITTING WITH — shared scroll choreography
   Lenis (smooth inertial scroll) + GSAP ScrollTrigger (pinned scrollytelling)
   Respects prefers-reduced-motion throughout. */

(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover:none), (pointer:coarse)').matches;
  if (isTouch) document.body.classList.add('touch');

  /* ---------- Lenis smooth scroll (desktop, motion allowed) ---------- */
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false });
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    document.documentElement.classList.add('has-smooth-scroll');
  }

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time)=>{ lenis.raf(time*1000); });
      gsap.ticker.lagSmoothing(0);
    }
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

  /* ---------- ambient cursor dot (native cursor stays visible) ---------- */
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

  /* ---------- reveal on scroll ---------- */
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

  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  /* ================= HERO ================= */
  const hero = document.querySelector('.hero');
  if (hero) {
    const heroArt = hero.querySelector('.hero-art');
    const heroImg = hero.querySelector('.hero-art img');
    const heroInner = hero.querySelector('.hero-inner');
    const heroCue = hero.querySelector('.hero-cue');
    const words = gsap.utils.toArray('.hero-statement .hw');
    const isMobile = window.innerWidth < 760;

    const tl = gsap.timeline({
      scrollTrigger:{
        trigger: hero, start:'top top', end: isMobile ? '+=70%' : '+=140%',
        pin:true, scrub:0.7, pinSpacing:true
      }
    });
    tl.to(heroImg, { scale: isMobile ? 1.08 : 1.16, ease:'none' }, 0)
      .to(heroInner, { scale: isMobile ? 0.94 : 0.86, ease:'none' }, 0)
      .fromTo(heroArt, { filter:'brightness(1)' }, { filter:'brightness(0.55)', ease:'none' }, 0.4);

    // each word separates through depth — very subtle, never spinning
    if (words[0]) tl.to(words[0], { y: isMobile ? -8 : -26, opacity:0.5, ease:'none' }, 0);
    if (words[1]) tl.to(words[1], { z: isMobile ? 0 : 10, opacity:0.75, ease:'none' }, 0);
    if (words[2]) tl.to(words[2], { z: isMobile ? 10 : 46, scale: isMobile ? 1.02 : 1.08, opacity:1, ease:'none' }, 0);
    if (words[3]) tl.to(words[3], { y: isMobile ? 8 : 24, opacity:0.5, ease:'none' }, 0);

    ScrollTrigger.create({
      trigger: hero, start:'top top', end:'+=40%', scrub:0.4,
      onUpdate(self){
        if (self.progress > 0.5) heroCue.classList.add('show-line');
        else heroCue.classList.remove('show-line');
      }
    });
    gsap.to(heroCue, {
      opacity:0, scrollTrigger:{ trigger:hero, start:'top top', end:'+=30%', scrub:0.4 }
    });
  }

  /* ================= GARDEN / EXPLORE pinned chapters ================= */
  const explorePin = document.querySelector('.explore-pin');
  if (explorePin && window.innerWidth > 860) {
    const chapters = gsap.utils.toArray('.chapter');
    const dots = gsap.utils.toArray('.explore-dots span');
    const artImg = explorePin.querySelector('.explore-art img');
    const n = chapters.length;

    gsap.set(chapters[0], { opacity:1 });
    if (dots[0]) dots[0].classList.add('on');

    ScrollTrigger.create({
      trigger: explorePin, start:'top top', end:'bottom bottom', scrub:0.5,
      onUpdate(self){
        const idx = Math.min(n-1, Math.floor(self.progress * n));
        chapters.forEach((ch,i)=>{
          const active = i === idx;
          gsap.to(ch, { opacity: active?1:0, y: active?0:16, duration:0.35, overwrite:'auto' });
        });
        dots.forEach((d,i)=> d.classList.toggle('on', i===idx));
      }
    });

    gsap.to(artImg, {
      yPercent: -12, scale: 1.06, ease:'none',
      scrollTrigger:{ trigger: explorePin, start:'top top', end:'bottom bottom', scrub:0.6 }
    });
  }

  /* ================= TYPOGRAPHIC TRANSITIONS ================= */
  gsap.utils.toArray('.transition-statement .statement').forEach(el=>{
    gsap.fromTo(el, { xPercent:-4, opacity:0.35 }, {
      xPercent:0, opacity:1, ease:'none',
      scrollTrigger:{ trigger: el, start:'top 92%', end:'top 35%', scrub:0.6 }
    });
  });

  /* ================= READER pinned zoom-out ================= */
  const readerPin = document.querySelector('.reader-pin');
  if (readerPin) {
    const rArt = readerPin.querySelector('.reader-art');
    const rCopyLede = readerPin.querySelector('.reader-copy .lede');
    const rCopyHead = readerPin.querySelector('.reader-copy .head-block');
    const startScale = window.innerWidth < 760 ? 1.7 : 2.15;

    gsap.set(rArt, { scale:startScale });
    gsap.set(rCopyLede, { opacity:0, y:14 });

    const tl = gsap.timeline({
      scrollTrigger:{ trigger: readerPin, start:'top top', end:'bottom bottom', scrub:0.6 }
    });
    tl.to(rArt, { scale:1, ease:'none' }, 0)
      .to(rCopyHead, { y:0, ease:'none' }, 0)
      .to(rCopyLede, { opacity:1, y:0, ease:'none' }, 0.62);
  }

  /* ================= BOOK CORRIDOR entrance ================= */
  const bookSec = document.querySelector('.book-corridor-sec');
  if (bookSec) {
    const scrim = bookSec.querySelector('.book-corridor-scrim');
    const copy = bookSec.querySelector('.book-corridor-copy');
    const thread = bookSec.querySelector('.book-corridor-thread');
    // the library has just fully "revealed" at the end of the Reading Desk
    // pin; entering here reads as the camera easing deeper into the same
    // dark archive, so this starts darker than the section's resting state
    // and lifts only partway — never fully clears the vignette.
    if (scrim) gsap.fromTo(scrim, { opacity:1 }, {
      opacity:0.55, ease:'none',
      scrollTrigger:{ trigger:bookSec, start:'top bottom', end:'top 30%', scrub:0.6 }
    });
    if (copy) gsap.fromTo(copy, { opacity:0, y:22 }, {
      opacity:1, y:0, ease:'none',
      scrollTrigger:{ trigger:bookSec, start:'top 85%', end:'top 40%', scrub:0.6 }
    });
    // the ambient thread drifts in a beat later than the scrim — it should
    // read as something noticed once the eye has settled, not part of the
    // initial reveal.
    if (thread) gsap.fromTo(thread, { opacity:0 }, {
      opacity:0.22, ease:'none',
      scrollTrigger:{ trigger:bookSec, start:'top 70%', end:'top 20%', scrub:0.6 }
    });
  }

  /* ================= ABOUT / ENDING subtle parallax ================= */
  gsap.utils.toArray('.about-portrait img, .ending-art img').forEach(img=>{
    gsap.fromTo(img, { yPercent:-6 }, {
      yPercent:6, ease:'none',
      scrollTrigger:{ trigger: img, start:'top bottom', end:'bottom top', scrub:0.8 }
    });
  });

  ScrollTrigger.addEventListener('refreshInit', ()=>{});
})();

/* ============================================================
   Data-driven sections. These are called by each page's own inline
   script once it has fetched the relevant content from
   renaissance-assets/generated/*.json — that keeps this file generic
   and means new content published from /admin needs no code changes.
   Each function renders the DOM for its section AND wires up the
   scroll behaviour, so a page only has to: fetch -> call render.
   ============================================================ */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  function esc(s){ const d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }

  /* ---------------- Thought modal — explanation shown only on open ----------------
     The tile itself is image + title only. Clicking (or Enter/Space on focus)
     opens a single shared overlay with the image, title and explanation, then
     closes on the × button, a click outside the card, or Escape. Built once
     and reused by every tile on every page that renders thoughts. */
  let modalEl = null;
  function ensureModal(){
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'thought-modal';
    modalEl.innerHTML = `
      <div class="thought-modal-card" role="dialog" aria-modal="true">
        <button class="thought-modal-close" aria-label="Close">×</button>
        <img class="thought-modal-img" alt=""/>
        <div class="thought-modal-body">
          <h3 class="thought-modal-title"></h3>
          <p class="thought-modal-expl"></p>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);
    function close(){ modalEl.classList.remove('open'); document.body.classList.remove('menu-open-modal'); }
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) close(); });
    modalEl.querySelector('.thought-modal-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    modalEl._close = close;
    return modalEl;
  }
  function openThoughtModal(t){
    const modal = ensureModal();
    const img = modal.querySelector('.thought-modal-img');
    if (t.image) { img.src = t.image; img.alt = `Renaissance-style artwork accompanying the thought: ${t.title || ''}`; img.style.display = ''; }
    else { img.style.display = 'none'; }
    modal.querySelector('.thought-modal-title').textContent = t.title || '';
    modal.querySelector('.thought-modal-expl').textContent = t.explanation || '';
    modal.querySelector('.thought-modal-expl').style.display = (t.explanation && t.explanation.trim()) ? '' : 'none';
    modal.classList.add('open');
  }

  /* One fixed tile: image on top, near-black title plate below — always this,
     never a per-entry layout choice. The explanation lives in the modal, not
     the tile, so it never has to fit inline. */
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

  /* ---------------- Thoughts — one horizontal cinematic sequence ----------------
     Exactly the published thoughts, in one row — this renders straight from
     `thoughts.map(...)`, so a new /admin entry becomes the next tile with no
     code change. Vertical scroll drives horizontal travel: the pin's height
     and the scrub distance are both derived from the track's real rendered
     width, recomputed on font/image load and on resize. On touch/small
     screens and with reduced motion, the pin is skipped entirely in favour of
     a native, swipeable, scroll-snapped row — the CSS media query and this
     check are kept in sync at the same 760px breakpoint. */
  window.renderThoughts = function(thoughts){
    const stage = document.querySelector('.stream-stage');
    const pin = document.querySelector('.stream-pin');
    const track = document.querySelector('.stream-track');
    if (!track || !thoughts || !thoughts.length) return;
    track.innerHTML = '';

    const items = thoughts.map(t => { const el = buildTile(t); track.appendChild(el); return el; });

    const isNarrow = () => window.innerWidth < 761;
    let mode = null; // 'pinned' | 'native'
    let st = null;

    function teardownPinned(){
      if (st) { st.kill(); st = null; }
      gsap.set(track, { clearProps: 'transform' });
    }

    function setupNative(){
      if (stage) { stage.style.position = 'relative'; stage.style.height = 'auto'; stage.style.overflowY = 'hidden'; }
      if (pin) pin.style.height = 'auto';
      mode = 'native';
    }

    function measureAndWire(){
      const trackWidth = track.scrollWidth;
      const viewportWidth = stage.clientWidth;
      const travel = Math.max(0, trackWidth - viewportWidth + 40);
      pin.style.height = (100 + (travel / window.innerHeight) * 100) + 'vh';
      return travel;
    }

    function setupPinned(){
      if (stage) { stage.style.position = ''; stage.style.height = ''; stage.style.overflowY = ''; stage.style.overflowX = ''; }
      let travel = measureAndWire();

      // depth: the tile nearest the stage's horizontal center reads as
      // "current" (full scale/opacity); neighbours recede a little as they
      // approach the edges — restrained, not a 3D carousel.
      function applyDepth(){
        const stageRect = stage.getBoundingClientRect();
        const stageCenter = stageRect.left + stageRect.width / 2;
        items.forEach(el => {
          const r = el.getBoundingClientRect();
          const center = r.left + r.width / 2;
          const dist = Math.min(1, Math.abs(center - stageCenter) / (r.width * 0.62));
          el.style.transform = `scale(${1 - 0.06 * dist})`;
          el.style.opacity = 1 - 0.35 * dist;
        });
      }

      st = ScrollTrigger.create({
        trigger: pin, start: 'top top', end: 'bottom bottom', scrub: 0.6,
        onUpdate(self){
          gsap.set(track, { x: -travel * self.progress });
          applyDepth();
        },
      });
      applyDepth();
      mode = 'pinned';
      function refresh(){ if (mode === 'pinned') { travel = measureAndWire(); ScrollTrigger.refresh(); } }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
      items.forEach(el => { const img = el.querySelector('img'); if (img && !img.complete) img.addEventListener('load', refresh, { once:true }); });
      return refresh;
    }

    if (reduceMotion || !hasGSAP) { setupNative(); return; }

    let refresh = null;
    if (isNarrow()) {
      setupNative();
    } else {
      refresh = setupPinned();
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const narrow = isNarrow();
        if (narrow && mode === 'pinned') { teardownPinned(); setupNative(); }
        else if (!narrow && mode === 'native') { refresh = setupPinned(); }
        else if (!narrow && mode === 'pinned' && refresh) { refresh(); }
      }, 200);
    });
  };

  /* ---------------- Thoughts archive — the same six tiles, laid out to browse ----------------
     Used by /thoughts.html: same fixed tile template, same click-to-open
     modal, just wrapped in a plain responsive grid instead of the pinned
     horizontal stage — no scroll-jacking needed on a page whose whole job is
     reading through the set. */
  window.renderThoughtsGrid = function(thoughts){
    const host = document.getElementById('thoughtList');
    if (!host || !thoughts || !thoughts.length) return;
    host.innerHTML = '';
    thoughts.forEach(t => host.appendChild(buildTile(t)));
  };
})();

/* ============================================================
   BOOK CORRIDOR — ported from the supplied two-rail perspective
   component (image-stream-hero.tsx, a React/Tailwind/shadcn piece).
   This site has no React, no Tailwind, and no build step beyond a
   dependency-free Node script, so pulling in that stack for one
   section would mean rebuilding the site's whole front end — which
   the brief explicitly rules out. Instead the component's actual
   mechanics are reproduced exactly in plain JS + generated CSS:
   the same sampled-keyframe perspective projection, the same
   geometric depth scaling, the same rail fan-out and negative-delay
   card cycling, the same prefers-reduced-motion handling (pause,
   don't hide, so the corridor freezes as a full still). Only the
   card source changes — books fetched from /admin instead of a
   fixed demo image array — and a small accessibility fix: the
   original marks its whole visual as decorative (aria-hidden) because
   it sits behind real hero copy; here the corridor *is* the content,
   so the animated layer stays aria-hidden (it's a repeating, cycling
   visual, not a real list) but a plain sr-only list carries the
   actual book names for assistive tech. ============================================================ */
(function(){
  function esc(s){ const d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }

  // Same defaults as the supplied component's `PATH` constant — see its
  // own comment block for why each value exists. Unchanged here.
  const GEOMETRY = {
    perspective: 30, cardWidth: 18, cardHeight: 25, cardRadius: 0.4,
    birthHeight: 2.6, exitHeight: 46, railBirth: -11, railExit: 44,
    fan: 3.3, turnBirth: 6, turnExit: 28, stops: 24,
  };

  // Traces the same curve the component samples client-side, just written
  // as a loop instead of a hook — the keyframes text is identical either way.
  function buildKeyframes(dir, name, p){
    const steps = [];
    for (let s = 0; s <= p.stops; s++) {
      const u = s / p.stops;
      const scale = (p.birthHeight / p.cardHeight) * Math.pow(p.exitHeight / p.birthHeight, u);
      const z = p.perspective * (1 - 1 / scale);
      const rail = p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan);
      const turn = p.turnBirth + (p.turnExit - p.turnBirth) * u;
      steps.push(`${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(2)}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`);
    }
    return `@keyframes ${name}{${steps.join('')}}`;
  }

  // Cards-per-rail and loop speed by breakpoint — point 11 of the brief
  // ("reduce card density on tablet; reduce cards/speed/depth on mobile").
  // The corridor's own geometry (perspective, fan, turn) stays constant so
  // it reads as the same object at every size; only density changes.
  function cardBucket(){
    const w = window.innerWidth;
    if (w < 761) return { cards: 5, speed: 15 };
    if (w < 1100) return { cards: 7, speed: 16 };
    return { cards: 9, speed: 18 };
  }

  let uid = 0;
  let currentBooks = null;
  let currentBucketCards = null;

  function paint(){
    const host = document.getElementById('bookCorridor');
    const sec = document.querySelector('.book-corridor-sec');
    if (!host || !currentBooks) return;

    // No books published yet — collapse the section rather than show an
    // empty near-black gap in the scroll sequence.
    if (!currentBooks.length) { if (sec) sec.style.display = 'none'; return; }
    if (sec) sec.style.display = '';

    const { cards, speed } = cardBucket();
    currentBucketCards = cards;
    const axis = 55;
    const p = GEOMETRY;

    uid += 1;
    const right = `bc-r-${uid}`, left = `bc-l-${uid}`, card = `bc-c-${uid}`;
    let styleEl = document.getElementById('bookCorridorStyle');
    if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'bookCorridorStyle'; document.head.appendChild(styleEl); }
    // The site's own global reduced-motion rule (renaissance.css) forces
    // animation-duration:0.001ms and animation-iteration-count:1 on every
    // element with !important, so it can't be beaten by a plain override —
    // left alone, every card would race to its exit keyframe and, with no
    // fill-mode:forwards, snap back to the un-animated centre point. Re-assert
    // this corridor's real duration/iteration-count/play-state with !important
    // of our own (a class selector beats the global `*` at equal importance),
    // so reduced motion instead freezes each card exactly where its own
    // negative delay put it — a full staggered still, per the original
    // component's design intent, not a collapsed pile at the axis.
    styleEl.textContent = buildKeyframes(1, right, p) + buildKeyframes(-1, left, p) +
      `@media(prefers-reduced-motion:reduce){.${card}{` +
      `animation-duration:${speed}s !important;` +
      `animation-iteration-count:infinite !important;` +
      `animation-play-state:paused !important;` +
      `}}`;

    host.innerHTML = '';
    const depth = document.createElement('div');
    depth.className = 'bc-depth';
    depth.setAttribute('aria-hidden', 'true');
    depth.style.perspective = `${p.perspective}cqw`;
    depth.style.perspectiveOrigin = `50% ${axis}%`;
    const inner = document.createElement('div');
    inner.className = 'bc-inner';
    depth.appendChild(inner);

    // Both rails walk the same book sequence. Each rail only has `cards`
    // slots on screen at once (kept fixed for performance — see
    // cardBucket()), so when there are more published books than slots,
    // a slot can't just sit on one book index forever or everything past
    // index `cards-1` would never appear at all. Instead each card owns a
    // rotating pointer into the book list and advances it by one on every
    // full loop of its own animation (`animationiteration`, which still
    // fires normally even though each card enters the loop mid-flight via
    // a negative delay) — so over enough loops, every published book
    // eventually surfaces on every rail, with no cap on how many can exist
    // and no code change needed when more are added.
    [right, left].forEach(name => {
      for (let i = 0; i < cards; i++) {
        let idx = i % currentBooks.length;
        const el = document.createElement('div');
        el.className = `bc-card ${card}`;
        el.style.left = '50%';
        el.style.top = `${axis}%`;
        el.style.width = `${p.cardWidth}cqw`;
        el.style.height = `${p.cardHeight}cqw`;
        el.style.marginLeft = `${-p.cardWidth / 2}cqw`;
        el.style.marginTop = `${-p.cardHeight / 2}cqw`;
        el.style.borderRadius = `${p.cardRadius}cqw`;
        el.style.animation = `${name} ${speed}s linear infinite`;
        // Negative delay drops each card mid-flight so the corridor is
        // already full on the first frame — same trick as the original.
        el.style.animationDelay = `${-(i * speed) / cards}s`;

        const img = document.createElement('img');
        img.loading = 'lazy'; img.decoding = 'async'; img.draggable = false; img.alt = '';
        const label = document.createElement('span');
        label.className = 'bc-label';
        el.appendChild(img);
        el.appendChild(label);

        function render(){
          const b = currentBooks[idx];
          if (!b) return;
          img.src = b.image || '';
          label.textContent = b.name || '';
        }
        render();
        el.addEventListener('animationiteration', () => {
          idx = (idx + 1) % currentBooks.length;
          render();
        });

        inner.appendChild(el);
      }
    });
    host.appendChild(depth);

    const list = document.createElement('ul');
    list.className = 'sr-only';
    list.innerHTML = currentBooks.map(b => `<li>${esc(b.name)}</li>`).join('');
    host.appendChild(list);
  }

  window.renderBookCorridor = function(books){
    currentBooks = Array.isArray(books) ? books : [];
    paint();
  };

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!currentBooks || !currentBooks.length) return;
      if (cardBucket().cards !== currentBucketCards) paint();
    }, 200);
  });
})();

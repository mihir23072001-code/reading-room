/* Sticky Grid Scroll — pins the "Recent arrivals" section on the homepage
   and reveals/zooms its book-cover grid as the reader scrolls through it.

   Adapted from a GSAP + ScrollTrigger demo. Two deliberate departures from
   that original:

   1. No Lenis (the smooth-scroll library the demo paired with it). Every
      other scroll-linked bit of this site — nav shrink, the article
      progress line, the hero scroll cue, the Journal image parallax —
      assumes plain native scroll. Lenis intercepts and re-drives scrolling
      itself, which would risk breaking all of those rather than just
      this one section, for a smoothing effect that isn't essential to the
      animation itself. ScrollTrigger works fine driven by native scroll.

   2. Nothing here is required for the page to work. If reduced motion is
      on, or either CDN script (gsap.min.js / ScrollTrigger.min.js) failed
      to load, this bails out immediately and the section stays in the
      plain, unpinned, fully-visible layout that renaissance.css already
      shows by default — a normal compact block, not a dead scroll gap.

   Exposed as window.initStickyGridScroll — called once from index.html,
   after the grid's <img> markup has actually been added to the DOM. */
window.initStickyGridScroll = function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sec = document.querySelector('.sgs-sec');
  if (!sec || reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  var wrapper = sec.querySelector('.sgs-inner');
  var content = sec.querySelector('.sgs-content');
  var title = sec.querySelector('.sgs-title');
  var desc = sec.querySelector('.sgs-desc');
  var grid = sec.querySelector('.sgs-grid');
  var items = grid ? Array.prototype.slice.call(grid.querySelectorAll('.sgs-item')) : [];
  // fewer than 3 items can't fill even one of each column — nothing
  // sensible to animate, so leave the static fallback layout in place
  if (!wrapper || !grid || items.length < 3) return;

  gsap.registerPlugin(ScrollTrigger);
  // only now — once we know the animation will actually run — switch the
  // section into its tall, pinned layout (see .sgs-active in the CSS)
  sec.classList.add('sgs-active');

  var numColumns = 3;
  var columns = [];
  for (var c = 0; c < numColumns; c++) columns.push([]);
  items.forEach(function (item, i) { columns[i % numColumns].push(item); });

  if (desc) gsap.set(desc, { opacity: 0, pointerEvents: 'none' });

  var titleOffsetY = 0;
  if (content && title) {
    var dy0 = (content.offsetHeight - title.offsetHeight) / 2;
    titleOffsetY = (dy0 / content.offsetHeight) * 100;
    gsap.set(title, { yPercent: titleOffsetY });
  }

  // wrapper drifts up slightly as the section arrives, like the page
  // catching up to the pin rather than snapping into place
  gsap.from(wrapper, {
    yPercent: -100,
    ease: 'none',
    scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top top', scrub: true },
  });

  if (title) {
    gsap.from(title, {
      opacity: 0,
      duration: 0.7,
      ease: 'power1.out',
      scrollTrigger: { trigger: sec, start: 'top 57%', toggleActions: 'play none none reset' },
    });
  }

  function gridRevealTimeline() {
    var timeline = gsap.timeline();
    var wh = window.innerHeight;
    var dy = wh - (wh - grid.offsetHeight) / 2;
    columns.forEach(function (column, colIndex) {
      var fromTop = colIndex % 2 === 0;
      timeline.from(column, {
        y: dy * (fromTop ? -1 : 1),
        stagger: { each: 0.06, from: fromTop ? 'end' : 'start' },
        ease: 'power1.inOut',
      }, 'grid-reveal');
    });
    return timeline;
  }

  function gridZoomTimeline() {
    var timeline = gsap.timeline({ defaults: { duration: 1, ease: 'power3.inOut' } });
    timeline.to(grid, { scale: 2.05 });
    if (columns[0].length) timeline.to(columns[0], { xPercent: -40 }, '<');
    if (columns[2] && columns[2].length) timeline.to(columns[2], { xPercent: 40 }, '<');
    if (columns[1] && columns[1].length) {
      timeline.to(columns[1], {
        yPercent: function (index) { return (index < Math.floor(columns[1].length / 2) ? -1 : 1) * 40; },
        duration: 0.5,
        ease: 'power1.inOut',
      }, '-=0.5');
    }
    return timeline;
  }

  function toggleContent(isVisible) {
    if (!title || !desc) return;
    gsap.timeline({ defaults: { overwrite: true } })
      .to(title, { yPercent: isVisible ? 0 : titleOffsetY, duration: 0.7, ease: 'power2.inOut' })
      .to(desc, {
        opacity: isVisible ? 1 : 0,
        duration: 0.4,
        ease: 'power1.' + (isVisible ? 'inOut' : 'out'),
        pointerEvents: isVisible ? 'all' : 'none',
      }, isVisible ? '-=90%' : '<');
  }

  var master = gsap.timeline({
    scrollTrigger: { trigger: sec, start: 'top 25%', end: 'bottom bottom', scrub: true },
  });
  master
    .add(gridRevealTimeline())
    .add(gridZoomTimeline(), '-=0.6')
    .add(function () { toggleContent(master.scrollTrigger.direction === 1); }, '-=0.32');
};

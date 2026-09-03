/* THE READING ROOM — hero ambient scene.
   A generative field of drifting gold/candle-light dust, rendered with
   three.js as a soft WebGL layer over the hero painting, between the
   scrim and the title text. Nothing about it is a static asset — the
   sprite texture, the particle positions and their drift are all
   generated at runtime, the same spirit as a procedural "painting" rather
   than a fixed image. This is the one page (the homepage hero) that loads
   an external library; every other page on the site stays dependency-free.
   Fully optional: if three.js fails to load (CDN unreachable, older
   browser, WebGL unavailable) the hero simply looks exactly as it does
   without this file — painting, scrim and title, nothing missing. */
(function () {
  const hero = document.querySelector('.hero');
  if (!hero || typeof window.THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Deliberate exception to reduced motion, same policy as the curtain, the
  // Shelf marquee and the floating ornaments elsewhere on this site: ambient
  // motion is the entire point of this layer, so it plays regardless of the
  // OS-level setting. (It does still pause when the tab is hidden or the
  // hero scrolls out of view — that's a performance concession, not an
  // accessibility one.)
  void reduceMotion;

  let canvas, renderer, scene, camera, points, particles;
  let raf = null;
  let visible = true;
  let frustum = { w: 0, h: 0 };

  function makeSprite() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function computeFrustum() {
    const dist = camera.position.z;
    const vFov = (camera.fov * Math.PI) / 180;
    frustum.h = 2 * Math.tan(vFov / 2) * dist;
    frustum.w = frustum.h * camera.aspect;
  }

  function buildParticles() {
    const COUNT = window.innerWidth < 640 ? 90 : 170;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const goldA = new THREE.Color(0xa9822f); // --gold-leaf
    const goldB = new THREE.Color(0xe3b872); // --candle

    particles = [];
    for (let i = 0; i < COUNT; i++) {
      const p = {
        x: (Math.random() - 0.5) * frustum.w,
        y: (Math.random() - 0.5) * frustum.h,
        z: (Math.random() - 0.5) * 260,
        vy: 6 + Math.random() * 10, // world units / second, gentle upward drift
        swayAmp: 6 + Math.random() * 16,
        swayFreq: 0.15 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2,
        baseX: 0,
      };
      p.baseX = p.x;
      particles.push(p);

      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      const t = Math.random();
      const col = goldA.clone().lerp(goldB, t);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = 5 + Math.random() * 7;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 9,
      map: makeSprite(),
      transparent: true,
      opacity: 0.55,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    if (points) scene.remove(points);
    points = new THREE.Points(geo, mat);
    scene.add(points);
  }

  function init() {
    canvas = document.createElement('canvas');
    canvas.className = 'hero-scene';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.querySelector('.hero-inner'));

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, hero.clientWidth / hero.clientHeight, 1, 2000);
    camera.position.z = 420;

    resize();
    buildParticles();

    requestAnimationFrame(() => requestAnimationFrame(() => canvas.classList.add('is-in')));

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { visible = e.isIntersecting; });
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0 });
      io.observe(hero);
    }

    start();
  }

  function resize() {
    const w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    computeFrustum();
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); buildParticles(); }, 150);
  }

  function onVisibility() {
    if (document.hidden) stop(); else if (visible) start();
  }

  let lastT = null;
  function tick(t) {
    if (lastT === null) lastT = t;
    const dt = Math.min((t - lastT) / 1000, 0.05);
    lastT = t;

    const half = frustum.h / 2;
    const posAttr = points.geometry.getAttribute('position');
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y += p.vy * dt;
      if (p.y > half) { p.y = -half; p.baseX = (Math.random() - 0.5) * frustum.w; }
      const sway = Math.sin(t / 1000 * p.swayFreq + p.phase) * p.swayAmp;
      posAttr.array[i * 3] = p.baseX + sway;
      posAttr.array[i * 3 + 1] = p.y;
    }
    posAttr.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  function start() {
    if (raf !== null) return;
    lastT = null;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf === null) return;
    cancelAnimationFrame(raf);
    raf = null;
  }

  try {
    init();
  } catch (err) {
    // WebGL context creation or some GPU quirk failed — remove any partial
    // canvas and leave the hero exactly as it looks without this file.
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  }
})();

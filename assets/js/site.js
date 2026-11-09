/* ALISA ILINOVA — site behaviour: header, reveals, hero bootstrap. No dependencies. */
(function () {
  var doc = document.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header: solid after scrolling, hides on scroll down, returns on scroll up */
  var hdr = document.querySelector('.site-header'), lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    if (hdr) {
      hdr.classList.toggle('is-solid', y > (hdr.dataset.solidAt ? +hdr.dataset.solidAt : 40));
      if (y > 420 && y > lastY + 4) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 120) hdr.classList.remove('is-hidden');
    }
    lastY = y; ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (hdr) hdr.addEventListener('focusin', function () { hdr.classList.remove('is-hidden'); });

  /* reveal on scroll */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !RM) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* hero */
  var stage = document.querySelector('.hero-stage');
  if (!stage || !doc.classList.contains('want-3d')) return;
  var canvas = stage.querySelector('.hero-canvas'), track = document.querySelector('.hero-track');
  var ui = stage.querySelector('.hero-ui'), arrive = stage.querySelector('.hero-arrive'), anchor = document.getElementById('work');
  var debug = /[?&]debug\b/.test(location.search);
  function keepPlace(fn) { var b = anchor ? anchor.getBoundingClientRect().top : 0; fn(); if (anchor && scrollY > 0) { var a = anchor.getBoundingClientRect().top; scrollBy(0, a - b); } }
  function fail(reason) {
    keepPlace(function () { doc.classList.remove('is-3d', 'want-3d'); });
    if (ui) ui.style.opacity = ''; if (arrive) arrive.style.opacity = '';
    if (debug) console.warn('hero fallback:', reason);
    window.__heroFail = String(reason);
  }
  var sm = function (t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
  var base = (document.querySelector('meta[name=asset-base]') || {}).content || 'assets/';
  var s = document.createElement('script'); s.src = base + 'js/hero.js'; s.async = true;
  s.onerror = function () { fail('script'); };
  s.onload = function () {
    if (!window.HERO) return fail('no-hero');
    window.HERO({
      canvas: canvas, track: track, debug: debug, noWatchdog: debug, allowSoftware: debug || /[?&]hero=3d\b/.test(location.search), preserve: debug,
      wm: base + 'hero/wm.json', field: base + 'hero/field.png', fov: 50, maxDpr: debug && /[?&]dpr=2\b/.test(location.search) ? 2 : 1.5, entranceMs: 2800,
      vantage: { pos: [0, -0.6, 8.0], ypr: [0.10, 0.24, -0.25], D: 8.0, Zf: 2.6, Zb: -10.0, th: 0.03, off: [-2.9, -0.55], rot: 0.20 },
      floor: null,
      atmos: { top: 'CW', hor: 'LV', bot: '#5A4FEF', fog: '#D3C8FF', skyK: 1.6, fog0: 22, fogL: 70 },
      light: { key: [-0.40, 0.75, 0.50], keyBox: [-0.4, 0.7, 0.6], violet: [0.9, -0.2, 0.4], cobalt: [-0.2, 0.3, -1.0] },
      sculpt: { pos: [1.969, -3.796, -4.75], ypr: [0.45, 0, 0], scale: 2.4, pool: false, drip: 0, arcEnd: 0 },
      reflLetters: 0.12, faceBlur: 0.7, letterShadowOnSculpture: 0,
      melt: function (pr, te) { return 0.05 + 0.22 * te + 0.28 * sm((pr - 0.05) / 0.5); },
      mobile: { fov: 32, maxDpr: debug && /[?&]dpr=2\b/.test(location.search) ? 2 : 1.5, vantage: { rot: 0.92, off: [-2.9, -0.55] }, orbit: [0, 0, 0], shift: [0, 0.11] },
      depthTint: true, orbit: [0.10, 0.05, 0.035], pivot: [-0.873, 1.539, -0.698],
      entrance: { pos: [8.246, 0.178, -3.5], ypr: [1.869, 0.142, 0] },
      path: [{ p: 0, pos: [0, -0.6, 8.0], ypr: [0.10, 0.24, -0.25] }, { p: 0.45, pos: [7.204, 0.22, -1.546], ypr: [0.953, -0.19, 0] }, { p: 0.72, pos: [1.441, -1.143, -5.642], ypr: [0.953, -0.19, 0] }, { p: 1, pos: [-0.368, -1.143, -6.928], ypr: [0.953, 0.0, 0] }],
      poster: { src: base + 'hero/poster.jpg', center: [-4.801, -1.143, -10.079], normal: [0.8151, 0, 0.5794], h: 2.6 },
      onReady: function () { keepPlace(function () { doc.classList.add('is-3d'); }); },
      onFail: fail,
      onFrame: function (st) {
        if (ui) ui.style.opacity = String(1 - sm(st.pr / 0.1));
        if (arrive) arrive.style.opacity = String(sm((st.pr - 0.86) / 0.1));
      }
    }).catch(function (e) { fail(e && e.message ? e.message.slice(0, 120) : 'error'); });
  };
  document.head.appendChild(s);
})();

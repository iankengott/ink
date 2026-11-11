(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Theme toggle -------------------------------------------------------
  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var themeBtn = document.getElementById('theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('ink-theme', next); } catch (e) {}
      readColors();
      if (reduceMotion) draw(0);
    });
  }

  // ---- Hero: spin wave in a perpendicularly magnetized film ----------------
  // Forward-volume geometry: the static field H0 and the magnetization point
  // out of the film (z), so each spin precesses on a cone about z and the
  // wave travels the same way in every in-plane direction. A stripline
  // antenna on one edge launches a plane wave; the pointer acts as a second,
  // point-like source, and the two interfere. Tiles show the dynamic
  // component m_x the way a micromagnetic snapshot would.
  var canvas = document.getElementById('wave');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var W = 0, H = 0, dpr = 1;
  var col = { ink: '#14151a', paper: '#f4f1ea', dim: '#7b7d88', hot: '#c8452b', cold: '#2b46c8' };

  // Film parameters (YIG) and the lowest forward-volume mode,
  //   w^2 = wH * (wH + wM * (1 - (1 - exp(-k d)) / (k d))),  wH = g*mu0*(H0 - Ms).
  var GAMMA = 28.0;        // GHz / T
  var MU0_MS = 0.175;      // T
  var MU0_H0 = 0.250;      // T, applied out of plane
  var THICK = 100e-9;      // m
  var LAMBDA = 2.0e-6;     // m
  function fGHz(k) {
    var fH = GAMMA * (MU0_H0 - MU0_MS), fM = GAMMA * MU0_MS, x = k * THICK;
    return Math.sqrt(fH * (fH + fM * (1 - (1 - Math.exp(-x)) / x)));
  }
  var K = 2 * Math.PI / LAMBDA;
  var FREQ = fGHz(K);
  var VG = 2 * Math.PI * 1e9 * (fGHz(K * 1.001) - fGHz(K * 0.999)) / (K * 0.002); // m/s

  var NX = 30, NY = 16;            // spins along and across the propagation direction
  var CELLS_PER_LAMBDA = 8;        // so one cell is 250 nm
  var KC = 2 * Math.PI / CELLS_PER_LAMBDA;
  var DECAY = 26;                  // attenuation length in cells (shortened so the decay is visible)
  var CONE = 0.48;                 // largest cone half-angle, rad (exaggerated)
  var PERIOD = 2.6;                // seconds per precession on screen
  var CA = 0.893, SA = 0.45;       // isometric axes

  var pointer = { x: -1, y: -1, on: 0, target: 0, u: 0, v: 0 };
  var geo = { s: 10, ox: 0, oy: 0, narrow: false, fade: 0 };

  function readColors() {
    var cs = getComputedStyle(root);
    function v(n, d) { return cs.getPropertyValue(n).trim() || d; }
    col.ink = v('--ink', col.ink);
    col.paper = v('--paper', col.paper);
    col.dim = v('--ink-3', col.dim);
    col.hot = v('--hot', col.hot);
    col.cold = v('--accent', col.cold);
  }

  function layout() {
    var narrow = W < 760;
    var span = (NX + NY) * CA;
    var s, cx, cy;
    if (narrow) {
      s = (W * 0.93) / span;
      cx = W * 0.5;
      cy = H - (NX + NY) * SA * s * 0.5 - 118;
    } else {
      // Use the space to the right of the headline, bleeding slightly off the edge.
      var text = document.querySelector('.hero-text');
      var left = Math.max(text ? text.getBoundingClientRect().right - canvas.getBoundingClientRect().left + 36 : 0, W * 0.46);
      var right = W * 1.02;
      s = Math.min((right - left) / span, (H * 0.8) / ((NX + NY) * SA + 3));
      cx = (left + right) / 2;
      cy = H * 0.5;
      geo.fade = left;
    }
    geo.s = s;
    geo.narrow = narrow;
    // Screen position of lattice corner (0, 0), chosen so the lattice is centered on (cx, cy).
    geo.ox = cx - ((NX - NY) / 2) * CA * s;
    geo.oy = cy - ((NX + NY) / 2) * SA * s + s;
  }

  function px(u, v) { return geo.ox + (u - v) * CA * geo.s; }
  function py(u, v, z) { return geo.oy + (u + v) * SA * geo.s - (z || 0) * geo.s; }

  function resize() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    layout();
    if (reduceMotion) draw(0);
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function arrow(x1, y1, x2, y2, head) {
    var a = Math.atan2(y2 - y1, x2 - x1);
    line(x1, y1, x2, y2);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4));
    ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function draw(ms) {
    if (!ctx || !W) return;
    var t = ms / 1000;
    var wt = (2 * Math.PI * t) / PERIOD;
    var s = geo.s;
    pointer.on += (pointer.target - pointer.on) * 0.06;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Pointer position in lattice coordinates.
    var dx = (pointer.x - geo.ox) / (CA * s), dy = (pointer.y - geo.oy) / (SA * s);
    pointer.u = (dx + dy) / 2;
    pointer.v = (dy - dx) / 2;
    var src = pointer.on > 0.01;

    var n = NX * NY, re = new Float32Array(n), im = new Float32Array(n);
    var u, v, i, r, a, ph;
    for (v = 0; v < NY; v++) {
      for (u = 0; u < NX; u++) {
        i = v * NX + u;
        // Plane wave from the antenna at u = 0.
        a = Math.exp(-u / DECAY);
        ph = KC * u - wt;
        re[i] = a * Math.cos(ph);
        im[i] = a * Math.sin(ph);
        if (src) {
          // Cylindrical wave from the pointer: 1/sqrt(r) spreading plus damping.
          r = Math.sqrt((u - pointer.u) * (u - pointer.u) + (v - pointer.v) * (v - pointer.v));
          a = (pointer.on * 1.1 * Math.exp(-r / DECAY)) / Math.sqrt(1 + r / 1.5);
          ph = KC * r - wt;
          re[i] += a * Math.cos(ph);
          im[i] += a * Math.sin(ph);
        }
      }
    }

    // m_x map on the film surface.
    var hx = CA * s, hy = SA * s, m, x, y;
    for (v = 0; v < NY; v++) {
      for (u = 0; u < NX; u++) {
        m = re[v * NX + u];
        if (m > 1) m = 1; else if (m < -1) m = -1;
        x = px(u, v); y = py(u, v);
        ctx.globalAlpha = 0.04 + 0.42 * Math.abs(m);
        ctx.fillStyle = m >= 0 ? col.hot : col.cold;
        ctx.beginPath();
        ctx.moveTo(x, y - hy);
        ctx.lineTo(x + hx, y);
        ctx.lineTo(x, y + hy);
        ctx.lineTo(x - hx, y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Antenna: a strip just outside the u = 0 edge.
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = col.ink;
    ctx.fillStyle = col.ink;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2.5, s * 0.34);
    line(px(-1.1, -0.6), py(-1.1, -0.6, 0.15), px(-1.1, NY - 0.4), py(-1.1, NY - 0.4, 0.15));

    // Spins.
    var L = 1.55, amp, th, phi, st, bx, by, tx, ty;
    ctx.lineWidth = 1;
    for (v = 0; v < NY; v++) {
      for (u = 0; u < NX; u++) {
        i = v * NX + u;
        amp = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
        if (amp > 1.25) amp = 1.25;
        th = CONE * amp;
        phi = Math.atan2(im[i], re[i]);
        st = Math.sin(th) * L;
        bx = px(u, v); by = py(u, v);
        tx = bx + (st * Math.cos(phi) - st * Math.sin(phi)) * CA * s;
        ty = by + (st * Math.cos(phi) + st * Math.sin(phi)) * SA * s - Math.cos(th) * L * s;
        ctx.globalAlpha = 0.28 + 0.5 * Math.min(amp, 1);
        ctx.strokeStyle = col.ink;
        line(bx, by, tx, ty);
        m = re[i];
        ctx.globalAlpha = 0.55 + 0.45 * Math.min(amp, 1);
        ctx.fillStyle = Math.abs(m) < 0.12 ? col.ink : (m > 0 ? col.hot : col.cold);
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(1.2, s * 0.13), 0, 6.2832);
        ctx.fill();
      }
    }

    // Annotations.
    var fs = geo.narrow ? 10 : 12;
    ctx.font = '500 ' + fs + 'px "IBM Plex Mono", ui-monospace, monospace';
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col.dim;
    ctx.fillStyle = col.dim;
    ctx.lineWidth = 1.2;
    var head = Math.max(5, s * 0.6);

    // Static field, out of plane.
    x = px(19, -3); y = py(19, -3);
    arrow(x, y, x, y - s * 4.2, head);
    ctx.textAlign = 'left';
    ctx.fillText('H₀ ∥ z', x + 8, y - s * 3.4);

    // Wave vector along the far edge.
    arrow(px(9, -1.6), py(9, -1.6), px(14, -1.6), py(14, -1.6), head);
    ctx.fillText('k', px(14, -1.6) + 6, py(14, -1.6) - 6);

    // One wavelength along the near edge.
    var e = NY + 0.6, u1 = 6, u2 = u1 + CELLS_PER_LAMBDA;
    line(px(u1, e), py(u1, e), px(u2, e), py(u2, e));
    line(px(u1, e - 0.5), py(u1, e - 0.5), px(u1, e + 0.5), py(u1, e + 0.5));
    line(px(u2, e - 0.5), py(u2, e - 0.5), px(u2, e + 0.5), py(u2, e + 0.5));
    ctx.textAlign = 'right';
    ctx.fillText('λ = ' + (LAMBDA * 1e6).toFixed(1) + ' µm', px((u1 + u2) / 2, e) - 8, py((u1 + u2) / 2, e) + fs + 6);

    // Antenna label.
    ctx.fillText('antenna', px(-1.1, -0.6) - 10, py(-1.1, -0.6, 0.15) - 4);
    ctx.textAlign = 'left';

    // Keep the headline readable: fade the film out toward the text.
    if (!geo.narrow) {
      var f1 = geo.fade - 20;
      var g = ctx.createLinearGradient(geo.fade - 140, 0, f1, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, f1, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  var running = false;
  function loop(ms) {
    if (!running) return;
    draw(ms);
    requestAnimationFrame(loop);
  }

  if (ctx) {
    readColors();
    resize();
    window.addEventListener('resize', resize);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
      readColors();
      if (reduceMotion) draw(0);
    });

    var hero = canvas.parentElement;
    hero.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.target = 1;
      if (reduceMotion) { pointer.on = 1; draw(0); }
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { pointer.target = 0; });

    var readout = document.getElementById('wave-readout');
    if (readout) {
      readout.innerHTML = 'f = ' + FREQ.toFixed(2) + ' GHz · v<sub>g</sub> = ' + (VG / 1000).toFixed(2) + ' km/s';
    }

    if (reduceMotion) {
      draw(0);
    } else if ('IntersectionObserver' in window) {
      // Only animate while the hero is on screen.
      new IntersectionObserver(function (entries) {
        var visible = entries[0].isIntersecting;
        if (visible && !running) { running = true; requestAnimationFrame(loop); }
        if (!visible) running = false;
      }).observe(canvas);
    } else {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  // ---- Nav: border on scroll, active section ------------------------------
  var nav = document.querySelector('.nav');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var navLinks = {};
  document.querySelectorAll('.nav nav a').forEach(function (a) {
    navLinks[a.getAttribute('href').slice(1)] = a;
  });

  // ---- Reveal on scroll ---------------------------------------------------
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 3) * 70 + 'ms';
      io.observe(el);
    });

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = navLinks[en.target.id];
        if (link && en.isIntersecting) {
          Object.keys(navLinks).forEach(function (k) { navLinks[k].classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('main section[id]').forEach(function (s) { spy.observe(s); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- Project filter -----------------------------------------------------
  var buttons = document.querySelectorAll('.chip-btn');
  var cards = document.querySelectorAll('.p-card');
  var empty = document.getElementById('empty');
  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var kind = btn.dataset.filter;
      var shown = 0;
      buttons.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach(function (card) {
        var show = kind === 'all' || card.dataset.kind === kind;
        card.hidden = !show;
        if (show) { card.classList.add('in'); shown++; }
      });
      if (empty) empty.hidden = shown > 0;
    });
  });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();

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

  // ---- Hero wave ----------------------------------------------------------
  // Stacked sine lines crossing an ink disc, where the colors invert.
  var canvas = document.getElementById('wave');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var W = 0, H = 0, dpr = 1;
  var ink = '#14151a', paper = '#f4f1ea';
  var pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  function readColors() {
    var cs = getComputedStyle(root);
    ink = cs.getPropertyValue('--ink').trim() || ink;
    paper = cs.getPropertyValue('--paper').trim() || paper;
  }

  function resize() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    if (reduceMotion) draw(0);
  }

  function strokeLines(t, cx, cy, R, color, alpha, gain) {
    var lines = 26;
    var step = Math.max(6, W / 160);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (var i = 0; i < lines; i++) {
      var f = i / (lines - 1);
      var off = (f - 0.5) * R * 0.95;
      ctx.globalAlpha = alpha * (0.35 + 0.65 * Math.sin(f * Math.PI));
      ctx.beginPath();
      for (var x = -step; x <= W + step; x += step) {
        var d = (x - cx) / R;
        var env = Math.exp(-d * d * 0.55);
        var amp = R * (0.1 + 0.34 * env) * gain;
        var phase = d * 2.6 - t * 0.55 + f * 1.25 + (pointer.x - 0.5) * 1.2;
        var y = cy + off * (0.45 + 0.55 * env) + Math.sin(phase) * amp
              + Math.sin(d * 5.3 + t * 0.32 + f * 3) * amp * 0.16;
        if (x <= -step) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw(ms) {
    if (!ctx || !W) return;
    var t = ms / 1000;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;

    var narrow = W < 760;
    var R = narrow ? Math.min(W * 0.3, 120) : Math.min(H * 0.36, W * 0.2);
    var cx = narrow ? W * 0.5 : W * 0.74;
    var cy = (narrow ? H - R - 34 : H * 0.5) + (pointer.y - 0.5) * 14;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Lines on the page.
    strokeLines(t, cx, cy, R, ink, narrow ? 0.22 : 0.3, 1);

    // Ink disc with inverted lines.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = ink;
    ctx.fill();
    ctx.clip();
    strokeLines(t, cx, cy, R, paper, 0.9, 1.25);
    ctx.restore();

    // Fade the lines out toward the text side.
    if (!narrow) {
      var g = ctx.createLinearGradient(0, 0, W * 0.55, 0);
      g.addColorStop(0, paper);
      g.addColorStop(0.55, paper);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-out';
      var m = ctx.createLinearGradient(0, 0, W * 0.55, 0);
      m.addColorStop(0, 'rgba(0,0,0,1)');
      m.addColorStop(0.5, 'rgba(0,0,0,0.92)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = m;
      ctx.fillRect(0, 0, W * 0.55, H);
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
    window.addEventListener('pointermove', function (e) {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = e.clientY / window.innerHeight;
    }, { passive: true });

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

/* Fenrir site motion.
   The gate: a marketing page seen once per visit, where the scroll itself is the delight. The page always scrolls
   at native speed: nothing listens to the wheel, nothing snaps and nothing is pinned. What moves is depth. Every
   scene visual sits on a perspective stage, and one requestAnimationFrame pass per scroll reads where each live
   stage is in the viewport and sets tilt, depth, parallax and fades from that position alone, so scrolling back
   plays everything in reverse. Frames, chips and illustration layers move in 3D; text only rises and fades.
   Transform and opacity only. Reduced motion keeps the fades and drops every movement. Hover effects run only for
   a fine pointer. Without this script everything simply stands still and visible. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var win = window;
  function media(q) { return win.matchMedia ? win.matchMedia(q) : null; }
  var reduceQuery = media('(prefers-reduced-motion: reduce)');
  var fineQuery = media('(hover: hover) and (pointer: fine)');
  var reduce = !!(reduceQuery && reduceQuery.matches);
  var finePointer = !!(fineQuery && fineQuery.matches);
  var hasIO = 'IntersectionObserver' in win;

  var FLAT = 0.55;        /* a visual lies flat and full size when its centre crosses 55% of the viewport height */
  var TEXT_FLAT = 0.62;   /* text settles when its top edge reaches 62% of the viewport height */

  function each(sel, fn, scope) { Array.prototype.forEach.call((scope || doc).querySelectorAll(sel), fn); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function easeOut(t) { return 1 - (1 - t) * (1 - t); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function num(v) { return Math.round(v * 100) / 100; }
  function shown(el) { return !!el && el.offsetParent !== null; }

  /* ---------- 1. The model: groups of elements, each measured against one box ---------- */
  var groups = [];
  var byBox = typeof Map === 'function' ? new Map() : null;
  function group(box, items, kind) {
    items = items.filter(function (it) { return it.el; });
    if (!box || !items.length) return;
    var g = { box: box, items: items, kind: kind || 'stage', live: !hasIO, flush: true };
    groups.push(g);
    if (byBox) byBox.set(box, g);
  }

  function build() {
    /* heroes: the copy rises faster than the page, the aurora trails at 0.3x, the window recedes */
    each('.hero, .phero', function (hero) {
      var items = [
        { el: hero.querySelector('.hero__copy') || hero.querySelector(':scope > .wrap:not(.jump)'), role: 'hero-copy' },
        { el: hero.querySelector(':scope > .aurora'), role: 'aurora' },
        { el: hero.querySelector('.hero__glow'), role: 'hero-glow' }
      ];
      var fan = hero.querySelector('.fan');
      if (fan) {
        items.push({ el: fan.querySelector('.fan__side--l'), role: 'fan', side: -1 },
                   { el: fan.querySelector('.fan__main'), role: 'fan', side: 0 },
                   { el: fan.querySelector('.fan__side--r'), role: 'fan', side: 1 });
      } else {
        items.push({ el: hero.querySelector('.frame--hero'), role: 'hero-frame' });
      }
      group(hero, items, 'hero');
      if (groups.length && groups[groups.length - 1].box === hero) groups[groups.length - 1].stage = hero.querySelector('.hero__stage');
    });

    /* scene visuals: the stage tilts in from deep below, chips ride in front, the glow trails behind */
    var stepSide = 1;
    each('.scene__visual, .step__visual', function (vis) {
      var isStep = vis.classList.contains('step__visual');
      var side = 0;
      if (isStep) { side = stepSide; stepSide = -stepSide; }
      var items = [];
      Array.prototype.forEach.call(vis.children, function (c) {
        if (c.classList.contains('glow')) items.push({ el: c, role: 'glow' });
        else if (c.matches('.chip, .m-float, .arrange__lift, .safe__log, .collage__side')) items.push({ el: c, role: 'fore' });
        else if (c.classList.contains('duo__back')) items.push({ el: c, role: 'duo', side: -1 });
        else if (c.classList.contains('duo__front')) items.push({ el: c, role: 'duo', side: 1 });
        else if (c.matches('.frame, .m-win, .m-card, .m-console, .phone, svg')) {
          items.push({ el: c, role: isStep ? 'step' : 'stage', side: side, mid: c.tagName.toLowerCase() === 'svg' });
        }
      });
      group(vis, items);
    });

    /* the rail between the three steps draws with the scroll */
    each('.steps__list', function (list) { group(list, [{ el: list.querySelector('.steps__rail i'), role: 'rail' }], 'rail'); });

    /* the call to action's aurora drifts slower than the page */
    each('.cta', function (cta) { group(cta, [{ el: cta.querySelector(':scope > .aurora'), role: 'aurora-scene' }]); });

    /* text only rises and fades; it measures itself and undoes its own lift */
    each('.scene__copy, .step__copy, .steps__head, .numbers__head, .numbers__grid, .cta__in, .section__head, .pages, ' +
         '.dl-grid, .portable, .req, .split, .section > .wrap > .panel, .faq__tools, .faq__group, .faq > .panel', function (el) {
      group(el, [{ el: el, role: 'copy', ty: 0 }], 'copy');
    });
  }

  /* ---------- 2. Writing a state, only when it changed ---------- */
  function put(it, transform, opacity) {
    if (transform !== it.t) { it.el.style.transform = transform; it.t = transform; }
    var o = Math.round(clamp(opacity, 0, 1) * 1000) / 1000;
    if (o !== it.o) { it.el.style.opacity = o >= 1 ? '' : String(o); it.o = o; }
  }
  function live(g, on) {
    if (reduce) return;
    g.items.forEach(function (it) { it.el.classList.toggle('is-live', on); });
  }

  /* ---------- 3. The states ---------- */
  var vh = 800, vw = 1200, kMove = 1, kFore = 1;

  function stageState(it, e, x, s, pass) {
    var q = 1 - easeOut(e);
    var o = clamp(e / 0.45, 0, 1);                                 /* opaque early, so the tilt is seen, not hidden in a fade */
    if (reduce) { put(it, '', o); return; }
    var tx = 0, ty = 60 * q * kMove, tz = -160 * q, rx = 18 * q - 6 * x, ry = 0, sc = 1 - 0.03 * x;
    if (it.mid) ty += clamp(0.3 * s, -140, 140) * kMove;          /* the illustration itself: 0.7x of the scroll */
    if (it.role === 'step') {                                        /* the steps swing in from alternating sides */
      tx = 90 * it.side * q * kMove; ty = 30 * q * kMove; tz = -140 * q; ry = -18 * it.side * q; rx = 8 * q - 6 * x;
    }
    if (it.role === 'duo') {                                         /* the two windows part in depth, then meet again */
      var sep = Math.sin(Math.PI * pass);
      tz += 60 * it.side * sep; ry = -5 * it.side * sep;
    }
    put(it, 'translate3d(' + num(tx) + 'px,' + num(ty) + 'px,' + num(tz) + 'px) rotateX(' + num(rx) + 'deg) rotateY(' + num(ry) + 'deg) scale(' + num(sc) + ')', o);
  }
  function foreState(it, e, s) {                                     /* chips and pills: 1.2x of the scroll */
    var o = clamp((e - 0.12) / 0.45, 0, 1);
    if (reduce) { put(it, '', o); return; }
    put(it, 'translate3d(0,' + num(clamp(-0.2 * s, -90, 90) * kFore) + 'px,0)', o);
  }
  function glowState(it, e, x, s) {                                  /* the glow behind: 0.4x of the scroll */
    var o = clamp(e / 0.8, 0, 1) * (1 - 0.85 * x);                   /* it fades as it leaves, before the next scene covers it */
    if (reduce) { put(it, '', o); return; }
    put(it, 'translate3d(0,' + num(clamp(0.6 * s, -240, 110) * kMove) + 'px,0)', o);
  }
  function copyState(it, top, h) {
    var bottom = top + h;
    var e = clamp((vh - top) / (vh * (1 - TEXT_FLAT)), 0, 1);       /* its top edge from the viewport bottom to 62% */
    var x = clamp((vh * 0.3 - bottom) / (vh * 0.3), 0, 1);          /* its bottom edge from 30% to the top */
    var o = clamp(e / 0.6, 0, 1) * (1 - 0.6 * x);
    if (reduce) { it.ty = 0; put(it, '', o); return; }
    var ty = (36 * (1 - easeOut(e)) - 28 * x) * kMove;
    it.ty = ty;
    put(it, 'translate3d(0,' + num(ty) + 'px,0)', o);
  }
  function heroState(g, r) {
    var scrolled = clamp(-r.top, 0, r.height);
    var hp = r.height ? scrolled / r.height : 0;
    var fanT = 0, sides = false;
    var main = null;
    g.items.forEach(function (it) { if (it.role === 'fan' && it.side === 0) main = it; if (it.role === 'fan' && it.side !== 0 && it.shown) sides = true; });
    if (g.stage) {
      var fc = r.top + g.stageMid;
      fanT = smooth(clamp((vh * 0.62 - fc) / (vh * 0.52), 0, 1));
    }
    g.items.forEach(function (it) {
      var o;
      switch (it.role) {
        case 'hero-copy':
          o = 1 - clamp((scrolled - vh * 0.06) / (vh * 0.5), 0, 1);
          if (reduce) put(it, '', o);
          else put(it, 'translate3d(0,' + num(-0.35 * scrolled) + 'px,0)', o);
          break;
        case 'aurora':
          if (!reduce) put(it, 'translate3d(0,' + num(0.7 * scrolled) + 'px,0)', 1);
          break;
        case 'hero-glow':
          o = 1 - 0.6 * hp;
          if (reduce) put(it, '', o);
          else put(it, 'translate3d(0,' + num(0.45 * scrolled) + 'px,0)', o);
          break;
        case 'hero-frame':
          if (!reduce) put(it, 'translate3d(0,0,' + num(-200 * hp) + 'px) rotateX(' + num(12 * hp) + 'deg) scale(' + num(1 - 0.04 * hp) + ')', 1 - 0.25 * hp);
          break;
        case 'fan':
          if (reduce) break;
          if (it === main && !sides) {                               /* phones: one window, so it recedes like the others */
            put(it, 'translate3d(0,0,' + num(-200 * hp) + 'px) rotateX(' + num(12 * hp) + 'deg) scale(' + num(1 - 0.04 * hp) + ')', 1 - 0.25 * hp);
          } else if (it.side === 0) {                                /* the fan closes into a row of three windows */
            put(it, 'scale(' + num(1 - 0.34 * fanT) + ')', 1);
          } else if (it.shown) {
            put(it, 'translateX(' + num(it.side * (34 + 34 * fanT)) + '%) translateZ(' + num(-180 * (1 - fanT)) + 'px) rotateY(' + num(-18 * it.side * (1 - fanT)) + 'deg) scale(' + num(1 - 0.34 * fanT) + ')', 1);
          }
          break;
      }
    });
  }

  /* Positions are measured once per layout change (load, resize, fonts, any change in the page's size) and every
     frame works from the scroll offset alone: reading layout between writes forced the browser to restyle on every
     frame, and that was most of the scroll's main-thread time. */
  var sy = 0, dirty = true;
  function measure() {
    vh = win.innerHeight || root.clientHeight || 800;
    vw = root.clientWidth || win.innerWidth || 1200;
    kMove = vw < 600 ? 0.55 : (vw < 960 ? 0.8 : 1);
    kFore = vw < 600 ? 0.35 : kMove;
    var y = win.pageYOffset || 0;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      g.shown = shown(g.box);
      for (var j = 0; j < g.items.length; j++) g.items[j].shown = shown(g.items[j].el);
      if (!g.shown) continue;
      var r = g.box.getBoundingClientRect();
      g.h = r.height;
      g.top = r.top + y - (g.kind === 'copy' ? (g.items[0].ty || 0) : 0);   /* a copy block measures itself: undo its own lift */
      if (g.stage) g.stageMid = g.stage.offsetTop + g.stage.offsetHeight / 2;
    }
  }
  function update(g) {
    if (!g.shown) return;
    var r = { top: g.top - sy, height: g.h };
    if (g.kind === 'hero') { heroState(g, r); return; }
    if (g.kind === 'copy') { copyState(g.items[0], r.top, r.height); return; }
    if (g.kind === 'rail') {
      if (!reduce) put(g.items[0], 'scaleY(' + num(clamp((vh * FLAT - r.top) / (r.height || 1), 0, 1)) + ')', 1);
      return;
    }
    var h = r.height, c = r.top + h / 2;
    var start = vh + h / 2, flat = vh * FLAT, end = -h / 2;
    var e = clamp((start - c) / (start - flat), 0, 1);             /* 0 below the fold, 1 flat at 55% */
    var x = clamp((flat - c) / (flat - end), 0, 1);                /* 0 flat, 1 gone past the top */
    var s = clamp(vh / 2 - c, -(vh / 2 + h / 2), vh / 2 + h / 2);  /* how far the stage has scrolled past centre */
    var pass = clamp((start - c) / (start - end), 0, 1);           /* 0 entering, 1 leaving */
    for (var i = 0; i < g.items.length; i++) {
      var it = g.items[i];
      if (it.role === 'glow') glowState(it, e, x, s);
      else if (it.role === 'fore') foreState(it, e, s);
      else if (it.role === 'aurora-scene') { if (!reduce) put(it, 'translate3d(0,' + num(clamp(0.5 * s, -220, 220)) + 'px,0)', 1); }
      else stageState(it, e, x, s, pass);
    }
  }

  /* ---------- 4. One frame per scroll, only for the stages near the viewport ---------- */
  var ticking = false;
  function frame() {
    ticking = false;
    if (dirty) { dirty = false; measure(); }
    sy = win.pageYOffset || 0;
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i];
      if (g.live || g.flush) { g.flush = false; update(g); }
    }
  }
  function request() {
    if (ticking) return;
    ticking = true;
    win.requestAnimationFrame(frame);
  }
  function reset() {
    dirty = true;
    groups.forEach(function (g) {
      g.flush = true;
      g.items.forEach(function (it) { it.t = null; it.o = null; it.ty = 0; it.el.style.transform = ''; it.el.style.opacity = ''; it.el.classList.remove('is-live'); });
      if (g.live) live(g, true);
    });
    request();
  }

  build();
  if (hasIO && byBox) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var g = byBox.get(en.target);
        if (!g || g.live === en.isIntersecting) return;
        g.live = en.isIntersecting;
        g.flush = true;          /* one last write settles it in its end state when it leaves */
        live(g, g.live);
      });
      request();
    }, { rootMargin: '12% 0px 12% 0px' });
    groups.forEach(function (g) { watcher.observe(g.box); });
  } else {
    groups.forEach(function (g) { g.live = true; live(g, true); });
  }
  win.addEventListener('scroll', request, { passive: true });
  function relayout() { dirty = true; request(); }
  win.addEventListener('resize', relayout);
  win.addEventListener('load', relayout);
  if (win.ResizeObserver) new ResizeObserver(relayout).observe(doc.body);
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(relayout, function () {});
  if (reduceQuery) {
    var onReduce = function () { reduce = reduceQuery.matches; reset(); };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduce);
    else if (reduceQuery.addListener) reduceQuery.addListener(onReduce);
  }
  request();

  /* ---------- 5. Big numerals count up once, in 700 ms, without moving the layout ---------- */
  function countUp(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var decimals = parseInt(el.getAttribute('data-dec') || '0', 10) || 0;
    var finalText = el.textContent;
    if (!isFinite(end)) return;
    el.style.minWidth = Math.ceil(el.getBoundingClientRect().width) + 'px';
    var start = 0;
    var duration = 700;
    function tick(now) {
      if (!start) start = now;
      var p = Math.min(1, (now - start) / duration);
      el.textContent = p < 1 ? (end * easeOut(p)).toFixed(decimals) : finalText;
      if (p < 1) win.requestAnimationFrame(tick);
    }
    el.textContent = (0).toFixed(decimals);
    win.requestAnimationFrame(tick);
  }
  if (hasIO && !reduce) {
    var counter = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        counter.unobserve(en.target);
        countUp(en.target);
      });
    }, { threshold: 0.6 });
    each('[data-count]', function (el) { counter.observe(el); });
  }

  /* ---------- 6. Ambient loops (aurora, stars, travelling links, the hour ring) rest off screen ---------- */
  if (hasIO) {
    var ambient = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) en.target.removeAttribute('data-idle');
        else en.target.setAttribute('data-idle', '');
      });
    });
    each('[data-ambient]', function (el) { ambient.observe(el); });
  }

  /* ---------- 7. The hero window leans toward the pointer, 10 px at most; its glow leans away. Mouse only. ---------- */
  var float = doc.querySelector('[data-parallax]');
  var glow = doc.querySelector('[data-parallax-glow]');
  if (float && finePointer && !reduce) {
    var hero = float.closest ? (float.closest('section') || doc.body) : doc.body;
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    var lean = function () {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      if (Math.abs(tx - cx) < 0.05 && Math.abs(ty - cy) < 0.05) { cx = tx; cy = ty; raf = 0; }
      else raf = win.requestAnimationFrame(lean);
      float.style.transform = 'translate3d(' + num(cx) + 'px,' + num(cy) + 'px,0)';
      if (glow) glow.style.translate = num(-cx) + 'px ' + num(-cy) + 'px';
    };
    var kick = function () { if (!raf) raf = win.requestAnimationFrame(lean); };
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      var w = win.innerWidth || 1;
      var h = win.innerHeight || 1;
      tx = clamp((e.clientX / w - 0.5) * 20, -10, 10);
      ty = clamp((e.clientY / h - 0.5) * 14, -10, 10);
      kick();
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
  }

  /* ---------- 8. The magnetic call to action drifts toward the pointer, 6 px at most ---------- */
  if (finePointer && !reduce) {
    each('[data-magnet]', function (m) {
      var mx = 0, my = 0, px = 0, py = 0, mraf = 0;
      var step = function () {
        px += (mx - px) * 0.18;
        py += (my - py) * 0.18;
        if (Math.abs(mx - px) < 0.05 && Math.abs(my - py) < 0.05) { px = mx; py = my; mraf = 0; }
        else mraf = win.requestAnimationFrame(step);
        m.style.transform = 'translate3d(' + num(px) + 'px,' + num(py) + 'px,0)';
      };
      var go = function () { if (!mraf) mraf = win.requestAnimationFrame(step); };
      m.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var r = m.getBoundingClientRect();
        mx = clamp((e.clientX - (r.left + r.width / 2)) * 0.25, -6, 6);
        my = clamp((e.clientY - (r.top + r.height / 2)) * 0.35, -6, 6);
        go();
      });
      m.addEventListener('pointerleave', function () { mx = 0; my = 0; go(); });
    });
  }
})();

/* Fenrir site: the theme, the menu, the nav's glass, versions.json, screenshots for each mode, the FAQ filter, the
   download chooser and copy buttons. No libraries. File names, sizes, checksums, the release date, the notes and the
   download address come only from versions.json. No page prints a version number: templates that ask for one keep
   their plain fallback text. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var KEY = 'fenrir-theme';
  var mqLight = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function each(sel, fn, scope) { Array.prototype.forEach.call((scope || doc).querySelectorAll(sel), fn); }
  function remember(value) {
    try { if (value) localStorage.setItem(KEY, value); else localStorage.removeItem(KEY); } catch (e) { /* storage can be blocked */ }
  }
  function mode() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return mqLight && mqLight.matches ? 'light' : 'dark';
  }

  /* ---------- screenshots: the twin that suits the page, a named placeholder when a file is missing ---------- */
  function syncShots() {
    var t = root.getAttribute('data-theme');
    each('source[data-when]', function (s) {
      if (s.hasAttribute('data-missing')) return;
      var want = s.getAttribute('data-when');
      var media = (t === 'light' || t === 'dark') ? (t === want ? 'all' : 'not all') : '(prefers-color-scheme: ' + want + ')';
      if (s.getAttribute('media') !== media) s.setAttribute('media', media);
    });
  }
  function shotFailed(img) {
    var pic = img.parentNode;
    var source = pic && pic.tagName === 'PICTURE' ? pic.querySelector('source[data-when]') : null;
    var frame = img.closest ? img.closest('.frame') : null;
    if (source && /-light\./.test(img.currentSrc || '')) {
      source.setAttribute('media', 'not all');
      source.setAttribute('data-missing', '');
      if (frame) frame.classList.add('is-plain');
      return;
    }
    if (frame) frame.classList.add('is-empty');
  }
  each('.frame img', function (img) {
    img.addEventListener('error', function () { shotFailed(img); });
    if (img.complete && img.naturalWidth === 0 && (img.currentSrc || img.getAttribute('src'))) shotFailed(img);
  });

  /* ---------- theme ---------- */
  /* a light/dark switch changes the text at once, so the grounds snap with it instead of fading (site.css 1b) */
  function snap() {
    root.classList.add('theme-snap');
    requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.remove('theme-snap'); }); });
  }
  function onScheme() { snap(); syncTheme(); }
  var themeMeta = doc.querySelector('meta[name="theme-color"]');
  function syncTheme() {
    var m = mode();
    var next = m === 'light' ? 'dark' : 'light';
    each('[data-theme-toggle]', function (b) { b.setAttribute('aria-label', 'Switch to ' + next + ' theme'); });
    if (themeMeta) themeMeta.setAttribute('content', m === 'light' ? '#f4f7fb' : '#0b0f17');
    syncShots();
  }
  each('[data-theme-toggle]', function (b) {
    b.addEventListener('click', function () {
      var next = mode() === 'light' ? 'dark' : 'light';
      snap();
      root.setAttribute('data-theme', next);
      remember(next);
      syncTheme();
    });
  });
  if (mqLight) {
    if (mqLight.addEventListener) mqLight.addEventListener('change', onScheme);
    else if (mqLight.addListener) mqLight.addListener(onScheme);
  }
  if (window.MutationObserver) {
    new MutationObserver(syncTheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  syncTheme();

  /* ---------- menu (phones) ---------- */
  var nav = doc.querySelector('[data-nav]');
  var menuBtn = nav ? nav.querySelector('.nav__menu') : null;
  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
  }
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
    each('.nav__links a', function (a) { a.addEventListener('click', function () { setMenu(false); }); }, nav);
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
    });
    doc.addEventListener('click', function (e) {
      if (nav.classList.contains('is-open') && !nav.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- the nav turns to glass once the page has moved ---------- */
  var sentinel = doc.querySelector('.top-sentinel');
  if (nav && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) nav.removeAttribute('data-scrolled');
      else nav.setAttribute('data-scrolled', '');
    }).observe(sentinel);
  } else if (nav) {
    nav.setAttribute('data-scrolled', '');
  }

  /* ---------- the palette: the app's eight themes take turns every 3.14 s --------------------------------
     The turn comes from the clock, so every page (and the next one you open) shows the same palette. The hidden layer
     is painted with the new palette first; one frame later data-slot flips and the compositor crossfades (site.css 1b). */
  var PALETTES = ['fenrir', 'midnight', 'sakura', 'ember', 'yggdrasil', 'aurora', 'snow', 'graphite'];
  var STEP = 3140;
  var still = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var cycleTimer = 0;
  function paletteAt(t) { return PALETTES[Math.floor(t / STEP) % PALETTES.length]; }
  function cycle() {
    clearTimeout(cycleTimer);
    if (still && still.matches) {
      ['data-palette', 'data-pa', 'data-pb', 'data-slot'].forEach(function (a) { root.removeAttribute(a); });
      return;
    }
    if (doc.hidden) return;
    var want = paletteAt(Date.now());
    if (!root.hasAttribute('data-slot')) {
      root.setAttribute('data-pa', want); root.setAttribute('data-pb', want);
      root.setAttribute('data-slot', 'a'); root.setAttribute('data-palette', want);
    } else if (root.getAttribute('data-palette') !== want) {
      var next = root.getAttribute('data-slot') === 'a' ? 'b' : 'a';
      root.setAttribute('data-p' + next, want);
      requestAnimationFrame(function () { root.setAttribute('data-slot', next); root.setAttribute('data-palette', want); });
    }
    cycleTimer = setTimeout(cycle, STEP - (Date.now() % STEP) + 12);
  }
  doc.addEventListener('visibilitychange', cycle);
  if (still) {
    if (still.addEventListener) still.addEventListener('change', cycle);
    else if (still.addListener) still.addListener(cycle);
  }
  cycle();

  /* the marks below the fold fade only while they are on screen: an opacity fade the compositor cannot run (an
     off-screen mark, or one inside text that is still faded out) would tick the main thread every frame */
  if ('IntersectionObserver' in window) {
    var markSeen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-near', en.isIntersecting); });
    }, { rootMargin: '8% 0px 8% 0px' });
    each('.logo', function (m) { if (!m.closest('.nav')) markSeen.observe(m); });
  }

  function glide(el) {  // smooth on an explicit click, instant under reduced motion
    var behavior = still && still.matches ? 'auto' : 'smooth';
    if (el) el.scrollIntoView({ behavior: behavior, block: 'start' });
    else window.scrollTo({ top: 0, behavior: behavior });
  }

  /* ---------- the nav's pill glides to the link under the pointer or the keyboard and rests on this page's link ---------- */
  var links = nav ? nav.querySelector('.nav__links') : null;
  var pill = links ? links.querySelector('.nav__pill') : null;
  var wide = window.matchMedia ? window.matchMedia('(min-width: 860px)') : null;
  if (links && pill) {
    var here = links.querySelector('a[aria-current="page"]');
    var place = function (a, instant) {
      if (!a || (wide && !wide.matches)) { pill.classList.remove('is-on'); return; }
      var jump = instant || !pill.classList.contains('is-on');
      if (jump) pill.classList.add('no-glide');
      pill.style.setProperty('--x', a.offsetLeft + 'px');
      pill.style.setProperty('--w', a.offsetWidth + 'px');
      pill.classList.add('is-on');
      if (jump) { void pill.offsetWidth; pill.classList.remove('no-glide'); }
    };
    each('a', function (a, i) {
      a.style.setProperty('--i', i);  // the phone menu's stagger
      a.addEventListener('pointerenter', function () { place(a); });
      a.addEventListener('focus', function () { place(a); });
    }, links);
    links.addEventListener('pointerleave', function () { place(here); });
    links.addEventListener('focusout', function (e) { if (!links.contains(e.relatedTarget)) place(here); });
    var rest = function () { place(here, true); };
    window.addEventListener('resize', rest);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(rest);
    rest();
  }

  /* ---------- a nav link to the page you are on glides back to its top (or to its section); other pages open at their top ---------- */
  function bare(path) { return path.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/\/+$/, '') || '/'; }  // /faq, /faq.html, / and /index.html alike
  if (nav) {
    each('a[href]', function (a) {
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        var u;
        try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
        if (u.origin !== location.origin || bare(u.pathname) !== bare(location.pathname)) return;
        var target = u.hash.length > 1 ? doc.getElementById(decodeURIComponent(u.hash.slice(1))) : null;
        e.preventDefault();
        setMenu(false);
        if (target) {
          glide(target);
          if (location.hash !== u.hash) history.pushState(null, '', u.hash);
          if (e.detail === 0) {  // from the keyboard: the next Tab continues from the section
            if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }
        } else {
          glide(null);
          if (location.hash) history.replaceState(null, '', location.pathname + location.search);
        }
      });
    }, nav);
  }

  /* ---------- back to the top: bottom right, once the page has moved; the ring shows how far you have read ---------- */
  var up = doc.createElement('button');
  up.type = 'button';
  up.className = 'totop';
  up.setAttribute('aria-label', 'Back to the top');
  up.innerHTML = '<svg class="totop__ring" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle class="totop__halo" cx="24" cy="24" r="22.25" pathLength="100"/><circle class="totop__bar" cx="24" cy="24" r="22.25" pathLength="100"/></svg>'
    + '<svg class="i totop__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 18.5V6M6.5 11.5L12 6l5.5 5.5"/></svg>';
  doc.body.appendChild(up);
  /* liquid glass: in Chromium the backdrop bends at the rim through a displacement map drawn once on a canvas.
     Red and green hold how far each point looks inward; the centre stays still and the pull grows toward the edge. */
  var brands = navigator.userAgentData && navigator.userAgentData.brands;
  if (brands && brands.some(function (b) { return /Chromium/.test(b.brand); })) {
    try {
      var size = 96, cv = doc.createElement('canvas');
      cv.width = cv.height = size;
      var cx = cv.getContext('2d'), img = cx.createImageData(size, size), px = img.data;
      for (var j = 0; j < size; j++) {
        for (var i = 0; i < size; i++) {
          var nx = (i + 0.5) / size * 2 - 1, ny = (j + 0.5) / size * 2 - 1, r = Math.sqrt(nx * nx + ny * ny), k = (j * size + i) * 4;
          var pull = r <= 1 && r > 0.5 ? Math.pow((r - 0.5) / 0.5, 2) : 0;
          px[k] = Math.round(127.5 - 127.5 * (r ? nx / r : 0) * pull);
          px[k + 1] = Math.round(127.5 - 127.5 * (r ? ny / r : 0) * pull);
          px[k + 2] = 128; px[k + 3] = 255;
        }
      }
      cx.putImageData(img, 0, 0);
      var holder = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      holder.setAttribute('class', 'sprite');
      holder.setAttribute('aria-hidden', 'true');
      holder.innerHTML = '<filter id="lg-lens" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">'
        + '<feImage href="' + cv.toDataURL() + '" x="0" y="0" width="' + (up.offsetWidth || 40) + '" height="' + (up.offsetWidth || 40) + '" preserveAspectRatio="none" result="map"/>'
        + '<feDisplacementMap in="SourceGraphic" in2="map" scale="13" xChannelSelector="R" yChannelSelector="G"/></filter>';
      doc.body.appendChild(holder);
      up.classList.add('lg-lens');
    } catch (err) { /* a plain glass button then */ }
  }
  var upQueued = false, upMax = 1, upShow = 640;
  function upMeasure() {  // the page's height changes only with layout, so it is read then and not on every frame
    upMax = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
    upShow = Math.min(640, window.innerHeight * 0.75);
  }
  function upDraw() {
    upQueued = false;
    var y = window.pageYOffset || 0;
    var max = upMax;
    up.style.setProperty('--p', Math.min(1, y / max).toFixed(4));
    up.classList.toggle('is-on', y > upShow);
  }
  function upQueue() { if (!upQueued) { upQueued = true; requestAnimationFrame(upDraw); } }
  window.addEventListener('scroll', upQueue, { passive: true });
  window.addEventListener('resize', function () { upMeasure(); upQueue(); });
  if (window.ResizeObserver) new ResizeObserver(function () { upMeasure(); upQueue(); }).observe(doc.body);
  upMeasure();
  upDraw();
  up.addEventListener('click', function () {
    glide(null);
    var brand = nav ? nav.querySelector('.nav__brand') : null;
    if (brand && brand.focus) brand.focus({ preventScroll: true });
  });

  /* ---------- versions.json ---------- */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o != null && o[k] != null ? o[k] : undefined; }, obj);
  }
  function megabytes(bytes) {
    var mb = bytes / 1e6;
    return (mb >= 100 ? Math.round(mb) : Math.round(mb * 10) / 10) + ' MB';
  }
  function longDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ' ' + m[1] : '';
  }
  function value(v, path) {
    if (/(^|\.)version$/.test(path)) return '';
    if (path === 'released') return longDate(v.released);
    if (/\.size$/.test(path)) { var n = get(v, path); return n > 0 ? megabytes(n) : ''; }
    var x = get(v, path);
    return x == null ? '' : String(x);
  }
  function disable(a) {
    a.removeAttribute('href');
    a.setAttribute('aria-disabled', 'true');
    a.setAttribute('role', 'link');
  }
  function fill(v) {
    var published = typeof v.releaseBase === 'string' && v.releaseBase !== '' && v.releaseBase.indexOf('OWNER') === -1;
    root.setAttribute('data-published', published ? 'yes' : 'no');
    each('[data-vt]', function (el) {
      var ok = true;
      var text = el.getAttribute('data-vt').replace(/\{([\w.]+)\}/g, function (all, path) {
        var x = value(v, path);
        if (!x) ok = false;
        return x;
      });
      if (ok) el.textContent = text;
    });
    each('[data-v-href]', function (a) {
      var file = get(v, a.getAttribute('data-v-href') + '.file');
      if (published && file) {
        a.setAttribute('href', v.releaseBase + file);
        a.removeAttribute('aria-disabled');
        a.removeAttribute('role');
      } else {
        disable(a);
      }
    });
    each('[data-v-page]', function (a) {
      if (published && v.releasesPage) a.setAttribute('href', v.releasesPage);
      else a.hidden = true;
    });
    each('[data-v-sha]', function (el) {
      var sha = get(v, el.getAttribute('data-v-sha') + '.sha256');
      if (sha) el.textContent = sha;
    });
    each('[data-v-row]', function (el) {
      var key = el.getAttribute('data-v-row');
      el.hidden = !(get(v, key + '.size') > 0 && get(v, key + '.sha256'));
    });
    each('[data-v-notes]', function (list) {
      if (!Array.isArray(v.notes) || !v.notes.length) return;
      list.textContent = '';
      v.notes.forEach(function (note) {
        var li = doc.createElement('li');
        li.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>';
        var span = doc.createElement('span');
        span.textContent = String(note);
        li.appendChild(span);
        list.appendChild(li);
      });
    });
    each('[data-if-published]', function (el) { el.hidden = !published; });
    each('[data-if-unpublished]', function (el) { el.hidden = published; });
  }
  function unreadable() {
    root.setAttribute('data-published', 'unknown');
    each('[data-v-href]', disable);
    each('[data-v-page]', function (a) { a.hidden = true; });
    each('[data-v-fail]', function (el) { el.hidden = false; });
  }
  if (doc.querySelector('[data-vt], [data-v-href], [data-v-sha], [data-v-row], [data-v-notes]')) {
    if (window.fetch && location.protocol !== 'file:') {
      fetch('versions.json', { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw new Error('versions.json answered ' + r.status); return r.json(); })
        .then(fill)
        .catch(unreadable);
    } else {
      unreadable();
    }
  }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[aria-disabled="true"]') : null;
    if (a) e.preventDefault();
  });

  /* ---------- copy buttons ---------- */
  function selectText(el) {
    try {
      var range = doc.createRange();
      range.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { /* nothing to select */ }
  }
  function flash(btn, text) {
    var label = btn.querySelector('[data-label]') || btn;
    if (!label.hasAttribute('data-was')) label.setAttribute('data-was', label.textContent);
    label.textContent = text;
    clearTimeout(btn.fenrirTimer);
    btn.fenrirTimer = setTimeout(function () { label.textContent = label.getAttribute('data-was'); }, 1800);
  }
  doc.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-copy]') : null;
    if (!btn) return;
    var target = doc.querySelector(btn.getAttribute('data-copy'));
    var text = target ? (target.textContent || '').trim() : '';
    if (!text) return;
    var fallback = function () { selectText(target); flash(btn, 'Press Ctrl+C'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { flash(btn, 'Copied'); }, fallback);
    } else {
      fallback();
    }
  });

  /* ---------- download chooser ---------- */
  function choose(which, jump) {
    each('[data-choose]', function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-choose') === which)); });
    each('[data-card]', function (c) { c.classList.toggle('is-chosen', c.getAttribute('data-card') === which); });
    each('[data-for]', function (el) { el.hidden = el.getAttribute('data-for') !== which; });
    var card = doc.getElementById(which);
    if (jump && card) {
      var r = card.getBoundingClientRect();
      if (r.top < 80 || r.top > (window.innerHeight || 800) * 0.6) card.scrollIntoView({ block: 'start' });
    }
  }
  each('[data-choose]', function (b) {
    b.addEventListener('click', function () { choose(b.getAttribute('data-choose'), true); });
  });
  if (doc.querySelector('[data-choose]') && /^#(fenrir|connect)$/.test(location.hash)) choose(location.hash.slice(1), false);

  /* ---------- FAQ ---------- */
  var field = doc.getElementById('faq-q');
  if (field) {
    var items = Array.prototype.slice.call(doc.querySelectorAll('.qa'));
    var groups = Array.prototype.slice.call(doc.querySelectorAll('.faq__group'));
    var count = doc.getElementById('faq-count');
    var empty = doc.getElementById('faq-empty');
    var filter = function () {
      var term = field.value.trim().toLowerCase();
      var shown = 0;
      items.forEach(function (d) {
        var hit = !term || d.textContent.toLowerCase().indexOf(term) !== -1;
        d.hidden = !hit;
        if (hit) shown++;
      });
      groups.forEach(function (g) { g.hidden = !g.querySelector('.qa:not([hidden])'); });
      if (count) count.textContent = term ? shown + ' of ' + items.length + ' questions' : items.length + ' questions';
      if (empty) empty.hidden = shown > 0;
    };
    field.addEventListener('input', filter);
    filter();
  }
  function openFromHash() {
    var id = location.hash.slice(1);
    if (!/^[A-Za-z0-9._~-]+$/.test(id)) return;
    var d = doc.getElementById(id);
    if (d && d.tagName === 'DETAILS') d.open = true;
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();

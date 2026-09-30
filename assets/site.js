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
      root.setAttribute('data-theme', next);
      remember(next);
      syncTheme();
    });
  });
  if (mqLight) {
    if (mqLight.addEventListener) mqLight.addEventListener('change', syncTheme);
    else if (mqLight.addListener) mqLight.addListener(syncTheme);
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

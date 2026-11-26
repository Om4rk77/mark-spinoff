(function () {
  'use strict';

  var LIB = window.LIBRARY || [];
  var $app = document.getElementById('app');
  var $eye = document.getElementById('eye');
  var EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
  var DUR = 460;

  /* ---------- armazenamento (preferências e progresso) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  var S = Object.assign({ theme: 'auto', eye: false, eyeLevel: 45, width: 'large', gap: true }, store.get('mk-settings', {}));
  var progress = store.get('mk-progress', {});

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function enc(s) { return encodeURI(s); }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }
  function workOf(id) { return LIB.filter(function (w) { return w.id === id; })[0]; }
  function chapOf(w, cid) { return w.chapters.filter(function (c) { return c.id === cid; })[0]; }
  function coverOf(w) { return w.cover || (w.chapters[0] && w.chapters[0].cover) || ''; }
  function allPages(c) { return (c.cover ? [c.cover] : []).concat(c.pages || []); }

  var ICON_BACK = '<svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ICON_CHEV = '<svg class="chev" width="8" height="14" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 7 7l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- ajustes (tema, filtro, largura) ---------- */
  function applySettings() {
    var root = document.documentElement;
    if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', S.theme);
    root.setAttribute('data-width', S.width);
    root.setAttribute('data-gap', S.gap ? 'on' : 'off');
    $eye.style.opacity = S.eye ? (clamp(S.eyeLevel, 0, 100) / 100 * 0.6).toFixed(3) : 0;
    var dark = S.theme === 'dark' || (S.theme === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#f2f2f7');
    store.set('mk-settings', S);
  }
  if (window.matchMedia) {
    try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySettings); } catch (e) {}
  }

  /* ---------- folha de ajustes ---------- */
  var $sheet = document.getElementById('sheet');
  var $backdrop = document.getElementById('backdrop');

  function syncSheet() {
    ['theme', 'width'].forEach(function (key) {
      var seg = $sheet.querySelector('[data-seg="' + key + '"]');
      var btns = [].slice.call(seg.querySelectorAll('button'));
      var i = btns.findIndex(function (b) { return b.dataset.val === S[key]; });
      seg.style.setProperty('--i', Math.max(0, i));
    });
    $sheet.querySelector('[data-sw="eye"]').checked = !!S.eye;
    $sheet.querySelector('[data-sw="gap"]').checked = !!S.gap;
    var r = $sheet.querySelector('[data-range="eyeLevel"]');
    r.value = S.eyeLevel;
    r.closest('.s-row').classList.toggle('off', !S.eye);
  }
  function openSheet() { syncSheet(); $backdrop.classList.add('open'); $sheet.classList.add('open'); }
  function closeSheet() { $backdrop.classList.remove('open'); $sheet.classList.remove('open'); }

  $sheet.addEventListener('click', function (e) {
    var b = e.target.closest('.seg button');
    if (!b) return;
    S[b.parentNode.dataset.seg] = b.dataset.val;
    applySettings(); syncSheet();
  });
  $sheet.querySelector('[data-sw="eye"]').addEventListener('change', function (e) { S.eye = e.target.checked; applySettings(); syncSheet(); });
  $sheet.querySelector('[data-sw="gap"]').addEventListener('change', function (e) { S.gap = e.target.checked; applySettings(); });
  $sheet.querySelector('[data-range="eyeLevel"]').addEventListener('input', function (e) { S.eyeLevel = +e.target.value; applySettings(); });
  document.getElementById('sheet-done').addEventListener('click', closeSheet);
  $backdrop.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  // arrastar a folha para baixo para fechar
  (function () {
    var zone = document.getElementById('grabber'), y0 = null;
    zone.addEventListener('pointerdown', function (e) { y0 = e.clientY; $sheet.style.transition = 'none'; zone.setPointerCapture(e.pointerId); });
    zone.addEventListener('pointermove', function (e) {
      if (y0 == null) return;
      $sheet.style.transform = 'translateY(' + Math.max(0, e.clientY - y0) + 'px)';
    });
    function end(e) {
      if (y0 == null) return;
      var dy = e.clientY - y0; y0 = null;
      $sheet.style.transition = ''; $sheet.style.transform = '';
      if (dy > 90) closeSheet();
    }
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  })();

  /* ---------- barra de navegação ---------- */
  function nav(opts) {
    return '<header class="nav' + (opts.scrolled ? ' scrolled' : '') + '">' +
      '<div class="nav-left">' + (opts.back ? '<a class="nav-btn" href="' + opts.back.href + '" data-back="' + opts.back.href + '">' + ICON_BACK + '<span>' + esc(opts.back.label) + '</span></a>' : '') + '</div>' +
      '<div class="nav-title">' + esc(opts.title || '') + '</div>' +
      '<div class="nav-right"><button class="nav-btn nav-aa" data-settings aria-label="Ajustes de leitura">Aa</button></div>' +
      (opts.progress ? '<div class="nav-progress"></div>' : '') +
    '</header>';
  }
  function coverHTML(src, label) {
    return '<div class="cover"><div class="ph">' + esc(label || '') + '</div>' +
      (src ? '<img src="' + enc(src) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>';
  }
  function mkScreen(cls) {
    var el = document.createElement('div');
    el.className = 'screen ' + cls;
    return el;
  }
  // título que aparece na barra depois de rolar
  function collapseOnScroll(el, threshold) {
    var n = el.querySelector('.nav'), t = el.querySelector('.nav-title');
    var tk = false;
    function upd() {
      tk = false;
      var y = el.scrollTop;
      n.classList.toggle('scrolled', y > 4);
      t.style.opacity = clamp((y - threshold) / 24, 0, 1);
    }
    el.addEventListener('scroll', function () { if (!tk) { tk = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---------- telas ---------- */
  function buildLibrary() {
    var el = mkScreen('library');
    el.innerHTML = nav({ title: 'Biblioteca' }) +
      '<h1 class="large-title">Biblioteca</h1>' +
      '<div class="grid">' + LIB.map(function (w) {
        return '<a class="card" href="#/obra/' + esc(w.id) + '">' + coverHTML(coverOf(w), w.title) +
          '<h3>' + esc(w.title) + '</h3><p>' + esc(w.type || '') + '</p></a>';
      }).join('') + '</div>' +
      '<p class="foot-note">Novas obras e capítulos em breve.</p>';
    return { el: el, mount: function () { collapseOnScroll(el, 34); } };
  }

  function buildSeries(r) {
    var w = workOf(r.work);
    if (!w) return null;
    var el = mkScreen('series');
    var last = progress[w.id];
    var lastChap = last && chapOf(w, last.chap);
    var first = w.chapters[0];
    var cta = '';
    if (first) {
      cta = lastChap
        ? '<a class="btn-primary" href="#/obra/' + esc(w.id) + '/cap/' + esc(lastChap.id) + '">Continuar · Capítulo ' + esc(lastChap.number) + '</a>'
        : '<a class="btn-primary" href="#/obra/' + esc(w.id) + '/cap/' + esc(first.id) + '">Começar a ler</a>';
    }
    el.innerHTML = nav({ back: { href: '#/', label: 'Biblioteca' }, title: w.title }) +
      '<section class="hero">' + coverHTML(coverOf(w), w.title) +
        '<div class="hero-info"><div class="tag">' + esc(w.type || '') + '</div><h1>' + esc(w.title) + '</h1><div class="author">' + esc(w.author || '') + '</div></div>' +
      '</section>' +
      (w.description ? '<p class="synopsis">' + esc(w.description) + '</p>' : '') +
      '<div class="cta-wrap">' + cta + '</div>' +
      '<div class="section-h">' + w.chapters.length + (w.chapters.length === 1 ? ' capítulo' : ' capítulos') + '</div>' +
      '<div class="group">' + w.chapters.map(function (c) {
        var n = (c.pages || []).length;
        var done = progress[w.id + '/' + c.id] != null;
        return '<a class="row" href="#/obra/' + esc(w.id) + '/cap/' + esc(c.id) + '">' +
          '<div class="thumb">' + (c.cover ? '<img src="' + enc(c.cover) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
          '<div class="meta"><b>Capítulo ' + esc(c.number) + '</b><span>' + esc(c.title) + (n ? ' · ' + n + ' págs.' : '') + '</span></div>' +
          (done ? '<span class="badge">Lido</span>' : '') + ICON_CHEV + '</a>';
      }).join('') + '</div>';
    return { el: el, mount: function () { collapseOnScroll(el, 150); } };
  }

  function buildReader(r) {
    var w = workOf(r.work), c = w && chapOf(w, r.chap);
    if (!c) return null;
    var idx = w.chapters.indexOf(c);
    var prev = w.chapters[idx - 1], next = w.chapters[idx + 1];
    var imgs = allPages(c), total = imgs.length;
    var el = mkScreen('reader');
    var base = '#/obra/' + w.id;

    var body = total
      ? '<main class="pages">' + imgs.map(function (src, i) {
          return '<figure class="pg" data-i="' + i + '"><img src="' + enc(src) + '" alt="' + (i === 0 && c.cover ? 'Capa' : 'Página ' + (c.cover ? i : i + 1)) + '" decoding="async" ' +
            (i < 3 ? '' : 'loading="lazy" ') + 'style="aspect-ratio:2/3"></figure>';
        }).join('') + '</main>'
      : '<main class="pages"><div class="pg"><div class="pg-empty">As páginas deste capítulo ainda não foram adicionadas.</div></div></main>';

    el.innerHTML = nav({ back: { href: base, label: w.title.length > 18 ? 'Obra' : w.title }, title: 'Cap. ' + c.number + ' · ' + c.title, progress: true }) +
      body +
      '<section class="end-card"><h2>Fim do Capítulo ' + esc(c.number) + '</h2>' +
        (next ? '<p>Próximo: ' + esc(next.title) + '</p><a class="btn-primary" data-replace href="' + base + '/cap/' + esc(next.id) + '">Próximo capítulo</a>'
              : '<p>Por enquanto é só. Novos capítulos em breve.</p>') +
        (prev ? '<a class="btn-secondary" data-replace href="' + base + '/cap/' + esc(prev.id) + '">Capítulo anterior</a>' : '') +
        '<a class="btn-secondary" href="' + base + '" data-back="' + base + '">Voltar à obra</a>' +
      '</section>' +
      '<div class="page-pill"></div>';

    function mount() {
      var navEl = el.querySelector('.nav'), bar = el.querySelector('.nav-progress'), pill = el.querySelector('.page-pill');
      var figs = [].slice.call(el.querySelectorAll('figure.pg[data-i]'));
      figs.forEach(function (f) {
        var im = f.querySelector('img');
        function ok() { im.style.aspectRatio = 'auto'; im.classList.add('ok'); }
        if (im.complete && im.naturalWidth) ok(); else { im.addEventListener('load', ok); im.addEventListener('error', function () { im.classList.add('ok'); }); }
      });

      var lastY = 0, saveT = null, tops = [], ticking = false, hidden = false, lastP = -1;
      function measure() { tops = figs.map(function (f) { return f.offsetTop; }); }
      measure();
      figs.forEach(function (f) { f.querySelector('img').addEventListener('load', measure); });
      window.addEventListener('resize', measure);
      function currentPage(y) {
        var mid = y + el.clientHeight * 0.4, lo = 0, hi = tops.length - 1, cur = 0;
        while (lo <= hi) { var m = (lo + hi) >> 1; if (tops[m] <= mid) { cur = m; lo = m + 1; } else hi = m - 1; }
        return cur;
      }
      function label(i) { return c.cover ? (i === 0 ? 'Capa' : 'Pág. ' + i + ' / ' + (total - 1)) : 'Pág. ' + (i + 1) + ' / ' + total; }
      function setHidden(h) { if (h !== hidden) { hidden = h; el.classList.toggle('hide-ui', h); } }
      function frame() {
        ticking = false;
        var y = el.scrollTop, max = el.scrollHeight - el.clientHeight;
        bar.style.setProperty('--p', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : 0);
        if (total) {
          var p = currentPage(y);
          if (p !== lastP) {
            lastP = p; pill.textContent = label(p);
            clearTimeout(saveT);
            saveT = setTimeout(function () {
              progress[w.id] = { chap: c.id };
              progress[w.id + '/' + c.id] = p;
              store.set('mk-progress', progress);
            }, 400);
          }
        }
        if (y > lastY + 8 && y > 140) setHidden(true);
        else if (y < lastY - 8 || y < 60) setHidden(false);
        lastY = y;
      }
      function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
      el.addEventListener('scroll', onScroll, { passive: true });
      el.addEventListener('click', function (e) {
        if (e.target.closest('a,button,.nav')) return;
        setHidden(!hidden);
      });

      // volta para onde parou
      var saved = progress[w.id + '/' + c.id];
      if (saved && saved > 0 && figs[saved]) requestAnimationFrame(function () { measure(); el.scrollTop = tops[saved]; lastY = el.scrollTop; frame(); });
      else frame();
    }
    return { el: el, mount: mount };
  }

  /* ---------- roteador com transições estilo iOS ---------- */
  var stack = [];

  function parse() {
    var h = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    if (h[0] === 'obra' && h[1]) {
      if (h[2] === 'cap' && h[3]) return { name: 'reader', work: h[1], chap: h[3], depth: 2 };
      return { name: 'series', work: h[1], depth: 1 };
    }
    return { name: 'library', depth: 0 };
  }
  function keyOf(r) { return r.name + ':' + (r.work || '') + ':' + (r.chap || ''); }
  function build(r) {
    var v = r.name === 'reader' ? buildReader(r) : r.name === 'series' ? buildSeries(r) : buildLibrary();
    if (v) { v.r = r; v.key = keyOf(r); if (r.depth > 0) v.el.classList.add('raised'); }
    return v;
  }
  function setTitle(r) {
    var w = r.work && workOf(r.work), c = w && r.chap && chapOf(w, r.chap);
    document.title = c ? w.title + ' · Cap. ' + c.number : w ? w.title : 'Biblioteca';
  }
  function run(el, frames, opts) {
    el.classList.add('anim');
    return el.animate(frames, Object.assign({ duration: DUR, easing: EASE, fill: 'both' }, opts)).finished.then(function () { el.classList.remove('anim'); });
  }
  function dimOf(el) { var d = el.querySelector(':scope > .dim'); if (!d) { d = document.createElement('div'); d.className = 'dim'; el.appendChild(d); } return d; }
  function slideUnder(el, from, to) {
    var d = dimOf(el);
    d.style.top = el.scrollTop + 'px'; d.style.height = el.clientHeight + 'px'; d.style.bottom = 'auto';
    d.animate([{ opacity: from * .22 }, { opacity: to * .22 }], { duration: DUR, easing: EASE, fill: 'both' });
    return run(el, [{ transform: 'translate3d(' + (-28 * from) + '%,0,0)' }, { transform: 'translate3d(' + (-28 * to) + '%,0,0)' }]);
  }

  function go() {
    var r = parse(), top = stack[stack.length - 1];
    if (top && top.key === keyOf(r)) return;
    var view = build(r);
    if (!view) { location.replace('#/'); return; }
    setTitle(r);

    if (!top) {
      stack.push(view); $app.appendChild(view.el); view.mount();
      return;
    }

    if (r.depth > top.r.depth) {                       // avançar (push)
      stack.push(view); $app.appendChild(view.el); view.mount();
      slideUnder(top.el, 0, 1);
      run(view.el, [{ transform: 'translate3d(100%,0,0)' }, { transform: 'translate3d(0,0,0)' }]).then(function () {
        view.el.getAnimations().forEach(function (a) { a.cancel(); });
        top.el.getAnimations().forEach(function (a) { a.cancel(); });
        top.el.style.visibility = 'hidden';
      });
    } else if (r.depth < top.r.depth) {                // voltar (pop)
      var under = null;
      for (var i = stack.length - 2; i >= 0; i--) { if (stack[i].key === view.key) { under = stack[i]; break; } }
      if (under) { view = under; }
      else { $app.insertBefore(view.el, top.el); view.mount(); }
      var keep = stack.filter(function (s) { return s.r.depth < r.depth; });
      if (keep.indexOf(view) === -1) keep.push(view);
      stack = keep.concat(top);                         // top sai logo depois da animação
      view.el.style.visibility = '';
      slideUnder(view.el, 1, 0);
      run(top.el, [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(100%,0,0)' }]).then(function () {
        top.el.remove();
        stack = stack.filter(function (s) { return s !== top; });
        view.el.getAnimations().forEach(function (a) { a.cancel(); });
        var d = view.el.querySelector(':scope > .dim'); if (d) d.getAnimations().forEach(function (a) { a.cancel(); });
      });
    } else {                                            // troca no mesmo nível (próximo capítulo)
      stack[stack.length - 1] = view;
      $app.appendChild(view.el); view.mount();
      run(view.el, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }).then(function () {
        view.el.getAnimations().forEach(function (a) { a.cancel(); });
        top.el.remove();
      });
    }
  }

  /* ---------- eventos globais ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-settings]')) { openSheet(); return; }
    var back = t.closest('[data-back]');
    if (back) {
      e.preventDefault();
      location.hash = back.getAttribute('data-back');
      return;
    }
    var rep = t.closest('[data-replace]');
    if (rep) { e.preventDefault(); location.replace(rep.getAttribute('href')); }
  });
  window.addEventListener('hashchange', go);

  applySettings();
  go();
})();

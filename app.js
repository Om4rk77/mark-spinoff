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
  var S = Object.assign({ theme: 'dark', eye: false, eyeLevel: 45, width: 'large' }, store.get('mk-settings', {}));
  if (S.theme !== 'light') S.theme = 'dark';
  S.gap = true;
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
  var ICON_ADJ = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h9M18 6h3M3 12h3M12 12h9M3 18h11M20 18h1"/><circle cx="15" cy="6" r="2.4"/><circle cx="9" cy="12" r="2.4"/><circle cx="17" cy="18" r="2.4"/></svg>';
  var ICON_CHEV = '<svg class="chev" width="8" height="14" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 7 7l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  /* ---------- ajustes (tema, filtro, largura) ---------- */
  function applySettings() {
    var root = document.documentElement;
    if (S.theme === 'auto') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', S.theme);
    root.setAttribute('data-width', S.width);
    root.setAttribute('data-gap', S.gap ? 'on' : 'off');
    $eye.classList.toggle('on', !!S.eye);
    $eye.style.opacity = S.eye ? (0.15 + clamp(S.eyeLevel, 0, 100) / 100 * 0.6).toFixed(3) : 0;
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
  ($sheet.querySelector('[data-sw="eye"]')||document.createElement('input')).addEventListener('change', function (e) { S.eye = e.target.checked; applySettings(); syncSheet(); });
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
      '<div class="nav-right"><button class="nav-btn nav-aa" data-settings aria-label="Ajustes de leitura">' + ICON_ADJ + '</button></div>' +
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
      '<section class="hero"><button class="zoomable" data-zoom="' + esc(coverOf(w)) + '" aria-label="Ver capa">' + coverHTML(coverOf(w), w.title) + '</button>' +
        '<div class="hero-info"><div class="tag">' + esc(w.type || '') + '</div><h1>' + esc(w.title) + '</h1><div class="author">' + esc(w.author || '') + '</div></div>' +
      '</section>' +
      (w.description ? '<p class="synopsis">' + esc(w.description) + '</p>' : '') +
      '<div class="cta-wrap">' + cta + '</div>' +
      '<div class="section-h">' + w.chapters.length + (w.chapters.length === 1 ? ' capítulo' : ' capítulos') + '</div>' +
      '<div class="group">' + w.chapters.map(function (c) {
        var n = (c.pages || []).length;
        var done = !!progress[w.id + '/' + c.id + '/lido'];
        return '<a class="row" href="#/obra/' + esc(w.id) + '/cap/' + esc(c.id) + '">' +
          '<div class="thumb">' + (c.cover ? '<img src="' + enc(c.cover) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>' +
          '<div class="meta"><b>Capítulo ' + esc(c.number) + '</b><span>' + esc(c.title) + (n ? ' · ' + n + ' págs.' : '') + '</span></div>' +
          '<span class="badge' + (done ? ' lido' : '') + '"><i></i>' + (done ? 'Lido' : 'Não lido') + '</span>' + ICON_CHEV + '</a>';
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
              : '') +
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
              if (p >= total - 1) progress[w.id + '/' + c.id + '/lido'] = 1;
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
  var current = null, busy = null;

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
    var v = null;
    try { v = r.name === 'reader' ? buildReader(r) : r.name === 'series' ? buildSeries(r) : buildLibrary(); } catch (e) { console.error(e); }
    if (v) { v.r = r; v.key = keyOf(r); }
    return v;
  }
  function setTitle(r) {
    var w = r.work && workOf(r.work), c = w && r.chap && chapOf(w, r.chap);
    document.title = c ? w.title + ' · Cap. ' + c.number : w ? w.title : 'Biblioteca';
  }
  function mountSafe(v) { try { v.mount(); } catch (e) { console.error(e); } }

  // termina na hora qualquer transição em andamento
  function finishBusy() { if (busy) { var f = busy; busy = null; f(); } }
  // garante que só a tela atual fique no app
  function cleanup() {
    [].slice.call($app.children).forEach(function (n) { if (!current || n !== current.el) n.remove(); });
    if (current) { current.el.getAnimations().forEach(function (a) { a.cancel(); }); current.el.style.transform = ''; current.el.classList.remove('anim'); }
  }

  function animate(el, from, to, dur) {
    el.classList.add('anim');
    return el.animate([{ transform: from }, { transform: to }], { duration: dur || DUR, easing: EASE, fill: 'forwards' });
  }
  function shade(el, a, b) {
    var d = document.createElement('div');
    d.className = 'dim';
    d.style.cssText = 'position:fixed;inset:0;z-index:5;background:#000;pointer-events:none';
    el.parentNode.insertBefore(d, el.nextSibling);
    d.animate([{ opacity: a }, { opacity: b }], { duration: DUR, easing: EASE, fill: 'forwards' });
    return d;
  }

  function go() {
    finishBusy();
    var r = parse();
    if (current && current.key === keyOf(r)) return;
    var view = build(r);
    if (!view) { location.replace('#/'); return; }
    setTitle(r);
    var prev = current;
    current = view;

    if (!prev) { $app.appendChild(view.el); mountSafe(view); return; }

    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var done = function () { cleanup(); };

    if (reduce || r.depth === prev.r.depth) {             // mesma profundidade: troca suave
      $app.appendChild(view.el); mountSafe(view);
      var f = view.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 260, easing: 'ease-out' });
      busy = done; f.finished.then(function () { if (busy === done) finishBusy(); }, function () {});
      return;
    }

    var forward = r.depth > prev.r.depth;
    var a1, a2, sh;
    if (forward) {                                        // avançar (entra pela direita)
      view.el.style.zIndex = 10; view.el.classList.add('raised');
      $app.appendChild(view.el); mountSafe(view);
      sh = shade(prev.el, 0, .25);
      a1 = animate(prev.el, 'translate3d(0,0,0)', 'translate3d(-28%,0,0)');
      a2 = animate(view.el, 'translate3d(100%,0,0)', 'translate3d(0,0,0)');
    } else {                                              // voltar (sai pela direita)
      prev.el.style.zIndex = 10; prev.el.classList.add('raised');
      $app.insertBefore(view.el, prev.el); mountSafe(view);
      sh = shade(view.el, .25, 0);
      a1 = animate(view.el, 'translate3d(-28%,0,0)', 'translate3d(0,0,0)');
      a2 = animate(prev.el, 'translate3d(0,0,0)', 'translate3d(100%,0,0)');
    }
    done = function () { view.el.style.zIndex = ''; cleanup(); };
    busy = done;
    a2.finished.then(function () { if (busy === done) finishBusy(); }, function () {});
    setTimeout(function () { if (busy === done) finishBusy(); }, DUR + 300); // rede de segurança
  }

  /* ---------- eventos globais ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-settings]')) { openSheet(); return; }
    var z = t.closest('[data-zoom]');
    if (z) { openLB(z.getAttribute('data-zoom')); return; }
    var back = t.closest('[data-back]');
    if (back) {
      e.preventDefault();
      location.hash = back.getAttribute('data-back');
      return;
    }
    var rep = t.closest('[data-replace]');
    if (rep) { e.preventDefault(); location.replace(rep.getAttribute('href')); }
  });
  /* ---------- ver capa em tela cheia ---------- */
  var $lb = document.createElement('div');
  $lb.id = 'lightbox'; $lb.innerHTML = '<img alt="Capa">';
  document.body.appendChild($lb);
  var $lbImg = $lb.querySelector('img');
  function openLB(src) {
    $lbImg.src = enc(src);
    $lb.classList.add('open');
  }
  function closeLB() { $lb.classList.remove('open'); }
  $lb.addEventListener('click', closeLB);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLB(); });
  window.addEventListener('hashchange', closeLB);

  window.addEventListener('hashchange', go);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { current = null; $app.innerHTML = ''; go(); } });

  applySettings();
  go();
})();

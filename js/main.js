// すずき美容室 サイトの動き
(function () {
  var root = document.documentElement;
  var body = document.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 読み込み時の演出（写真がせり上がり、縦書きが一行ずつ現れる） ----
  function start() { requestAnimationFrame(function () { body.classList.add('loaded'); }); }
  if (document.fonts && document.fonts.ready) {
    // フォントの読み込みを最大0.8秒だけ待ってから始める
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 800); })]).then(start);
  } else { start(); }

  // ---- メニュー（スマホ） ----
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  }
  btn.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
  nav.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // ---- スクロール：ヘッダーの出し入れ、固定予約バー、パララックス ----
  var header = document.querySelector('.header');
  var fixbar = document.querySelector('.fixbar');
  var hero = document.querySelector('.hero');
  var para = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var lastY = window.scrollY, ticking = false;

  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 20);
    if (!body.classList.contains('menu-open')) {
      header.classList.toggle('hide', y > lastY && y > 400);
    }
    fixbar.classList.toggle('show', y > hero.offsetHeight * 0.6);
    lastY = y;

    if (!reduce) {
      var vh = window.innerHeight;
      para.forEach(function (el) {
        var r = el.parentElement.getBoundingClientRect();
        var center = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (center * parseFloat(el.dataset.parallax)).toFixed(1) + 'px,0)';
      });
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  // ---- スクロールで表示（近くの要素は少しずつ時間差で） ----
  var io = null;
  function observe(els) {
    // 同じ親の中で何番目かによって、少しずつ遅らせる
    els.forEach(function (el) {
      var sibs = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-reveal'); });
      var i = sibs.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 5) * 0.12 + 's');
    });
    if (!('IntersectionObserver' in window) || reduce) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            (en.target._reveal || [en.target]).forEach(function (t) { t.classList.add('is-in'); });
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    }
    els.forEach(function (el) {
      // 写真（アーチ）は切り抜きで隠れているので、外側の枠が画面に入ったかで判定する
      if (el.getAttribute('data-reveal') === 'arch') {
        var box = el.parentElement;
        (box._reveal = box._reveal || []).push(el);
        io.observe(box);
      } else {
        io.observe(el);
      }
    });
  }
  observe(Array.prototype.slice.call(document.querySelectorAll('[data-reveal]')));

  // ---- メニューのタブ切替（下線がスライド） ----
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var ink = document.querySelector('.tab-ink');
  function moveInk(tab) {
    ink.style.width = tab.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
  }
  function select(tab) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    moveInk(tab);
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (n) { n.focus(); select(n); }
    });
  });
  function inkToCurrent() {
    var cur = document.querySelector('[role="tab"][aria-selected="true"]');
    if (cur) moveInk(cur);
  }
  inkToCurrent();
  window.addEventListener('resize', inkToCurrent);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(inkToCurrent);

  // ---- 文字を安全に表示する ----
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- お知らせ（data/news.json） ----
  var newsEl = document.getElementById('news-list');
  fetch('data/news.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (items) {
      items.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      newsEl.innerHTML = items.slice(0, 6).map(function (n) {
        return '<li data-reveal><div class="news-meta"><time datetime="' + esc(n.date) + '">' + esc(n.date.replace(/-/g, '.')) + '</time>' +
          (n.tag ? '<span class="tag">' + esc(n.tag) + '</span>' : '') + '</div>' +
          '<h3>' + esc(n.title) + '</h3>' +
          (n.body ? '<p>' + esc(n.body) + '</p>' : '') + '</li>';
      }).join('');
      observe(Array.prototype.slice.call(newsEl.querySelectorAll('[data-reveal]')));
    })
    .catch(function () {
      newsEl.innerHTML = '<li><p>最新のお知らせは<a href="https://www.instagram.com/suzuki_localhairsalon/">Instagram</a>でもご覧いただけます。</p></li>';
    });

  // ---- Instagram 最新3件（Behold のフィードURLから取得） ----
  var insta = document.getElementById('instagram');
  var instaGrid = document.getElementById('insta-grid');
  var feedUrl = (insta.getAttribute('data-feed') || '').trim();
  var isLocalPreview = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

  function showInsta(posts) {
    var list = posts.filter(function (p) { return p && (p.mediaUrl || p.thumbnailUrl || p.sizes); }).slice(0, 3);
    if (!list.length) { insta.classList.add('is-empty'); return; }
    instaGrid.innerHTML = list.map(function (p) {
      var isVideo = p.mediaType === 'VIDEO';
      var s = p.sizes || {};
      var img = (s.medium && s.medium.mediaUrl) || (s.large && s.large.mediaUrl) ||
                (isVideo ? p.thumbnailUrl : p.mediaUrl) || p.thumbnailUrl || '';
      var alt = p.altText || p.prunedCaption || p.caption || 'Instagramの投稿写真';
      alt = String(alt).replace(/\s+/g, ' ').slice(0, 80);
      var d = p.timestamp ? new Date(p.timestamp) : null;
      var date = d && !isNaN(d) ? d.getFullYear() + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + ('0' + d.getDate()).slice(-2) : '';
      return '<li class="insta-item"><a href="' + esc(p.permalink || 'https://www.instagram.com/suzuki_localhairsalon/') + '" target="_blank" rel="noopener">' +
        '<div class="arch" data-reveal="arch"><img src="' + esc(img) + '" alt="' + esc(alt) + '" loading="lazy"></div>' +
        (date ? '<time datetime="' + esc(p.timestamp) + '">' + date + '</time>' : '') + '</a></li>';
    }).join('');
    observe(Array.prototype.slice.call(instaGrid.querySelectorAll('[data-reveal]')));
  }

  if (feedUrl) {
    fetch(feedUrl)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) { showInsta(Array.isArray(data) ? data : (data.posts || [])); })
      .catch(function () { insta.classList.add('is-empty'); }); // 取れないときはリンクだけ表示
  } else if (!isLocalPreview) {
    // フィードURLが未設定なら、写真枠は出さずにInstagramへのリンクだけ表示
    insta.classList.add('is-empty');
  }

  // ---- お客様の声（data/voices.json） ----
  var voiceEl = document.getElementById('voices');
  fetch('data/voices.json', { cache: 'no-cache' })
    .then(function (r) { return r.json(); })
    .then(function (items) {
      voiceEl.innerHTML = items.map(function (v) {
        return '<blockquote class="voice" data-reveal><p>' + esc(v.text) + '</p><cite>' + esc(v.name) + '</cite></blockquote>';
      }).join('');
      observe(Array.prototype.slice.call(voiceEl.querySelectorAll('[data-reveal]')));
    })
    .catch(function () { document.getElementById('voice').hidden = true; });
})();

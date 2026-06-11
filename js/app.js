/* ============================================================
   AURA CAFÉ — Customer Menu App
   States: categories → items → detail modal
   ============================================================ */
(function () {
  'use strict';

  /* ── State ── */
  let menu   = null;
  let lang   = localStorage.getItem('aura-lang') || 'en';
  let search = '';

  const t = {
    en: { search: 'Search…', featured: "Chef's Pick", soldout: 'Sold Out', video: 'Watch Video', noItems: 'No items found', back: 'Categories', about: 'About' },
    ar: { search: 'بحث…', featured: 'اختيار الشيف', soldout: 'نفد', video: 'شاهد الفيديو', noItems: 'لا توجد عناصر', back: 'التصنيفات', about: 'عن المطعم' },
  };

  /* ── DOM ── */
  const $  = id => document.getElementById(id);
  const qs = s  => document.querySelector(s);

  /* ══════════════════════════════════════════════════════
     LOAD MENU
  ══════════════════════════════════════════════════════ */
  async function loadMenu() {
    try {
      const res = await fetch('menu.json?_=' + Math.floor(Date.now() / 60000));
      if (!res.ok) throw new Error(res.status);
      menu = await res.json();
      applyBranding();
      renderCategories();
      renderFooter();
    } catch (e) {
      $('cat-grid').innerHTML = `<p style="color:#7A8FA6;text-align:center;padding:40px;grid-column:1/-1">Failed to load menu. Please refresh.</p>`;
    }
  }

  /* ══════════════════════════════════════════════════════
     LANGUAGE
  ══════════════════════════════════════════════════════ */
  function setLang(l) {
    lang = l;
    localStorage.setItem('aura-lang', l);
    document.documentElement.lang = l;
    document.body.dir = l === 'ar' ? 'rtl' : 'ltr';
    qs('.lang-btn[data-lang="en"]').classList.toggle('active', l === 'en');
    qs('.lang-btn[data-lang="ar"]').classList.toggle('active', l === 'ar');
    if (menu) { applyBranding(); renderCategories(); renderFooter(); }
  }

  function applyBranding() {
    const r = menu.restaurant;
    const name = l(r.name_en, r.name_ar);
    const tag  = l(r.tagline_en, r.tagline_ar);
    setText('brand-name', name);
    setText('brand-tag',  tag);
    setText('hero-title', name);
    setText('hero-sub',   tag);
    setText('footer-brand', name);
    setText('about-link', t[lang].about);
    document.title = name + ' — Menu';
    const si = $('search-input'); if (si) si.placeholder = t[lang].search;
  }

  /* ══════════════════════════════════════════════════════
     VIEW: CATEGORIES
  ══════════════════════════════════════════════════════ */
  function renderCategories() {
    const grid = $('cat-grid');
    if (!grid || !menu) return;

    const cats = menu.categories.filter(c => c.visible !== false);
    if (!cats.length) {
      grid.innerHTML = `<p style="color:#7A8FA6;grid-column:1/-1;text-align:center;padding:40px">No categories yet.</p>`;
      return;
    }

    grid.innerHTML = cats.map(cat => {
      const name  = l(cat.name_en, cat.name_ar);
      const count = menu.items.filter(i => i.category === cat.id && i.visible !== false).length;
      const imgEl = cat.image
        ? `<img class="cat-card-bg" src="${cat.image}" alt="${name}" loading="lazy"
               onerror="this.style.display='none'">`
        : `<div class="cat-card-ph">${cat.icon || '🍽️'}</div>`;
      return `
        <div class="cat-card" data-cat="${cat.id}" role="button" tabindex="0"
             aria-label="${name} — ${count} items">
          ${imgEl}
          <div class="cat-card-overlay">
            <div class="cat-card-name">${name}</div>
            <div class="cat-card-count">${count} ${count === 1 ? 'item' : 'items'}</div>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.cat-card').forEach(card => {
      const open = () => showItems(card.dataset.cat);
      card.addEventListener('click', open);
      card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') open(); });
    });
  }

  /* ══════════════════════════════════════════════════════
     VIEW: ITEMS
  ══════════════════════════════════════════════════════ */
  function showItems(catId) {
    const cat = menu.categories.find(c => c.id === catId);
    if (!cat) return;

    // Switch views
    $('view-categories').style.display = 'none';
    $('view-items').style.display      = 'block';
    $('back-btn').classList.add('show');
    search = '';
    const si = $('search-input'); if (si) si.value = '';

    // Category header
    const name = l(cat.name_en, cat.name_ar);
    setText('items-cat-name', name);
    const imgWrap = $('items-cat-img');
    imgWrap.innerHTML = cat.image
      ? `<img src="${cat.image}" alt="${name}" loading="lazy">`
      : cat.icon || '🍽️';

    // Push browser history (enables back button)
    history.pushState({ view: 'items', catId }, '', '#' + catId);

    renderItems(catId);
    window.scrollTo(0, 0);
  }

  function renderItems(catId) {
    const grid = $('items-grid');
    if (!grid || !menu) return;

    const currency = l(menu.restaurant.currency_en, menu.restaurant.currency_ar);
    let items = menu.items.filter(item => {
      if (item.visible === false) return false;
      if (item.category !== catId) return false;
      if (!search) return true;
      const name = l(item.name_en, item.name_ar).toLowerCase();
      const desc = l(item.description_en || '', item.description_ar || '').toLowerCase();
      return name.includes(search) || desc.includes(search);
    });

    if (!items.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>${t[lang].noItems}</p></div>`;
      return;
    }

    grid.innerHTML = items.map(item => buildCard(item, currency)).join('');
    grid.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => openDetail(card.dataset.id));
    });
  }

  function buildCard(item, currency) {
    const name   = l(item.name_en, item.name_ar);
    const desc   = l(item.description_en || '', item.description_ar || '');
    const avail  = item.available !== false;
    const hasVid = !!item.video_url;

    const imgEl = item.image
      ? `<img src="${item.image}" alt="${name}" loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=\\'item-card-img-ph\\'>🍽️</div>'">`
      : `<div class="item-card-img-ph">🍽️</div>`;

    const badge = item.featured && avail
      ? `<span class="badge badge-featured">${t[lang].featured}</span>`
      : !avail
      ? `<span class="badge badge-soldout">${t[lang].soldout}</span>`
      : '';

    return `
      <div class="item-card ${!avail ? 'sold-out' : ''}" data-id="${item.id}" role="button" tabindex="0">
        <div class="item-card-img">
          ${imgEl}
          ${hasVid ? `<div class="item-card-video-icon">▶</div>` : ''}
        </div>
        <div class="item-card-body">
          <div>
            <p class="item-card-name">${name}</p>
            ${desc ? `<p class="item-card-desc">${desc}</p>` : ''}
          </div>
          <div class="item-card-footer">
            <span class="item-card-price">${item.price}<span class="item-card-price-cur"> ${currency}</span></span>
            ${badge}
            ${hasVid ? `<span class="badge badge-video">▶ Video</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════
     DETAIL MODAL
  ══════════════════════════════════════════════════════ */
  function openDetail(id) {
    const item = menu.items.find(i => i.id === id);
    if (!item) return;

    const currency = l(menu.restaurant.currency_en, menu.restaurant.currency_ar);
    const name     = l(item.name_en, item.name_ar);
    const desc     = l(item.description_en || '', item.description_ar || '');
    const avail    = item.available !== false;

    // Image
    $('detail-img-wrap').innerHTML = item.image
      ? `<img src="${item.image}" alt="${name}" loading="lazy">`
      : `<div class="detail-img-ph">🍽️</div>`;

    // Badges
    const badges = [];
    if (item.featured && avail) badges.push(`<span class="badge badge-featured">${t[lang].featured}</span>`);
    if (!avail) badges.push(`<span class="badge badge-soldout">${t[lang].soldout}</span>`);
    if (item.video_url) badges.push(`<span class="badge badge-video">▶ ${t[lang].video}</span>`);
    $('detail-badges').innerHTML = badges.join('');

    setText('detail-name',  name);
    setText('detail-desc',  desc || '');
    $('detail-price').textContent = item.price + ' ' + currency;

    // Video
    const videoWrap = $('detail-video');
    if (item.video_url) {
      const ytId = getYouTubeId(item.video_url);
      if (ytId) {
        videoWrap.style.display = 'block';
        videoWrap.innerHTML = `
          <div class="detail-video-thumb" id="yt-thumb-${ytId}" data-ytid="${ytId}">
            <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="Video thumbnail" loading="lazy">
            <div class="detail-video-play">
              <div class="detail-video-play-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--n900)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          </div>
          <p class="detail-video-label">${t[lang].video}</p>`;
        videoWrap.querySelector('.detail-video-thumb').addEventListener('click', () => {
          videoWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1" allowfullscreen allow="autoplay"></iframe>`;
        });
      } else {
        // Instagram/other video — just open link
        videoWrap.style.display = 'block';
        videoWrap.innerHTML = `<a href="${item.video_url}" target="_blank" rel="noopener" class="footer-link" style="justify-content:center">▶ ${t[lang].video}</a>`;
      }
    } else {
      videoWrap.style.display = 'none';
      videoWrap.innerHTML = '';
    }

    // Open overlay
    $('detail-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    $('detail-overlay').classList.remove('open');
    document.body.style.overflow = '';
    $('detail-video').innerHTML = ''; // stop video
    $('detail-video').style.display = 'none';
  }

  function getYouTubeId(url) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  /* ══════════════════════════════════════════════════════
     FOOTER — contact info
  ══════════════════════════════════════════════════════ */
  function renderFooter() {
    if (!menu) return;
    const c = menu.restaurant.contact || {};
    const links = [];

    if (c.phone) links.push(`<a class="footer-link" href="tel:${c.phone}"><span>📞</span>${c.phone}</a>`);
    if (c.whatsapp) links.push(`<a class="footer-link" href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" rel="noopener"><span>💬</span>WhatsApp</a>`);
    if (c.instagram) links.push(`<a class="footer-link" href="${c.instagram}" target="_blank" rel="noopener"><span>📷</span>Instagram</a>`);
    if (c.facebook)  links.push(`<a class="footer-link" href="${c.facebook}"  target="_blank" rel="noopener"><span>👤</span>Facebook</a>`);
    if (c.tiktok)    links.push(`<a class="footer-link" href="${c.tiktok}"    target="_blank" rel="noopener"><span>🎵</span>TikTok</a>`);
    const addr = l(c.address_en || '', c.address_ar || '');
    if (addr) {
      const mapsHref = c.maps_url || `https://maps.google.com/?q=${encodeURIComponent(addr)}`;
      links.push(`<a class="footer-link" href="${mapsHref}" target="_blank" rel="noopener"><span>📍</span>${addr}</a>`);
    }

    $('footer-contact').innerHTML = links.join('');
  }

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */
  const l       = (en, ar) => lang === 'ar' ? ar : en;
  const setText = (id, val) => { const el = $(id); if (el) el.textContent = val; };

  function goBackToCategories() {
    $('view-items').style.display      = 'none';
    $('view-categories').style.display = 'block';
    $('back-btn').classList.remove('show');
    window.scrollTo(0, 0);
    if (location.hash) history.pushState({}, '', location.pathname);
  }

  /* ══════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════ */
  function init() {
    // Apply language immediately (no flicker)
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    qs('.lang-btn[data-lang="en"]').classList.toggle('active', lang === 'en');
    qs('.lang-btn[data-lang="ar"]').classList.toggle('active', lang === 'ar');

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(b =>
      b.addEventListener('click', () => setLang(b.dataset.lang)));

    // Back button
    $('back-btn').addEventListener('click', goBackToCategories);

    // Browser back/forward
    window.addEventListener('popstate', e => {
      if (e.state && e.state.view === 'items') {
        // Re-show items (don't re-render, just show the view)
        // This is a simple fallback
      } else {
        goBackToCategories();
      }
    });

    // Search
    $('search-input').addEventListener('input', e => {
      search = e.target.value.toLowerCase().trim();
      const catId = location.hash.slice(1);
      if (catId) renderItems(catId);
    });

    // Detail modal close
    $('detail-close').addEventListener('click', closeDetail);
    $('detail-overlay').addEventListener('click', e => {
      if (e.target === $('detail-overlay')) closeDetail();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDetail(); });

    // Handle deep link (if opened with #catId in URL)
    if (location.hash) {
      const catId = location.hash.slice(1);
      if (catId) loadMenu().then(() => { if (menu) showItems(catId); });
      return;
    }

    loadMenu();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

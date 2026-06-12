/* ============================================================
   AURA CAFÉ & RESTAURANT — Customer Menu App
   3-Level navigation: Sections → Categories → Items
   ============================================================ */

'use strict';

/* ── Helpers ── */
const $ = id => document.getElementById(id);

/* ── State ── */
let menu       = null;   // full parsed menu.json
let lang       = localStorage.getItem('aura-lang') || 'en';
let currentSec = null;   // active section id
let currentCat = null;   // active category id
let searchQ    = '';
let navLevel   = 0;      // 0=sections, 1=categories, 2=items

/* ── i18n helper ── */
const t = (obj, key) => obj[key + '_' + lang] || obj[key + '_en'] || '';

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  applyLang();
  await loadMenu();
  bindEvents();

  // Handle browser history on load
  const state = history.state;
  if (state && state.view === 'items' && state.catId) {
    currentSec = state.secId || null;
    showItems(state.catId, true);
  } else if (state && state.view === 'categories' && state.secId) {
    showCategories(state.secId, true);
  } else {
    showSections(true);
  }
});

/* ── Load menu.json ── */
async function loadMenu() {
  try {
    const res = await fetch('/menu.json?v=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    menu = await res.json();
    renderFooter();
    renderBranding();
  } catch (err) {
    console.error('Failed to load menu.json:', err);
    $('sec-grid').innerHTML = '<div class="empty"><div class="empty-icon">⚠️</div><p>Could not load menu. Please try again.</p></div>';
  }
}

/* ============================================================
   LANGUAGE
   ============================================================ */
function applyLang() {
  document.documentElement.lang = lang;
  document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  const si = $('search-input');
  if (si) si.placeholder = lang === 'ar' ? 'بحث…' : 'Search…';
  const al = $('about-link');
  if (al) al.textContent = lang === 'ar' ? 'من نحن' : 'About';
}

function setLang(newLang) {
  lang = newLang;
  localStorage.setItem('aura-lang', lang);
  applyLang();
  if (navLevel === 0) renderSections();
  else if (navLevel === 1 && currentSec) renderCategories(currentSec);
  else if (navLevel === 2 && currentCat) renderItems(currentCat);
  renderBranding();
  renderFooter();
}

/* ============================================================
   BRANDING
   ============================================================ */
function renderBranding() {
  if (!menu) return;
  const r = menu.restaurant;
  // Navbar brand text (small, alongside logo SVG)
  const bn = $('brand-name'); if (bn) bn.textContent = t(r, 'name');
  const bt = $('brand-tag');  if (bt) bt.textContent = t(r, 'tagline');
  // Footer
  const fb = $('footer-brand'); if (fb) fb.textContent = t(r, 'name');
  // Hero uses the static SVG logo — no text elements to update
}

/* ============================================================
   FOOTER
   ============================================================ */
function renderFooter() {
  if (!menu) return;
  const c = menu.restaurant.contact;
  const items = [];
  if (c.phone)     items.push(`<a class="footer-link" href="tel:${c.phone}"><span>📞</span>${c.phone}</a>`);
  if (c.whatsapp)  items.push(`<a class="footer-link" href="https://wa.me/${c.whatsapp.replace(/\D/g,'')}" target="_blank" rel="noopener"><span>💬</span>WhatsApp</a>`);
  if (c.instagram) items.push(`<a class="footer-link" href="${c.instagram}" target="_blank" rel="noopener"><span>📸</span>Instagram</a>`);
  if (c.facebook)  items.push(`<a class="footer-link" href="${c.facebook}"  target="_blank" rel="noopener"><span>👥</span>Facebook</a>`);
  if (c.tiktok)    items.push(`<a class="footer-link" href="${c.tiktok}"    target="_blank" rel="noopener"><span>🎵</span>TikTok</a>`);
  if (c.maps_url)  items.push(`<a class="footer-link" href="${c.maps_url}"  target="_blank" rel="noopener"><span>📍</span>${t(c,'address')}</a>`);
  else if (t(c,'address')) items.push(`<span class="footer-link"><span>📍</span>${t(c,'address')}</span>`);
  $('footer-contact').innerHTML = items.join('');
}

/* ============================================================
   VIEW SWITCHER
   ============================================================ */
function showView(viewId) {
  ['view-sections','view-categories','view-items'].forEach(id => {
    $(id).style.display = id === viewId ? '' : 'none';
  });
}

function updateBackBtn() {
  $('back-btn').classList.toggle('show', navLevel > 0);
}

/* ============================================================
   LEVEL 1 — SECTIONS
   ============================================================ */
function showSections(skipPush) {
  navLevel   = 0;
  currentSec = null;
  currentCat = null;
  updateBackBtn();
  showView('view-sections');
  renderSections();
  if (!skipPush) history.pushState({ view: 'sections' }, '', '/');
}

function renderSections() {
  if (!menu) return;
  const grid    = $('sec-grid');
  const visible = (menu.sections || []).filter(s => s.visible !== false);

  if (!visible.length) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>No sections available.</p></div>';
    return;
  }

  const emojis = { 'main-menu': '🍽️', 'delivery': '🛵', 'breakfast': '🌅' };

  grid.innerHTML = visible.map((sec, i) => {
    const name = t(sec, 'name');
    const desc = t(sec, 'description');
    const bg   = sec.image
      ? `<img class="sec-card-bg" src="${sec.image}" alt="${name}" loading="lazy">`
      : `<div class="sec-card-ph">${emojis[sec.id] || '📋'}</div>`;

    return `
      <div class="sec-card" data-sec="${sec.id}" role="button" tabindex="0"
           aria-label="${name}" style="animation-delay:${i * .07}s">
        ${bg}
        <div class="sec-card-overlay">
          <div class="sec-card-name">${name}</div>
          ${desc ? `<div class="sec-card-desc">${desc}</div>` : ''}
        </div>
        <div class="sec-card-arrow">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.sec-card').forEach(card => {
    card.addEventListener('click', () => showCategories(card.dataset.sec));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') showCategories(card.dataset.sec);
    });
  });
}

/* ============================================================
   LEVEL 2 — CATEGORIES
   ============================================================ */
function showCategories(secId, skipPush) {
  navLevel   = 1;
  currentSec = secId;
  currentCat = null;
  updateBackBtn();
  showView('view-categories');
  renderCategories(secId);
  if (!skipPush) history.pushState({ view: 'categories', secId }, '', '/?s=' + secId);
}

function renderCategories(secId) {
  if (!menu) return;

  // Section header
  const sec = (menu.sections || []).find(s => s.id === secId);
  if (sec) {
    const icon = $('section-header-icon');
    const emojis = { 'main-menu': '🍽️', 'delivery': '🛵', 'breakfast': '🌅' };
    icon.innerHTML = sec.image
      ? `<img src="${sec.image}" alt="${t(sec,'name')}" loading="lazy">`
      : emojis[secId] || '📋';
    $('section-header-name').textContent = t(sec, 'name');
    $('section-header-desc').textContent = t(sec, 'description');
  }

  const grid = $('cat-grid');
  const cats = (menu.categories || []).filter(c => c.section === secId && c.visible !== false);

  if (!cats.length) {
    grid.innerHTML = '<div class="empty"><div class="empty-icon">📂</div><p>No categories yet.</p></div>';
    return;
  }

  grid.innerHTML = cats.map((cat, i) => {
    const name  = t(cat, 'name');
    const count = (menu.items || []).filter(it => it.category === cat.id && it.visible !== false).length;
    const img   = cat.image
      ? `<img class="cat-card-bg" src="${cat.image}" alt="${name}" loading="lazy">`
      : `<div class="cat-card-ph">🍽️</div>`;

    return `
      <div class="cat-card" data-cat="${cat.id}" role="button" tabindex="0"
           aria-label="${name}" style="animation-delay:${i * .06}s">
        ${img}
        <div class="cat-card-overlay">
          <div class="cat-card-name">${name}</div>
          <div class="cat-card-count">${count} ${lang === 'ar' ? 'صنف' : 'item' + (count !== 1 ? 's' : '')}</div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => showItems(card.dataset.cat));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') showItems(card.dataset.cat);
    });
  });
}

/* ============================================================
   LEVEL 3 — ITEMS
   ============================================================ */
function showItems(catId, skipPush) {
  navLevel   = 2;
  currentCat = catId;
  updateBackBtn();
  showView('view-items');
  searchQ = '';
  $('search-input').value = '';
  renderItems(catId);
  if (!skipPush) history.pushState({ view: 'items', catId, secId: currentSec }, '', '/?c=' + catId);
}

function renderItems(catId) {
  if (!menu) return;
  const cat = (menu.categories || []).find(c => c.id === catId);

  // Category header
  const catImg  = $('items-cat-img');
  const catName = $('items-cat-name');
  if (cat) {
    catName.textContent = t(cat, 'name');
    catImg.innerHTML = cat.image
      ? `<img src="${cat.image}" alt="${t(cat,'name')}" loading="lazy">`
      : '🍽️';
  }

  const items = (menu.items || []).filter(it => it.category === catId && it.visible !== false);
  renderItemCards(items);
}

function renderItemCards(items) {
  const grid = $('items-grid');
  const q    = searchQ.toLowerCase().trim();
  const list = q
    ? items.filter(it => t(it,'name').toLowerCase().includes(q) || t(it,'description').toLowerCase().includes(q))
    : items;

  if (!list.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">${q ? '🔍' : '🍽️'}</div><p>${q ? 'No results for "' + q + '"' : (lang === 'ar' ? 'لا توجد أصناف بعد.' : 'No items yet.')}</p></div>`;
    return;
  }

  const cur = lang === 'ar' ? (menu.restaurant.currency_ar || 'ج.م') : (menu.restaurant.currency_en || 'EGP');

  grid.innerHTML = list.map((item, i) => {
    const name   = t(item, 'name');
    const desc   = t(item, 'description');
    const hasVid = item.video_url && item.video_url.trim();

    const imgHtml = item.image
      ? `<img src="${item.image}" alt="${name}" loading="lazy">`
      : `<div class="item-card-img-ph">🍽️</div>`;

    // Centered play button — visual indicator only
    const playBtn = hasVid
      ? `<div class="item-card-video-btn">
           <div class="item-card-play-circle">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
               <polygon points="5,3 19,12 5,21"/>
             </svg>
           </div>
         </div>`
      : '';

    const badges = [];
    if (item.featured) badges.push('<span class="badge badge-featured">★ Featured</span>');

    return `
      <div class="item-card" data-id="${item.id}"
           style="animation-delay:${i * .05}s"
           role="button" tabindex="0" aria-label="${name}">
        <div class="item-card-img">
          ${imgHtml}${playBtn}
        </div>
        <div class="item-card-body">
          <div>
            <div class="item-card-name">${name}</div>
            ${desc ? `<div class="item-card-desc">${desc}</div>` : ''}
          </div>
          <div class="item-card-footer">
            <span class="item-card-price">${item.price} <span class="item-card-price-cur">${cur}</span></span>
            <div style="display:flex;gap:4px;flex-wrap:wrap">${badges.join('')}</div>
          </div>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => openDetail(card.dataset.id));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openDetail(card.dataset.id);
    });
  });
}

/* ============================================================
   ITEM DETAIL — bottom sheet
   ============================================================ */
function openDetail(itemId) {
  if (!menu) return;
  const item = menu.items.find(i => i.id === itemId);
  if (!item) return;

  const name = t(item, 'name');
  const desc = t(item, 'description');
  const cur  = lang === 'ar' ? (menu.restaurant.currency_ar || 'ج.م') : (menu.restaurant.currency_en || 'EGP');

  // Image
  $('detail-img-wrap').innerHTML = item.image
    ? `<img src="${item.image}" alt="${name}">`
    : `<div class="detail-img-ph">🍽️</div>`;

  // Badges
  const badges = [];
  if (item.featured) badges.push('<span class="badge badge-featured">★ Featured</span>');
  if (item.video_url && item.video_url.trim()) badges.push('<span class="badge badge-video">▶ Video</span>');
  $('detail-badges').innerHTML = badges.join('');

  $('detail-name').textContent  = name;
  $('detail-desc').textContent  = desc;
  $('detail-price').textContent = item.price + ' ' + cur;

  // Video (lazy embed)
  const vidEl = $('detail-video');
  if (item.video_url && item.video_url.trim()) {
    vidEl.style.display = '';
    const ytId = extractYouTubeId(item.video_url);
    if (ytId) {
      const thumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      vidEl.innerHTML = `
        <div class="detail-video-thumb" id="vid-thumb">
          <img src="${thumb}" alt="Video thumbnail">
          <div class="detail-video-play" id="vid-play">
            <div class="detail-video-play-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#0D1B2A">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
            </div>
          </div>
        </div>
        <p class="detail-video-label">${lang === 'ar' ? 'اضغط لمشاهدة الفيديو' : 'Tap to watch video'}</p>`;
      $('vid-thumb').addEventListener('click', () => {
        vidEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
      });
    } else {
      vidEl.innerHTML = `<a class="footer-link" href="${item.video_url}" target="_blank" rel="noopener">▶ Watch Video</a>`;
    }
  } else {
    vidEl.style.display = 'none';
    vidEl.innerHTML = '';
  }

  // Open
  const overlay = $('detail-overlay');
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

function closeDetail() {
  const overlay = $('detail-overlay');
  overlay.classList.remove('open');
  setTimeout(() => {
    overlay.style.display = 'none';
    document.body.style.overflow = '';
    // Stop video playback
    const vidEl = $('detail-video');
    if (vidEl) vidEl.innerHTML = '';
  }, 260);
}

function extractYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

/* ============================================================
   BACK NAVIGATION
   ============================================================ */
function goBack() {
  if (navLevel === 2) showCategories(currentSec);
  else if (navLevel === 1) showSections();
}

window.addEventListener('popstate', e => {
  const s = e.state;
  if (!s || s.view === 'sections') {
    showSections(true);
  } else if (s.view === 'categories') {
    currentSec = s.secId;
    showCategories(s.secId, true);
  } else if (s.view === 'items') {
    currentSec = s.secId;
    showItems(s.catId, true);
  }
});

/* ============================================================
   EVENTS
   ============================================================ */
function bindEvents() {
  // Language
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Back
  $('back-btn').addEventListener('click', goBack);

  // Detail close (X button)
  $('detail-close').addEventListener('click', closeDetail);

  // Backdrop click closes detail — stop propagation inside sheet
  $('detail-overlay').addEventListener('click', e => {
    if (e.target === $('detail-overlay')) closeDetail();
  });
  $('detail-sheet').addEventListener('click', e => e.stopPropagation());

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetail();
  });

  // Search
  $('search-input').addEventListener('input', e => {
    searchQ = e.target.value;
    if (currentCat && menu) {
      const items = menu.items.filter(it => it.category === currentCat && it.visible !== false);
      renderItemCards(items);
    }
  });
}

/* ============================================================
   AURA CAFÉ — Customer Menu Application
   View-only · Fast · Mobile-first · EN/AR
   ============================================================ */
(function () {
  'use strict';

  /* ---- State ---- */
  let menu = null;
  let lang = localStorage.getItem('aura-lang') || 'en';
  let activeCat = 'all';
  let searchQ = '';

  /* ---- Strings ---- */
  const t = {
    en: {
      all: 'All', search: 'Search menu…',
      featured: "Chef's Pick", soldout: 'Sold Out',
      noResults: 'No items found', noResultsSub: 'Try a different search',
    },
    ar: {
      all: 'الكل', search: 'ابحث في المنيو…',
      featured: 'اختيار الشيف', soldout: 'نفد',
      noResults: 'لا توجد عناصر', noResultsSub: 'جرب بحثاً آخر',
    },
  };

  /* ---- DOM helpers ---- */
  const $ = id => document.getElementById(id);
  const qs = sel => document.querySelector(sel);

  /* ── FETCH MENU ──────────────────────────────────────────── */
  async function loadMenu() {
    try {
      const res = await fetch('menu.json?_=' + Math.floor(Date.now() / 60000));
      if (!res.ok) throw new Error(res.statusText);
      menu = await res.json();
      render();
    } catch (e) {
      $('menu-content').innerHTML =
        `<div class="empty">
           <div class="empty-icon">⚠️</div>
           <p class="empty-text">Could not load menu. Please refresh.</p>
         </div>`;
    }
  }

  /* ── LANGUAGE ────────────────────────────────────────────── */
  function setLang(l) {
    lang = l;
    localStorage.setItem('aura-lang', l);
    document.documentElement.lang = l;
    document.body.dir = l === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === l));
    render();
  }

  /* ── CATEGORY FILTER ─────────────────────────────────────── */
  function setCategory(id) {
    activeCat = id;
    document.querySelectorAll('.cat-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.cat === id));
    // Scroll active tab into view
    const active = qs(`.cat-tab[data-cat="${id}"]`);
    if (active) active.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    renderItems();
  }

  /* ── SEARCH ──────────────────────────────────────────────── */
  function onSearch(e) {
    searchQ = e.target.value.toLowerCase().trim();
    renderItems();
  }

  /* ── RENDER CATEGORY TABS ────────────────────────────────── */
  function renderTabs() {
    const container = $('cat-tabs');
    if (!container) return;

    const allTab = { id: 'all', name_en: t[lang].all, name_ar: t[lang].all, image: '' };
    const cats = [allTab, ...menu.categories.filter(c => c.visible !== false)];

    container.innerHTML = cats.map(cat => {
      const name = lang === 'ar' ? cat.name_ar : cat.name_en;
      const imgEl = cat.image
        ? `<img class="cat-tab-img" src="${cat.image}" alt="${name}" loading="lazy"
               onerror="this.parentElement.innerHTML='<div class=\\'cat-tab-img\\' style=\\'font-size:1.1rem\\'>🍽️</div>'">`
        : `<div class="cat-tab-img">${cat.icon || '🍽️'}</div>`;
      return `
        <button class="cat-tab ${cat.id === activeCat ? 'active' : ''}"
                data-cat="${cat.id}"
                role="tab"
                aria-selected="${cat.id === activeCat}"
                aria-label="${name}">
          ${imgEl}
          <span>${name}</span>
        </button>`;
    }).join('');

    container.querySelectorAll('.cat-tab').forEach(btn =>
      btn.addEventListener('click', () => setCategory(btn.dataset.cat)));
  }

  /* ── RENDER ITEMS ────────────────────────────────────────── */
  function renderItems() {
    const container = $('menu-content');
    if (!container) return;

    const currency = lang === 'ar' ? menu.restaurant.currency_ar : menu.restaurant.currency_en;

    // Filter
    let items = menu.items.filter(item => {
      if (item.visible === false) return false;
      const matchCat = activeCat === 'all' || item.category === activeCat;
      if (!matchCat) return false;
      if (!searchQ) return true;
      const name = (lang === 'ar' ? item.name_ar : item.name_en).toLowerCase();
      const desc = (lang === 'ar' ? (item.description_ar || '') : (item.description_en || '')).toLowerCase();
      return name.includes(searchQ) || desc.includes(searchQ);
    });

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty">
          <div class="empty-icon">🔍</div>
          <p class="empty-text">${t[lang].noResults}</p>
          <p class="empty-text" style="font-size:.75rem;margin-top:4px">${t[lang].noResultsSub}</p>
        </div>`;
      return;
    }

    // Group by category when showing all (no search)
    if (activeCat === 'all' && !searchQ) {
      const groups = {};
      menu.categories.forEach(c => { groups[c.id] = []; });
      items.forEach(i => { if (groups[i.category]) groups[i.category].push(i); });

      container.innerHTML = menu.categories
        .filter(c => c.visible !== false && groups[c.id] && groups[c.id].length)
        .map(cat => {
          const catName = lang === 'ar' ? cat.name_ar : cat.name_en;
          const imgEl = cat.image
            ? `<img src="${cat.image}" alt="${catName}" loading="lazy" onerror="this.style.display='none'">`
            : `<div style="font-size:1.2rem">${cat.icon || '🍽️'}</div>`;
          return `
            <section class="cat-section" id="sect-${cat.id}">
              <div class="cat-heading">
                <div class="cat-heading-img">${imgEl}</div>
                <h2 class="cat-heading-title">${catName}</h2>
                <div class="cat-heading-line"></div>
              </div>
              <ul class="items-list" role="list">
                ${groups[cat.id].map(item => buildCard(item, currency)).join('')}
              </ul>
            </section>`;
        }).join('');
    } else {
      container.innerHTML = `
        <ul class="items-list" role="list">
          ${items.map(item => buildCard(item, currency)).join('')}
        </ul>`;
    }
  }

  /* ── BUILD CARD ──────────────────────────────────────────── */
  function buildCard(item, currency) {
    const name = lang === 'ar' ? item.name_ar : item.name_en;
    const desc = lang === 'ar' ? (item.description_ar || '') : (item.description_en || '');
    const avail = item.available !== false;

    const imgHtml = item.image
      ? `<img class="item-img" src="${item.image}" alt="${name}" loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=\\'item-img-placeholder\\'>🍽️</div>'">`
      : `<div class="item-img-placeholder">🍽️</div>`;

    const badge = item.featured && avail
      ? `<span class="item-badge badge-featured">${t[lang].featured}</span>`
      : !avail
      ? `<span class="item-badge badge-soldout">${t[lang].soldout}</span>`
      : '';

    return `
      <li class="item-card ${!avail ? 'sold-out' : ''}" role="article">
        <div class="item-img-wrap">${imgHtml}</div>
        <div class="item-body">
          <div>
            <p class="item-name">${name}</p>
            ${desc ? `<p class="item-desc">${desc}</p>` : ''}
          </div>
          <div class="item-footer">
            <span class="item-price">${item.price}<span class="item-price-currency"> ${currency}</span></span>
            ${badge}
          </div>
        </div>
      </li>`;
  }

  /* ── BRANDING ────────────────────────────────────────────── */
  function renderBranding() {
    if (!menu) return;
    const r = menu.restaurant;
    const name    = lang === 'ar' ? r.name_ar    : r.name_en;
    const tagline = lang === 'ar' ? r.tagline_ar : r.tagline_en;

    [['brand-name', name], ['hero-title', name], ['footer-name', name]].forEach(([id, val]) => {
      const el = $(id); if (el) el.textContent = val;
    });
    const bt = $('brand-tag'), hs = $('hero-sub');
    if (bt) bt.textContent = tagline;
    if (hs) hs.textContent = tagline;
    document.title = `${name} — Menu`;
    const si = $('search-input'); if (si) si.placeholder = t[lang].search;
  }

  /* ── FULL RENDER ─────────────────────────────────────────── */
  function render() {
    renderBranding();
    renderTabs();
    renderItems();
  }

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    // Apply saved language immediately
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.lang === lang));

    // Wire language buttons
    document.querySelectorAll('.lang-btn').forEach(b =>
      b.addEventListener('click', () => setLang(b.dataset.lang)));

    // Wire search
    const si = $('search-input');
    if (si) si.addEventListener('input', onSearch);

    // Load data
    loadMenu();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

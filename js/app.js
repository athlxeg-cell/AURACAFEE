/* ============================================
   AURA CAFE — Main Menu Application
   ============================================ */

const App = (() => {
  // ---- State ----
  let menuData = null;
  let currentLang = localStorage.getItem('aura-lang') || 'en';
  let currentCategory = 'all';
  let searchQuery = '';

  // ---- i18n ----
  const i18n = {
    en: {
      all: 'All Items',
      search: 'Search menu...',
      featured: 'Chef\'s Pick',
      unavailable: 'Sold Out',
      noResults: 'No items found',
      noResultsSub: 'Try a different search term',
    },
    ar: {
      all: 'الكل',
      search: 'ابحث في المنيو...',
      featured: 'اختيار الشيف',
      unavailable: 'نفد المخزون',
      noResults: 'لا توجد عناصر',
      noResultsSub: 'جرب بحثاً مختلفاً',
    }
  };

  // ---- DOM refs ----
  const $ = id => document.getElementById(id);

  // ---- Fetch menu.json ----
  async function loadMenu() {
    try {
      const res = await fetch('menu.json?v=' + Date.now());
      if (!res.ok) throw new Error('Failed to load menu');
      menuData = await res.json();
      render();
    } catch (e) {
      console.error(e);
      document.getElementById('menu-container').innerHTML =
        `<div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <p>Could not load menu. Please try again.</p>
        </div>`;
    }
  }

  // ---- Language toggle ----
  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('aura-lang', lang);
    document.documentElement.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
    render();
  }

  // ---- Category filter ----
  function setCategory(id) {
    currentCategory = id;
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.cat === id);
    });
    // Scroll active tab into view
    const activeBtn = document.querySelector(`.cat-btn[data-cat="${id}"]`);
    if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    renderMenuItems();
  }

  // ---- Search ----
  function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase().trim();
    renderMenuItems();
  }

  // ---- Build categories ----
  function renderCategories() {
    const t = i18n[currentLang];
    const scroll = $('cat-scroll');
    if (!scroll) return;

    const allCats = [{ id: 'all', name_en: t.all, name_ar: t.all, icon: '🍽️' }, ...menuData.categories];

    scroll.innerHTML = allCats.map(cat => `
      <button class="cat-btn ${cat.id === currentCategory ? 'active' : ''}"
              data-cat="${cat.id}"
              aria-label="${currentLang === 'ar' ? cat.name_ar : cat.name_en}">
        <span class="cat-icon">${cat.icon || '🍽️'}</span>
        <span>${currentLang === 'ar' ? cat.name_ar : cat.name_en}</span>
      </button>
    `).join('');

    scroll.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => setCategory(btn.dataset.cat));
    });
  }

  // ---- Build menu items ----
  function renderMenuItems() {
    const container = $('menu-container');
    if (!container || !menuData) return;

    const t = i18n[currentLang];
    const currency = currentLang === 'ar' ? menuData.restaurant.currency_ar : menuData.restaurant.currency_en;

    // Filter items
    let items = menuData.items.filter(item => {
      const matchCat = currentCategory === 'all' || item.category === currentCategory;
      const name = (currentLang === 'ar' ? item.name_ar : item.name_en).toLowerCase();
      const desc = (currentLang === 'ar' ? item.description_ar : item.description_en).toLowerCase();
      const matchSearch = !searchQuery || name.includes(searchQuery) || desc.includes(searchQuery);
      return matchCat && matchSearch;
    });

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <p>${t.noResults}</p>
          <p style="margin-top:6px;font-size:0.8rem;">${t.noResultsSub}</p>
        </div>`;
      return;
    }

    // Group by category if showing all
    if (currentCategory === 'all' && !searchQuery) {
      const groups = {};
      menuData.categories.forEach(cat => { groups[cat.id] = []; });
      items.forEach(item => {
        if (groups[item.category]) groups[item.category].push(item);
      });

      container.innerHTML = menuData.categories.map(cat => {
        const catItems = groups[cat.id];
        if (!catItems || catItems.length === 0) return '';
        return `
          <div class="category-group" id="cat-${cat.id}">
            <div class="section-header">
              <h2 class="section-title">${cat.icon} ${currentLang === 'ar' ? cat.name_ar : cat.name_en}</h2>
              <div class="section-line"></div>
            </div>
            <div class="menu-grid">
              ${catItems.map(item => buildCard(item, currency, t)).join('')}
            </div>
          </div>`;
      }).join('');
    } else {
      container.innerHTML = `<div class="menu-grid">${items.map(item => buildCard(item, currency, t)).join('')}</div>`;
    }
  }

  // ---- Build single card ----
  function buildCard(item, currency, t) {
    const name = currentLang === 'ar' ? item.name_ar : item.name_en;
    const desc = currentLang === 'ar' ? item.description_ar : item.description_en;
    const imgHtml = item.image
      ? `<img class="card-img" src="${item.image}" alt="${name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'card-img-placeholder\\'>🍽️</div>'">`
      : `<div class="card-img-placeholder">🍽️</div>`;

    return `
      <div class="menu-card ${item.available ? '' : 'unavailable'}" role="article">
        <div class="card-img-wrap">
          ${imgHtml}
          ${item.featured ? `<span class="featured-badge">${t.featured}</span>` : ''}
          ${!item.available ? `<div class="unavailable-overlay"><span class="unavailable-label">${t.unavailable}</span></div>` : ''}
        </div>
        <div class="card-body">
          <h3 class="card-name">${name}</h3>
          <p class="card-desc">${desc}</p>
          <div class="card-footer">
            <span class="card-price">${item.price}<span>${currency}</span></span>
          </div>
        </div>
      </div>`;
  }

  // ---- Hero & Branding ----
  function renderBranding() {
    if (!menuData) return;
    const r = menuData.restaurant;
    const name = currentLang === 'ar' ? r.name_ar : r.name_en;
    const tagline = currentLang === 'ar' ? r.tagline_ar : r.tagline_en;

    const heroTitle = $('hero-title');
    const heroSub = $('hero-subtitle');
    const navName = $('nav-name');
    const navTag = $('nav-tagline');

    if (heroTitle) heroTitle.textContent = name;
    if (heroSub) heroSub.textContent = tagline;
    if (navName) navName.textContent = name;
    if (navTag) navTag.textContent = tagline;

    // Search placeholder
    const searchEl = $('search-input');
    if (searchEl) searchEl.placeholder = i18n[currentLang].search;

    // Page title
    document.title = `${name} — Menu`;
  }

  // ---- Full render ----
  function render() {
    renderBranding();
    renderCategories();
    renderMenuItems();
  }

  // ---- Init ----
  function init() {
    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    // Apply saved lang
    document.documentElement.lang = currentLang;
    document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === currentLang);
    });

    // Search
    const searchEl = $('search-input');
    if (searchEl) {
      searchEl.addEventListener('input', handleSearch);
    }

    loadMenu();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', App.init);

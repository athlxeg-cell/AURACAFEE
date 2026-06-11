/* ============================================================
   AURA CAFÉ — Admin Panel Logic
   Password checked via Netlify Function (never in source code)
   ============================================================ */
'use strict';

/* ── State ─────────────────────────────────────────────────── */
let menu = null;
let parsedImport = [];
let adminPassword = ''; // held in memory only (not stored)

/* ── DOM shorthand ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

/* ── Toast ─────────────────────────────────────────────────── */
function toast(msg, type = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4000);
}

/* ── Step navigation ───────────────────────────────────────── */
function goStep(id) {
  $$('.step-panel').forEach(p => p.classList.remove('active'));
  $$('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === id));
  $(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Refresh whichever panel we're on
  if (id === 'step-photos')    renderPhotoGrid();
  if (id === 'step-visibility') { renderVisibility(); updateStats(); }
}
window.goStep = goStep; // expose for inline onclick

/* ══════════════════════════════════════════════════════════════
   AUTH — password verified via Netlify serverless function
   The password never lives in client code.
══════════════════════════════════════════════════════════════ */
async function login() {
  const pw = $('pw-input').value.trim();
  if (!pw) return;

  $('login-err').style.display     = 'none';
  $('login-loading').style.display = 'block';
  $('login-btn').disabled           = true;

  try {
    // Call the Netlify function (no password in code, just sent for verification)
    const res = await fetch('/api/update-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, menuData: null, checkOnly: true }),
    });

    $('login-loading').style.display = 'none';
    $('login-btn').disabled = false;

    // 200 = correct, 401 = wrong, 500 = env not configured yet
    if (res.status === 200 || res.status === 412) {
      // 412 = password ok but no menu data passed — that's fine, we just wanted auth check
      adminPassword = pw;
      $('login-screen').style.display = 'none';
      $('admin-app').style.display     = 'block';
      loadMenu();
    } else if (res.status === 401) {
      $('login-err').style.display = 'block';
      $('login-err').textContent   = '❌ Incorrect password';
      $('pw-input').value = '';
      $('pw-input').focus();
    } else {
      // Netlify function not yet configured — allow local mode
      const text = await res.text();
      if (text.includes('env vars not configured') || res.status === 500) {
        // Local / dev mode: just skip to app
        adminPassword = pw;
        $('login-screen').style.display = 'none';
        $('admin-app').style.display     = 'block';
        $('login-loading').style.display = 'none';
        loadMenu();
        toast('⚠ Netlify not configured — using local mode. Changes can only be downloaded.', 'err');
      } else {
        $('login-err').textContent   = '❌ Server error. Try again.';
        $('login-err').style.display = 'block';
      }
    }
  } catch {
    // Network error / local file system (no server) — allow local mode with fixed password
    $('login-loading').style.display = 'none';
    $('login-btn').disabled = false;
    adminPassword = pw;
    $('login-screen').style.display = 'none';
    $('admin-app').style.display     = 'block';
    loadMenu();
    toast('⚠ Running in local mode (no server). Changes can only be downloaded.', 'err');
  }
}

/* ══════════════════════════════════════════════════════════════
   LOAD MENU
══════════════════════════════════════════════════════════════ */
async function loadMenu() {
  try {
    const res = await fetch('../menu.json?_=' + Date.now());
    menu = await res.json();
    // Ensure defaults
    menu.items.forEach(i => {
      if (i.visible === undefined) i.visible = true;
    });
    renderCategories();
    updateCatHints();
    renderPhotoGrid();
    renderVisibility();
    updateStats();
  } catch (e) {
    toast('Could not load menu.json', 'err');
  }
}

function markUnsaved() {
  $('unsaved-badge').style.display = 'inline-block';
}

/* ══════════════════════════════════════════════════════════════
   STEP 1 — CATEGORIES
══════════════════════════════════════════════════════════════ */
function renderCategories() {
  const list = $('cat-list');
  if (!list) return;

  if (!menu.categories.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:.83rem;text-align:center;padding:24px">No categories yet. Add one above.</p>';
    return;
  }

  list.innerHTML = menu.categories.map((cat, idx) => {
    const imgEl = cat.image
      ? `<div class="cat-row-img"><img src="${cat.image}" alt="" onerror="this.style.display='none'"></div>`
      : `<div class="cat-row-img">${cat.icon || '🍽️'}</div>`;
    const count = (menu.items || []).filter(i => i.category === cat.id).length;
    return `
      <div class="cat-row" data-catid="${cat.id}">
        ${imgEl}
        <div class="cat-row-info">
          <div class="cat-row-name">${cat.name_en} / <span dir="rtl">${cat.name_ar}</span></div>
          <div class="cat-row-meta">ID: <code>${cat.id}</code> &nbsp;•&nbsp; ${count} item${count !== 1 ? 's' : ''}</div>
        </div>
        <div class="cat-row-order">
          <button class="order-btn" data-dir="up"   data-idx="${idx}" title="Move up">▲</button>
          <button class="order-btn" data-dir="down" data-idx="${idx}" title="Move down">▼</button>
        </div>
        <div class="cat-row-actions">
          <button class="btn btn-icon" data-edit-cat="${cat.id}" title="Edit">✏️</button>
          <button class="btn btn-icon btn-danger btn-sm" data-del-cat="${cat.id}" title="Delete">🗑</button>
        </div>
      </div>`;
  }).join('');

  // Bind
  list.querySelectorAll('[data-edit-cat]').forEach(b => b.addEventListener('click', () => editCategory(b.dataset.editCat)));
  list.querySelectorAll('[data-del-cat]').forEach(b  => b.addEventListener('click', () => deleteCategory(b.dataset.delCat)));
  list.querySelectorAll('.order-btn').forEach(b => b.addEventListener('click', () => moveCat(+b.dataset.idx, b.dataset.dir)));
}

function saveCategoryForm() {
  const id   = $('edit-cat-id').value || toId($('cat-name-en').value);
  const en   = $('cat-name-en').value.trim();
  const ar   = $('cat-name-ar').value.trim();
  const img  = $('cat-image').value.trim();
  if (!en || !ar) { toast('Name EN and AR are required', 'err'); return; }

  const existing = menu.categories.find(c => c.id === id);
  if (existing) {
    existing.name_en = en; existing.name_ar = ar;
    if (img) existing.image = img;
  } else {
    menu.categories.push({ id, name_en: en, name_ar: ar, image: img, visible: true });
  }

  clearCatForm();
  renderCategories();
  updateCatHints();
  markUnsaved();
  toast('Category saved');
}

function editCategory(id) {
  const cat = menu.categories.find(c => c.id === id);
  if (!cat) return;
  $('edit-cat-id').value = cat.id;
  $('cat-name-en').value = cat.name_en;
  $('cat-name-ar').value = cat.name_ar;
  $('cat-image').value   = cat.image || '';
  updatePreview('cat-image', 'cat-img-preview');
  $('cat-form-title').textContent = 'Edit Category';
  $('cat-name-en').focus();
  $('cat-name-en').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteCategory(id) {
  const count = menu.items.filter(i => i.category === id).length;
  if (!confirm(`Delete this category? It has ${count} item(s). Items will remain but their category will be unassigned.`)) return;
  menu.categories = menu.categories.filter(c => c.id !== id);
  menu.items.forEach(i => { if (i.category === id) i.category = ''; });
  renderCategories();
  updateCatHints();
  markUnsaved();
  toast('Category deleted');
}

function moveCat(idx, dir) {
  const cats = menu.categories;
  if (dir === 'up'   && idx > 0)              [cats[idx-1], cats[idx]] = [cats[idx], cats[idx-1]];
  if (dir === 'down' && idx < cats.length - 1)[cats[idx+1], cats[idx]] = [cats[idx], cats[idx+1]];
  renderCategories();
  markUnsaved();
}

function clearCatForm() {
  $('edit-cat-id').value = '';
  $('cat-name-en').value = '';
  $('cat-name-ar').value = '';
  $('cat-image').value   = '';
  $('cat-img-preview').innerHTML = '<span>Image preview</span>';
  $('cat-form-title').textContent = 'Add New Category';
}

function updateCatHints() {
  const hint = $('cat-ids-hint');
  if (!hint) return;
  const ids = menu.categories.map(c => `<code>${c.id}</code>`).join('  ');
  hint.innerHTML = ids || '<em>no categories yet</em>';
  // Sync category dropdowns in other panels
  ['photo-filter-cat', 'vis-filter-cat', 'edit-cat-sel'].forEach(selId => {
    const sel = $(selId);
    if (!sel) return;
    const all = selId === 'edit-cat-sel' ? '' : '<option value="all">All categories</option>';
    sel.innerHTML = all + menu.categories.map(c => `<option value="${c.id}">${c.name_en}</option>`).join('');
  });
}

/* ══════════════════════════════════════════════════════════════
   STEP 2 — BULK IMPORT
══════════════════════════════════════════════════════════════ */
function parseCSV() {
  const raw = $('csv-input').value.trim();
  if (!raw) { toast('Paste CSV data first', 'err'); return; }

  const lines = raw.split('\n').filter(l => l.trim());
  parsedImport = lines.map((line, i) => {
    // Support both comma and tab separators
    const sep = line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
    const [name_en='', name_ar='', description_en='', description_ar='', price='', category=''] = parts;
    const errors = [];
    if (!name_en) errors.push('Missing Name EN');
    if (!name_ar) errors.push('Missing Name AR');
    const priceNum = parseFloat(price);
    if (isNaN(priceNum)) errors.push('Invalid price');
    if (category && !menu.categories.find(c => c.id === category)) errors.push(`Unknown category "${category}"`);
    return { name_en, name_ar, description_en, description_ar, price: priceNum, category, errors, line: i + 1 };
  });

  const wrap    = $('import-preview-wrap');
  const preview = $('import-preview');
  const count   = $('import-count');

  wrap.style.display = 'block';
  count.textContent  = parsedImport.length;

  preview.innerHTML = parsedImport.map(row => `
    <div class="import-row">
      <span style="color:var(--muted);min-width:24px;font-size:.7rem">${row.line}</span>
      <span style="flex:1"><strong>${row.name_en}</strong> / ${row.name_ar}</span>
      <span>${isNaN(row.price) ? '—' : row.price + ' EGP'}</span>
      <span style="color:var(--muted);font-size:.72rem">${row.category || '—'}</span>
      <span>${row.errors.length ? `<span class="err">⚠ ${row.errors.join(', ')}</span>` : '<span class="ok">✓</span>'}</span>
    </div>`).join('');

  const hasErrors = parsedImport.some(r => r.errors.length > 0);
  $('confirm-import-btn').disabled = hasErrors;
  if (hasErrors) toast('Fix errors before importing', 'err');
  else toast(`${parsedImport.length} items ready to import`);
}

function confirmImport() {
  const valid = parsedImport.filter(r => !r.errors.length);
  valid.forEach(row => {
    menu.items.push({
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2,6),
      category: row.category,
      name_en: row.name_en,
      name_ar: row.name_ar,
      description_en: row.description_en,
      description_ar: row.description_ar,
      price: row.price,
      image: '',
      visible: true,
      featured: false,
    });
  });
  parsedImport = [];
  $('csv-input').value = '';
  $('import-preview-wrap').style.display = 'none';
  $('confirm-import-btn').disabled = true;
  markUnsaved();
  toast(`✓ ${valid.length} items imported! Go to Step 3 to add photos.`);
}

/* ══════════════════════════════════════════════════════════════
   STEP 3 — ASSIGN PHOTOS
══════════════════════════════════════════════════════════════ */
function renderPhotoGrid() {
  const grid = $('photo-grid');
  if (!grid || !menu) return;

  const q       = ($('photo-search') || {value:''}).value.toLowerCase();
  const catF    = ($('photo-filter-cat') || {value:'all'}).value;
  const noImg   = ($('photo-no-image-only') || {checked:false}).checked;

  const items = menu.items.filter(item => {
    const matchCat  = catF === 'all' || item.category === catF;
    const matchQ    = !q || item.name_en.toLowerCase().includes(q) || item.name_ar.includes(q);
    const matchImg  = !noImg || !item.image;
    return matchCat && matchQ && matchImg;
  });

  if (!items.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:.83rem;grid-column:1/-1;text-align:center;padding:32px">No items match your filter.</p>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const cat  = menu.categories.find(c => c.id === item.category);
    const catN = cat ? cat.name_en : item.category || '—';
    const imgHtml = item.image
      ? `<img src="${item.image}" alt="${item.name_en}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
      : `🍽️`;
    return `
      <div class="photo-card">
        <div class="photo-thumb">${imgHtml}</div>
        <div class="photo-body">
          <div class="photo-name">${item.name_en}</div>
          <div class="photo-cat">${catN}</div>
          <input class="fi photo-url" type="url" placeholder="Paste image URL…"
                 value="${item.image || ''}" data-item-id="${item.id}"
                 style="font-size:.72rem;padding:7px 10px">
          <button class="btn btn-gold full-w btn-sm" style="margin-top:6px" data-apply-photo="${item.id}">
            Apply
          </button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('[data-apply-photo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.dataset.applyPhoto;
      const url = grid.querySelector(`[data-item-id="${id}"]`).value.trim();
      const item = menu.items.find(i => i.id === id);
      if (item) { item.image = url; markUnsaved(); renderPhotoGrid(); toast('Photo saved'); }
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   STEP 4 — VISIBILITY
══════════════════════════════════════════════════════════════ */
function renderVisibility() {
  const tbody = $('vis-tbody');
  if (!tbody || !menu) return;

  const q    = ($('vis-search') || {value:''}).value.toLowerCase();
  const catF = ($('vis-filter-cat') || {value:'all'}).value;

  const items = menu.items.filter(item => {
    const matchCat = catF === 'all' || item.category === catF;
    const matchQ   = !q || item.name_en.toLowerCase().includes(q) || item.name_ar.includes(q);
    return matchCat && matchQ;
  });

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">No items match filter</td></tr>`;
    return;
  }

  const currency = menu.restaurant.currency_en;

  tbody.innerHTML = items.map(item => {
    const cat = menu.categories.find(c => c.id === item.category);
    const thumb = item.image
      ? `<img class="thumb" src="${item.image}" alt="" onerror="this.style.display='none'">`
      : `<div class="thumb-ph">🍽️</div>`;
    return `
      <tr>
        <td>${thumb}</td>
        <td>
          <strong>${item.name_en}</strong><br>
          <small style="color:var(--muted)" dir="rtl">${item.name_ar}</small>
        </td>
        <td><span class="pill pill-gold">${cat ? cat.name_en : item.category || '—'}</span></td>
        <td><strong style="color:var(--gold)">${item.price} ${currency}</strong></td>
        <td>
          <label class="toggle" title="Toggle visibility">
            <input type="checkbox" ${item.visible !== false ? 'checked' : ''} data-vis="${item.id}">
            <span class="toggle-track"></span>
          </label>
        </td>
        <td>
          <label class="toggle" title="Toggle featured">
            <input type="checkbox" ${item.featured ? 'checked' : ''} data-feat="${item.id}">
            <span class="toggle-track"></span>
          </label>
        </td>
        <td>
          <div class="actions">
            <button class="btn btn-icon" data-edit-item="${item.id}" title="Edit">✏️</button>
            <button class="btn btn-icon btn-danger btn-sm" data-del-item="${item.id}" title="Delete">🗑</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Bind toggles
  tbody.querySelectorAll('[data-vis]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = menu.items.find(i => i.id === cb.dataset.vis);
      if (item) { item.visible = cb.checked; markUnsaved(); updateStats(); }
    });
  });
  tbody.querySelectorAll('[data-feat]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = menu.items.find(i => i.id === cb.dataset.feat);
      if (item) { item.featured = cb.checked; markUnsaved(); }
    });
  });
  tbody.querySelectorAll('[data-edit-item]').forEach(b => b.addEventListener('click', () => openEditModal(b.dataset.editItem)));
  tbody.querySelectorAll('[data-del-item]').forEach(b  => b.addEventListener('click', () => deleteItem(b.dataset.delItem)));
}

function updateStats() {
  if (!menu) return;
  const total    = menu.items.length;
  const visible  = menu.items.filter(i => i.visible !== false).length;
  const hidden   = total - visible;
  const featured = menu.items.filter(i => i.featured).length;
  $('vis-total')  .textContent = total;
  $('vis-visible').textContent = visible;
  $('vis-hidden') .textContent = hidden;
  $('vis-featured').textContent = featured;
}

function deleteItem(id) {
  const item = menu.items.find(i => i.id === id);
  if (!item || !confirm(`Delete "${item.name_en}"?`)) return;
  menu.items = menu.items.filter(i => i.id !== id);
  renderVisibility();
  updateStats();
  markUnsaved();
  toast('Item deleted');
}

/* ── Edit item modal ── */
function openEditModal(id) {
  const item = menu.items.find(i => i.id === id);
  if (!item) return;

  $('edit-item-id').value  = id;
  $('edit-name-en').value  = item.name_en;
  $('edit-name-ar').value  = item.name_ar;
  $('edit-desc-en').value  = item.description_en || '';
  $('edit-desc-ar').value  = item.description_ar || '';
  $('edit-price').value    = item.price;
  $('edit-image').value    = item.image || '';
  $('edit-visible').checked  = item.visible !== false;
  $('edit-featured').checked = !!item.featured;

  updateCatHints(); // ensure dropdown populated
  const sel = $('edit-cat-sel');
  if (sel) sel.value = item.category;

  updatePreview('edit-image', 'edit-img-preview');
  $('edit-modal').classList.add('open');
}

function saveEditModal() {
  const id   = $('edit-item-id').value;
  const item = menu.items.find(i => i.id === id);
  if (!item) return;

  const en = $('edit-name-en').value.trim();
  const ar = $('edit-name-ar').value.trim();
  if (!en || !ar) { toast('Name EN and AR are required', 'err'); return; }

  item.name_en        = en;
  item.name_ar        = ar;
  item.description_en = $('edit-desc-en').value.trim();
  item.description_ar = $('edit-desc-ar').value.trim();
  item.price          = parseFloat($('edit-price').value) || item.price;
  item.category       = $('edit-cat-sel').value;
  item.image          = $('edit-image').value.trim();
  item.visible        = $('edit-visible').checked;
  item.featured       = $('edit-featured').checked;

  $('edit-modal').classList.remove('open');
  renderVisibility();
  renderPhotoGrid();
  updateStats();
  markUnsaved();
  toast('Item updated');
}

/* ══════════════════════════════════════════════════════════════
   STEP 5 — SAVE & PUBLISH
══════════════════════════════════════════════════════════════ */
function downloadJSON() {
  const json = JSON.stringify(menu, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'menu.json' });
  a.click();
  URL.revokeObjectURL(url);
  $('unsaved-badge').style.display = 'none';
  toast('menu.json downloaded — upload it to GitHub to publish');
}

async function pushToGitHub() {
  const pw = $('save-password').value.trim();
  if (!pw) { toast('Enter your admin password to confirm', 'err'); return; }

  const btn = $('push-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  $('push-status').textContent = '';

  try {
    const res = await fetch('/api/update-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, menuData: menu }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      $('unsaved-badge').style.display = 'none';
      $('save-password').value = '';
      $('push-status').textContent = '✓ Published! Site updates in ~30s';
      $('push-status').style.color = 'var(--green)';
      toast('✅ Menu published to GitHub!');
    } else {
      $('push-status').textContent = '❌ ' + (data.error || 'Error — check Netlify env vars');
      $('push-status').style.color = 'var(--red)';
      toast(data.error || 'Push failed', 'err');
    }
  } catch (e) {
    $('push-status').textContent = '❌ Network error — try downloading instead';
    $('push-status').style.color = 'var(--red)';
    toast('Network error', 'err');
  }

  btn.disabled = false;
  btn.textContent = '🚀 Save & Publish';
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function toId(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function updatePreview(inputId, previewId) {
  const url = $(inputId).value.trim();
  const el  = $(previewId);
  if (!el) return;
  el.innerHTML = url
    ? `<img src="${url}" alt="preview" onerror="this.parentElement.innerHTML='<span>Image not found</span>'">`
    : '<span>Image preview</span>';
}

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  /* ── Login ── */
  $('login-btn').addEventListener('click', login);
  $('pw-input').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

  /* ── Step nav ── */
  $$('.step-btn').forEach(btn =>
    btn.addEventListener('click', () => goStep(btn.dataset.step)));

  /* ── Category form ── */
  $('save-cat-btn').addEventListener('click', saveCategoryForm);
  $('clear-cat-btn').addEventListener('click', clearCatForm);
  $('cat-image').addEventListener('input', () => updatePreview('cat-image', 'cat-img-preview'));

  /* ── Bulk import ── */
  $('parse-btn').addEventListener('click', parseCSV);
  $('confirm-import-btn').addEventListener('click', confirmImport);
  $('load-example-btn').addEventListener('click', () => {
    $('csv-input').value =
`Cappuccino, كابوتشينو, Espresso with steamed milk foam, إسبريسو مع رغوة الحليب, 85, hot-drinks
Iced Latte, لاتيه مثلج, Cold espresso over ice, إسبريسو بارد على الثلج, 95, cold-drinks
Mango Smoothie, عصير مانجو, Fresh mango blended, مانجو طازج, 110, smoothies
Grilled Chicken Sandwich, ساندويتش دجاج مشوي, Grilled chicken with garlic sauce, دجاج مشوي بصلصة الثوم, 165, sandwiches`;
  });

  /* ── Photo grid filters ── */
  ['photo-search', 'photo-filter-cat', 'photo-no-image-only'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', renderPhotoGrid);
  });

  /* ── Visibility filters ── */
  ['vis-search', 'vis-filter-cat'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', renderVisibility);
  });
  $('show-all-btn').addEventListener('click', () => {
    menu.items.forEach(i => i.visible = true);
    renderVisibility(); updateStats(); markUnsaved(); toast('All items visible');
  });
  $('hide-all-btn').addEventListener('click', () => {
    if (!confirm('Hide ALL items from the menu?')) return;
    menu.items.forEach(i => i.visible = false);
    renderVisibility(); updateStats(); markUnsaved(); toast('All items hidden');
  });

  /* ── Edit modal ── */
  $('edit-modal-close').addEventListener('click', () => $('edit-modal').classList.remove('open'));
  $('edit-cancel-btn').addEventListener('click',  () => $('edit-modal').classList.remove('open'));
  $('edit-save-btn').addEventListener('click', saveEditModal);
  $('edit-image').addEventListener('input', () => updatePreview('edit-image', 'edit-img-preview'));
  $('edit-modal').addEventListener('click', e => {
    if (e.target === $('edit-modal')) $('edit-modal').classList.remove('open');
  });

  /* ── Save ── */
  $('download-btn').addEventListener('click', downloadJSON);
  $('push-btn').addEventListener('click', pushToGitHub);
});

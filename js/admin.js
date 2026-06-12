/* ============================================================
   AURA CAFÉ — Admin Panel
   Password → /api/update-menu (Vercel function, never in code)
   ============================================================ */
'use strict';

let menu = null;
let adminPw = '';
let parsedImport = [];

const $ = id => document.getElementById(id);
const $$ = s  => document.querySelectorAll(s);

/* ── Toast ─────────────────────────────────────────────────── */
function toast(msg, type = 'ok') {
  const el = $('toast');
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 4500);
}

/* ── Step nav ───────────────────────────────────────────────── */
function goStep(id) {
  $$('.step-panel').forEach(p => {
    p.classList.remove('active');
    p.style.display = '';
  });
  $$('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === id));
  $(id).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (id === 'step-sections')   renderSecList();
  if (id === 'step-import')     syncCatDropdowns();
  if (id === 'step-photos')     renderPhotoGrid();
  if (id === 'step-visibility') { renderVisTable(); updateStats(); }
}
window.goStep = goStep;

/* ══════════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════════ */
async function login() {
  const pw = $('pw-input').value.trim();
  if (!pw) return;
  $('login-err').style.display  = 'none';
  $('login-spin').style.display = 'block';
  $('login-btn').disabled       = true;

  try {
    const res = await fetch('/api/update-menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, checkOnly: true }),
    });
    $('login-spin').style.display = 'none';
    $('login-btn').disabled = false;

    if (res.status === 200) {
      adminPw = pw;
      $('login-screen').style.display = 'none';
      $('admin-app').style.display    = 'block';
      loadMenu();
    } else if (res.status === 401) {
      $('login-err').style.display = 'block';
      $('pw-input').value = ''; $('pw-input').focus();
    } else {
      adminPw = pw;
      $('login-screen').style.display = 'none';
      $('admin-app').style.display    = 'block';
      loadMenu();
      toast('⚠ Vercel not configured — download-only mode', 'err');
    }
  } catch {
    $('login-spin').style.display = 'none';
    $('login-btn').disabled = false;
    adminPw = pw;
    $('login-screen').style.display = 'none';
    $('admin-app').style.display    = 'block';
    loadMenu();
    toast('⚠ Local mode — download only', 'err');
  }
}

/* ══════════════════════════════════════════════════════════════
   LOAD MENU
══════════════════════════════════════════════════════════════ */
async function loadMenu() {
  try {
    const res = await fetch('../menu.json?_=' + Date.now());
    menu = await res.json();
    if (!menu.sections)    menu.sections    = [];
    if (!menu.categories)  menu.categories  = [];
    if (!menu.items)       menu.items       = [];
    menu.items.forEach(i => { if (i.visible === undefined) i.visible = true; });
    refreshAll();
  } catch { toast('Could not load menu.json', 'err'); }
}

function refreshAll() {
  syncSecDropdowns();
  syncCatDropdowns();
  renderSecList();
  renderCatList();
  renderPhotoGrid();
  renderVisTable();
  updateStats();
  loadContactForm();
  loadAboutForm();
}

function markUnsaved() { $('unsaved-badge').style.display = 'inline-block'; }

/* ══════════════════════════════════════════════════════════════
   STEP 1 — SECTIONS
══════════════════════════════════════════════════════════════ */
function renderSecList() {
  const el = $('sec-list');
  if (!el || !menu) return;
  if (!menu.sections.length) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px;font-size:.83rem">No sections yet. Add one above.</p>';
    return;
  }

  const emojis = { 'main-menu': '🍽️', 'delivery': '🛵', 'breakfast': '🌅' };

  el.innerHTML = menu.sections.map((sec, idx) => {
    const catCount = menu.categories.filter(c => c.section === sec.id).length;
    const imgEl = sec.image
      ? `<div class="cat-row-img"><img src="${sec.image}" onerror="this.style.display='none'" alt=""></div>`
      : `<div class="cat-row-img">${emojis[sec.id] || '📋'}</div>`;
    const vis = sec.visible !== false;
    return `
      <div class="cat-row">
        ${imgEl}
        <div class="cat-row-info">
          <div class="cat-row-name">${sec.name_en} / <span dir="rtl">${sec.name_ar}</span>
            ${!vis ? '<span class="pill" style="background:rgba(255,255,255,.06);color:var(--muted);margin-left:6px">Hidden</span>' : ''}
          </div>
          <div class="cat-row-meta">ID: <code>${sec.id}</code> &nbsp;•&nbsp; ${catCount} category${catCount !== 1 ? 'ies' : 'y'}</div>
        </div>
        <div class="cat-row-order">
          <button class="order-btn" data-dir="up"   data-idx="${idx}">▲</button>
          <button class="order-btn" data-dir="down" data-idx="${idx}">▼</button>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-icon" data-edit-sec="${sec.id}">✏️</button>
          <button class="btn btn-icon btn-danger btn-sm" data-del-sec="${sec.id}">🗑</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('[data-edit-sec]').forEach(b  => b.addEventListener('click', () => editSec(b.dataset.editSec)));
  el.querySelectorAll('[data-del-sec]').forEach(b   => b.addEventListener('click', () => delSec(b.dataset.delSec)));
  el.querySelectorAll('.order-btn').forEach(b => b.addEventListener('click', () => moveSec(+b.dataset.idx, b.dataset.dir)));
}

function saveSecForm() {
  const existingId = $('edit-sec-id').value;
  const en  = $('sec-name-en').value.trim();
  const ar  = $('sec-name-ar').value.trim();
  const img = $('sec-image-url').value.trim();
  const vis = $('sec-visible').checked;
  if (!en || !ar) { toast('Name EN and AR are required', 'err'); return; }

  const id = existingId || toId(en);

  const ex = menu.sections.find(s => s.id === id);
  if (ex) {
    ex.name_en       = en;
    ex.name_ar       = ar;
    ex.description_en = $('sec-desc-en').value.trim();
    ex.description_ar = $('sec-desc-ar').value.trim();
    if (img) ex.image = img;
    ex.visible = vis;
  } else {
    menu.sections.push({
      id,
      name_en:       en,
      name_ar:       ar,
      description_en: $('sec-desc-en').value.trim(),
      description_ar: $('sec-desc-ar').value.trim(),
      image:  img,
      visible: vis,
    });
  }

  clearSecForm();
  renderSecList();
  syncSecDropdowns();
  syncCatDropdowns();
  markUnsaved();
  toast('Section saved');
}

function editSec(id) {
  const sec = menu.sections.find(s => s.id === id);
  if (!sec) return;
  $('edit-sec-id').value    = sec.id;
  $('sec-name-en').value    = sec.name_en;
  $('sec-name-ar').value    = sec.name_ar;
  $('sec-desc-en').value    = sec.description_en || '';
  $('sec-desc-ar').value    = sec.description_ar || '';
  $('sec-image-url').value  = sec.image || '';
  $('sec-visible').checked  = sec.visible !== false;
  previewUrl('sec-image-url', 'sec-img-prev');
  $('sec-form-title').textContent = 'Edit Section';
  $('sec-name-en').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function delSec(id) {
  const catCount = menu.categories.filter(c => c.section === id).length;
  if (!confirm(`Delete this section? ${catCount} categor${catCount !== 1 ? 'ies' : 'y'} will be unassigned.`)) return;
  menu.sections = menu.sections.filter(s => s.id !== id);
  menu.categories.forEach(c => { if (c.section === id) c.section = ''; });
  renderSecList(); syncSecDropdowns(); syncCatDropdowns(); markUnsaved(); toast('Section deleted');
}

function moveSec(idx, dir) {
  const a = menu.sections;
  if (dir === 'up'   && idx > 0)         [a[idx-1], a[idx]] = [a[idx], a[idx-1]];
  if (dir === 'down' && idx < a.length-1) [a[idx+1], a[idx]] = [a[idx], a[idx+1]];
  renderSecList(); markUnsaved();
}

function clearSecForm() {
  ['edit-sec-id','sec-name-en','sec-name-ar','sec-desc-en','sec-desc-ar','sec-image-url'].forEach(id => {
    const el = $(id); if (el) el.value = '';
  });
  const p = $('sec-img-prev'); if (p) p.innerHTML = '<span>Preview</span>';
  const v = $('sec-visible'); if (v) v.checked = true;
  $('sec-form-title').textContent = 'Add New Section';
}

async function uploadSecImage() {
  const file = $('sec-image-file').files[0];
  if (!file) return;
  await uploadImageFile(file, url => {
    $('sec-image-url').value = url;
    previewUrl('sec-image-url', 'sec-img-prev');
    toast('Image uploaded: ' + url);
  });
}

/* ══════════════════════════════════════════════════════════════
   STEP 2 — CATEGORIES
══════════════════════════════════════════════════════════════ */
function renderCatList() {
  const el = $('cat-list');
  if (!el || !menu) return;
  if (!menu.categories.length) {
    el.innerHTML = '<p style="color:var(--muted);text-align:center;padding:24px;font-size:.83rem">No categories yet.</p>';
    return;
  }
  el.innerHTML = menu.categories.map((cat, idx) => {
    const count = menu.items.filter(i => i.category === cat.id).length;
    const sec   = menu.sections.find(s => s.id === cat.section);
    const imgEl = cat.image
      ? `<div class="cat-row-img"><img src="${cat.image}" onerror="this.style.display='none'" alt=""></div>`
      : `<div class="cat-row-img">${cat.icon || '🍽️'}</div>`;
    return `
      <div class="cat-row">
        ${imgEl}
        <div class="cat-row-info">
          <div class="cat-row-name">${cat.name_en} / <span dir="rtl">${cat.name_ar}</span></div>
          <div class="cat-row-meta">ID: <code>${cat.id}</code> &nbsp;•&nbsp; ${count} item${count !== 1 ? 's' : ''} &nbsp;•&nbsp; Section: <code>${sec ? sec.name_en : (cat.section || 'none')}</code></div>
        </div>
        <div class="cat-row-order">
          <button class="order-btn" data-dir="up"   data-idx="${idx}">▲</button>
          <button class="order-btn" data-dir="down" data-idx="${idx}">▼</button>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-icon" data-edit-cat="${cat.id}">✏️</button>
          <button class="btn btn-icon btn-danger btn-sm" data-del-cat="${cat.id}">🗑</button>
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('[data-edit-cat]').forEach(b => b.addEventListener('click', () => editCat(b.dataset.editCat)));
  el.querySelectorAll('[data-del-cat]').forEach(b  => b.addEventListener('click', () => delCat(b.dataset.delCat)));
  el.querySelectorAll('.order-btn').forEach(b => b.addEventListener('click', () => moveCat(+b.dataset.idx, b.dataset.dir)));
}

function saveCatForm() {
  const id   = $('edit-cat-id').value || toId($('cat-name-en').value);
  const en   = $('cat-name-en').value.trim();
  const ar   = $('cat-name-ar').value.trim();
  const img  = $('cat-image-url').value.trim();
  const sec  = $('cat-section').value;
  if (!en || !ar) { toast('Name EN and AR required', 'err'); return; }

  const ex = menu.categories.find(c => c.id === id);
  if (ex) {
    ex.name_en = en; ex.name_ar = ar;
    if (img) ex.image = img;
    ex.section = sec;
  } else {
    menu.categories.push({ id, name_en: en, name_ar: ar, image: img, section: sec, visible: true });
  }

  clearCatForm();
  renderCatList();
  syncCatDropdowns();
  markUnsaved();
  toast('Category saved');
}

function editCat(id) {
  const cat = menu.categories.find(c => c.id === id);
  if (!cat) return;
  $('edit-cat-id').value    = cat.id;
  $('cat-name-en').value    = cat.name_en;
  $('cat-name-ar').value    = cat.name_ar;
  $('cat-image-url').value  = cat.image || '';
  syncSecDropdowns();   // ensure options are populated
  $('cat-section').value    = cat.section || '';
  previewUrl('cat-image-url', 'cat-img-prev');
  $('cat-form-title').textContent = 'Edit Category';
  $('cat-name-en').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function delCat(id) {
  const n = menu.items.filter(i => i.category === id).length;
  if (!confirm(`Delete this category? ${n} item(s) will become uncategorised.`)) return;
  menu.categories = menu.categories.filter(c => c.id !== id);
  menu.items.forEach(i => { if (i.category === id) i.category = ''; });
  renderCatList(); syncCatDropdowns(); markUnsaved(); toast('Category deleted');
}

function moveCat(idx, dir) {
  const a = menu.categories;
  if (dir === 'up'   && idx > 0)        [a[idx-1], a[idx]] = [a[idx], a[idx-1]];
  if (dir === 'down' && idx < a.length-1)[a[idx+1], a[idx]] = [a[idx], a[idx+1]];
  renderCatList(); markUnsaved();
}

function clearCatForm() {
  ['edit-cat-id','cat-name-en','cat-name-ar','cat-image-url'].forEach(id => { const el=$(id); if(el) el.value=''; });
  const p = $('cat-img-prev'); if(p) p.innerHTML='<span>Preview</span>';
  const s = $('cat-section'); if(s) s.value='';
  $('cat-form-title').textContent = 'Add New Category';
}

async function uploadCatImage() {
  const file = $('cat-image-file').files[0];
  if (!file) return;
  await uploadImageFile(file, url => {
    $('cat-image-url').value = url;
    previewUrl('cat-image-url', 'cat-img-prev');
    toast('Image uploaded: ' + url);
  });
}

/* ══════════════════════════════════════════════════════════════
   STEP 3 — ADD SINGLE ITEM (manual)
══════════════════════════════════════════════════════════════ */
function saveManualItem() {
  const en = $('m-name-en').value.trim();
  const ar = $('m-name-ar').value.trim();
  const price = parseFloat($('m-price').value);
  if (!en || !ar || isNaN(price)) { toast('Name EN, Name AR and Price required', 'err'); return; }

  const item = {
    id: 'item-' + Date.now(),
    category: $('m-category').value,
    name_en: en, name_ar: ar,
    description_en: $('m-desc-en').value.trim(),
    description_ar: $('m-desc-ar').value.trim(),
    price, image: $('m-image-url').value.trim(),
    video_url: $('m-video-url').value.trim(),
    visible: true, featured: $('m-featured').checked,
  };
  menu.items.push(item);
  clearManualForm();
  syncCatDropdowns();
  updateStats();
  markUnsaved();
  toast('✓ Item added! Go to Step 5 to set visibility or Step 4 to add a photo.');
}

function clearManualForm() {
  ['m-name-en','m-name-ar','m-desc-en','m-desc-ar','m-price','m-image-url','m-video-url'].forEach(id => {
    const el = $(id); if (el) el.value = '';
  });
  const p = $('m-img-prev'); if (p) p.innerHTML = '<span>Preview</span>';
  const f = $('m-featured'); if (f) f.checked = false;
}

async function uploadManualImage() {
  const file = $('m-image-file').files[0];
  if (!file) return;
  await uploadImageFile(file, url => {
    $('m-image-url').value = url;
    previewUrl('m-image-url', 'm-img-prev');
    toast('Image uploaded');
  });
}

/* ══════════════════════════════════════════════════════════════
   STEP 4 — BULK IMPORT (CSV paste OR Excel file upload)
══════════════════════════════════════════════════════════════ */

/* ── Parse a raw array of row arrays into import records ── */
function parseRows(rows) {
  // Skip header row if it starts with 'name' (case-insensitive)
  const start = (rows[0] && String(rows[0][0]).toLowerCase().startsWith('name')) ? 1 : 0;
  parsedImport = rows.slice(start).filter(r => r.some(c => String(c||'').trim())).map((cols, i) => {
    const [name_en='', name_ar='', description_en='', description_ar='', price='', category='', image='', video_url='']
      = cols.map(c => String(c ?? '').trim());
    const errors = [];
    if (!name_en) errors.push('Missing Name EN');
    if (!name_ar) errors.push('Missing Name AR');
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) errors.push('Invalid price');
    if (!category) errors.push('Category ID is required');
    else if (!menu.categories.find(c => c.id === category)) errors.push(`Unknown category "${category}"`);
    return { name_en, name_ar, description_en, description_ar, price: priceNum, category, image, video_url, errors, line: start + i + 1 };
  });
  showImportPreview();
}

/* ── Parse pasted CSV / TSV text ── */
function parseCSV() {
  const raw = $('csv-input').value.trim();
  if (!raw) { toast('Paste data first, then click Preview', 'err'); return; }
  const rows = raw.split('\n').filter(l => l.trim()).map(line => {
    const sep = line.includes('\t') ? '\t' : ',';
    return line.split(sep).map(p => p.trim().replace(/^["']|["']$/g, ''));
  });
  parseRows(rows);
}

/* ── Parse uploaded Excel / CSV file ── */
function handleImportFile(file) {
  if (!file) return;
  $('import-file-name').textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = XLSX.read(e.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      parseRows(rows);
      toast(`File loaded: ${file.name}`);
    } catch { toast('Could not read file. Use .xlsx or .csv', 'err'); }
  };
  reader.readAsBinaryString(file);
}

/* ── Render import preview table ── */
function showImportPreview() {
  if (!parsedImport.length) { toast('No data to preview', 'err'); return; }

  const okCount  = parsedImport.filter(r => !r.errors.length).length;
  const errCount = parsedImport.length - okCount;

  $('import-ok-count').textContent  = okCount;
  $('import-err-count').textContent = errCount;
  $('import-preview-wrap').style.display = 'block';

  $('import-preview').innerHTML = parsedImport.map(r => {
    const cat = menu.categories.find(c => c.id === r.category);
    const sec = cat ? (menu.sections.find(s => s.id === cat.section) || {}).name_en || '' : '';
    return `
      <div class="import-row">
        <span style="color:var(--muted);min-width:24px;font-size:.7rem">#${r.line}</span>
        <span style="flex:1;min-width:0">
          <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name_en || '—'}</strong>
          <small dir="rtl" style="color:var(--muted)">${r.name_ar || ''}</small>
        </span>
        <span style="white-space:nowrap;color:var(--gold);font-size:.8rem">${isNaN(r.price)?'—':r.price+' EGP'}</span>
        <span style="color:var(--muted);font-size:.72rem;white-space:nowrap">
          ${cat ? cat.name_en : (r.category||'—')}${sec?' · '+sec:''}
        </span>
        <span style="white-space:nowrap">
          ${r.errors.length
            ? `<span class="err" title="${r.errors.join('; ')}">⚠ ${r.errors[0]}${r.errors.length>1?' +'+( r.errors.length-1):''}</span>`
            : '<span class="ok">✓ OK</span>'}
        </span>
      </div>`;
  }).join('');

  // Only enable confirm when there are items with no errors
  $('confirm-import-btn').disabled = okCount === 0;

  const msg = errCount > 0
    ? `${okCount} item${okCount!==1?'s':''} will be imported · ${errCount} skipped (errors)`
    : `${okCount} items ready — no errors found`;
  toast(msg, errCount > 0 ? 'err' : 'ok');
}

function confirmImport() {
  const valid = parsedImport.filter(r => !r.errors.length);
  valid.forEach(r => {
    menu.items.push({
      id: 'item-' + Date.now() + '-' + Math.random().toString(36).slice(2,5),
      category: r.category,
      name_en: r.name_en, name_ar: r.name_ar,
      description_en: r.description_en, description_ar: r.description_ar,
      price: r.price, image: r.image || '', video_url: r.video_url || '',
      visible: true, featured: false,
    });
  });
  const n = valid.length;
  const skipped = parsedImport.length - n;
  parsedImport = [];
  $('csv-input').value = '';
  $('import-file-name').textContent = 'No file chosen';
  $('import-preview-wrap').style.display = 'none';
  $('confirm-import-btn').disabled = true;
  updateStats(); markUnsaved();
  toast(`✅ ${n} item${n!==1?'s':''} imported${skipped?` · ${skipped} skipped`:''}!`);
}

function cancelImport() {
  parsedImport = [];
  $('import-preview-wrap').style.display = 'none';
  $('csv-input').value = '';
  $('import-file-name').textContent = 'No file chosen';
}

/* ══════════════════════════════════════════════════════════════
   STEP 5 — PHOTOS
══════════════════════════════════════════════════════════════ */
function renderPhotoGrid() {
  const grid = $('photo-grid');
  if (!grid || !menu) return;

  const q    = ($('photo-search')||{value:''}).value.toLowerCase();
  const catF = ($('photo-filter-cat')||{value:'all'}).value;
  const noImg= ($('photo-no-img')||{checked:false}).checked;

  const items = menu.items.filter(i => {
    const matchCat = catF==='all' || i.category===catF;
    const matchQ   = !q || i.name_en.toLowerCase().includes(q) || i.name_ar.includes(q);
    const matchImg = !noImg || !i.image;
    return matchCat && matchQ && matchImg;
  });

  if (!items.length) {
    grid.innerHTML = '<p style="color:var(--muted);font-size:.83rem;grid-column:1/-1;text-align:center;padding:32px">No items match.</p>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const cat = menu.categories.find(c => c.id === item.category);
    const thumb = item.image
      ? `<img src="${item.image}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'">`
      : '🍽️';
    return `
      <div class="photo-card">
        <div class="photo-thumb">${thumb}</div>
        <div class="photo-body">
          <div class="photo-name">${item.name_en}</div>
          <div class="photo-cat">${cat ? cat.name_en : item.category||'—'}</div>
          <label class="btn btn-outline btn-sm full-w" style="margin-bottom:6px;justify-content:center;cursor:pointer">
            📁 Upload Image
            <input type="file" accept="image/*" style="display:none" data-upload-for="${item.id}">
          </label>
          <input class="fi photo-url-input" type="url" placeholder="Or paste image URL…"
                 value="${item.image||''}" data-item-id="${item.id}" style="font-size:.72rem;padding:7px 10px;margin-bottom:4px">
          <input class="fi" type="url" placeholder="YouTube URL (optional)"
                 value="${item.video_url||''}" data-video-id="${item.id}" style="font-size:.72rem;padding:7px 10px;margin-bottom:6px">
          <button class="btn btn-gold full-w btn-sm" data-apply-photo="${item.id}">Apply</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('input[data-upload-for]').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files[0];
      const id   = input.dataset.uploadFor;
      if (!file) return;
      const btn = input.closest('.photo-card').querySelector('[data-apply-photo]');
      btn.textContent = 'Uploading…'; btn.disabled = true;
      await uploadImageFile(file, url => {
        const urlInput = grid.querySelector(`[data-item-id="${id}"]`);
        if (urlInput) urlInput.value = url;
        toast('Image uploaded');
      });
      btn.textContent = 'Apply'; btn.disabled = false;
    });
  });

  grid.querySelectorAll('[data-apply-photo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.dataset.applyPhoto;
      const url = grid.querySelector(`[data-item-id="${id}"]`).value.trim();
      const vid = grid.querySelector(`[data-video-id="${id}"]`).value.trim();
      const item = menu.items.find(i => i.id === id);
      if (item) { item.image = url; item.video_url = vid; markUnsaved(); toast('Saved'); renderPhotoGrid(); }
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   IMAGE UPLOAD HELPER
══════════════════════════════════════════════════════════════ */
async function uploadImageFile(file, onSuccess) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = async e => {
      const base64  = e.target.result;
      const content = base64.split(',')[1];
      try {
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: adminPw, filename: file.name, content, mimeType: file.type }),
        });
        const data = await res.json();
        if (res.ok) { onSuccess(data.url); }
        else { toast('Upload failed: ' + (data.error || 'Unknown error'), 'err'); }
      } catch { toast('Network error during upload', 'err'); }
      resolve();
    };
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════════════
   STEP 6 — VISIBILITY
══════════════════════════════════════════════════════════════ */
function renderVisTable() {
  const tbody = $('vis-tbody');
  if (!tbody || !menu) return;

  const q    = ($('vis-search')||{value:''}).value.toLowerCase();
  const catF = ($('vis-filter-cat')||{value:'all'}).value;
  const items = menu.items.filter(i => {
    const matchCat = catF==='all' || i.category===catF;
    const matchQ   = !q || i.name_en.toLowerCase().includes(q) || i.name_ar.includes(q);
    return matchCat && matchQ;
  });

  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">No items match</td></tr>`;
    return;
  }
  const cur = menu.restaurant.currency_en;
  tbody.innerHTML = items.map(item => {
    const cat = menu.categories.find(c => c.id === item.category);
    const thumb = item.image
      ? `<img class="thumb" src="${item.image}" onerror="this.style.display='none'" alt="">`
      : `<div class="thumb-ph">🍽️</div>`;
    return `<tr>
      <td>${thumb}</td>
      <td><strong>${item.name_en}</strong><br><small dir="rtl" style="color:var(--muted)">${item.name_ar}</small></td>
      <td><span class="pill pill-gold">${cat?cat.name_en:item.category||'—'}</span></td>
      <td><strong style="color:var(--gold)">${item.price} ${cur}</strong></td>
      <td><label class="toggle"><input type="checkbox" ${item.visible!==false?'checked':''} data-vis="${item.id}"><span class="toggle-track"></span></label></td>
      <td><label class="toggle"><input type="checkbox" ${item.featured?'checked':''} data-feat="${item.id}"><span class="toggle-track"></span></label></td>
      <td><div class="actions">
        <button class="btn btn-icon" data-edit-item="${item.id}">✏️</button>
        <button class="btn btn-icon btn-danger btn-sm" data-del-item="${item.id}">🗑</button>
      </div></td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('[data-vis]').forEach(cb => cb.addEventListener('change', () => {
    const i = menu.items.find(x => x.id===cb.dataset.vis); if(i){i.visible=cb.checked;markUnsaved();updateStats();}
  }));
  tbody.querySelectorAll('[data-feat]').forEach(cb => cb.addEventListener('change', () => {
    const i = menu.items.find(x => x.id===cb.dataset.feat); if(i){i.featured=cb.checked;markUnsaved();}
  }));
  tbody.querySelectorAll('[data-edit-item]').forEach(b => b.addEventListener('click', () => openEditModal(b.dataset.editItem)));
  tbody.querySelectorAll('[data-del-item]').forEach(b  => b.addEventListener('click', () => delItem(b.dataset.delItem)));
}

function updateStats() {
  if (!menu) return;
  const total = menu.items.length;
  const vis   = menu.items.filter(i => i.visible!==false).length;
  $('stat-total').textContent    = total;
  $('stat-visible').textContent  = vis;
  $('stat-hidden').textContent   = total - vis;
  $('stat-featured').textContent = menu.items.filter(i=>i.featured).length;
}

function delItem(id) {
  const i = menu.items.find(x => x.id===id);
  if (!i || !confirm(`Delete "${i.name_en}"?`)) return;
  menu.items = menu.items.filter(x => x.id!==id);
  renderVisTable(); updateStats(); markUnsaved(); toast('Item deleted');
}

/* ── Edit item modal ── */
function openEditModal(id) {
  const item = menu.items.find(i => i.id===id);
  if (!item) return;
  $('edit-item-id').value    = id;
  $('edit-name-en').value    = item.name_en;
  $('edit-name-ar').value    = item.name_ar;
  $('edit-desc-en').value    = item.description_en||'';
  $('edit-desc-ar').value    = item.description_ar||'';
  $('edit-price').value      = item.price;
  $('edit-image').value      = item.image||'';
  $('edit-video').value      = item.video_url||'';
  $('edit-visible').checked  = item.visible!==false;
  $('edit-featured').checked = !!item.featured;
  syncCatDropdowns();
  $('edit-cat-sel').value    = item.category;
  previewUrl('edit-image','edit-img-prev');
  $('edit-modal').classList.add('open');
}

function saveEditModal() {
  const id   = $('edit-item-id').value;
  const item = menu.items.find(i => i.id===id);
  if (!item) return;
  const en = $('edit-name-en').value.trim();
  const ar = $('edit-name-ar').value.trim();
  if (!en||!ar) { toast('Name EN and AR required','err'); return; }
  item.name_en = en; item.name_ar = ar;
  item.description_en = $('edit-desc-en').value.trim();
  item.description_ar = $('edit-desc-ar').value.trim();
  item.price     = parseFloat($('edit-price').value)||item.price;
  item.category  = $('edit-cat-sel').value;
  item.image     = $('edit-image').value.trim();
  item.video_url = $('edit-video').value.trim();
  item.visible   = $('edit-visible').checked;
  item.featured  = $('edit-featured').checked;
  $('edit-modal').classList.remove('open');
  renderVisTable(); renderPhotoGrid(); updateStats(); markUnsaved(); toast('Item updated');
}

async function uploadEditImage() {
  const file = $('edit-image-file').files[0];
  if (!file) return;
  await uploadImageFile(file, url => { $('edit-image').value = url; previewUrl('edit-image','edit-img-prev'); toast('Image uploaded'); });
}

/* ══════════════════════════════════════════════════════════════
   STEP 7 — CONTACT & ABOUT
══════════════════════════════════════════════════════════════ */
function loadContactForm() {
  if (!menu) return;
  const c = menu.restaurant.contact || {};
  ['phone','whatsapp','instagram','facebook','tiktok','address_en','address_ar','maps_url'].forEach(f => {
    const el = $('c-'+f); if(el) el.value = c[f]||'';
  });
}

function saveContact() {
  if (!menu.restaurant.contact) menu.restaurant.contact = {};
  const c = menu.restaurant.contact;
  ['phone','whatsapp','instagram','facebook','tiktok','address_en','address_ar','maps_url'].forEach(f => {
    const el = $('c-'+f); if(el) c[f] = el.value.trim();
  });
  markUnsaved(); toast('Contact info saved (remember to Save & Publish)');
}

function loadAboutForm() {
  if (!menu) return;
  const r = menu.restaurant;
  ['name_en','name_ar','tagline_en','tagline_ar','about_en','about_ar'].forEach(f => {
    const el = $('r-'+f); if(el) el.value = r[f]||'';
  });
}

function saveAbout() {
  const r = menu.restaurant;
  ['name_en','name_ar','tagline_en','tagline_ar','about_en','about_ar'].forEach(f => {
    const el = $('r-'+f); if(el) r[f] = el.value.trim();
  });
  markUnsaved(); toast('Restaurant info saved (remember to Save & Publish)');
}

/* ══════════════════════════════════════════════════════════════
   EXCEL EXPORT & IMPORT TEMPLATE
══════════════════════════════════════════════════════════════ */

/* ── Column widths helper ── */
function wscols(widths) {
  return widths.map(w => ({ wch: w }));
}

/* ── Export full menu as Excel workbook ── */
function exportMenuExcel(itemsOnly) {
  if (!menu) return;
  if (typeof XLSX === 'undefined') { toast('Excel library not loaded', 'err'); return; }

  const wb = XLSX.utils.book_new();

  // ─ Items sheet ─
  const itemHeaders = ['ID','Name EN','Name AR','Description EN','Description AR','Price','Category ID','Image URL','Video URL','Visible','Featured'];
  const itemRows = menu.items.map(it => [
    it.id, it.name_en, it.name_ar,
    it.description_en||'', it.description_ar||'',
    it.price, it.category,
    it.image||'', it.video_url||'',
    it.visible!==false?'Yes':'No',
    it.featured?'Yes':'No',
  ]);
  const wsItems = XLSX.utils.aoa_to_sheet([itemHeaders, ...itemRows]);
  wsItems['!cols'] = wscols([16,20,20,30,30,8,16,30,30,8,8]);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Items');

  if (!itemsOnly) {
    // ─ Categories sheet ─
    const catHeaders = ['ID','Name EN','Name AR','Section ID','Image URL','Visible'];
    const catRows = menu.categories.map(c => [c.id, c.name_en, c.name_ar, c.section||'', c.image||'', c.visible!==false?'Yes':'No']);
    const wsCats = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows]);
    wsCats['!cols'] = wscols([18,20,20,16,30,8]);
    XLSX.utils.book_append_sheet(wb, wsCats, 'Categories');

    // ─ Sections sheet ─
    const secHeaders = ['ID','Name EN','Name AR','Description EN','Description AR','Visible'];
    const secRows = menu.sections.map(s => [s.id, s.name_en, s.name_ar, s.description_en||'', s.description_ar||'', s.visible!==false?'Yes':'No']);
    const wsSecs = XLSX.utils.aoa_to_sheet([secHeaders, ...secRows]);
    wsSecs['!cols'] = wscols([16,18,18,35,35,8]);
    XLSX.utils.book_append_sheet(wb, wsSecs, 'Sections');
  }

  const filename = itemsOnly ? 'AURA-items.xlsx' : 'AURA-menu-full.xlsx';
  XLSX.writeFile(wb, filename);
  toast(`✅ ${itemsOnly ? 'Items' : 'Full menu'} exported as Excel!`);
}

/* ── Download blank import template with valid category IDs pre-listed ── */
function downloadImportTemplate() {
  if (!menu) return;
  if (typeof XLSX === 'undefined') { toast('Excel library not loaded', 'err'); return; }

  const wb = XLSX.utils.book_new();

  // ─ Template sheet ─
  const headers = ['Name EN *','Name AR *','Description EN','Description AR','Price *','Category ID *','Image URL','Video URL'];
  const example = ['Cappuccino','كابوتشينو','Espresso with steamed milk foam','إسبريسو مع رغوة الحليب',85,'hot-drinks','',''];
  const wsTemplate = XLSX.utils.aoa_to_sheet([headers, example]);
  wsTemplate['!cols'] = wscols([22,22,32,32,8,18,30,30]);
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Items to Import');

  // ─ Reference sheet: valid category IDs ─
  const refHeaders = ['Category ID (use this exactly)','Category Name EN','Section'];
  const refRows = menu.categories.map(c => {
    const sec = menu.sections.find(s => s.id === c.section);
    return [c.id, c.name_en, sec ? sec.name_en : ''];
  });
  const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
  wsRef['!cols'] = wscols([28,22,18]);
  XLSX.utils.book_append_sheet(wb, wsRef, 'Valid Category IDs ← READ THIS');

  // ─ Instructions sheet ─
  const instrRows = [
    ['AURA Bulk Import Instructions'],[''],
    ['1. Fill in the "Items to Import" sheet — one item per row'],
    ['2. Column A and B (Name EN / AR) are required'],
    ['3. Column E (Price) must be a number'],
    ['4. Column F (Category ID) must exactly match an ID from the "Valid Category IDs" sheet'],
    ['5. Columns G and H (Image URL, Video URL) are optional — leave blank'],
    ['6. Do NOT delete or rename the header row'],
    ['7. Delete this sheet and the reference sheet before uploading (or just upload as-is — they are ignored)'],
    [''],['Upload the file in Admin → Bulk Import → Upload Excel File'],
  ];
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows);
  wsInstr['!cols'] = wscols([70]);
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

  XLSX.writeFile(wb, 'AURA-import-template.xlsx');
  toast('✅ Import template downloaded!');
}

/* ══════════════════════════════════════════════════════════════
   STEP 8 — SAVE & PUBLISH
══════════════════════════════════════════════════════════════ */
function downloadJSON() {
  const blob = new Blob([JSON.stringify(menu, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'menu.json' });
  a.click(); URL.revokeObjectURL(url);
  $('unsaved-badge').style.display = 'none';
  toast('Downloaded — upload menu.json to GitHub to publish');
}

async function publishToGitHub() {
  const pw = $('save-pw').value.trim();
  if (!pw) { toast('Enter admin password to confirm', 'err'); return; }
  const btn = $('push-btn');
  btn.disabled = true; btn.textContent = 'Publishing…';
  $('push-status').textContent = '';

  try {
    const res  = await fetch('/api/update-menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw, menuData: menu }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      $('unsaved-badge').style.display = 'none';
      $('save-pw').value = '';
      $('push-status').textContent = '✓ Published! Site updates in ~30s';
      $('push-status').style.color = 'var(--green)';
      toast('✅ Menu published!');
    } else {
      $('push-status').textContent = '❌ ' + (data.error||'Error — check Vercel env vars');
      $('push-status').style.color = 'var(--red)';
      toast(data.error||'Push failed','err');
    }
  } catch {
    $('push-status').textContent = '❌ Network error — try downloading instead';
    $('push-status').style.color = 'var(--red)';
    toast('Network error','err');
  }
  btn.disabled = false; btn.textContent = '🚀 Save & Publish';
}

/* ══════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════ */
function toId(str) {
  return str.toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
}

function previewUrl(inputId, previewId) {
  const url = $(inputId) ? $(inputId).value.trim() : '';
  const el  = $(previewId);
  if (!el) return;
  el.innerHTML = url
    ? `<img src="${url}" onerror="this.parentElement.innerHTML='<span>Image not found</span>'" style="max-width:100%;max-height:160px;border-radius:6px;object-fit:contain">`
    : '<span>Preview</span>';
}

/* ── Populate section selector in category form ── */
function syncSecDropdowns() {
  if (!menu) return;
  const sel = $('cat-section');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select a section —</option>' +
    menu.sections.map(s => `<option value="${s.id}">${s.name_en}</option>`).join('');
}

/* ── Populate category dropdowns throughout admin ── */
function syncCatDropdowns() {
  if (!menu) return;
  const hint = $('cat-ids-hint');
  if (hint) hint.innerHTML = menu.categories.map(c=>`<code>${c.id}</code>`).join(' ') || '<em>no categories</em>';

  ['photo-filter-cat','vis-filter-cat','edit-cat-sel','m-category'].forEach(selId => {
    const sel = $(selId); if (!sel) return;
    const all = (selId==='edit-cat-sel'||selId==='m-category') ? '' : '<option value="all">All categories</option>';
    sel.innerHTML = all + menu.categories.map(c=>`<option value="${c.id}">${c.name_en}</option>`).join('');
  });
}

/* ══════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  $('login-btn').addEventListener('click', login);
  $('pw-input').addEventListener('keydown', e => { if(e.key==='Enter') login(); });

  $$('.step-btn').forEach(b => b.addEventListener('click', () => goStep(b.dataset.step)));

  // Sections
  $('save-sec-btn').addEventListener('click', saveSecForm);
  $('clear-sec-btn').addEventListener('click', clearSecForm);
  $('sec-image-url').addEventListener('input', () => previewUrl('sec-image-url','sec-img-prev'));
  $('sec-image-file').addEventListener('change', uploadSecImage);

  // Categories
  $('save-cat-btn').addEventListener('click', saveCatForm);
  $('clear-cat-btn').addEventListener('click', clearCatForm);
  $('cat-image-url').addEventListener('input', () => previewUrl('cat-image-url','cat-img-prev'));
  $('cat-image-file').addEventListener('change', uploadCatImage);

  // Manual add
  $('save-manual-btn').addEventListener('click', saveManualItem);
  $('clear-manual-btn').addEventListener('click', clearManualForm);
  $('m-image-url').addEventListener('input', () => previewUrl('m-image-url','m-img-prev'));
  $('m-image-file').addEventListener('change', uploadManualImage);

  // Bulk import
  $('parse-btn').addEventListener('click', parseCSV);
  $('confirm-import-btn').addEventListener('click', confirmImport);
  $('cancel-import-btn').addEventListener('click', cancelImport);
  $('dl-template-btn').addEventListener('click', downloadImportTemplate);
  $('import-file-input').addEventListener('change', e => handleImportFile(e.target.files[0]));
  $('load-example-btn').addEventListener('click', () => {
    $('csv-input').value =
`Cappuccino, كابوتشينو, Espresso with steamed milk foam, إسبريسو مع رغوة الحليب, 85, hot-drinks
Iced Latte, لاتيه مثلج, Cold espresso over ice, إسبريسو بارد على الثلج, 95, cold-drinks
Mango Smoothie, عصير مانجو, Fresh mango blended with ice, مانجو طازج ممزوج مع الثلج, 110, smoothies`;
  });

  // Photo grid filters
  ['photo-search','photo-filter-cat','photo-no-img'].forEach(id => {
    const el = $(id); if(el) el.addEventListener(el.type==='checkbox'?'change':'input', renderPhotoGrid);
  });

  // Visibility filters
  ['vis-search','vis-filter-cat'].forEach(id => {
    const el=$(id); if(el) el.addEventListener('input', renderVisTable);
  });
  $('show-all-btn').addEventListener('click', () => { menu.items.forEach(i=>i.visible=true); renderVisTable(); updateStats(); markUnsaved(); toast('All visible'); });
  $('hide-all-btn').addEventListener('click', () => { if(!confirm('Hide ALL items?')) return; menu.items.forEach(i=>i.visible=false); renderVisTable(); updateStats(); markUnsaved(); toast('All hidden'); });

  // Edit modal
  $('edit-modal-close').addEventListener('click', () => $('edit-modal').classList.remove('open'));
  $('edit-cancel-btn').addEventListener('click',  () => $('edit-modal').classList.remove('open'));
  $('edit-save-btn').addEventListener('click', saveEditModal);
  $('edit-image').addEventListener('input', () => previewUrl('edit-image','edit-img-prev'));
  $('edit-image-file').addEventListener('change', uploadEditImage);
  $('edit-modal').addEventListener('click', e => { if(e.target===$('edit-modal')) $('edit-modal').classList.remove('open'); });

  // Contact & About
  $('save-contact-btn').addEventListener('click', saveContact);
  $('save-about-btn').addEventListener('click', saveAbout);

  // Save & Publish
  $('download-btn').addEventListener('click', downloadJSON);
  $('push-btn').addEventListener('click', publishToGitHub);

  // Excel export
  $('export-excel-btn').addEventListener('click', () => exportMenuExcel(false));
  $('export-items-btn').addEventListener('click', () => exportMenuExcel(true));
});

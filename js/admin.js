/* ============================================
   AURA CAFE — Admin Panel
   ============================================ */

const Admin = (() => {
  // ---- Config ----
  // SHA-256 hash of your password. Change this!
  // Default password: aura2024  → hash below
  // To generate a new hash: https://emn178.github.io/online-tools/sha256.html
  const PASSWORD_HASH = '8c10a2cbfdb3dd3b5af89c4b5f7d88c4e90c5e1d6d0a5b0f7b0d0e5b3d1a2f9';

  let menuData = null;
  let editingId = null;
  let authenticated = false;

  // ---- Simple SHA-256 via Web Crypto ----
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---- DOM shorthand ----
  const $ = id => document.getElementById(id);

  // ---- Auth ----
  async function login() {
    const pw = $('admin-password').value;
    const hash = await sha256(pw);
    if (hash === PASSWORD_HASH) {
      authenticated = true;
      $('login-screen').style.display = 'none';
      $('admin-app').style.display = 'block';
      loadMenu();
    } else {
      $('login-error').style.display = 'block';
      $('admin-password').value = '';
      $('admin-password').focus();
    }
  }

  // ---- Load menu.json ----
  async function loadMenu() {
    try {
      const res = await fetch('../menu.json?v=' + Date.now());
      menuData = await res.json();
      renderAll();
    } catch (e) {
      showToast('Could not load menu.json — make sure it exists.', 'error');
    }
  }

  // ---- Render everything ----
  function renderAll() {
    renderStats();
    renderCategories();
    renderItems();
  }

  function renderStats() {
    $('stat-total').textContent = menuData.items.length;
    $('stat-available').textContent = menuData.items.filter(i => i.available).length;
    $('stat-featured').textContent = menuData.items.filter(i => i.featured).length;
    $('stat-cats').textContent = menuData.categories.length;
  }

  function renderCategories() {
    const sel = $('item-category');
    if (!sel) return;
    sel.innerHTML = menuData.categories.map(c =>
      `<option value="${c.id}">${c.name_en} / ${c.name_ar}</option>`
    ).join('');

    // Filter dropdown
    const filterSel = $('filter-category');
    if (filterSel) {
      filterSel.innerHTML = '<option value="all">All Categories</option>' +
        menuData.categories.map(c =>
          `<option value="${c.id}">${c.name_en}</option>`
        ).join('');
    }
  }

  function renderItems(filterCat = 'all', searchQ = '') {
    const tbody = $('items-tbody');
    if (!tbody) return;

    let items = menuData.items.filter(item => {
      const matchCat = filterCat === 'all' || item.category === filterCat;
      const q = searchQ.toLowerCase();
      const matchSearch = !q || item.name_en.toLowerCase().includes(q) || item.name_ar.includes(q);
      return matchCat && matchSearch;
    });

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted)">No items found</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => {
      const cat = menuData.categories.find(c => c.id === item.category);
      return `
        <tr>
          <td>
            ${item.image
              ? `<img src="${item.image}" class="tbl-thumb" alt="${item.name_en}">`
              : `<div class="tbl-thumb-placeholder">🍽️</div>`}
          </td>
          <td>
            <strong>${item.name_en}</strong><br>
            <small style="color:var(--text-muted)">${item.name_ar}</small>
          </td>
          <td><span class="cat-pill">${cat ? cat.name_en : item.category}</span></td>
          <td><strong style="color:var(--gold)">${item.price} EGP</strong></td>
          <td>
            <span class="status-pill ${item.available ? 'avail' : 'unavail'}">
              ${item.available ? '● Available' : '○ Sold Out'}
            </span>
          </td>
          <td>
            ${item.featured ? '<span class="featured-pill">★ Featured</span>' : '—'}
          </td>
          <td>
            <div class="action-btns">
              <button class="btn-icon edit-btn" data-id="${item.id}" title="Edit">✏️</button>
              <button class="btn-icon del-btn" data-id="${item.id}" title="Delete">🗑️</button>
            </div>
          </td>
        </tr>`;
    }).join('');

    // Bind edit/delete
    tbody.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => openEdit(b.dataset.id)));
    tbody.querySelectorAll('.del-btn').forEach(b => b.addEventListener('click', () => deleteItem(b.dataset.id)));
  }

  // ---- Open modal ----
  function openAdd() {
    editingId = null;
    $('modal-title').textContent = 'Add New Item';
    clearForm();
    showModal();
  }

  function openEdit(id) {
    const item = menuData.items.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    $('modal-title').textContent = 'Edit Item';
    fillForm(item);
    showModal();
  }

  function fillForm(item) {
    $('item-id').value = item.id;
    $('item-name-en').value = item.name_en;
    $('item-name-ar').value = item.name_ar;
    $('item-desc-en').value = item.description_en;
    $('item-desc-ar').value = item.description_ar;
    $('item-price').value = item.price;
    $('item-category').value = item.category;
    $('item-image').value = item.image || '';
    $('item-available').checked = item.available;
    $('item-featured').checked = item.featured;
    updateImagePreview(item.image);
  }

  function clearForm() {
    ['item-id','item-name-en','item-name-ar','item-desc-en','item-desc-ar','item-price','item-image'].forEach(id => {
      if ($(id)) $(id).value = '';
    });
    $('item-available').checked = true;
    $('item-featured').checked = false;
    if ($('item-category') && menuData.categories.length) {
      $('item-category').value = menuData.categories[0].id;
    }
    updateImagePreview('');
  }

  function showModal() { $('item-modal').style.display = 'flex'; }
  function hideModal() { $('item-modal').style.display = 'none'; }

  // ---- Save item ----
  function saveItem() {
    const nameEn = $('item-name-en').value.trim();
    const nameAr = $('item-name-ar').value.trim();
    const price = parseFloat($('item-price').value);

    if (!nameEn || !nameAr || isNaN(price)) {
      showToast('Please fill in Name (EN), Name (AR) and Price.', 'error');
      return;
    }

    const item = {
      id: editingId || 'item-' + Date.now(),
      category: $('item-category').value,
      name_en: nameEn,
      name_ar: nameAr,
      description_en: $('item-desc-en').value.trim(),
      description_ar: $('item-desc-ar').value.trim(),
      price: price,
      image: $('item-image').value.trim(),
      available: $('item-available').checked,
      featured: $('item-featured').checked,
    };

    if (editingId) {
      const idx = menuData.items.findIndex(i => i.id === editingId);
      if (idx !== -1) menuData.items[idx] = item;
    } else {
      menuData.items.push(item);
    }

    hideModal();
    renderAll();
    markUnsaved();
    showToast(editingId ? 'Item updated!' : 'Item added!', 'success');
  }

  // ---- Delete item ----
  function deleteItem(id) {
    if (!confirm('Delete this item?')) return;
    menuData.items = menuData.items.filter(i => i.id !== id);
    renderAll();
    markUnsaved();
    showToast('Item deleted.', 'success');
  }

  // ---- Toggle availability ----
  function toggleAvailability(id) {
    const item = menuData.items.find(i => i.id === id);
    if (item) { item.available = !item.available; renderItems(); markUnsaved(); }
  }

  // ---- Image preview ----
  function updateImagePreview(url) {
    const prev = $('img-preview');
    if (!prev) return;
    if (url) {
      prev.innerHTML = `<img src="${url}" alt="Preview" style="max-width:100%;max-height:180px;border-radius:8px;object-fit:cover;">`;
    } else {
      prev.innerHTML = `<span style="color:var(--text-muted);font-size:0.85rem">Image preview will appear here</span>`;
    }
  }

  // ---- Unsaved changes indicator ----
  function markUnsaved() {
    $('save-indicator').style.display = 'inline-flex';
  }

  // ---- Export / Save ----
  function exportJSON() {
    const json = JSON.stringify(menuData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu.json';
    a.click();
    URL.revokeObjectURL(url);
    $('save-indicator').style.display = 'none';
    showToast('menu.json downloaded! Upload it to your hosting to update the menu.', 'success');
  }

  // ---- GitHub API Save ----
  async function saveToGitHub() {
    const owner = $('gh-owner').value.trim();
    const repo = $('gh-repo').value.trim();
    const token = $('gh-token').value.trim();

    if (!owner || !repo || !token) {
      showToast('Fill in your GitHub owner, repo, and token.', 'error');
      return;
    }

    // Save settings
    localStorage.setItem('gh-owner', owner);
    localStorage.setItem('gh-repo', repo);

    try {
      // Get current file SHA
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/menu.json`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' }
      });

      let sha = '';
      if (getRes.ok) {
        const data = await getRes.json();
        sha = data.sha;
      }

      // Put new content
      const json = JSON.stringify(menuData, null, 2);
      const content = btoa(unescape(encodeURIComponent(json)));

      const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/menu.json`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update menu via AURA Admin',
          content,
          sha: sha || undefined
        })
      });

      if (putRes.ok) {
        $('save-indicator').style.display = 'none';
        showToast('✅ Menu saved to GitHub! Site will update in ~1 minute.', 'success');
      } else {
        const err = await putRes.json();
        showToast('GitHub error: ' + (err.message || 'Unknown error'), 'error');
      }
    } catch (e) {
      showToast('Network error: ' + e.message, 'error');
    }
  }

  // ---- Toast notification ----
  function showToast(msg, type = 'success') {
    const toast = $('toast');
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 4000);
  }

  // ---- Restore GitHub settings ----
  function restoreGHSettings() {
    const owner = localStorage.getItem('gh-owner');
    const repo = localStorage.getItem('gh-repo');
    if (owner && $('gh-owner')) $('gh-owner').value = owner;
    if (repo && $('gh-repo')) $('gh-repo').value = repo;
  }

  // ---- Init ----
  function init() {
    // Login
    $('login-btn').addEventListener('click', login);
    $('admin-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(btn.dataset.tab).classList.add('active');
      });
    });

    // Item actions
    $('add-item-btn').addEventListener('click', openAdd);
    $('save-item-btn').addEventListener('click', saveItem);
    $('cancel-modal-btn').addEventListener('click', hideModal);
    $('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) hideModal(); });

    // Image URL preview
    $('item-image').addEventListener('input', e => updateImagePreview(e.target.value));

    // Filter / search
    $('filter-category').addEventListener('change', () => {
      renderItems($('filter-category').value, $('search-items').value);
    });
    $('search-items').addEventListener('input', () => {
      renderItems($('filter-category').value, $('search-items').value);
    });

    // Save
    $('export-btn').addEventListener('click', exportJSON);
    $('gh-save-btn').addEventListener('click', saveToGitHub);

    restoreGHSettings();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', Admin.init);

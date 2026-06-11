# AURA Café & Restaurant — Menu Website

**Stack:** Pure HTML/CSS/JS · No backend · No database · Free to host

---

## Files

```
AURA MENU/
├── index.html        ← Customer-facing menu
├── admin.html        ← Admin panel (add/edit/delete items)
├── menu.json         ← All menu data (this is your "database")
├── css/style.css     ← Styles
├── js/app.js         ← Menu app logic
├── js/admin.js       ← Admin panel logic
└── images/           ← Put your logo here (logo.png)
```

---

## Quick Start (Local)

Just open `index.html` in a browser. No server needed for viewing.

> To use the admin panel locally, you need a local server (because of `fetch()`):
> ```bash
> npx serve .
> # or: python -m http.server 8080
> ```
> Then open `http://localhost:8080/admin.html`

---

## Deploying Free (GitHub Pages)

1. Create a free account at [github.com](https://github.com)
2. Create a new **public** repository (e.g. `aura-menu`)
3. Upload all these files to the repo
4. Go to repo **Settings → Pages → Deploy from branch `main`**
5. Your site is live at: `https://yourusername.github.io/aura-menu/`
6. Connect your custom domain in Settings → Pages → Custom domain

---

## Admin Panel

Open `admin.html` (or `https://your-site.com/admin.html`)

**Default password:** `aura2024`

### To change the password:
1. Go to [sha256 generator](https://emn178.github.io/online-tools/sha256.html)
2. Type your new password, copy the hash
3. Open `js/admin.js`, replace the value of `PASSWORD_HASH`

### Saving changes:
**Option A (Easy):** Click "Download menu.json" → upload the file to GitHub manually

**Option B (Auto):** In the "Save to GitHub" tab, enter your GitHub username, repo name, and a Personal Access Token → click "Push to GitHub" → site updates in ~1 minute

### Getting a GitHub Personal Access Token:
1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Give it a name (e.g. "AURA Admin")
3. Expiration: choose your preference
4. Permissions: check **Contents → Read and write**
5. Click "Generate token" and copy it

---

## Images (Free)

Use **Cloudinary** free tier:
1. Sign up at [cloudinary.com](https://cloudinary.com) (free, no credit card)
2. Upload your food photos
3. Copy the image URL
4. Paste it into the admin panel when adding/editing items

---

## Logo

Replace `images/logo.png` with your actual AURA logo.
If no logo file is found, the site shows a stylized "A" as fallback.

---

## Customization

| What | Where |
|------|--------|
| Colors | `css/style.css` → `:root` variables |
| Restaurant name / tagline | `menu.json` → `restaurant` section |
| Password | `js/admin.js` → `PASSWORD_HASH` |
| Currency | `menu.json` → `currency_en` / `currency_ar` |
| Categories | `menu.json` → `categories` array |

---

## Total Cost

| Item | Cost |
|------|------|
| Domain | ~$12/year (only paid item) |
| Hosting (GitHub Pages / Netlify) | **FREE** |
| Images (Cloudinary) | **FREE** |
| Database | **None needed** |

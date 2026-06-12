# AURA Café & Restaurant — Complete Project Guide

---

## Table of Contents

1. [How the Project Works](#1-how-the-project-works)
2. [File Structure Explained](#2-file-structure-explained)
3. [The Customer Website](#3-the-customer-website)
4. [The Admin Panel](#4-the-admin-panel)
5. [How Data Is Stored](#5-how-data-is-stored)
6. [How Images Work](#6-how-images-work)
7. [How Videos Work](#7-how-videos-work)
8. [Security Model](#8-security-model)
9. [Full Deployment Guide](#9-full-deployment-guide)
10. [Using the Admin Panel (Step-by-Step)](#10-using-the-admin-panel-step-by-step)
11. [Updating Your Menu After Launch](#11-updating-your-menu-after-launch)
12. [Changing Your Admin Password](#12-changing-your-admin-password)
13. [Cost Breakdown](#13-cost-breakdown)
14. [How Updates Flow (Technical)](#14-how-updates-flow-technical)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. How the Project Works

This is a **static website** — meaning there is no traditional backend server, no PHP, no WordPress, no running process. Instead:

- All menu data lives in a single file called `menu.json` inside your GitHub repo
- Vercel (the hosting platform) serves your HTML/CSS/JS files to customers
- When the admin makes a change and clicks "Save & Publish", a Vercel serverless function writes the new `menu.json` to GitHub using the GitHub API
- Vercel detects the new commit and automatically redeploys the site in ~30 seconds
- All customers then get the updated menu from Vercel's global CDN (content delivery network)

**Why no database?**

Your menu changes rarely. A database like Neon's free tier **auto-suspends after 5 minutes of inactivity**, which means every customer who opens the menu after a quiet hour gets a 1–3 second cold-start delay — a terrible experience for a restaurant. `menu.json` on Vercel's CDN has zero cold starts and handles unlimited simultaneous customers.

---

## 2. File Structure Explained

```
aura-menu/
│
├── index.html              ← Customer-facing menu website (landing page)
├── about.html              ← About Us page (story + contact grid)
├── admin.html              ← Admin panel (private, password-protected)
├── menu.json               ← THE DATABASE — all menu data lives here
├── vercel.json             ← Vercel hosting configuration
├── SETUP.md                ← This file
│
├── css/
│   └── style.css           ← All styling for the customer site
│
├── js/
│   ├── app.js              ← Customer site logic (categories, items, modal)
│   └── admin.js            ← Admin panel logic (all 7 steps)
│
├── api/
│   ├── update-menu.js      ← Vercel serverless function: saves menu.json to GitHub
│   └── upload-image.js     ← Vercel serverless function: uploads images to GitHub
│
├── images/
│   ├── logo.png            ← Your logo (replace with your own)
│   └── (all uploaded food photos go here automatically)
│
└── AURA_Menu_Import_Template.xlsx  ← Excel template for bulk menu import
```

**The key files to understand:**

- `menu.json` — This is your entire database. Categories, items, prices, descriptions, contact info, about text — everything. You never edit this file manually; the admin panel does it for you.
- `api/update-menu.js` — Runs on Vercel's servers (not in the browser). It receives the updated `menu.json` from the admin panel and writes it to GitHub. This is the only file that can touch GitHub — and it checks your password before doing anything.
- `api/upload-image.js` — Same idea but for images. Receives a photo from the admin panel and uploads it to the `images/` folder in your GitHub repo.

---

## 3. The Customer Website

**URL:** `yourdomain.com`

The customer site is a single-page app with three views:

### View 1 — Categories grid
The homepage shows all your menu categories as large image cards (e.g. Hot Drinks, Cold Drinks, Mains, Desserts). Each card shows the category photo and the number of items inside. The customer taps a card to enter that category.

### View 2 — Items grid
After tapping a category, items appear as cards. Each card shows:
- Item photo
- Name (in the selected language)
- Short description (2 lines)
- Price
- "Chef's Pick" badge if featured
- A ▶ icon if there is a video

The customer can search within the category using the search bar.

### View 3 — Item detail modal
Tapping any item opens a bottom sheet (on mobile) or centered popup (on desktop) with:
- Full-size photo
- Full name and description
- Price
- Lazy-loaded YouTube video thumbnail (if one is set) — the video iframe only loads when the customer taps the play button

### Language toggle
Every page has an EN / ع button in the top-right corner. Switching language:
- Instantly re-renders all text (no page reload)
- Flips text direction to RTL for Arabic
- Changes font to Cairo (designed for Arabic) for Arabic mode
- Saves the preference in the browser (remembered on next visit)

### Footer
Every page has a footer with your contact info: phone, WhatsApp, Instagram, Facebook, TikTok, and address (with a link to Google Maps). All of this is managed from the admin panel.

---

## 4. The Admin Panel

**URL:** `yourdomain.com/admin.html`

> ⚠️ This URL is **not linked anywhere** on the public site. Only you know it exists. Never share it publicly.

The admin panel is a 7-step workflow:

| Step | What it does |
|------|-------------|
| 1 · Categories | Create, edit, reorder, and delete menu categories. Upload a cover image per category. |
| 2 · Add Item | Add a single item manually with all fields. |
| 3 · Bulk Import | Paste multiple items at once (from the Excel template). |
| 4 · Photos | Upload a photo for each item. Also set YouTube video URLs per item. |
| 5 · Visibility | Toggle items visible/hidden. Mark items as Chef's Pick. Edit any item's details. |
| 6 · Info & Contact | Edit restaurant name, tagline, About Us text (EN+AR), and all contact links. |
| 7 · Save & Publish | Push all changes to GitHub in one click (site updates in ~30 seconds). |

All changes you make in steps 1–6 are held in browser memory. Nothing is saved to the live site until you click **Save & Publish** in step 7. You'll see an "● Unsaved changes" badge in the top-right whenever you have pending changes.

---

## 5. How Data Is Stored

Everything is in `menu.json`. Here is what it looks like:

```json
{
  "restaurant": {
    "name_en": "AURA",
    "name_ar": "أورا",
    "tagline_en": "Lounge & Café",
    "tagline_ar": "لاونج وكافيه",
    "currency_en": "EGP",
    "currency_ar": "ج.م",
    "about_en": "Welcome to AURA...",
    "about_ar": "مرحباً بك في أورا...",
    "contact": {
      "phone": "+20 100 000 0000",
      "whatsapp": "+20 100 000 0000",
      "instagram": "https://www.instagram.com/auralounge.eg/",
      "facebook": "",
      "tiktok": "",
      "address_en": "Cairo, Egypt",
      "address_ar": "القاهرة، مصر",
      "maps_url": ""
    }
  },
  "categories": [
    {
      "id": "hot-drinks",
      "name_en": "Hot Drinks",
      "name_ar": "مشروبات ساخنة",
      "image": "/images/hot-drinks.jpg",
      "visible": true
    }
  ],
  "items": [
    {
      "id": "item-001",
      "category": "hot-drinks",
      "name_en": "Cappuccino",
      "name_ar": "كابوتشينو",
      "description_en": "Espresso with velvety steamed milk foam",
      "description_ar": "إسبريسو مع رغوة حليب مخملية",
      "price": 85,
      "image": "/images/cappuccino.jpg",
      "video_url": "",
      "visible": true,
      "featured": false
    }
  ]
}
```

When you click "Save & Publish" in the admin, this entire file is sent to Vercel, which writes it to GitHub. Vercel then redeploys the site automatically.

---

## 6. How Images Work

Images are stored in the `images/` folder of your GitHub repo and served by Vercel's CDN — no external image service needed.

**When you upload an image from the admin panel:**
1. You pick a file (max 5MB — JPG, PNG, WebP, GIF supported)
2. The browser converts it to base64 and sends it to the `/api/upload-image` Vercel function
3. The function verifies your password, sanitizes the filename, and uploads it to your GitHub repo's `images/` folder via the GitHub API
4. The function returns the URL `/images/your-photo.jpg`
5. That URL is automatically filled into the item's image field

The image is now live on your site at `yourdomain.com/images/your-photo.jpg` served by Vercel's global CDN.

**Image tips:**
- Keep images under 5MB (the API limit)
- JPG is best for food photos (smaller files, good quality)
- Square or 4:3 ratio images look best on the item cards
- For the category cover images, landscape (16:9) works well

---

## 7. How Videos Work

Videos are **not uploaded** — they stay on YouTube. You only paste the YouTube link.

**How it works for the customer:**
1. A thumbnail of the YouTube video is shown (fetched from YouTube's image servers — fast, no loading time)
2. Nothing else loads — no iframe, no YouTube scripts
3. Only when the customer taps the play button does the YouTube player load
4. This means videos have **zero performance impact** until the customer chooses to watch

**Supported YouTube URL formats:**
- `https://www.youtube.com/watch?v=XXXXXXXXXXX`
- `https://youtu.be/XXXXXXXXXXX`
- `https://www.youtube.com/shorts/XXXXXXXXXXX`

Set the video URL per item in Step 4 (Photos) or Step 2 (Add Item) of the admin panel.

---

## 8. Security Model

**Admin password:**
- Never stored in any code file
- Stored only as a Vercel environment variable (`ADMIN_PASSWORD`)
- Every request to save the menu or upload an image checks this password server-side
- If the password is wrong, the request is rejected with HTTP 401
- The admin page itself is hidden from Google (`X-Robots-Tag: noindex, nofollow` in `vercel.json`)

**GitHub token:**
- Never in any code file
- Stored only in Vercel environment variables (`GITHUB_TOKEN`)
- Only the Vercel serverless functions use it — the browser never sees it

**Public GitHub repo:**
- If you make the repo public (e.g. for free Vercel features), the code is visible but **no secrets are in the code**. Passwords and tokens are in Vercel's environment only.

---

## 9. Full Deployment Guide

### Step 1 — Create a GitHub account and repository

1. Go to [github.com](https://github.com) → Sign up (free)
2. Click **New repository** (the green button or the `+` icon)
3. Repository name: `aura-menu`
4. Set to **Private** (keeps your code private from the public)
5. Do **not** initialize with README (you'll upload your own files)
6. Click **Create repository**

**Upload your files:**
- Download [GitHub Desktop](https://desktop.github.com) (easier than the command line)
- Clone your new empty repo
- Copy all project files into the cloned folder
- Commit and push

Alternatively: on your repo page, click **uploading an existing file** and drag the entire project folder.

---

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **Sign Up** → choose **Continue with GitHub**
3. Click **Add New → Project**
4. Find your `aura-menu` repository and click **Import**
5. On the configuration screen:
   - Framework Preset: **Other**
   - Build Command: leave empty
   - Output Directory: leave empty
   - Install Command: leave empty
6. Click **Deploy**

Vercel will build and deploy your site. In about 1 minute it will give you a URL like `aura-menu-xxxx.vercel.app`. Your site is live.

---

### Step 3 — Set the admin password

1. In Vercel, open your project
2. Click **Settings** → **Environment Variables**
3. Add this variable:

   | Name | Value |
   |------|-------|
   | `ADMIN_PASSWORD` | Your chosen admin password (make it strong) |

4. Make sure **Production**, **Preview**, and **Development** are all checked
5. Click **Save**

> Write this password down somewhere safe. This is what you use to log into `/admin.html`.

---

### Step 4 — Create a GitHub Personal Access Token

This allows the admin panel to save your menu directly to GitHub with one click.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token → Generate new token (classic)**
3. Note / name: `AURA Menu Admin`
4. Expiration: **No expiration** (or 1 year — your choice)
5. Under Scopes, check: ✅ **repo** (the top-level checkbox — this covers everything needed)
6. Scroll down → click **Generate token**
7. **Copy the token immediately** — it starts with `ghp_` and you will never see it again after closing the page

---

### Step 5 — Add GitHub env vars to Vercel

Back in Vercel → **Settings → Environment Variables**, add 3 more variables:

| Name | Value | Where to find it |
|------|-------|-----------------|
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxxxx` | The token you just copied |
| `GITHUB_OWNER` | Your GitHub username | Top-right corner of github.com |
| `GITHUB_REPO` | `aura-menu` | The repository name you created in Step 1 |

Check **Production**, **Preview**, and **Development** for each. Click **Save** after each one.

---

### Step 6 — Redeploy to activate the variables

Environment variables only take effect after a new deployment.

1. In Vercel → click the **Deployments** tab
2. Click the three dots `···` on the most recent deployment
3. Click **Redeploy**
4. Wait ~1 minute for it to finish

After this, your admin panel can save the menu and upload images directly to GitHub.

---

### Step 7 — Test everything

1. Open `yourdomain.vercel.app` — you should see the AURA menu site with the placeholder categories
2. Open `yourdomain.vercel.app/admin.html`
3. Enter your `ADMIN_PASSWORD` — you should be logged in
4. Go to Step 1, create a test category, upload an image — it should succeed
5. Go to Step 7, click **Save & Publish** — you should see "✓ Published! Site updates in ~30s"

If any of these fail, go to Section 15 (Troubleshooting).

---

### Step 8 — Connect your custom domain

1. In Vercel → your project → **Settings → Domains**
2. Type your domain (e.g. `auracafe.eg` or `menu.auracafe.eg`) → click **Add**
3. Vercel will show you DNS records to add at your domain registrar
4. Log into wherever you bought your domain → find **DNS settings**
5. Add the records Vercel shows you (usually an A record and a CNAME)
6. Click **Verify** in Vercel — it may take up to 24 hours for DNS to propagate, but usually under an hour
7. Vercel provisions free HTTPS automatically — no action needed

---

### Step 9 — Add your logo

Place your logo file at `images/logo.png` in the project (push it to GitHub).

The site looks for `images/logo.png`. If no logo is found, it shows a styled "A" letter as a fallback — so the site still looks good while you set this up.

---

## 10. Using the Admin Panel (Step-by-Step)

**URL:** `yourdomain.com/admin.html`
**Login:** Enter your `ADMIN_PASSWORD`

---

### Step 1 — Categories

Before adding any items, create your categories first.

1. Enter the category name in English (e.g. `Hot Drinks`)
2. Enter the name in Arabic (e.g. `مشروبات ساخنة`)
3. Upload a cover image for the category (click **📁 Upload Image** → pick a file), or paste a URL
4. Click **Save Category**

The category appears in the list below. You can:
- **▲ ▼** — reorder categories (this controls the order on the menu)
- **✏️** — edit the category name or image
- **🗑** — delete the category (items in it become uncategorised, not deleted)

Repeat for all your categories. Typical setup for a café:
`Hot Drinks`, `Cold Drinks`, `Smoothies`, `Food`, `Desserts`, `Shisha` (or whatever applies)

---

### Step 2 — Add Item (single item)

Use this to add items one at a time.

1. Fill in Name (English) and Name (Arabic) — required
2. Fill in Description (English) and Description (Arabic) — optional but recommended
3. Enter the price as a number only (e.g. `85`)
4. Select the category from the dropdown
5. Upload an image or skip (you can add it in Step 4 later)
6. Add a YouTube URL if this item has a video — optional
7. Check **Chef's Pick** if you want a badge on this item
8. Click **Add Item**

---

### Step 3 — Bulk Import

Use this to add many items at once using the Excel template.

1. Open `AURA_Menu_Import_Template.xlsx`
2. Fill in your items (rows 9 and below — delete the example rows 4–8)
3. Copy all your data rows
4. In the admin panel, paste them into the text area
5. Click **Preview Import** — check that all rows show ✓
6. If any row shows ⚠, fix the issue (most common: wrong Category ID)
7. Click **Confirm Import**

**Column order for the paste:**
```
Name EN | Name AR | Description EN | Description AR | Price | Category ID | Image URL | Video URL
```

The Category ID must match exactly what you created in Step 1. For example, if you named the category "Hot Drinks", the auto-generated ID is `hot-drinks`.

---

### Step 4 — Photos

This is where you assign images (and optional video URLs) to each item.

- Use the search bar or category filter to find items
- Check **"No image only"** to show only items missing a photo
- For each item: click **📁 Upload Image** → pick a file → click **Apply**
- Or paste an image URL directly into the URL field → click **Apply**
- To add a YouTube video: paste the URL in the YouTube field → click **Apply**

---

### Step 5 — Visibility

Control what customers see.

- **Visible toggle** — hide an item without deleting it (e.g. seasonal items, out-of-stock)
- **Featured toggle** — shows a gold "Chef's Pick" badge on the item card
- **✏️ Edit button** — opens a modal to edit all item fields including price, description, image, and video
- **🗑 Delete** — permanently removes the item
- **Show All / Hide All** — bulk toggle all items

The stats at the top show total / visible / hidden / featured counts.

---

### Step 6 — Info & Contact

Edit your restaurant's information:

**Restaurant Info:**
- Name in English and Arabic (shown in the navbar and hero)
- Tagline in English and Arabic
- About Us text in English and Arabic (shown on the About page)

**Contact Information:**
- Phone number (links to a phone call)
- WhatsApp number (links to WhatsApp chat)
- Instagram URL
- Facebook URL
- TikTok URL
- Google Maps URL (direct link to your location on maps)
- Address in English and Arabic

All of this appears in the footer of every page and on the About Us page.

Click **Save Restaurant Info** and **Save Contact Info** separately to apply changes. These changes are still unsaved to the live site — go to Step 7 to publish.

---

### Step 7 — Save & Publish

When you're done making changes:

**Option A — One-click publish (requires Step 5 of setup to be done):**
1. Enter your admin password in the confirmation field
2. Click **🚀 Save & Publish**
3. Wait ~30 seconds
4. Your live site is updated

**Option B — Manual download:**
1. Click **⬇️ Download menu.json**
2. Go to your GitHub repo → find `menu.json` → click it → click the pencil icon → delete the content → paste your downloaded content → commit
3. Vercel detects the new commit and redeploys automatically (~30 seconds)

---

## 11. Updating Your Menu After Launch

For routine updates (price change, new item, hide a dish):

1. Open `yourdomain.com/admin.html`
2. Log in
3. Go directly to the relevant step (e.g. Step 5 to hide an item)
4. Make the change
5. Go to Step 7 → Save & Publish

The live site updates in about 30 seconds. No developer needed.

---

## 12. Changing Your Admin Password

1. Go to **Vercel → your project → Settings → Environment Variables**
2. Find `ADMIN_PASSWORD` → click **Edit**
3. Enter the new password → Save
4. Go to **Deployments → Redeploy**
5. The old password stops working immediately after the redeployment

---

## 13. Cost Breakdown

| Item | Cost |
|------|------|
| Domain name | ~$12–25/year (the only cost) |
| GitHub private repository | **FREE** |
| Vercel Hobby hosting | **FREE** (100 GB bandwidth/month) |
| Vercel Serverless Functions | **FREE** (1,000,000 invocations/month) |
| Image storage (GitHub + Vercel CDN) | **FREE** |
| HTTPS certificate | **FREE** (Vercel auto-provisions via Let's Encrypt) |
| **Monthly total** | **$0** |

---

## 14. How Updates Flow (Technical)

```
Admin opens yourdomain.com/admin.html
  → Browser shows login screen
  → Admin enters password → browser sends it to /api/update-menu (Vercel Function)
  → Function checks password against ADMIN_PASSWORD env var
  → If correct: returns 200, admin panel unlocks and loads menu.json from the repo
  → Admin makes changes (categories / items / photos / contact info)
  → All changes are held in browser memory only (nothing saved yet)
  → Admin clicks "Save & Publish"
  → Browser sends updated menu.json to /api/update-menu with password
  → Function verifies password again
  → Function calls GitHub API: GET /repos/owner/repo/contents/menu.json (to get current SHA)
  → Function calls GitHub API: PUT /repos/owner/repo/contents/menu.json (writes new content)
  → GitHub saves the commit
  → Vercel detects new commit via webhook
  → Vercel redeploys the static site (~30 seconds)
  → All customers worldwide now see the updated menu via Vercel's CDN

For image uploads:
  → Admin picks a file in the admin panel
  → Browser reads the file and converts it to base64
  → Browser sends base64 + filename + password to /api/upload-image (Vercel Function)
  → Function verifies password, sanitizes filename, checks file size (max 5MB)
  → Function calls GitHub API: PUT /repos/owner/repo/contents/images/filename.jpg
  → GitHub stores the image in the images/ folder
  → Function returns { url: "/images/filename.jpg" }
  → Admin panel fills the URL into the item's image field automatically
```

---

## 15. Troubleshooting

### "GitHub env vars not configured" error

You haven't added the GitHub environment variables to Vercel yet, or you haven't redeployed after adding them.

**Fix:**
1. Vercel → Settings → Environment Variables
2. Make sure `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` are all present
3. Vercel → Deployments → Redeploy

---

### "Incorrect password" at login

The password you're typing doesn't match `ADMIN_PASSWORD` in Vercel.

**Fix:** Go to Vercel → Environment Variables → check the value of `ADMIN_PASSWORD`. Note that it is case-sensitive. If you changed it recently, make sure you redeployed after saving.

---

### "Upload failed: Image too large"

The image file is over 5MB (the limit set by the upload function).

**Fix:** Compress the image before uploading. Use [squoosh.app](https://squoosh.app) (free, no account) to reduce file size — for food photos, 800px wide at 80% quality is more than enough.

---

### "Save & Publish" works but the site doesn't update

Vercel may be caching the old `menu.json`. It refreshes within 5 minutes due to the cache headers set in `vercel.json` (`max-age=60, stale-while-revalidate=300`).

**Fix:** Wait up to 5 minutes and hard-refresh the customer site (Ctrl+Shift+R or Cmd+Shift+R).

---

### Items or categories not showing on the menu

Check that the item/category has `"visible": true` in the admin panel (Step 5). Hidden items don't appear to customers.

---

### The admin panel shows items but "Save & Publish" gives a GitHub error

The most common cause is an expired or revoked GitHub token.

**Fix:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Check if your token is still valid (not expired)
3. If expired: generate a new one with `repo` scope
4. Update `GITHUB_TOKEN` in Vercel → Environment Variables → Redeploy

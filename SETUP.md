# AURA Menu Website — Setup Guide (Vercel)

## Why no database?

Your menu rarely changes. That makes the data **static**, not dynamic.
A database like Neon free tier **auto-suspends after 5 minutes of inactivity** — meaning
every customer who opens the menu after a quiet period gets a 1–3 second cold-start delay.

Instead: `menu.json` lives in your GitHub repo and is served by Vercel's global CDN.
- ✅ Zero cold starts — file cached at edge worldwide
- ✅ Handles unlimited traffic (CDN, not a database)
- ✅ No sleeping, no pausing, never goes down
- ✅ Admin saves → GitHub updates → Vercel redeploys in ~30 seconds

---

## What you get

| | |
|---|---|
| **Customer site** | `yourdomain.com` — mobile menu, EN/AR, view only, no cart |
| **Admin panel** | `yourdomain.com/admin.html` — private URL, password-protected |
| **Data storage** | `menu.json` in your private GitHub repo |
| **Images** | Cloudinary (free CDN, you just paste URLs) |
| **Total cost** | Domain only (~$12–25/year). Everything else is free. |

---

## Setup Steps

### Step 1 — GitHub: create a private repo

1. Go to [github.com](https://github.com) → sign up (free)
2. Click **New repository**
3. Name: `aura-menu`
4. Set to **Private** ← keeps your code private
5. Click **Create repository**
6. Upload all project files (drag & drop the folder, or use [GitHub Desktop](https://desktop.github.com))

---

### Step 2 — Vercel: connect and deploy

1. Go to [vercel.com](https://vercel.com) → **Sign up with GitHub** (free Hobby plan)
2. Click **Add New → Project**
3. Import your `aura-menu` GitHub repository
4. Leave all settings as-is (Framework: **Other**, no build command needed)
5. Click **Deploy**
6. Your site is live at `aura-menu-xxxx.vercel.app`

---

### Step 3 — Set your admin password (CRITICAL — do this before using the admin)

The password never lives in the code. It lives only in Vercel's secure environment.

1. In Vercel → your project → **Settings → Environment Variables**
2. Add this variable:

   | Name | Value |
   |------|-------|
   | `ADMIN_PASSWORD` | `choose a strong password` |

3. Click **Save**
4. Go to **Deployments → Redeploy** (so the function picks up the new variable)

That is your admin password. **Write it down somewhere safe.**

---

### Step 4 — Enable automatic saves from the admin panel

Without this, you download `menu.json` and re-upload manually.
With this, one click in the admin publishes everything automatically.

**Create a GitHub Personal Access Token:**
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → **Generate new token (classic)**
2. Name: `AURA Admin`
3. Expiration: `No expiration` (or 1 year — your choice)
4. Under **repo**, check **Contents → Read and Write**
5. Click **Generate token** → **Copy it immediately** (only shown once)

**Add to Vercel:**

In Vercel → Settings → Environment Variables, add 3 more:

| Name | Value |
|------|-------|
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxxxxxxxxxx` (paste your token) |
| `GITHUB_OWNER` | your GitHub username |
| `GITHUB_REPO` | `aura-menu` |

Redeploy after saving. Done.

---

### Step 5 — Connect your custom domain

1. In Vercel → your project → **Settings → Domains**
2. Type your domain (e.g. `auracafe.eg` or `menu.auracafe.eg`)
3. Follow the DNS instructions from Vercel at your domain registrar
4. Vercel provisions free HTTPS automatically (Let's Encrypt)

---

### Step 6 — Add your logo

Put your logo file at `images/logo.png` in the repo.
The site shows a styled "A" as a fallback if no logo is found.

---

## Using the admin panel

**URL:** `yourdomain.com/admin.html`

> ⚠️ This URL is not linked anywhere on the public site. Only you know it exists.
> Do not share it publicly.

**Login:** Enter the `ADMIN_PASSWORD` you set in Step 3.

### Admin workflow (5 steps):

**Step 1 — Categories**
- Add a category: name in English + Arabic + image URL
- Reorder with the ▲ ▼ arrows
- Delete categories you don't need

**Step 2 — Bulk Import**
- Paste your full menu as CSV, one line per item:
  ```
  Name EN, Name AR, Description EN, Description AR, Price, category-id
  ```
  Example:
  ```
  Cappuccino, كابوتشينو, Espresso with steamed milk, إسبريسو مع الحليب, 85, hot-drinks
  ```
- Click **Preview Import** to see any errors
- Click **Confirm Import** to add all items

**Step 3 — Assign Photos**
- Paste a Cloudinary (or any public) image URL per item
- Use the "Missing photo only" filter to quickly find items without images

**Step 4 — Visibility**
- Toggle each item visible or hidden using the switch
- Mark items as "Featured" (shows a "Chef's Pick" badge)
- Use **Show All / Hide All** for bulk control

**Step 5 — Save & Publish**
- **Option A (manual):** Download `menu.json` → replace the file in GitHub → Vercel auto-redeploys
- **Option B (one click):** Enter your password → click "Save & Publish" → live in ~30 seconds

---

## Free image hosting (Cloudinary)

1. Go to [cloudinary.com](https://cloudinary.com) → sign up free (no credit card)
2. Free tier: 25 GB/month — more than enough for a restaurant
3. **Media Library** → Upload your food photos
4. Click any photo → copy the URL (ends in `.jpg` or `.webp`)
5. Paste that URL in the admin panel → Apply

**Tip:** In Cloudinary, add `/w_800,q_auto,f_auto/` to the URL before the filename for automatic compression:
`https://res.cloudinary.com/yourcloud/image/upload/w_800,q_auto,f_auto/your-photo.jpg`

---

## Changing your admin password

1. Vercel → Settings → Environment Variables → Edit `ADMIN_PASSWORD`
2. Enter the new password → Save
3. Redeploy (Vercel → Deployments → Redeploy)
4. Old password no longer works immediately

---

## Full cost breakdown

| Item | Cost |
|------|------|
| Domain | ~$12–25/year (only paid item) |
| GitHub private repo | **FREE** |
| Vercel Hobby hosting | **FREE** (100 GB bandwidth/month) |
| Vercel Serverless Functions | **FREE** (1M invocations/month) |
| Cloudinary images | **FREE** (25 GB/month CDN) |
| HTTPS certificate | **FREE** (Vercel auto-provisions) |
| **Monthly total** | **$0** |

---

## How updates work (flow)

```
Admin opens admin.html
  → logs in (password checked via Vercel Function)
  → makes changes (categories / items / photos / visibility)
  → clicks "Save & Publish"
  → Vercel Function sends updated menu.json to GitHub API
  → GitHub saves the file
  → Vercel detects the commit
  → Vercel rebuilds and deploys (~30 seconds)
  → All customers now see the updated menu
```

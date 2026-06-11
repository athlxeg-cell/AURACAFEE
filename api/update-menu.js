/**
 * AURA Admin — Vercel Serverless Function
 * POST /api/update-menu
 *
 * Verifies the admin password and saves menu.json to GitHub.
 * The password and GitHub token live in Vercel environment variables —
 * they are never exposed in the source code.
 *
 * Required environment variables (set in Vercel dashboard):
 *   ADMIN_PASSWORD  — your secret admin password
 *   GITHUB_TOKEN    — GitHub Personal Access Token (Contents: read + write)
 *   GITHUB_OWNER    — your GitHub username
 *   GITHUB_REPO     — your repository name
 */

module.exports = async function handler(req, res) {
  // CORS headers (only needed if you ever call from a different origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  // ── 1. Parse body ───────────────────────────────────────────────────────
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { password, menuData, checkOnly } = body || {};

  // ── 2. Verify password ──────────────────────────────────────────────────
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD) {
    // Env var not configured yet — tell client so it can fall back to local mode
    return res.status(500).json({ error: 'env vars not configured' });
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── 3. Auth-check only (login screen) ──────────────────────────────────
  if (checkOnly) {
    return res.status(200).json({ ok: true });
  }

  // ── 4. Validate menu data ───────────────────────────────────────────────
  if (!menuData || !menuData.categories || !menuData.items) {
    return res.status(412).json({ error: 'No menu data provided' });
  }

  // ── 5. Push to GitHub ───────────────────────────────────────────────────
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'GitHub env vars not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO in Vercel.' });
  }

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/menu.json`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AURA-Admin',
  };

  // Get current file SHA (required by GitHub API to update an existing file)
  let sha = '';
  try {
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch {
    // File may not exist yet — that's fine, we'll create it
  }

  // Encode content as base64 (GitHub API requirement)
  const json = JSON.stringify(menuData, null, 2);
  const content = Buffer.from(json, 'utf-8').toString('base64');

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `[AURA Admin] Update menu — ${new Date().toISOString()}`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'GitHub API error' });
  }

  return res.status(200).json({
    success: true,
    message: 'Menu saved to GitHub. Vercel will redeploy in ~30 seconds.',
  });
};

/**
 * AURA Admin — Image Upload via GitHub
 * POST /api/upload-image
 *
 * Receives a base64-encoded image from the admin panel,
 * uploads it to the /images/ folder of the GitHub repo,
 * and returns the public URL served by Vercel CDN.
 *
 * No external image service needed — images live in your repo.
 *
 * Required env vars (same as update-menu):
 *   ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method Not Allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { password, filename, content, mimeType } = body || {};

  // ── Verify password ────────────────────────────────────────
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'env vars not configured' });
  if (!password || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  // ── Validate input ─────────────────────────────────────────
  if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });

  // Sanitize filename: lowercase, no spaces, safe chars only
  const safeName = filename.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.');

  // Only allow image types
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
  if (mimeType && !allowed.includes(mimeType)) {
    return res.status(400).json({ error: 'Only image files allowed' });
  }

  // Max file size: 5MB (base64 is ~33% larger, so ~6.7MB base64)
  if (content.length > 7_000_000) {
    return res.status(400).json({ error: 'Image too large. Max 5MB.' });
  }

  // ── Upload to GitHub ───────────────────────────────────────
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'GitHub env vars not configured' });
  }

  const filePath = `images/${safeName}`;
  const apiUrl   = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
  const headers  = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AURA-Admin',
  };

  // Check if file already exists (need SHA to overwrite)
  let sha = '';
  try {
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) { const d = await getRes.json(); sha = d.sha; }
  } catch { /* new file */ }

  // Strip data URI prefix if present (e.g. "data:image/jpeg;base64,")
  const base64 = content.includes(',') ? content.split(',')[1] : content;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `[AURA Admin] Upload image: ${safeName}`,
      content: base64,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'GitHub upload failed' });
  }

  // Return the public URL (served by Vercel as a static file)
  const publicUrl = `/images/${safeName}`;

  return res.status(200).json({
    success: true,
    url: publicUrl,
    message: `Image uploaded: ${safeName}`,
  });
};

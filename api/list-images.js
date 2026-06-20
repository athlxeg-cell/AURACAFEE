/**
 * AURA Admin — List images from GitHub repo
 * POST /api/list-images
 * Returns all image files in the /images/ folder with size info.
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

  const { password } = body || {};
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'env not configured' });
  if (!password || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return res.status(500).json({ error: 'GitHub env vars missing' });

  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/images`;
  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'AURA-Admin',
  };

  const r = await fetch(apiUrl, { headers });
  if (!r.ok) return res.status(500).json({ error: 'Could not fetch images folder from GitHub' });

  const files = await r.json();
  const images = (Array.isArray(files) ? files : [])
    .filter(f => f.type === 'file' && /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f.name))
    .map(f => ({ name: f.name, size: f.size, path: f.path }));

  return res.status(200).json({ images });
};

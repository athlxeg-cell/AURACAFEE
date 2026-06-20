/**
 * AURA Admin — Create a GitHub blob (no commit, no deployment)
 * POST /api/create-blob
 * { password, content (base64), filename }
 * Returns { sha } — the blob SHA to use later in a batch commit
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

  const { password, content, filename } = body || {};
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'env not configured' });
  if (!password || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  if (!content || !filename) return res.status(400).json({ error: 'content and filename required' });

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return res.status(500).json({ error: 'GitHub env vars missing' });

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AURA-Admin',
  };

  // Strip data URI prefix if present
  const base64 = content.includes(',') ? content.split(',')[1] : content;

  // Create a blob — does NOT trigger any deployment
  const blobRes = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs`,
    { method: 'POST', headers, body: JSON.stringify({ content: base64, encoding: 'base64' }) }
  );

  if (!blobRes.ok) {
    const err = await blobRes.json().catch(() => ({}));
    return res.status(500).json({ error: err.message || 'Blob creation failed' });
  }

  const blob = await blobRes.json();
  return res.status(200).json({ sha: blob.sha, filename });
};

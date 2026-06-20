/**
 * AURA Admin — Create ONE commit with many file changes (1 Vercel deployment)
 * POST /api/batch-commit
 * { password, files: [{ path, sha }], message }
 * Creates a single git commit updating all files at once.
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

  const { password, files, message } = body || {};
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'env not configured' });
  if (!password || password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  if (!files || !files.length) return res.status(400).json({ error: 'files array required' });

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) return res.status(500).json({ error: 'GitHub env vars missing' });

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'AURA-Admin',
  };

  const base = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;

  // 1. Get HEAD SHA
  const refRes = await fetch(`${base}/git/refs/heads/main`, { headers });
  if (!refRes.ok) return res.status(500).json({ error: 'Could not get branch ref' });
  const ref = await refRes.json();
  const headSha = ref.object.sha;

  // 2. Get current commit's tree SHA
  const commitRes = await fetch(`${base}/git/commits/${headSha}`, { headers });
  if (!commitRes.ok) return res.status(500).json({ error: 'Could not get commit' });
  const commit = await commitRes.json();
  const treeSha = commit.tree.sha;

  // 3. Create a new tree with all the updated blobs
  const treeItems = files.map(f => ({
    path: f.path,       // e.g. "images/photo.jpg"
    mode: '100644',
    type: 'blob',
    sha: f.sha,         // blob SHA from /api/create-blob
  }));

  const newTreeRes = await fetch(`${base}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ base_tree: treeSha, tree: treeItems }),
  });
  if (!newTreeRes.ok) return res.status(500).json({ error: 'Could not create tree' });
  const newTree = await newTreeRes.json();

  // 4. Create the commit
  const newCommitRes = await fetch(`${base}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message: message || '[AURA Admin] Batch optimize images',
      tree: newTree.sha,
      parents: [headSha],
    }),
  });
  if (!newCommitRes.ok) return res.status(500).json({ error: 'Could not create commit' });
  const newCommit = await newCommitRes.json();

  // 5. Update branch ref to point to new commit
  const updateRefRes = await fetch(`${base}/git/refs/heads/main`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ sha: newCommit.sha }),
  });
  if (!updateRefRes.ok) return res.status(500).json({ error: 'Could not update branch ref' });

  return res.status(200).json({ success: true, commit: newCommit.sha, filesUpdated: files.length });
};

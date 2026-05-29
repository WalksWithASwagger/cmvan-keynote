export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  if (isLikelyBot(body)) return res.status(200).json({ ok: true });

  const email = String(body.email || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'valid email required' });
  }

  const pubId = process.env.BEEHIIV_PUB_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!pubId || !apiKey) {
    return res.status(500).json({ error: 'newsletter unavailable' });
  }

  const r = await fetch(
    `https://api.beehiiv.com/v2/publications/${pubId}/subscriptions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ email, reactivate_existing: false }),
    }
  );

  const data = await r.json();
  if (!r.ok) {
    console.error('beehiiv subscribe failed', r.status, data.code || data.message || 'unknown');
    return res.status(502).json({ error: 'newsletter unavailable' });
  }
  return res.status(200).json({ ok: true });
}

const MIN_FORM_AGE_MS = 1000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

function isLikelyBot(body) {
  if (String(body.company || '').trim()) return true;

  const startedAt = Number(body.formStartedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return true;

  const age = Date.now() - startedAt;
  return age < MIN_FORM_AGE_MS || age > MAX_FORM_AGE_MS;
}

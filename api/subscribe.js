export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const email = (body && body.email || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'valid email required' });
  }

  const pubId = process.env.BEEHIIV_PUB_ID;
  const apiKey = process.env.BEEHIIV_API_KEY;
  if (!pubId || !apiKey) {
    return res.status(500).json({ error: 'newsletter not configured' });
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
  if (!r.ok) return res.status(r.status).json({ error: data.message || 'subscription failed' });
  return res.status(200).json({ ok: true });
}

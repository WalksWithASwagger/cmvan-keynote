export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://punkrockai.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const notionToken = process.env.NOTION_TOKEN;
  const dbId = process.env.NOTION_DB_ID;

  // GET — return published submissions
  if (req.method === 'GET') {
    if (!notionToken || !dbId) return res.status(200).json({ submissions: [] });
    const r = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: { property: 'Published', checkbox: { equals: true } },
        sorts: [{ property: 'Submitted', direction: 'descending' }],
      }),
    });
    const data = await r.json();
    const submissions = (data.results || []).map((p) => ({
      id: p.id,
      name: p.properties.Name?.title?.[0]?.plain_text || '',
      handle: p.properties.Handle?.rich_text?.[0]?.plain_text || '',
      url: p.properties.URL?.url || '',
      what: p.properties.What?.rich_text?.[0]?.plain_text || '',
      why: p.properties.Why?.rich_text?.[0]?.plain_text || '',
      submitted: p.properties.Submitted?.date?.start || '',
    }));
    return res.status(200).json({ submissions });
  }

  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const MAX = { name: 120, handle: 60, url: 500, what: 600, why: 600 };
  const name = String(body.name || '').trim().slice(0, MAX.name);
  const handle = String(body.handle || '').trim().slice(0, MAX.handle);
  const url = String(body.url || '').trim().slice(0, MAX.url);
  const what = String(body.what || '').trim().slice(0, MAX.what);
  const why = String(body.why || '').trim().slice(0, MAX.why);

  if (!name) return res.status(400).json({ error: 'name required' });
  if (!url) return res.status(400).json({ error: 'url required' });
  try { const u = new URL(url); if (!['http:', 'https:'].includes(u.protocol)) throw new Error(); }
  catch { return res.status(400).json({ error: 'valid http/https url required' }); }
  if (!what) return res.status(400).json({ error: 'what required' });

  // No backend configured — acknowledge without persisting
  if (!notionToken || !dbId) {
    return res.status(202).json({ status: 'queued-no-backend' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';

  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: dbId },
      properties: {
        Name: { title: [{ text: { content: name } }] },
        Handle: { rich_text: [{ text: { content: handle } }] },
        URL: { url },
        What: { rich_text: [{ text: { content: what } }] },
        Why: { rich_text: [{ text: { content: why } }] },
        Submitted: { date: { start: new Date().toISOString() } },
        IP: { rich_text: [{ text: { content: ip } }] },
        Published: { checkbox: false },
        Status: { select: { name: 'pending' } },
      },
    }),
  });

  const data = await r.json();
  if (!r.ok) {
    console.error('notion submission failed', r.status, data.code || data.message || 'unknown');
    return res.status(502).json({ error: 'submission backend unavailable' });
  }
  return res.status(200).json({ id: data.id, status: 'pending' });
}

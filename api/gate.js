// api/gate.js

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, message: 'gate backend alive' });
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    return res.status(200).json({ ok: true, received: body });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

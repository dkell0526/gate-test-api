// api/gate/ack.js

import { setLastAck } from '../../lib/gateState.js';

function checkAuth(req, res) {
  const auth = req.headers.authorization || '';
  const expected = `Bearer ${process.env.GATE_API_KEY}`;

  if (auth !== expected) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

export default function handler(req, res) {
  if (!checkAuth(req, res)) return;

  if (req.method === 'POST') {
    let body = req.body || {};

    // If body was not auto-parsed
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (err) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid JSON body',
        });
      }
    }

    const commandId = Number(body.commandId);
    if (!Number.isFinite(commandId) || commandId <= 0) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid commandId',
      });
    }

    const ack = {
      commandId,
      at: new Date().toISOString(),
    };

    setLastAck(ack);

    return res.status(200).json({
      ok: true,
      lastAck: ack,
    });
  }

  res.setHeader('Allow', 'POST');
  return res
    .status(405)
    .json({ ok: false, error: `method ${req.method} not allowed` });
}

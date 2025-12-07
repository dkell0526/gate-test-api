// pages/api/gate.js

import { lastCommand, lastAck, setLastCommand } from '../../lib/gateState';

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

  if (req.method === 'GET') {
    // Status endpoint for ESP32 + Wix
    return res.status(200).json({
      ok: true,
      message: 'gate backend alive',
      lastCommand,
      lastAck,        // 🔴 new field
    });
  }

  if (req.method === 'POST') {
    // Issue a new command (currently only 'open')
    const { type } = req.body || {};

    if (type !== 'open') {
      return res
        .status(400)
        .json({ ok: false, error: 'unsupported command type' });
    }

    const id = (lastCommand.id || 0) + 1;
    const cmd = {
      id,
      type,
      at: new Date().toISOString(),
    };

    setLastCommand(cmd);

    return res.status(200).json({
      ok: true,
      lastCommand: cmd,
    });
  }

  res.setHeader('Allow', 'GET, POST');
  return res
    .status(405)
    .json({ ok: false, error: `method ${req.method} not allowed` });
}

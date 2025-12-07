// api/gate/index.js

import { lastCommand, lastAck, setLastCommand, setLastAck } from '../../lib/gateState.js';

function checkAuth(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }

  if (!process.env.API_KEY && !process.env.GATE_API_KEY) {
    console.warn('API_KEY/GATE_API_KEY not set in env');
    res.status(500).json({ ok: false, error: 'server misconfigured' });
    return false;
  }

  const expected = process.env.GATE_API_KEY || process.env.API_KEY;
  if (token !== expected) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }

  return true;
}

export default async function handler(req, res) {
  if (!checkAuth(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'gate backend alive',
      lastCommand,
      lastAck,
    });
  }

  if (req.method === 'POST') {
    let body = req.body || {};

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ ok: false, error: 'invalid JSON body' });
      }
    }

    const { type } = body;

    // 1) OPEN command from Wix/page
    if (type === 'open') {
      const id = (lastCommand.id || 0) + 1;
      const cmd = {
        id,
        type: 'open',
        at: new Date().toISOString(),
      };

      setLastCommand(cmd);

      return res.status(200).json({
        ok: true,
        lastCommand: cmd,
      });
    }

    // 2) ACK from ESP home node
    if (type === 'ack') {
      const commandId = Number(body.commandId);
      if (!Number.isFinite(commandId) || commandId <= 0) {
        return res
          .status(400)
          .json({ ok: false, error: 'invalid commandId for ack' });
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

    return res
      .status(400)
      .json({ ok: false, error: 'unsupported type (use "open" or "ack")' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res
    .status(405)
    .json({ ok: false, error: `method ${req.method} not allowed` });
}

// api/gate/index.js

import {
  lastCommand,
  lastAck,
  setLastCommand,
  setLastAck
} from '../../lib/gateState.js';

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

  // ------- GET: Wix status polling -------
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'gate backend alive',
      lastCommand,
      lastAck,
    });
  }

  // ------- POST: open from Wix OR ack/cooldown from HomeNode -------
  if (req.method === 'POST') {
    let body = req.body || {};

    // Body may arrive as a string depending on Vercel config
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res
          .status(400)
          .json({ ok: false, error: 'invalid JSON body' });
      }
    }

    const { type } = body;

    // 1) OPEN command from Wix/page
    if (type === 'open') {
      const newId = (lastCommand.id || 0) + 1;
      const cmd = {
        id: newId,
        type: 'open',
        at: new Date().toISOString(),
      };

      setLastCommand(cmd);

      return res.status(200).json({
        ok: true,
        lastCommand: cmd,
        lastAck,
      });
    }

    // 2) ACK (and optional COOLDOWN) from Home Node
    if (type === 'ack') {
      const commandId = Number(body.commandId);

      // Allow any integer (including -1 for LOCAL if you ever use it)
      if (!Number.isInteger(commandId)) {
        return res
          .status(400)
          .json({ ok: false, error: 'invalid commandId for ack' });
      }

      const nowIso = new Date().toISOString();
      const ack = {
        commandId,
        at: nowIso,
      };

      // ---- COOLDOWN HANDLING ----
      // If either "cooldown" or "cooldownMsRemaining" is present in the
      // POST body, treat this as a cooldown-aware ACK.
      const hasCdFlag = Object.prototype.hasOwnProperty.call(body, 'cooldown');
      const hasCdMs   = Object.prototype.hasOwnProperty.call(body, 'cooldownMsRemaining');

      if (hasCdFlag || hasCdMs) {
        const msRaw = Number(body.cooldownMsRemaining);
        const ms =
          Number.isFinite(msRaw) && msRaw >= 0 ? msRaw : 0;

        ack.cooldown = body.cooldown === true || ms > 0;

        if (ms > 0) {
          ack.cooldownMsRemaining = ms;
        } else {
          ack.cooldownMsRemaining = 0;
        }
      }
      // ----------------------------

      setLastAck(ack);

      return res.status(200).json({
        ok: true,
        lastAck: ack,
        lastCommand,
      });
    }

    // Anything else is unsupported
    return res
      .status(400)
      .json({ ok: false, error: 'unsupported type (use "open" or "ack")' });
  }

  // ------- Method not allowed -------
  res.setHeader('Allow', 'GET, POST');
  return res
    .status(405)
    .json({ ok: false, error: `method ${req.method} not allowed` });
}

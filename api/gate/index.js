// api/gate/index.js

const {
  getLastCommand,
  getLastAck,
  setLastCommand,
  setLastAck,
  addLog,
  getLogs,
} = require('../../lib/gateState.js');

function checkAuth(req, res) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }

  const expected = process.env.GATE_API_KEY || process.env.API_KEY;
  if (!expected) {
    console.warn('API_KEY/GATE_API_KEY not set in env');
    res.status(500).json({ ok: false, error: 'server misconfigured' });
    return false;
  }

  if (token !== expected) {
    res.status(401).json({ ok: false, error: 'unauthorized' });
    return false;
  }

  return true;
}

function buildStatus() {
  const lastCommand = getLastCommand();
  const lastAck = getLastAck();

  let cooldownActive = false;
  let cooldownMsRemaining = 0;

  if (lastAck && lastAck.at && typeof lastAck.cooldownMsRemaining === 'number') {
    const ackTimeMs = new Date(lastAck.at).getTime();
    const nowMs = Date.now();
    const elapsed = nowMs - ackTimeMs;
    const remaining = Math.max(lastAck.cooldownMsRemaining - elapsed, 0);

    cooldownMsRemaining = remaining;
    cooldownActive = !!lastAck.cooldown && remaining > 0;
  }

  let statusText = 'Gate idle';

  if (cooldownActive) {
    const sec = Math.ceil(cooldownMsRemaining / 1000);
    statusText = `Gate in cooldown (${sec}s remaining)`;
  } else if (lastCommand && lastCommand.type === 'open') {
    statusText = 'Last command: OPEN';
  }

  return {
    cooldownActive,
    cooldownMsRemaining,
    statusText,
    lastCommand,
    lastAck,
  };
}

module.exports = async function handler(req, res) {
  if (!checkAuth(req, res)) return;

  // ---- GET ----
  if (req.method === 'GET') {
    // Dev logs: GET /api/gate?view=log
    const view = (req.query && req.query.view) ? String(req.query.view) : '';
    if (view === 'log') {
      return res.status(200).json({
        ok: true,
        logs: getLogs(),
      });
    }

    const status = buildStatus();
    return res.status(200).json({
      ok: true,
      message: 'gate backend alive',
      ...status,
    });
  }

  // ---- POST ----
  if (req.method === 'POST') {
    let body = req.body || {};

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return res.status(400).json({ ok: false, error: 'invalid JSON body' });
      }
    }

    const { type } = body;
    const source = typeof body.source === 'string' ? body.source : 'unknown';

    // OPEN
    if (type === 'open') {
      // PIN required (if configured)
      const expectedPin = process.env.GATE_PIN;
      if (expectedPin) {
        const userPin = typeof body.pin === 'string' ? body.pin : String(body.pin ?? '');
        if (userPin !== expectedPin) {
          addLog({
            event: 'open_rejected',
            source,
            reason: 'invalid_pin',
          });
          return res.status(403).json({ ok: false, error: 'invalid pin' });
        }
      }

      const prevCommand = getLastCommand();
      const newId = (prevCommand?.id || 0) + 1;

      const cmd = {
        id: newId,
        type: 'open',
        at: new Date().toISOString(),
      };

      setLastCommand(cmd);

      addLog({
        event: 'open',
        source,
        commandId: cmd.id,
      });

      const status = buildStatus();
      return res.status(200).json({ ok: true, ...status });
    }

    // ACK
    if (type === 'ack') {
      const commandId = Number(body.commandId);
      if (!Number.isInteger(commandId)) {
        return res.status(400).json({ ok: false, error: 'invalid commandId for ack' });
      }

      const ack = {
        commandId,
        at: new Date().toISOString(),
      };

      // Optional cooldown info
      const msRaw = Number(body.cooldownMsRemaining);
      const ms = Number.isFinite(msRaw) && msRaw >= 0 ? msRaw : 0;
      const cooldown = body.cooldown === true || ms > 0;

      ack.cooldown = cooldown;
      ack.cooldownMsRemaining = ms;

      setLastAck(ack);

      // Optional RF metrics if you want to send them later
      const rssi = (body.rssi !== undefined) ? Number(body.rssi) : undefined;
      const snr  = (body.snr  !== undefined) ? Number(body.snr)  : undefined;

      addLog({
        event: 'ack',
        source,
        commandId,
        cooldown,
        cooldownMsRemaining: ms,
        ...(Number.isFinite(rssi) ? { rssi } : {}),
        ...(Number.isFinite(snr) ? { snr } : {}),
      });

      const status = buildStatus();
      return res.status(200).json({ ok: true, ...status });
    }

    return res.status(400).json({ ok: false, error: 'unsupported type (use "open" or "ack")' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: `method ${req.method} not allowed` });
};

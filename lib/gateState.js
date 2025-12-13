// lib/gateState.js

let lastCommand = {
  id: 0,
  type: null,
  at: null,
};

let lastAck = {
  commandId: 0,
  at: null,
  cooldown: false,
  cooldownMsRemaining: 0,
};

// ---- Rolling log (new) ----
const MAX_LOGS = 50;
let logs = []; // newest at end

function addLog(entry) {
  // entry: { ts, event, source, ... }
  logs.push({
    ts: new Date().toISOString(),
    ...entry,
  });

  if (logs.length > MAX_LOGS) {
    logs = logs.slice(logs.length - MAX_LOGS);
  }
}

function getLogs() {
  // return newest first for UI convenience
  return [...logs].reverse();
}
// ---------------------------

function getLastCommand() {
  return lastCommand;
}

function getLastAck() {
  return lastAck;
}

function setLastCommand(cmd) {
  lastCommand = cmd;
}

function setLastAck(ack) {
  lastAck = ack;
}

module.exports = {
  getLastCommand,
  getLastAck,
  setLastCommand,
  setLastAck,
  addLog,     // NEW
  getLogs,    // NEW
};

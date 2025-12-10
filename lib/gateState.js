// lib/gateState.js

// We keep lastCommand and lastAck as internal variables and expose
// getter/setter functions so other modules always see the latest values.

let lastCommand = {
  id: 0,
  type: null,       // "open" or null
  at: null,         // ISO string
};

let lastAck = {
  commandId: 0,
  at: null,                // ISO string
  cooldown: false,         // true if gate was in cooldown when ACK arrived
  cooldownMsRemaining: 0,  // ms remaining in cooldown (if known)
};

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
};

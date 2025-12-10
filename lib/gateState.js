// lib/gateState.js

// Last command sent from Wix/backend to the home node
export let lastCommand = {
  id: 0,
  type: null,       // "open" or null
  at: null,         // ISO string
};

// Last ACK received from the home/gate node
export let lastAck = {
  commandId: 0,
  at: null,                // ISO string
  cooldown: false,         // true if gate was in cooldown when ACK arrived
  cooldownMsRemaining: 0,  // ms remaining in cooldown (if known)
};

export function setLastCommand(cmd) {
  lastCommand = cmd;
}

export function setLastAck(ack) {
  lastAck = ack;
}

// lib/gateState.js

// Last command sent from Wix/backend to the home node
export let lastCommand = {
  id: 0,
  type: null,       // "open" or null
  at: null,         // ISO string
};

// Last ACK received from the gate node
export let lastAck = {
  commandId: 0,
  at: null,         // ISO string
};

export function setLastCommand(cmd) {
  lastCommand = cmd;
}

export function setLastAck(ack) {
  lastAck = ack;
}

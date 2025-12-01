// api/gate.js

// Simple in-memory state (resets on each cold start / redeploy)
let lastCommand = {
  id: 0,
  type: null,
  at: null
};

export default async function handler(req, res) {
  // Check Authorization header: "Bearer <API_KEY>"
  const auth = req.headers.authorization || "";
  const expected = `Bearer ${process.env.API_KEY}`;

  if (auth !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  if (req.method === "POST") {
    const body = req.body || {};

    if (body.action === "open") {
      // Record a new command
      lastCommand.id += 1;
      lastCommand.type = "open";
      lastCommand.at = new Date().toISOString();

      console.log("Gate command received:", body, "as id", lastCommand.id);

      return res.status(200).json({
        ok: true,
        received: "open",
        commandId: lastCommand.id,
        at: lastCommand.at
      });
    }

    return res.status(400).json({ ok: false, error: "Unknown action" });
  }

  if (req.method === "GET") {
    // Handy for debugging in browser and later for ESP32 polling
    return res.status(200).json({
      ok: true,
      message: "gate backend alive",
      lastCommand
    });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}

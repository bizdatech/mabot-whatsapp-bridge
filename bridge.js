// MABOT WhatsApp cloud bridge (Render). Reply-only support bot — never broadcasts.
// The QR code is sent to Kira and shown on the MABOT page.
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import http from "http";

const KIRA_URL = process.env.KIRA_URL;
const BRIDGE_KEY = process.env.BRIDGE_KEY;
if (!KIRA_URL || !BRIDGE_KEY) { console.error("Set KIRA_URL and BRIDGE_KEY"); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastReply = new Map();
let state = "starting";

async function callKira(payload) {
  const res = await fetch(KIRA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-bridge-key": BRIDGE_KEY },
    body: JSON.stringify(payload),
  });
  return res.json().catch(() => ({}));
}
const report = (status, extra = {}) => { state = status; callKira({ type: "state", status, ...extra }).catch(() => {}); };

async function start() {
  const { state: auth, saveCreds } = await useMultiFileAuthState("./session");
  const sock = makeWASocket({ auth, logger: pino({ level: "silent" }), printQRInTerminal: false });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) report("qr", { qr });
    if (connection === "open") report("connected", { phone: (sock.user?.id || "").split(":")[0].split("@")[0] });
    if (connection === "close") {
      const loggedOut = lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut;
      report("disconnected");
      if (loggedOut) import("fs").then((fs) => fs.rmSync("./session", { recursive: true, force: true }));
      setTimeout(start, 5000);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const m of messages) {
      const jid = m.key.remoteJid || "";
      if (m.key.fromMe || !jid.endsWith("@s.whatsapp.net")) continue; // skip own, groups, status
      const text = m.message?.conversation || m.message?.extendedTextMessage?.text;
      if (!text) continue;
      if (Date.now() - (lastReply.get(jid) || 0) < 4000) continue;
      lastReply.set(jid, Date.now());
      try {
        const { reply } = await callKira({ type: "message", from: jid.split("@")[0], name: m.pushName, text });
        if (!reply) continue;
        await sock.readMessages([m.key]);
        await sock.sendPresenceUpdate("composing", jid);
        await sleep(1500 + Math.random() * 1500);
        await sock.sendMessage(jid, { text: reply });
      } catch (e) { console.log("Reply failed:", e.message); }
    }
  });
}

// Health endpoint for Render + free uptime pinger (keeps the free plan awake).
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, state }));
}).listen(process.env.PORT || 10000);

setInterval(() => callKira({ type: "ping" }).catch(() => {}), 60_000);
callKira({ type: "ping" }).catch(() => {});
start();

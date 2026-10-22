// Minimal stand-in for the Resend API, used ONLY for automated tests (port 4020).
// POST /emails records the request. Behaviour is switched with POST /__mode {"mode":"ok|flaky|fail403|fail500"}.
import http from "node:http";
const KEY = "re_mock_key_123456789";
let mode = "ok", calls = 0; const log = [];
const send = (res, code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let body = ""; for await (const c of req) body += c;
  if (url.pathname === "/__mode" && req.method === "POST") { mode = JSON.parse(body).mode; calls = 0; return send(res, 200, { ok: true }); }
  if (url.pathname === "/__log") return send(res, 200, log);
  if (url.pathname === "/__reset") { log.length = 0; calls = 0; mode = "ok"; return send(res, 200, { ok: true }); }
  const auth = req.headers.authorization === `Bearer ${KEY}`;
  if (req.method === "GET" && url.pathname === "/domains") {
    if (!auth) return send(res, 401, { name: "invalid_api_key", message: "API key is invalid" });
    return send(res, 200, { data: [{ name: "cloudedge.test", status: "verified" }] });
  }
  if (req.method === "POST" && url.pathname === "/emails") {
    calls++;
    log.push({ auth, idem: req.headers["idempotency-key"] ?? null, body: JSON.parse(body || "{}") });
    if (!auth) return send(res, 401, { name: "invalid_api_key" });
    if (mode === "fail403") return send(res, 403, { name: "validation_error", message: "domain not verified" });
    if (mode === "fail500") return send(res, 500, { name: "internal_server_error" });
    if (mode === "flaky" && calls === 1) return send(res, 503, { name: "service_unavailable" });
    return send(res, 200, { id: "mock-" + log.length });
  }
  send(res, 404, { message: "not found" });
}).listen(4020, "127.0.0.1", () => console.log("mock resend on 4020"));

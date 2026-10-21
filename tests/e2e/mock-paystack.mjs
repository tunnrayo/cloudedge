// Minimal stand-in for the Paystack API, used ONLY for automated tests.
import http from "node:http";
const KEY = "sk_test_mock_123456";
const tx = new Map(); // reference -> {amount, email, callback_url, status, paidAmount, currency}
let refunds = 0;
const send = (res, code, body, type = "application/json") => { res.writeHead(code, { "Content-Type": type }); res.end(typeof body === "string" ? body : JSON.stringify(body)); };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let body = ""; for await (const c of req) body += c;
  const auth = req.headers.authorization === `Bearer ${KEY}`;
  if (req.method === "POST" && url.pathname === "/transaction/initialize") {
    if (!auth) return send(res, 401, { status: false, message: "Invalid key" });
    const b = JSON.parse(body);
    if (!b.email || !Number.isInteger(b.amount) || !b.reference) return send(res, 400, { status: false, message: "bad" });
    if (tx.has(b.reference)) return send(res, 400, { status: false, message: "Duplicate Transaction Reference" });
    tx.set(b.reference, { amount: b.amount, email: b.email, callback_url: b.callback_url, status: "abandoned", paidAmount: b.amount, currency: b.currency });
    return send(res, 200, { status: true, message: "Authorization URL created", data: { authorization_url: `http://127.0.0.1:4010/pay/${b.reference}`, access_code: "ac_" + b.reference, reference: b.reference } });
  }
  if (req.method === "GET" && url.pathname.startsWith("/transaction/verify/")) {
    if (!auth) return send(res, 401, { status: false, message: "Invalid key" });
    const ref = decodeURIComponent(url.pathname.split("/").pop());
    const t = tx.get(ref);
    if (!t) return send(res, 400, { status: false, message: "Transaction reference not found" });
    return send(res, 200, { status: true, message: "Verification successful", data: { id: 1, status: t.status, reference: ref, amount: t.paidAmount, currency: t.currency ?? "NGN", paid_at: t.status === "success" ? new Date().toISOString() : null, gateway_response: t.status === "success" ? "Successful" : t.status } });
  }
  if (req.method === "POST" && url.pathname === "/refund") {
    if (!auth) return send(res, 401, { status: false, message: "Invalid key" });
    refunds++; return send(res, 200, { status: true, message: "Refund has been queued for processing", data: { id: refunds, status: "pending" } });
  }
  if (req.method === "GET" && url.pathname.startsWith("/pay/")) { // fake hosted checkout page
    const ref = url.pathname.split("/").pop();
    return send(res, 200, `<html><body><h1>Mock Paystack checkout</h1><p id="ref">${ref}</p><a id="succeed" href="/complete/${ref}?r=success">Pay</a> <a id="fail" href="/complete/${ref}?r=failed">Fail</a></body></html>`, "text/html");
  }
  if (req.method === "GET" && url.pathname.startsWith("/complete/")) {
    const ref = url.pathname.split("/").pop(); const t = tx.get(ref);
    t.status = url.searchParams.get("r");
    const cb = new URL(t.callback_url); cb.searchParams.set("trxref", ref); cb.searchParams.set("reference", ref);
    res.writeHead(302, { Location: cb.toString() }); return res.end();
  }
  if (req.method === "POST" && url.pathname === "/__set") { const b = JSON.parse(body); Object.assign(tx.get(b.reference), b.patch); return send(res, 200, { ok: true }); }
  if (req.method === "GET" && url.pathname === "/__tx") return send(res, 200, Object.fromEntries(tx));
  send(res, 404, { status: false, message: "not found" });
}).listen(4010, "127.0.0.1", () => console.log("mock paystack on 4010"));

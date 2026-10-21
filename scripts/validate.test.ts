// Unit tests. Run with: npm test   (needs Node.js 22.6 or newer)
import test from "node:test";
import assert from "node:assert/strict";
import { normalize, validate } from "../src/lib/validate.ts";
import { createSessionToken, verifySessionToken, passwordMatches, adminConfig } from "../src/lib/auth.ts";

const ok = { name: "Ada Obi", email: "ada@example.com", type: "General inquiry", message: "I would like to discuss a website." };
const quote = { ...ok, mode: "quote", type: "Website design & development", scope: "A five page company website with a contact form." };

test("valid contact passes", () => assert.deepEqual(validate(normalize(ok)), {}));
test("valid quote passes", () => assert.deepEqual(validate(normalize(quote)), {}));
test("quote message is optional", () => assert.deepEqual(validate(normalize({ ...quote, message: "" })), {}));
test("bad email rejected", () => assert.ok(validate(normalize({ ...ok, email: "nope" })).email));
test("email is lower-cased", () => assert.equal(normalize({ ...ok, email: "ADA@Example.COM" }).email, "ada@example.com"));
test("short message rejected", () => assert.ok(validate(normalize({ ...ok, message: "hi" })).message));
test("unknown type rejected", () => assert.ok(validate(normalize({ ...ok, type: "Hack" })).type));
test("quote needs scope", () => assert.ok(validate(normalize({ ...ok, mode: "quote" })).scope));
test("optional phone validated when present", () => {
  assert.ok(validate(normalize({ ...ok, phone: "abc" })).phone);
  assert.equal(validate(normalize({ ...ok, phone: "+234 801 234 5678" })).phone, undefined);
});
test("unknown budget/timeline rejected", () => {
  const e = validate(normalize({ ...quote, budget: "a million", timeline: "yesterday" }));
  assert.ok(e.budget && e.timeline);
});
test("product must be a slug", () => assert.ok(validate(normalize({ ...ok, product: "<script>" })).product));
test("long input is truncated", () => assert.equal(normalize({ ...ok, name: "x".repeat(500) }).name.length, 100));
test("control characters stripped", () => assert.equal(normalize({ ...ok, name: "Ada\u0000 Obi" }).name, "Ada Obi"));
test("non-object input is safe", () => assert.ok(Object.keys(validate(normalize(null))).length > 0));

const SECRET = "x".repeat(40);
test("session token round-trip", async () => assert.equal(await verifySessionToken(await createSessionToken(SECRET), SECRET), true));
test("session token rejects wrong secret", async () => assert.equal(await verifySessionToken(await createSessionToken(SECRET), "y".repeat(40)), false));
test("session token rejects tampering", async () => {
  const t = await createSessionToken(SECRET);
  const [p, s] = t.split(".");
  assert.equal(await verifySessionToken(`${p}x.${s}`, SECRET), false);
  assert.equal(await verifySessionToken("garbage", SECRET), false);
  assert.equal(await verifySessionToken(undefined, SECRET), false);
});
test("password comparison", async () => {
  assert.equal(await passwordMatches("correct horse", "correct horse", SECRET), true);
  assert.equal(await passwordMatches("wrong", "correct horse", SECRET), false);
});
test("admin locked without strong config", () => {
  const before = { ...process.env };
  process.env.ADMIN_PASSWORD = "short"; process.env.ADMIN_SESSION_SECRET = SECRET;
  assert.equal(adminConfig().ok, false);
  process.env.ADMIN_PASSWORD = "a-long-enough-password"; process.env.ADMIN_SESSION_SECRET = "short";
  assert.equal(adminConfig().ok, false);
  process.env.ADMIN_SESSION_SECRET = SECRET;
  assert.equal(adminConfig().ok, true);
  process.env = before;
});

import test from "node:test";
import assert from "node:assert/strict";
import { normalize, validate } from "../src/lib/validate.ts";

const ok = { name: "Ada Obi", email: "ada@example.com", type: "General inquiry", message: "I would like to discuss a website." };
test("valid contact passes", () => assert.deepEqual(validate(normalize(ok)), {}));
test("bad email rejected", () => assert.ok(validate(normalize({ ...ok, email: "nope" })).email));
test("short message rejected", () => assert.ok(validate(normalize({ ...ok, message: "hi" })).message));
test("unknown type rejected", () => assert.ok(validate(normalize({ ...ok, type: "Hack" })).type));
test("quote needs scope", () => assert.ok(validate(normalize({ ...ok, mode: "quote" })).scope));
test("non-object input is safe", () => assert.ok(Object.keys(validate(normalize(null))).length > 0));

/** Paystack webhook signature check: x-paystack-signature = HMAC-SHA512(raw body, secret key), hex. */
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyPaystackSignature(rawBody: string, signature: string | null, secretKey: string | undefined): boolean {
  if (!secretKey || !signature || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const expected = Buffer.from(createHmac("sha512", secretKey).update(rawBody).digest("hex"), "hex");
  const got = Buffer.from(signature, "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

import Link from "next/link";
import { Svg } from "@/components/Icon";

/** The required sourcing disclaimer, used wherever products can be requested. */
export const SOURCING_DISCLAIMER =
  "Cloud Edge sources eligible software products through external suppliers. Availability, final pricing, licence eligibility, and delivery time must be confirmed before your order is finalised.";

/** Honest summary of how requests, prices and payment work, shown at the top of the shop. */
export function ShopNotice() {
  return (
    <div className="note info-note" role="note">
      <Svg name="info" />
      <p>
        {SOURCING_DISCLAIMER} Prices shown are <strong>indicative</strong> naira estimates. Send a request, and we will reply with a quotation; you pay only after you accept it.{" "}
        <Link href="/faq#sourcing">How sourcing works</Link> · <Link href="/refund-policy">Refunds &amp; delivery</Link>.
      </p>
    </div>
  );
}

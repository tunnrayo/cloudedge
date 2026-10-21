import Link from "next/link";
import { Svg } from "@/components/Icon";

/** Honest summary of how prices and fulfilment work, shown at the top of the shop. */
export function ShopNotice() {
  return (
    <div className="note info-note" role="note">
      <Svg name="info" />
      <p>
        Prices are in naira. Where a vendor prices in US dollars, we convert at the rate shown on the product page. Products are supplied by our team after your order
        (we purchase or provision them from the vendor or a supplier and email activation details). Products marked <strong>Available on request</strong> are not yet sold online — you can request them.{" "}
        <Link href="/refund-policy">Delivery &amp; refunds</Link>.
      </p>
    </div>
  );
}

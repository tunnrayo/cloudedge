import type { Metadata } from "next";
import Cta from "@/components/Cta";
import { faqs } from "@/lib/site";
export const metadata: Metadata = { title: "FAQ", description: "Frequently asked questions about Cloud Edge Technology Services Limited." };
export default function Faq() {
  return (<><section className="section"><div className="wrap" style={{ maxWidth: 820 }}><p className="eyebrow">FAQ</p><h1>Frequently asked questions</h1>
    {faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div></section><Cta /></>);
}

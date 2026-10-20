import type { Metadata } from "next";
import InquiryForm from "@/components/InquiryForm";
import { company } from "@/lib/site";
export const metadata: Metadata = { title: "Contact", description: "Contact Cloud Edge Technology Services Limited in Abuja, Nigeria." };

export default function Contact() {
  return (
    <section className="section"><div className="wrap two">
      <div><p className="eyebrow">Contact</p><h1>Get in touch</h1><InquiryForm mode="contact" /></div>
      <aside><h2>Company details</h2>
        <p><strong>Email</strong><br /><a href={`mailto:${company.email}`}>{company.email}</a></p>
        <address style={{ fontStyle: "normal" }}><strong>Registered address</strong>{company.address.map((l) => <div key={l}>{l}</div>)}</address>
        <p><strong>RC number</strong><br />{company.rc}</p></aside>
    </div></section>
  );
}

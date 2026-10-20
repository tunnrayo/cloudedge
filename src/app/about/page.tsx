import type { Metadata } from "next";
import Cta from "@/components/Cta";
import { company } from "@/lib/site";
export const metadata: Metadata = { title: "About", description: "About Cloud Edge Technology Services Limited, a Nigerian technology and e-commerce company based in Abuja." };

export default function About() {
  return (<>
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <p className="eyebrow">About us</p><h1>About {company.short}</h1>
      <p>{company.name} (RC {company.rc}) is a Nigerian technology and e-commerce company focused on software, web and mobile application development, internet-related services, digital products and technology solutions. Our registered office is in Wuse Zone 5, Abuja.</p>
      <div className="note" role="note">Draft for company approval: the mission, vision and principles below are proposed messaging based on the company&apos;s stated business purpose.</div>
      <h2 style={{ marginTop: 28 }}>Mission</h2><p>To help businesses, organizations and individuals use dependable technology to operate more effectively and reach their customers.</p>
      <h2>Vision</h2><p>To be a trusted technology partner for Nigerian and international clients.</p>
      <h2>Operating principles</h2>
      <ul className="tick"><li><strong>Clarity:</strong> plain business language, clear scope, no hidden surprises.</li><li><strong>Reliability:</strong> we build for maintainability and document our work.</li><li><strong>Security-minded:</strong> we collect only the data a service needs and protect it sensibly.</li><li><strong>Customer focus:</strong> technology should solve a real business problem.</li></ul>
    </div></section><Cta /></>);
}

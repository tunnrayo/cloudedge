import Link from "next/link";
export default function Cta() {
  return (
    <section className="cta"><div className="wrap">
      <div><h2>Let&apos;s discuss your project</h2><p>Tell us what you need and we will respond to discuss next steps.</p></div>
      <Link className="btn" href="/quote">Request a Quote</Link>
    </div></section>
  );
}

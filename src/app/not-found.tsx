import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Svg } from "@/components/Icon";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="section">
        <div className="container narrow center">
          <p className="eyebrow">Error 404</p>
          <h1>Page not found</h1>
          <p className="lead">The page you are looking for does not exist or has moved.</p>
          <div className="actions" style={{ justifyContent: "center" }}>
            <Link className="btn btn-primary" href="/">Back to home <Svg name="arrow" /></Link>
            <Link className="btn btn-outline" href="/search">Search the site</Link>
            <Link className="btn btn-outline" href="/contact">Contact us</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

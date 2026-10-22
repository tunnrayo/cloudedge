import Link from "next/link";
import ProductImage from "./ProductImage";
import { imageUrl, isRequestable, priceSuffix, type Product } from "@/lib/shop/products";
import { naira } from "@/lib/shop/format";

export default function ProductCard({ p }: { p: Product }) {
  const requestable = isRequestable(p);
  return (
    <article className="card hover product-card shop-card">
      <div className="product-media light">
        <ProductImage src={imageUrl(p)} alt={p.imageAlt || p.name} />
      </div>
      <div className="product-body">
        <div className="meta"><span className="badge cat">{p.category}</span></div>
        <h3><Link className="card-link" href={`/products/${p.slug}`} style={{ color: "inherit", textDecoration: "none" }}>{p.name}</Link></h3>
        <p className="clamp-2">{p.description}</p>
        <div className="price">
          <span><span className="per">Indicative</span> <strong>{naira(p.priceNgn)}</strong> <span className="per">{priceSuffix(p)}</span></span>
        </div>
        <div className="avail-row">
          {requestable ? <span className="badge ok">Request a quotation</span> : <span className="badge muted-badge">Currently unavailable</span>}
          {p.priceVerification === "needs_verification" && <span className="badge sample">Price under review</span>}
        </div>
      </div>
    </article>
  );
}

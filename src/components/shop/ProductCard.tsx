import Link from "next/link";
import ProductImage from "./ProductImage";
import { imageUrl, isPurchasable, priceSuffix, type Product } from "@/lib/shop/products";
import { naira } from "@/lib/shop/format";

export default function ProductCard({ p }: { p: Product }) {
  const buyable = isPurchasable(p);
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
          <span><strong>{naira(p.priceNgn)}</strong> <span className="per">{priceSuffix(p)}</span></span>
        </div>
        <div className="avail-row">
          {buyable ? <span className="badge ok">Buy online</span> : <span className="badge muted-badge">Available on request</span>}
          {p.priceVerification === "needs_verification" && <span className="badge sample">Price under review</span>}
        </div>
      </div>
    </article>
  );
}

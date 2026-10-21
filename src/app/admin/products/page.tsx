import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import ProductImage from "@/components/shop/ProductImage";
import { imageUrl, listProducts, purchaseBlockers, priceSuffix } from "@/lib/shop/products";
import { naira } from "@/lib/shop/format";
import { CATEGORIES } from "@/content/catalogue";
import { bulkProductsAction } from "../shop-actions";

export const metadata = { title: "Products" };

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; flag?: string; ok?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  let products = await listProducts({ q: sp.q?.slice(0, 80) || undefined, category: CATEGORIES.includes(sp.category as never) ? sp.category : undefined, sort: "featured" }, { admin: true });
  if (sp.flag === "price") products = products.filter((p) => p.priceVerification === "needs_verification");
  if (sp.flag === "resale") products = products.filter((p) => p.resaleStatus === "unconfirmed");
  if (sp.flag === "buyable") products = products.filter((p) => purchaseBlockers(p).length === 0);
  if (sp.flag === "hidden") products = products.filter((p) => p.status !== "published");
  const ret = `/admin/products?${new URLSearchParams(Object.entries({ q: sp.q ?? "", category: sp.category ?? "", flag: sp.flag ?? "" }).filter(([, v]) => v))}`;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Products ({products.length})</h1>
        <Link className="btn btn-primary btn-sm" href="/admin/products/new">Add product</Link>
      </div>
      <nav className="admin-tabs" aria-label="Product views" style={{ marginTop: 16 }}>
        <Link href="/admin/products" aria-current={!sp.flag ? "page" : undefined}>All</Link>
        <Link href="/admin/products?flag=buyable" aria-current={sp.flag === "buyable" ? "page" : undefined}>Sold online</Link>
        <Link href="/admin/products?flag=price" aria-current={sp.flag === "price" ? "page" : undefined}>Price needs verification</Link>
        <Link href="/admin/products?flag=resale" aria-current={sp.flag === "resale" ? "page" : undefined}>Resale unconfirmed</Link>
        <Link href="/admin/products?flag=hidden" aria-current={sp.flag === "hidden" ? "page" : undefined}>Draft / archived</Link>
      </nav>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok}</p></div>}
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err}</p></div>}
      <div className="alert info"><p><strong>Selling online requires:</strong> published + resale permission confirmed as <em>authorised</em> + price not marked “needs verification” + a fulfilment method. Until then, products show “Available on request” and customers can send an enquiry.</p></div>
      <form className="toolbar" method="get" action="/admin/products" role="search">
        {sp.flag && <input type="hidden" name="flag" value={sp.flag} />}
        <div className="field"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={sp.q} placeholder="Name, brand, SKU" /></div>
        <div className="field"><label htmlFor="cat">Category</label><select id="cat" name="category" defaultValue={sp.category ?? ""}><option value="">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <button className="btn btn-primary btn-sm" type="submit">Filter</button>
      </form>
      <form action={bulkProductsAction}>
        <input type="hidden" name="return" value={ret} />
        <div className="toolbar">
          <div className="field"><label htmlFor="bulk">With selected</label>
            <select id="bulk" name="bulk" defaultValue=""><option value="" disabled>Choose an action</option><option value="published">Publish</option><option value="draft">Unpublish (draft)</option><option value="archived">Archive (hide)</option><option value="purchase">Enable online purchase (only if eligible)</option><option value="enquiry">Set to enquiry only</option></select></div>
          <button className="btn btn-outline btn-sm" type="submit">Apply to selected</button>
        </div>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Products</caption>
            <thead><tr><th scope="col"><span className="sr-only">Select</span></th><th scope="col">Product</th><th scope="col">Price</th><th scope="col">Flags</th><th scope="col">Status</th></tr></thead>
            <tbody>{products.map((p) => {
              const blockers = purchaseBlockers(p);
              return (
                <tr key={p.id}>
                  <td><input type="checkbox" name="ids" value={p.id} aria-label={`Select ${p.name}`} style={{ width: 20, height: 20, minHeight: 0 }} /></td>
                  <td><div style={{ display: "flex", gap: 10, alignItems: "center" }}><ProductImage src={imageUrl(p)} alt="" className="admin-thumb" /><div><Link href={`/admin/products/${p.id}`}>{p.name}</Link><br /><span className="muted small">{p.sku} · {p.category}</span></div></div></td>
                  <td style={{ whiteSpace: "nowrap" }}>{naira(p.priceNgn)}<br /><span className="muted small">{priceSuffix(p)}</span></td>
                  <td>
                    {blockers.length === 0 ? <span className="flag good">Sold online</span> : <span className="flag warn">Enquiry</span>}
                    {p.priceVerification === "needs_verification" && <span className="flag bad">Price: verify</span>}
                    {p.priceVerification === "verified" && <span className="flag good">Price checked</span>}
                    {p.resaleStatus !== "authorised" && <span className="flag warn">Resale: {p.resaleStatus.replace("_", " ")}</span>}
                    {p.listedPriceNgn != null && p.listedPriceNgn !== p.priceNgn && <span className="flag warn" title={`Document listed ${naira(p.listedPriceNgn)}`}>Doc price differs</span>}
                  </td>
                  <td>{p.status}{p.featured ? " · featured" : ""}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </form>
    </>
  );
}

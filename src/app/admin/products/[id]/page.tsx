import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import ProductImage from "@/components/shop/ProductImage";
import { getProductById, imageUrl, purchaseBlockers } from "@/lib/shop/products";
import ProductForm from "../ProductForm";
import { deleteProductAction } from "../../shop-actions";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const p = await getProductById(id);
  if (!p) notFound();
  const blockers = purchaseBlockers(p);
  return (
    <>
      <p><Link href="/admin/products">← Products</Link> · <Link href={`/products/${p.slug}`} target="_blank">View on website</Link></p>
      <h1 style={{ fontSize: "1.7rem" }}>{p.name}</h1>
      {sp.ok && <div className="alert ok" role="status"><p>{sp.ok}</p></div>}
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err}</p></div>}
      <div className="split wide-left" style={{ alignItems: "start", gap: 24 }}>
        <ProductForm p={p} />
        <div className="stack">
          <div className="card"><ProductImage src={imageUrl(p)} alt={p.imageAlt} /><p className="hint">{p.imageId ? "Uploaded image" : `Generated image: ${p.imagePath}`}</p></div>
          <div className={`alert ${blockers.length ? "info" : "ok"}`}>
            <p><strong>{blockers.length ? "Not sold online" : "Sold online"}</strong></p>
            {blockers.length > 0 && <ul className="small" style={{ margin: "6px 0 0" }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
          </div>
          <div className="card small"><strong>Source document:</strong> {p.sourceDocument || "added in admin"}</div>
          <form action={deleteProductAction} className="card danger-zone">
            <input type="hidden" name="id" value={p.id} />
            <h2 className="h-small">Delete product</h2>
            <p className="small">Products that appear in orders are archived instead of deleted.</p>
            <label className="check"><input type="checkbox" name="confirm" value="yes" /> I understand</label>
            <button className="btn btn-danger btn-sm" type="submit" style={{ marginTop: 10 }}>Delete</button>
          </form>
        </div>
      </div>
    </>
  );
}

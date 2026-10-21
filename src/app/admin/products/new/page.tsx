import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import ProductForm from "../ProductForm";

export const metadata = { title: "Add product" };

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <>
      <p><Link href="/admin/products">← Products</Link></p>
      <h1 style={{ fontSize: "1.7rem" }}>Add product</h1>
      {sp.err && <div className="alert bad" role="alert"><p>{sp.err}</p></div>}
      <ProductForm />
    </>
  );
}

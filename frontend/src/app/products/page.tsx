import { Suspense } from "react";
import { ProductCatalog } from "@/components/product-catalog";
import { SiteHeader } from "@/components/site-header";

export default function ProductsPage() {
  return <><SiteHeader /><main><Suspense fallback={<div className="mx-auto max-w-7xl px-5 py-10 text-sm text-brand-muted">Memuat katalog...</div>}><ProductCatalog /></Suspense></main></>;
}

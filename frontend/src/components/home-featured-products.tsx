"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Store } from "lucide-react";
import { api } from "@/lib/api";
import type { Product } from "@/types/api";

export function HomeFeaturedProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    api.get("/products", { params: { per_page: 4 } })
      .then(({ data }) => setProducts(data.data ?? data))
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <p className="rounded-3xl bg-brand-cream px-6 py-12 text-center text-sm text-brand-muted">Memuat menu terbaru...</p>;
  if (hasError) return <p role="status" className="rounded-3xl bg-brand-cream px-6 py-12 text-center text-sm text-brand-muted">Menu belum bisa dimuat. Silakan jelajahi katalog untuk mencoba lagi.</p>;
  if (products.length === 0) return <div className="rounded-3xl bg-brand-cream px-6 py-12 text-center"><p className="font-semibold text-stone-800">Belum ada menu yang tersedia.</p><p className="mt-1 text-sm text-brand-muted">Menu dari UMKM lokal akan hadir di sini.</p></div>;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <Link href={`/products/${product.slug}`} key={product.id} className="group overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-950/5">
          <div className="relative flex h-52 items-center justify-center overflow-hidden bg-brand-light text-6xl">
            {product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" unoptimized={product.image_url.includes("/storage/")} className="object-cover transition duration-300 group-hover:scale-105" /> : "🍲"}
          </div>
          <div className="p-4"><p className="flex items-center gap-1.5 text-xs font-medium text-brand-muted"><Store size={13} />{product.merchant?.store_name}</p><h3 className="mt-2 line-clamp-1 font-bold text-stone-900">{product.name}</h3><p className="mt-3 font-extrabold text-brand-forest">Rp{Number(product.price).toLocaleString("id-ID")}</p></div>
        </Link>
      ))}
      <Link href="/products" className="group flex items-center justify-center gap-2 rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/60 p-5 font-bold text-brand-forest transition hover:bg-emerald-100 sm:col-span-2 lg:col-span-4">
        Temukan lebih banyak menu <ArrowRight size={18} className="transition group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

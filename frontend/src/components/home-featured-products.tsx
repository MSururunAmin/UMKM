"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Store } from "lucide-react";
import { api } from "@/lib/api";
import { getFoodImage } from "@/lib/food-images";
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
    <>
      <div
        role="region"
        aria-label="Menu unggulan"
        aria-roledescription="carousel"
        className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-5 pb-3 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4"
      >
        {products.map((product) => (
          <Link href={`/products/${product.slug}`} key={product.id} className="group w-[46%] shrink-0 snap-start overflow-hidden rounded-2xl border border-brand-border/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/10 sm:w-auto sm:shrink sm:rounded-3xl">
            <div className="relative flex h-28 items-center justify-center overflow-hidden bg-brand-light text-6xl sm:h-52">
              <Image src={product.image_url || getFoodImage(product.category)} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 25vw" unoptimized={Boolean(product.image_url?.includes("/storage/"))} quality={75} className="object-cover transition duration-300 group-hover:scale-105" />
            </div>
            <div className="p-2.5 sm:p-4">
              <p className="flex items-center gap-1 text-[10px] font-medium text-brand-muted sm:text-xs"><Store className="size-3 shrink-0 sm:size-[13px]" /><span className="truncate">{product.merchant?.store_name}</span></p>
              <h3 className="mt-1.5 line-clamp-1 text-sm font-bold text-stone-900 transition-colors group-hover:text-brand-secondary sm:mt-2 sm:text-base">{product.name}</h3>
              <p className="mt-2 text-sm font-extrabold text-brand-forest sm:mt-3 sm:text-base">Rp{Number(product.price).toLocaleString("id-ID")}</p>
            </div>
          </Link>
        ))}
      </div>
      <Link href="/products" className="group mt-3 flex items-center justify-center gap-2 rounded-3xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 font-bold text-brand-forest transition hover:bg-emerald-100 sm:mt-5">
        Temukan lebih banyak menu <ArrowRight size={18} className="transition group-hover:translate-x-1" />
      </Link>
    </>
  );
}

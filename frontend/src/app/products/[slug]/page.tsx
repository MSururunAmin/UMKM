"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Check, ChevronRight, Minus, Plus, ShoppingBag, Store } from "lucide-react";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart-store";
import type { Product } from "@/types/api";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { SellerDirections } from "@/components/seller-directions";
import { TegalMap } from "@/components/tegal-map";

export default function ProductDetailPage() {
  return <Suspense fallback={<><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-5 py-20 text-center text-brand-muted">Memuat produk...</main></>}><ProductDetail /></Suspense>;
}

function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    let active = true;
    api.get(`/products/${slug}`)
      .then((response) => { if (active) setProduct(response.data.data); })
      .catch(() => { if (active) setError("Produk tidak ditemukan atau sudah tidak tersedia."); });
    return () => { active = false; };
  }, [slug]);

  if (error) return <><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-5 py-20 text-center"><p role="alert" className="text-lg font-semibold text-stone-800">{error}</p><Link className="mt-4 inline-block font-bold text-brand-forest hover:text-brand-secondary" href="/products">Kembali ke katalog</Link></main></>;
  if (!product) return <><SiteHeader /><main className="mx-auto w-full max-w-6xl flex-1 px-5 py-20 text-center text-brand-muted">Memuat produk...</main></>;

  const isAvailable = product.stock > 0;
  const seller = product.merchant;
  const sellerLocation = seller?.id && seller.latitude != null && seller.longitude != null
    ? {
        ...seller,
        id: seller.id,
        description: seller.description ?? null,
        address: seller.address ?? "",
        location_check_source: "OpenStreetMap Nominatim",
        is_open: seller.is_open ?? true,
      }
    : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-sm text-brand-muted">
          <Link href="/products" className="transition hover:text-brand-forest">Katalog</Link><ChevronRight size={15} /><span className="truncate font-medium text-stone-800">{product.name}</span>
        </nav>
        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div className="relative flex min-h-80 items-center justify-center overflow-hidden rounded-[2rem] border border-brand-border bg-brand-light text-8xl sm:min-h-[30rem]">
            {product.image_url ? <Image src={product.image_url} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" unoptimized={product.image_url.includes("/storage/")} className="object-cover" /> : "🍲"}
          </div>
          <section className="rounded-[2rem] border border-brand-border bg-white p-6 shadow-sm sm:p-8">
            {product.category && <span className="inline-flex rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-forest">{product.category.name}</span>}
            <h1 className="mt-4 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">{product.name}</h1>
            <p className="mt-4 text-base leading-7 text-brand-muted">{product.description}</p>
            <p className="mt-7 text-3xl font-black tracking-tight text-brand-forest">Rp{Number(product.price).toLocaleString("id-ID")}</p>
            <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold ${isAvailable ? "text-brand-secondary" : "text-red-700"}`}>
              {isAvailable ? <Check size={16} /> : null}
              {isAvailable ? `Tersedia · ${product.stock} stok` : "Stok sedang habis"}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <div className="flex h-12 items-center rounded-xl border border-brand-border bg-white">
                <button type="button" aria-label="Kurangi jumlah" onClick={() => setQuantity((value) => Math.max(1, value - 1))} disabled={!isAvailable || quantity <= 1} className="flex size-11 items-center justify-center rounded-l-xl text-brand-forest transition hover:bg-emerald-50 disabled:opacity-40"><Minus size={16} /></button>
                <span aria-live="polite" className="min-w-9 text-center text-sm font-bold">{quantity}</span>
                <button type="button" aria-label="Tambah jumlah" onClick={() => setQuantity((value) => Math.min(product.stock, value + 1))} disabled={!isAvailable || quantity >= product.stock} className="flex size-11 items-center justify-center rounded-r-xl text-brand-forest transition hover:bg-emerald-50 disabled:opacity-40"><Plus size={16} /></button>
              </div>
              <Button size="lg" disabled={!isAvailable} onClick={() => { for (let count = 0; count < quantity; count += 1) addItem(product); }} className="min-w-48 flex-1">
                <ShoppingBag size={18} /> {isAvailable ? "Tambah ke keranjang" : "Stok habis"}
              </Button>
            </div>
            <div className="my-8 border-t border-brand-border" />
            <div className="rounded-2xl bg-brand-cream p-4 sm:p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-muted">Dijual oleh</p>
              {seller && <Link href={`/stores/${seller.slug}`} className="mt-2 inline-flex items-center gap-2 font-bold text-stone-900 hover:text-brand-forest">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-light text-brand-forest"><Store size={18} /></span>{seller.store_name}
              </Link>}
              {seller?.description && <p className="mt-3 text-sm leading-6 text-brand-muted">{seller.description}</p>}
              {seller?.address && <p className="mt-2 text-sm text-brand-muted">{seller.address}</p>}
              {seller && <p className="mt-2 text-xs text-brand-muted">{seller.village}, {seller.district}, {seller.regency}, {seller.province}</p>}
              <div className="mt-4">
                <SellerDirections latitude={seller?.latitude} longitude={seller?.longitude} address={seller?.address} />
              </div>
              {sellerLocation && (
                <div className="mt-5">
                  <TegalMap stores={[sellerLocation]} height="18rem" />
                  <p className="mt-2 text-xs text-brand-muted">Lokasi dicek melalui OpenStreetMap; bukan verifikasi pemerintah.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

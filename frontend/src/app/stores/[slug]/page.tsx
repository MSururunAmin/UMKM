"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, Store as StoreIcon } from "lucide-react";
import { SellerDirections } from "@/components/seller-directions";
import { SiteHeader } from "@/components/site-header";
import { TegalMap } from "@/components/tegal-map";
import { api } from "@/lib/api";
import type { Product, StoreLocation } from "@/types/api";

type StoreDetail = StoreLocation & { products: Product[] };

export default function StoreDetailPage() {
  return <Suspense fallback={<><SiteHeader /><main className="mx-auto w-full max-w-7xl flex-1 px-5 py-20 text-center text-brand-muted">Memuat toko...</main></>}><StoreDetail /></Suspense>;
}

function StoreDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<{ data: StoreDetail }>(`/stores/${slug}`)
      .then(({ data }) => {
        if (active) setStore(data.data);
      })
      .catch(() => {
        if (active) setError("Toko tidak ditemukan atau belum tersedia untuk publik.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/stores" className="text-sm font-semibold text-brand-secondary hover:text-brand-forest">← Kembali ke peta UMKM</Link>
        {loading ? (
          <p role="status" className="py-20 text-center text-brand-muted">Memuat toko...</p>
        ) : error || !store ? (
          <p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error || "Toko tidak ditemukan."}</p>
        ) : (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-3xl border border-brand-border bg-white p-6 sm:p-8">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-secondary"><StoreIcon size={17} /> UMKM Tegal</p>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-stone-900">{store.store_name}</h1>
                {store.description && <p className="mt-3 leading-7 text-brand-muted">{store.description}</p>}
                <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-stone-700"><MapPin size={17} className="mt-1 shrink-0 text-brand-secondary" />{store.address}</p>
                <p className="mt-2 text-sm text-brand-muted">{store.village}, {store.district}, {store.regency}, {store.province}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <SellerDirections latitude={store.latitude} longitude={store.longitude} address={store.address} />
                  <span className="text-xs text-brand-muted">Lokasi dicek via OpenStreetMap; bukan verifikasi pemerintah.</span>
                </div>
                <div className="mt-6">
                  <TegalMap stores={[store]} height="20rem" />
                </div>
              </section>
              <section>
                <h2 className="text-2xl font-black text-stone-900">Menu dari toko ini</h2>
                {!store.is_open ? (
                  <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-brand-muted">Toko sedang tutup.</p>
                ) : store.products.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-white p-6 text-sm text-brand-muted">Belum ada menu tersedia.</p>
                ) : (
                  <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                    {store.products.map((product) => (
                      <li key={product.id}>
                        <Link href={`/products/${product.slug}`} className="block overflow-hidden rounded-2xl border border-brand-border bg-white transition hover:-translate-y-0.5 hover:shadow-brand">
                          <div className="relative h-40 bg-brand-light">
                            {product.image_url && <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 640px) 100vw, 50vw" unoptimized={product.image_url.includes("/storage/")} className="object-cover" />}
                          </div>
                          <div className="p-4">
                            <h3 className="font-bold text-stone-900">{product.name}</h3>
                            <p className="mt-1 text-sm font-bold text-brand-forest">Rp{Number(product.price).toLocaleString("id-ID")}</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </>
  );
}

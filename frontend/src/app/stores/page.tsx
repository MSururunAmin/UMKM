"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Store as StoreIcon } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { TegalMap } from "@/components/tegal-map";
import { api } from "@/lib/api";
import type { StoreLocation } from "@/types/api";

export default function StoreDiscoveryPage() {
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<{ data: StoreLocation[] }>("/stores")
      .then(({ data }) => {
        if (active) setStores(data.data);
      })
      .catch(() => {
        if (active) setError("Peta UMKM belum dapat dimuat. Silakan coba lagi.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <section className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_90%_10%,rgba(93,128,93,0.44),transparent_34%),linear-gradient(125deg,#123d2b,#205238_58%,#386641)] px-6 py-7 text-white shadow-[0_28px_70px_-40px_rgba(18,61,43,0.75)] sm:px-9 sm:py-9">
          <div aria-hidden="true" className="absolute -right-14 -top-20 size-64 rounded-full border-[34px] border-white/5" />
          <div className="relative max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Jelajahi sekitar Tegal</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Peta UMKM lokal</h1>
            <p className="mt-3 leading-7 text-emerald-50/85">Temukan toko yang telah disetujui dan memiliki lokasi yang dicek melalui OpenStreetMap. Pemeriksaan peta ini bukan verifikasi pemerintah.</p>
          </div>
        </section>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {!error && (
          <div className="mt-7 grid gap-5 lg:grid-cols-[1.5fr_0.8fr]">
            <div className="overflow-hidden rounded-3xl border border-brand-border/80 bg-white p-1 shadow-[0_18px_48px_-36px_rgba(18,61,43,0.4)]">
              <TegalMap stores={stores} height="min(70vh, 42rem)" />
            </div>
            <section aria-label="Daftar toko di peta" className="max-h-[min(70vh,42rem)] overflow-y-auto rounded-3xl border border-brand-border/80 bg-white p-4 shadow-[0_18px_48px_-36px_rgba(18,61,43,0.4)] sm:p-5">
              <h2 className="text-lg font-bold text-stone-900">Toko di wilayah Tegal</h2>
              {loading ? (
                <p role="status" className="py-10 text-center text-sm text-brand-muted">Memuat toko...</p>
              ) : stores.length === 0 ? (
                <p className="py-10 text-center text-sm text-brand-muted">Belum ada toko dengan lokasi yang dapat ditampilkan.</p>
              ) : (
                <ul className="mt-3 divide-y divide-brand-border">
                  {stores.map((store) => (
                    <li key={store.id} className="py-3">
                      <Link href={`/stores/${store.slug}`} className="group block rounded-2xl p-3 transition hover:bg-brand-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary">
                        <span className="flex items-center gap-2 font-bold text-stone-900 group-hover:text-brand-forest"><StoreIcon size={16} />{store.store_name}</span>
                        <span className="mt-1 flex items-start gap-2 text-sm text-brand-muted"><MapPin size={15} className="mt-0.5 shrink-0" />{store.address}</span>
                        <span className="mt-2 block text-xs font-semibold text-brand-secondary">{store.regency}, Jawa Tengah</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <p className="mt-4 text-xs text-brand-muted">Peta menggunakan OpenStreetMap. Jangan melakukan pemuatan massal atau penggunaan offline pada server tile publik.</p>
      </main>
    </>
  );
}

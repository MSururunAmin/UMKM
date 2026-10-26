"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, CheckCircle2, Leaf, MapPin, Store } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HomeFeaturedProducts } from "@/components/home-featured-products";
import { api } from "@/lib/api";
import type { Category } from "@/types/api";

type HomeSettings = {
  home_badge: string;
  home_title: string;
  home_description: string;
  home_card_emoji: string;
  home_card_label: string;
  home_card_title: string;
  category_eyebrow: string;
  category_title: string;
  featured_eyebrow: string;
  featured_title: string;
  seller_eyebrow: string;
  seller_title: string;
  seller_description: string;
  seller_button: string;
};

type HomeBanner = { id: number; title: string; description: string | null; image_url: string | null; link_url: string | null };

const defaultSettings: HomeSettings = {
  home_badge: "Rasa dekat, dukung lokal",
  home_title: "Cerita baik, dimulai dari sepiring rasa.",
  home_description: "Temukan masakan rumahan dan jajanan autentik dari pelaku UMKM di sekitarmu. Setiap pesanan ikut menumbuhkan usaha lokal.",
  home_card_emoji: "🍲",
  home_card_label: "Dari tetangga, untuk tetangga",
  home_card_title: "Rasa rumahan, selalu punya cerita.",
  category_eyebrow: "Ada rasa untuk setiap suasana",
  category_title: "Mulai dari yang kamu suka",
  featured_eyebrow: "Temukan favoritmu",
  featured_title: "Menu dari dapur sekitar",
  seller_eyebrow: "Punya usaha kuliner?",
  seller_title: "Saatnya lebih banyak orang mencicipi karya terbaikmu.",
  seller_description: "Bawa cerita dari dapurmu ke lebih banyak meja makan bersama Rasa Lokal.",
  seller_button: "Daftarkan usahamu",
};

const defaultCategories: Category[] = [
  { id: 1, name: "Makanan Berat", slug: "makanan-berat", emoji: "🍛", caption: "Masakan rumahan yang mengenyangkan" },
  { id: 2, name: "Jajanan Pasar", slug: "jajanan-pasar", emoji: "🍡", caption: "Jajanan tradisional penuh cerita" },
  { id: 3, name: "Minuman", slug: "minuman", emoji: "🥤", caption: "Segar untuk menemani harimu" },
  { id: 4, name: "Camilan", slug: "camilan", emoji: "🍪", caption: "Teman santai buatan tetangga" },
];

export default function Home() {
  const [settings, setSettings] = useState(defaultSettings);
  const [categories, setCategories] = useState(defaultCategories);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [contentUnavailable, setContentUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    api.get<{ settings: HomeSettings; categories: Category[]; banners: HomeBanner[] }>("/home-content")
      .then(({ data }) => {
        if (!active) return;
        setSettings(data.settings);
        setCategories(data.categories);
        setBanners(data.banners);
      })
      .catch(() => {
        if (active) setContentUnavailable(true);
      });
    return () => { active = false; };
  }, []);

  return (
    <>
      <SiteHeader />
      <main>
        {contentUnavailable && <p role="status" className="bg-amber-50 px-5 py-2 text-center text-xs text-amber-900">Konten terbaru belum dapat dimuat. Menampilkan konten bawaan.</p>}
        <section className="overflow-hidden bg-brand-cream">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_0.9fr] lg:gap-16 lg:py-24">
            <div className="relative z-10">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-border bg-white/80 px-4 py-2 text-sm font-semibold text-brand-secondary shadow-sm">
                <MapPin size={16} /> {settings.home_badge}
              </p>
              <h1 className="max-w-2xl text-5xl font-black leading-[1.06] tracking-[-0.045em] text-stone-900 sm:text-6xl lg:text-7xl">
                {settings.home_title}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-brand-muted">
                {settings.home_description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-forest px-6 py-3 font-bold text-white shadow-lg shadow-emerald-950/15 transition hover:-translate-y-0.5 hover:bg-brand-secondary">
                  Jelajahi menu <ArrowRight size={18} />
                </Link>
                <Link href="/register" className="inline-flex min-h-12 items-center rounded-full border border-brand-border bg-white px-6 py-3 font-bold text-brand-forest transition hover:border-brand-secondary hover:bg-emerald-50">
                  Jadi penjual
                </Link>
                <Link href="/stores" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-border bg-white px-6 py-3 font-bold text-brand-forest transition hover:border-brand-secondary hover:bg-emerald-50">
                  <MapPin size={17} /> Peta UMKM
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-brand-muted">
                <span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-brand-secondary" /> Dibuat UMKM lokal</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-brand-secondary" /> Pesan dengan mudah</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -right-8 -top-8 size-44 rounded-full bg-brand-light/80 blur-2xl" />
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/70 bg-gradient-to-br from-emerald-100 via-[#eef0dc] to-[#e7ead6] p-6 shadow-[0_30px_80px_-36px_rgba(22,78,53,0.35)] sm:p-9">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-2 text-xs font-bold text-brand-forest"><Leaf size={14} /> PILIHAN DARI DAPUR LOKAL</span>
                  <span className="text-sm font-semibold text-brand-muted">01 / 04</span>
                </div>
                <div className="flex min-h-64 items-center justify-center text-[9rem] drop-shadow-[0_18px_22px_rgba(22,78,53,0.16)] sm:min-h-80 sm:text-[12rem]" aria-hidden="true">{settings.home_card_emoji}</div>
                <div className="rounded-2xl bg-white/90 p-4 shadow-lg shadow-emerald-950/5 backdrop-blur sm:p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-secondary">{settings.home_card_label}</p>
                  <p className="mt-1 text-lg font-extrabold text-stone-900">{settings.home_card_title}</p>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-3 hidden items-center gap-3 rounded-2xl border border-brand-border bg-white p-3 pr-5 shadow-xl shadow-emerald-950/10 sm:flex">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-light text-xl">🌿</span>
                <span><strong className="block text-sm text-stone-900">Dukung usaha lokal</strong><small className="text-brand-muted">Belanja dengan lebih bermakna</small></span>
              </div>
            </div>
          </div>
        </section>

        {banners.length > 0 && (
          <section aria-label="Promosi" className="mx-auto grid max-w-7xl gap-4 px-5 pt-10 sm:px-8 md:grid-cols-2">
            {banners.map((banner) => (
              <a key={banner.id} href={banner.link_url || "/products"} className="group relative flex min-h-48 overflow-hidden rounded-3xl bg-brand-forest p-6 text-white">
                {banner.image_url && <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center opacity-40 transition group-hover:scale-105" style={{ backgroundImage: `url("${banner.image_url}")` }} />}
                <div className="absolute inset-0 bg-gradient-to-r from-stone-950/75 to-stone-950/10" />
                <div className="relative z-10 mt-auto max-w-xl">
                  <h2 className="text-2xl font-black">{banner.title}</h2>
                  {banner.description && <p className="mt-2 text-sm leading-6 text-white/90">{banner.description}</p>}
                </div>
              </a>
            ))}
          </section>
        )}

        <section id="kategori" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">{settings.category_eyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">{settings.category_title}</h2></div>
            <Link href="/products" className="inline-flex items-center gap-2 font-bold text-brand-forest hover:text-brand-secondary">Lihat semua menu <ArrowRight size={17} /></Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link href={`/products?category=${encodeURIComponent(category.slug)}`} key={category.id} className="group rounded-3xl border border-brand-border bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5">
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-brand-light text-4xl transition group-hover:rotate-3">{category.emoji || "🍽️"}</div>
                <h3 className="font-bold text-stone-900">{category.name}</h3><p className="mt-1 text-sm leading-6 text-brand-muted">{category.caption}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-secondary">{settings.featured_eyebrow}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">{settings.featured_title}</h2></div>
              <Link href="/products" className="inline-flex items-center gap-2 font-bold text-brand-forest hover:text-brand-secondary">Jelajahi katalog <ArrowRight size={17} /></Link>
            </div>
            <HomeFeaturedProducts />
          </div>
        </section>

        <section className="bg-brand-forest">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-12 sm:px-8 sm:py-16 md:flex-row md:items-center">
            <div><p className="flex items-center gap-2 text-sm font-semibold text-emerald-100"><Store size={17} /> {settings.seller_eyebrow}</p><h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">{settings.seller_title}</h2><p className="mt-3 max-w-xl leading-7 text-emerald-100/80">{settings.seller_description}</p></div>
            <Link href="/register" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-brand-forest transition hover:bg-emerald-50">{settings.seller_button} <ArrowDown size={17} className="-rotate-45" /></Link>
          </div>
        </section>
      </main>
    </>
  );
}

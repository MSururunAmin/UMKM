"use client";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Store } from "lucide-react";
import { api } from "@/lib/api";
import { getFoodImage } from "@/lib/food-images";
import type { Category, Product } from "@/types/api";

type CatalogResponse = { data: Product[]; current_page: number; last_page: number; total: number };

export function ProductCatalog() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<Product[] | null>(null);
  const [bestSellingError, setBestSellingError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") ?? "all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<{ data: Category[] }>("/categories")
      .then(({ data }) => {
        if (!active) return;
        setCategories(data.data ?? []);
      })
      .catch(() => {
        if (active) setLoadError("Kategori belum bisa dimuat. Periksa koneksi lalu coba lagi.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    api.get<CatalogResponse>("/products", { params: { sort_by: "best_selling", per_page: 8 } })
    .then(({ data }) => {
      if (active) setBestSellingProducts(data.data ?? []);
    })
    .catch(() => {
      if (active) setBestSellingError("Menu terlaris belum bisa dimuat. Silakan coba lagi nanti.");
    });

    return () => {
    active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => {
      api.get<CatalogResponse>("/products", {
        params: {
          page: currentPage,
          per_page: 12,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(activeCategory !== "all" ? { category: activeCategory } : {}),
        },
        signal: controller.signal,
      })
        .then(({ data: page }) => {
          if (!active) return;
          setProducts(page.data ?? []);
          setLastPage(page.last_page ?? 1);
          setTotalProducts(page.total ?? page.data?.length ?? 0);
        })
        .catch((error: unknown) => {
          if (!active || axios.isCancel(error)) return;
          setLoadError("Menu belum bisa dimuat. Periksa koneksi lalu coba lagi.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, search.trim() ? 300 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [currentPage, activeCategory, search]);

  const sortedProducts = useMemo(() => [...products].sort((left, right) => {
    if (sortOrder === "price-ascending") return Number(left.price) - Number(right.price);
    if (sortOrder === "price-descending") return Number(right.price) - Number(left.price);
    if (sortOrder === "name") return left.name.localeCompare(right.name, "id");
    return 0;
  }), [products, sortOrder]);

  const changeCategory = (category: string) => {
    setLoading(true);
    setLoadError("");
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const changePage = (page: number) => {
    setLoading(true);
    setCurrentPage(page);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_90%_10%,rgba(93,128,93,0.44),transparent_34%),linear-gradient(125deg,#123d2b,#205238_58%,#386641)] px-6 py-8 text-white shadow-[0_28px_70px_-40px_rgba(18,61,43,0.75)] sm:px-9 sm:py-10">
        <div aria-hidden="true" className="absolute -right-14 -top-20 size-64 rounded-full border-[34px] border-white/5" />
        <div className="relative max-w-3xl">
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Pilihan UMKM terbaik</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Temukan rasa yang dekat di hati.</h1>
          <p className="mt-3 max-w-2xl leading-7 text-emerald-50/85">Jelajahi menu buatan pelaku usaha lokal dan temukan favorit barumu.</p>
        </div>
      </div>

      <div className="mb-7 grid gap-3 rounded-3xl border border-brand-border/80 bg-white p-3 shadow-[0_16px_45px_-35px_rgba(18,61,43,0.45)] sm:grid-cols-[1fr_auto] sm:p-4">
        <label className="flex min-w-0 items-center gap-3 rounded-2xl bg-brand-cream px-4 py-3.5">
          <Search size={19} className="shrink-0 text-brand-muted" />
          <input value={search} onChange={(event) => { setLoading(true); setLoadError(""); setSearch(event.target.value); setCurrentPage(1); }} aria-label="Cari menu" placeholder="Cari nama menu..." className="w-full bg-transparent text-sm outline-none placeholder:text-brand-muted/80 focus-visible:ring-0" />
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-brand-border px-4 py-2.5 text-sm font-semibold text-stone-700 focus-within:border-brand-secondary">
          <SlidersHorizontal size={17} className="text-brand-secondary" />
          <span className="sr-only">Urutkan menu</span>
          <select aria-label="Urutkan menu" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} className="min-w-36 bg-transparent outline-none">
            <option value="newest">Terbaru</option>
            <option value="name">Nama A–Z</option>
            <option value="price-ascending">Harga terendah</option>
            <option value="price-descending">Harga tertinggi</option>
          </select>
        </label>
      </div>

      <section aria-labelledby="best-selling-heading" className="mb-8">
        <div className="mb-4">
          <h2 id="best-selling-heading" className="text-xl font-black text-stone-900 sm:text-2xl">Terlaris</h2>
          <p className="mt-1 text-sm text-brand-muted">Menu favorit yang paling banyak dipesan.</p>
        </div>
        {bestSellingError ? (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{bestSellingError}</p>
        ) : bestSellingProducts === null ? (
          <p role="status" className="py-4 text-sm text-brand-muted">Memuat menu terlaris...</p>
        ) : bestSellingProducts.length === 0 ? (
          <p className="rounded-2xl bg-brand-cream px-4 py-5 text-sm text-brand-muted">Belum ada menu terlaris.</p>
        ) : (
          <div role="region" aria-label="Menu terlaris, geser ke samping untuk melihat menu lainnya" aria-roledescription="carousel" className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-5 pb-3 sm:mx-0">
            {bestSellingProducts.map((product) => <CatalogProductCard key={product.id} product={product} horizontal />)}
          </div>
        )}
      </section>

      <div role="group" aria-label="Filter kategori menu" className="-mx-5 mb-8 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain px-5 pb-2 sm:mx-0 sm:px-0">
        <button onClick={() => changeCategory("all")} aria-pressed={activeCategory === "all"} className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition ${activeCategory === "all" ? "bg-brand-forest text-white" : "bg-white text-brand-forest ring-1 ring-brand-border hover:bg-emerald-50"}`}>Semua menu</button>
        {categories.map((category) => <button key={category.id} onClick={() => changeCategory(category.slug)} aria-pressed={activeCategory === category.slug} className={`shrink-0 snap-start whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition ${activeCategory === category.slug ? "bg-brand-forest text-white" : "bg-white text-brand-forest ring-1 ring-brand-border hover:bg-emerald-50"}`}>{category.name}</button>)}
      </div>

      <div className="mb-5 flex min-h-7 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-brand-muted" aria-live="polite">{loading ? "Memuat menu..." : `${totalProducts} menu ditemukan`}</p>
        {lastPage > 1 && <p className="text-sm text-brand-muted">Halaman {currentPage} dari {lastPage}</p>}
      </div>

      {loadError ? (
        <div role="alert" className="rounded-3xl border border-red-100 bg-red-50 px-6 py-14 text-center text-sm text-red-800">{loadError}</div>
      ) : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Memuat produk">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="overflow-hidden rounded-3xl border border-brand-border bg-white"><div className="h-52 animate-pulse bg-brand-light" /><div className="space-y-3 p-4"><div className="h-3 w-1/3 animate-pulse rounded bg-brand-light" /><div className="h-5 w-3/4 animate-pulse rounded bg-brand-light" /></div></div>)}
        </div>
      ) : sortedProducts.length === 0 ? (
        <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-sm"><p className="text-lg font-bold text-stone-800">Menu belum tersedia</p><p className="mt-2 text-sm text-brand-muted">Coba kata kunci atau kategori lainnya.</p></div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {sortedProducts.map((product) => <CatalogProductCard key={product.id} product={product} compact />)}
        </div>
      )}

      {!loadError && lastPage > 1 && (
        <nav aria-label="Halaman katalog" className="mt-9 flex items-center justify-center gap-3">
          <button type="button" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={currentPage === 1 || loading} className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-forest transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft size={17} /> Sebelumnya</button>
          <span className="text-sm font-semibold text-brand-muted">{currentPage} / {lastPage}</span>
          <button type="button" onClick={() => changePage(Math.min(lastPage, currentPage + 1))} disabled={currentPage === lastPage || loading} className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-forest transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50">Berikutnya <ChevronRight size={17} /></button>
        </nav>
      )}
    </div>
  );
}

function CatalogProductCard({ product, horizontal = false, compact = false }: { product: Product; horizontal?: boolean; compact?: boolean }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group overflow-hidden border border-brand-border/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/10 ${horizontal ? "w-[46%] shrink-0 snap-start rounded-2xl sm:w-64" : compact ? "flex rounded-2xl" : "rounded-3xl"}`}
    >
      <div className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-brand-light text-6xl ${horizontal ? "h-28" : compact ? "h-28 w-28" : "h-52"}`}>
        <Image src={product.image_url || getFoodImage(product.category)} alt={product.name} fill sizes={horizontal ? "60vw" : compact ? "112px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"} unoptimized={Boolean(product.image_url?.includes("/storage/"))} quality={75} className="object-cover transition duration-300 group-hover:scale-105" />
        <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold sm:left-3 sm:top-3 sm:px-3 sm:text-xs ${product.stock > 5 ? "bg-white/95 text-brand-forest" : product.stock > 0 ? "bg-amber-50 text-amber-900" : "bg-stone-100 text-stone-600"}`}>{product.stock > 5 ? "Tersedia" : product.stock > 0 ? `Sisa ${product.stock}` : "Habis"}</span>
      </div>
      <div className={`${horizontal || compact ? "p-3" : "p-4"} ${compact ? "min-w-0 flex-1" : ""}`}>
        <div className={`mb-1.5 flex items-center gap-1 font-semibold text-brand-muted ${compact ? "text-[10px] sm:text-xs" : "gap-1.5 text-xs"}`}><Store size={compact ? 11 : 13} />{product.merchant?.store_name ?? "UMKM Lokal"}</div>
        <h2 className={`font-bold text-stone-900 transition-colors group-hover:text-brand-secondary ${compact ? "line-clamp-2 text-sm" : "line-clamp-1"} ${horizontal ? "text-sm" : ""}`}>{product.name}</h2>
        <p className={`mt-1 text-brand-muted ${compact || horizontal ? "line-clamp-1 text-xs" : "line-clamp-2 min-h-10 text-sm leading-5"}`}>{product.description}</p>
        <p className={`font-black text-brand-forest ${horizontal || compact ? "mt-2 text-sm" : "mt-3"}`}>Rp{Number(product.price).toLocaleString("id-ID")}</p>
      </div>
    </Link>
  );
}

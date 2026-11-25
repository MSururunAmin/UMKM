"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { getFoodImage } from "@/lib/food-images";

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCartStore();
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 sm:px-8 sm:py-12">
        <div className="rounded-3xl bg-[radial-gradient(ellipse_at_90%_10%,rgba(93,128,93,0.44),transparent_34%),linear-gradient(125deg,#123d2b,#205238_58%,#386641)] px-6 py-7 text-white shadow-[0_26px_65px_-42px_rgba(18,61,43,0.8)] sm:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Pesananmu</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Keranjang belanja</h1>
          <p className="mt-2 text-sm text-emerald-50/85">{items.length} jenis menu siap menemani harimu.</p>
        </div>

        {!items.length ? (
          <div className="mt-7 rounded-3xl border border-brand-border/80 bg-white px-6 py-16 text-center shadow-[0_20px_55px_-42px_rgba(18,61,43,0.45)]">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-light text-brand-forest">
              <ShoppingBag size={28} />
            </div>
            <p className="mt-4 text-lg font-bold text-stone-900">Keranjangmu masih kosong.</p>
            <p className="mt-2 text-sm text-brand-muted">Yuk temukan rasa baru dari dapur UMKM di sekitarmu.</p>
            <Link href="/products" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-forest px-5 py-3 font-bold text-white transition hover:bg-brand-secondary">
              Jelajahi menu <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="mt-7 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-3">
              {items.map((item) => (
                <article key={item.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-brand-border/80 bg-white p-4 shadow-[0_16px_40px_-34px_rgba(18,61,43,0.5)] transition-shadow hover:shadow-lg sm:p-5">
                  <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-light">
                    <Image
                      src={item.image_url || getFoodImage(item.category)}
                      alt={item.name}
                      fill
                      sizes="80px"
                      unoptimized={Boolean(item.image_url?.includes("/storage/"))}
                      quality={70}
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold text-stone-900">{item.name}</h2>
                    <p className="mt-1 font-semibold text-brand-forest">Rp{Number(item.price).toLocaleString("id-ID")}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <button type="button" aria-label={`Kurangi jumlah ${item.name}`} onClick={() => updateQuantity(item.id, item.quantity - 1)} className="flex size-9 items-center justify-center rounded-xl border border-brand-border text-brand-forest transition hover:bg-emerald-50">
                        <Minus size={14} />
                      </button>
                      <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                      <button type="button" aria-label={`Tambah jumlah ${item.name}`} onClick={() => updateQuantity(item.id, Math.min(item.quantity + 1, item.stock))} className="flex size-9 items-center justify-center rounded-xl border border-brand-border text-brand-forest transition hover:bg-emerald-50">
                        <Plus size={14} />
                      </button>
                      <span className="text-xs text-brand-muted">Maks. {item.stock}</span>
                    </div>
                  </div>
                  <button type="button" aria-label={`Hapus ${item.name} dari keranjang`} onClick={() => removeItem(item.id)} className="rounded-xl p-2.5 text-red-600 transition hover:bg-red-50">
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
            <aside className="h-fit rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_20px_55px_-42px_rgba(18,61,43,0.45)] lg:sticky lg:top-24">
              <p className="text-sm font-medium text-brand-muted">Total pesanan</p>
              <p className="mt-1 text-2xl font-black text-stone-900">Rp{total.toLocaleString("id-ID")}</p>
              <p className="mt-2 text-xs leading-5 text-brand-muted">Biaya pengiriman dihitung sesuai metode penerimaan.</p>
              <Button asChild className="mt-5 w-full">
                <Link href="/checkout">Lanjut checkout <ArrowRight size={17} /></Link>
              </Button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

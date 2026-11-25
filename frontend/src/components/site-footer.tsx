"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Leaf, MapPin } from "lucide-react";

export function SiteFooter() {
  return <Suspense fallback={null}><SiteFooterContent /></Suspense>;
}

function SiteFooterContent() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-auto border-t border-emerald-950/10 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 sm:py-12 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand-forest">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-forest text-amber-100 shadow-sm"><Leaf size={18} /></span>
            rasa<span className="text-brand-secondary">lokal</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-brand-muted">
            Cerita rasa dari dapur UMKM Indonesia, dekat, hangat, dan dibuat sepenuh hati.
          </p>
        </div>
        <nav aria-label="Navigasi footer" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-brand-muted">
          <Link href="/products" className="transition hover:text-brand-forest">Jelajahi menu</Link>
          <Link href="/stores" className="transition hover:text-brand-forest">Peta UMKM</Link>
          <Link href="/register" className="transition hover:text-brand-forest">Gabung sebagai penjual</Link>
          <span className="flex items-center gap-1.5"><MapPin size={15} /> Indonesia</span>
        </nav>
        <p className="border-t border-brand-border pt-5 text-xs text-brand-muted md:col-span-2">© Rasa Lokal. Tumbuh bersama UMKM Indonesia.</p>
      </div>
    </footer>
  );
}

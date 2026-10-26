import Link from "next/link";
import { Leaf, MapPin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-brand-border bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-lg font-extrabold tracking-tight text-brand-forest">
            <span className="flex size-8 items-center justify-center rounded-xl bg-brand-light"><Leaf size={17} /></span>
            rasa<span className="text-brand-secondary">lokal</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-brand-muted">
            Cerita rasa dari dapur UMKM Indonesia, dekat, hangat, dan dibuat sepenuh hati.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-brand-muted">
          <Link href="/products" className="transition hover:text-brand-forest">Jelajahi menu</Link>
          <Link href="/register" className="transition hover:text-brand-forest">Gabung sebagai penjual</Link>
          <span className="flex items-center gap-1.5"><MapPin size={15} /> Indonesia</span>
        </div>
        <p className="text-xs text-brand-muted md:col-span-2">© Rasa Lokal. Tumbuh bersama UMKM Indonesia.</p>
      </div>
    </footer>
  );
}

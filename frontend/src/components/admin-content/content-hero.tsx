import { PanelsTopLeft, Sparkles } from "lucide-react";

export function ContentHero() {
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_85%_12%,rgba(245,190,84,0.22),transparent_28%),radial-gradient(ellipse_at_10%_100%,rgba(93,128,93,0.36),transparent_38%),linear-gradient(125deg,#102e22,#174a33_58%,#286044)] px-6 py-7 text-white shadow-[0_30px_75px_-42px_rgba(12,46,31,0.8)] sm:px-9 sm:py-9">
      <div aria-hidden="true" className="absolute -right-14 -top-20 size-64 rounded-full border-[34px] border-white/5" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-100">
            <Sparkles size={14} /> Administrasi marketplace
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Kelola konten website</h1>
          <p className="mt-2 leading-6 text-emerald-50/80">Atur kategori, promosi, dan teks beranda dari satu tempat. Perubahan akan langsung tampil di website.</p>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl border border-white/15 bg-black/10 px-4 py-3 text-xs font-semibold text-emerald-50/90 sm:flex">
          <span className="flex size-8 items-center justify-center rounded-xl bg-amber-300 text-emerald-950"><PanelsTopLeft size={17} /></span>
          Panel kontrol konten
        </div>
      </div>
    </div>
  );
}

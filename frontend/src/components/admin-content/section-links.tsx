import { ArrowDown, Megaphone, PanelsTopLeft, Tags } from "lucide-react";

type SectionLinksProps = {
  categoryCount: number;
  bannerCount: number;
};

export function SectionLinks({ categoryCount, bannerCount }: SectionLinksProps) {
  const sections = [
    { label: "Bagian beranda", detail: "Teks & pengenalan", icon: PanelsTopLeft, href: "#admin-home-content" },
    { label: "Kategori", detail: `${categoryCount} kategori`, icon: Tags, href: "#admin-categories" },
    { label: "Banner promosi", detail: `${bannerCount} banner`, icon: Megaphone, href: "#admin-banners" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {sections.map(({ label, detail, icon: Icon, href }) => (
        <a key={href} href={href} className="group relative flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-brand-border/80 bg-white p-2.5 shadow-[0_14px_38px_-34px_rgba(18,61,43,0.45)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg sm:flex-row sm:items-center sm:gap-3 sm:p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-forest transition group-hover:bg-brand-forest group-hover:text-white sm:size-11"><Icon size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold leading-4 text-stone-900 sm:text-sm">{label}</span>
            <span className="mt-0.5 block truncate text-[9px] text-brand-muted sm:text-xs">{detail}</span>
          </span>
          <ArrowDown size={13} className="absolute right-2.5 top-2.5 -rotate-45 text-brand-muted transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-brand-forest sm:static sm:size-[15px]" />
        </a>
      ))}
    </div>
  );
}

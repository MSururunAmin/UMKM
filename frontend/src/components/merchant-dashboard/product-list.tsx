import { Pencil, Plus, Trash2 } from "lucide-react";
import type { Product } from "@/types/api";
import { Button } from "@/components/ui/button";

type ProductListProps = {
  products: Product[];
  loading: boolean;
  onCreate: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
};

export function ProductList({ products, loading, onCreate, onEdit, onDelete }: ProductListProps) {
  return (
    <section id="produk-saya" className="scroll-mt-24 rounded-2xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
      <h2 className="text-xl font-bold">Produk saya</h2>
      {loading ? <p className="mt-5 text-stone-500">Memuat produk...</p> : products.length === 0 ? (
        <div className="py-12 text-center text-stone-500">
          <p>Belum ada produk di toko Anda.</p>
          <Button onClick={onCreate} variant="outline" className="mt-4"><Plus size={16} /> Tambah Produk</Button>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-stone-100">
          {products.map((product) => (
            <article key={product.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="mt-1 text-sm text-stone-500">{product.category?.name ?? "Tanpa kategori"} · Stok: {product.stock}</p>
              </div>
              <div className="flex items-center gap-3">
                <strong className="text-brand-forest">Rp{Number(product.price).toLocaleString("id-ID")}</strong>
                <Button variant="outline" onClick={() => onEdit(product)} aria-label={`Ubah ${product.name}`}><Pencil size={16} /> Ubah</Button>
                <Button variant="outline" onClick={() => onDelete(product)} aria-label={`Hapus ${product.name}`} className="text-red-600 hover:bg-red-50"><Trash2 size={16} /> Hapus</Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import type { FormEvent, Dispatch, SetStateAction } from "react";
import { X } from "lucide-react";
import type { Category, Product } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProductForm } from "./types";

type ProductDialogProps = {
  open: boolean;
  product: Product | null;
  form: ProductForm;
  categories: Category[];
  isSaving: boolean;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProductDialog({
  open,
  product,
  form,
  categories,
  isSaving,
  setForm,
  onClose,
  onSubmit,
}: ProductDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/60 bg-white p-6 shadow-2xl shadow-stone-950/20">
        <div className="flex items-center justify-between">
          <h2 id="product-dialog-title" className="text-xl font-bold">{product ? "Ubah Produk" : "Tambah Produk"}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium">Nama Produk
            <Input required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">Kategori
            <select required value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })} className="h-11 rounded-control border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
              <option value="">Pilih kategori</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium">Harga (Rp)
              <Input required type="number" min="0" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">Stok
              <Input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">Deskripsi
            <textarea required value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="min-h-24 rounded-xl border border-brand-border p-3 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium">File Gambar Produk{product && " (opsional jika tidak diganti)"}
            <Input required={!product} type="file" accept="image/*" onChange={(event) => setForm({ ...form, image: event.target.files?.[0] ?? null })} className="h-auto py-2" />
            <span className="font-normal text-stone-500">Format gambar, maksimal 5 MB.</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Menyimpan..." : product ? "Simpan Perubahan" : "Simpan Produk"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

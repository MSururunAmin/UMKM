"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import Link from "next/link";
import { CheckCircle2, Pencil, Plus, Store, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorDetails } from "@/lib/api-error";
import { createMerchantProductFormData } from "@/lib/merchant-product-form";
import { useAuthStore } from "@/store/auth-store";
import type { Category, Product, User } from "@/types/api";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MerchantLocationForm } from "@/components/merchant-location-form";

type Order = { id: number; order_number: string; status: string; total_amount: string; shipping_type: "delivery" | "pickup"; delivery_address: string | null; is_test: boolean; user: { name: string } };
type ProductForm = {
  name: string;
  category_id: string;
  price: string;
  stock: string;
  description: string;
  image: File | null;
};

const emptyForm: ProductForm = { name: "", category_id: "", price: "", stock: "", description: "", image: null };

function apiErrorMessage(error: unknown, fallback: string): string {
  const details = getApiErrorDetails(error, fallback);
  return details.validationMessages.join(" ") || details.message;
}

export default function MerchantDashboard() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const isMerchant = (user?.role.toLowerCase() === "merchant" || user?.role.toLowerCase() === "customer")
    && Boolean(user.merchant?.is_verified && !user.merchant.rejected_at);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(true);
  const [isUpdatingStoreStatus, setIsUpdatingStoreStatus] = useState(false);
  const [storeStatusNotice, setStoreStatusNotice] = useState("");
  const [message, setMessage] = useState("");

  const loadProducts = useCallback(async () => {
    const response = await api.get("/merchant/products");
    setProducts(response.data.data);
  }, []);

  const loadMerchantData = useCallback(async () => {
    const [productResult, categoryResult, orderResult] = await Promise.allSettled([
      api.get("/merchant/products"),
      api.get("/categories"),
      api.get("/merchant/orders"),
    ]);
    if (productResult.status === "fulfilled") setProducts(productResult.value.data.data);
    if (categoryResult.status === "fulfilled") setCategories(categoryResult.value.data.data);
    if (orderResult.status === "fulfilled") setOrders(orderResult.value.data.data);

    const errors: string[] = [];
    if (productResult.status === "rejected") errors.push(apiErrorMessage(productResult.reason, "Produk tidak dapat dimuat."));
    if (categoryResult.status === "rejected") errors.push(apiErrorMessage(categoryResult.reason, "Kategori produk tidak dapat dimuat."));
    if (orderResult.status === "rejected") errors.push(apiErrorMessage(orderResult.reason, "Pesanan tidak dapat dimuat."));
    setMessage(errors.join(" "));
  }, []);

  const toggleStoreStatus = async () => {
    if (!user?.merchant || !token || isUpdatingStoreStatus) return;

    setIsUpdatingStoreStatus(true);
    setMessage("");
    setStoreStatusNotice("");
    try {
      const isOpen = !user.merchant.is_open;
      const response = await api.put<{ data: NonNullable<User["merchant"]> }>("/merchant/my-store", { is_open: isOpen });
      setSession({ ...user, merchant: response.data.data }, token);
      setStoreStatusNotice(isOpen ? "Toko berhasil dibuka dan menu dapat tampil di katalog." : "Toko berhasil ditutup dan menu disembunyikan dari katalog.");
    } catch (error: unknown) {
      setMessage(apiErrorMessage(error, "Status toko gagal diperbarui. Silakan coba lagi."));
    } finally {
      setIsUpdatingStoreStatus(false);
    }
  };

  useEffect(() => {
    if (!isHydrated || !token) return;

    let isActive = true;
    void (async () => {
      try {
        const { data } = await api.get<{ user: User }>("/auth/me");
        if (!isActive) return;

        setSession(data.user, token);
        if (!data.user.merchant?.is_verified || data.user.merchant.rejected_at) {
          setMessage("Toko belum disetujui untuk mengakses dashboard penjual.");
          setIsLoading(false);
          setIsVerifyingAccount(false);
          return;
        }

        await loadMerchantData();
        if (!isActive) return;
      } catch (error: unknown) {
        if (!isActive) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          clearSession();
          setMessage("Sesi login sudah tidak berlaku. Silakan masuk kembali.");
        } else {
          setMessage(apiErrorMessage(error, "Profil akun tidak dapat diverifikasi."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          setIsVerifyingAccount(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isHydrated, token, setSession, clearSession, loadMerchantData]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setMessage("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category_id: String(product.category?.id ?? ""),
      price: String(product.price),
      stock: String(product.stock),
      description: product.description,
      image: null,
    });
    setMessage("");
    setIsDialogOpen(true);
  };

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    const formData = createMerchantProductFormData(form, Boolean(editingProduct));

    try {
      if (editingProduct) {
        await api.post(`/merchant/products/${editingProduct.id}`, formData);
      } else await api.post("/merchant/products", formData);
      setIsDialogOpen(false);
      await loadProducts();
    } catch (error: unknown) {
      setMessage(apiErrorMessage(error, "Produk gagal disimpan. Silakan coba lagi."));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Hapus produk "${product.name}"?`)) return;
    setMessage("");
    try {
      await api.delete(`/merchant/products/${product.id}`);
      await loadProducts();
    } catch (error: unknown) {
      setMessage(apiErrorMessage(error, "Produk gagal dihapus."));
    }
  };

  if (!isHydrated || (token && isVerifyingAccount)) return <><SiteHeader /><main className="p-12 text-center text-stone-500">Memuat dashboard...</main></>;
  if (!token || !isMerchant) return <><SiteHeader /><main className="mx-auto w-full max-w-3xl flex-1 px-5 py-20 text-center">{message && <p role="alert" className="mx-auto mb-4 max-w-xl rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<p className="text-lg font-bold text-stone-900">Dashboard hanya tersedia untuk toko yang sudah disetujui.</p><p className="mt-2 text-sm text-brand-muted">Kamu tetap dapat berbelanja dengan akun pelangganmu.</p><Link href="/seller/register" className="mt-5 inline-flex rounded-full bg-brand-forest px-5 py-3 font-bold text-white hover:bg-brand-secondary">Lihat status toko</Link></main></>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand-secondary">Kelola toko Anda</p>
            <h1 id="ringkasan" className="mt-1 text-3xl font-black tracking-tight text-stone-900">Dashboard Merchant</h1>
            <p className="mt-1 text-sm text-brand-muted">Ringkasan dan aktivitas toko Anda.</p>
          </div>
          <Button onClick={openCreateDialog}><Plus size={18} /> Tambah Produk</Button>
        </div>

        <section aria-label="Ringkasan toko" className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-brand-muted">Total produk</p><p className="mt-2 text-3xl font-black text-brand-forest">{products.length}</p></div>
          <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-brand-muted">Pesanan masuk</p><p className="mt-2 text-3xl font-black text-brand-forest">{orders.length}</p></div>
          <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5"><p className="text-sm font-medium text-brand-muted">Menunggu diproses</p><p className="mt-2 text-3xl font-black text-brand-forest">{orders.filter((order) => order.status === "pending").length}</p></div>
        </section>

        {user?.merchant && !user.merchant.is_verified && (
          <p role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Toko Anda sedang menunggu verifikasi. Produk akan tampil di katalog publik setelah toko disetujui.
          </p>
        )}
        {user?.merchant?.is_verified && (
          <section aria-label="Status operasional toko" className={`mt-5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${user.merchant.is_open ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${user.merchant.is_open ? "bg-white text-brand-secondary" : "bg-white text-amber-800"}`}><Store size={18} /></span>
              <div>
                <p className={`font-bold ${user.merchant.is_open ? "text-brand-forest" : "text-amber-950"}`}>{user.merchant.is_open ? "Toko Anda sedang buka" : "Toko Anda sedang tutup"}</p>
                <p className={`mt-1 text-sm leading-5 ${user.merchant.is_open ? "text-emerald-900" : "text-amber-900"}`}>
                  {!user.merchant.is_open
                    ? "Produk disembunyikan dari katalog publik sampai toko dibuka kembali."
                    : user.merchant.location_checked_at
                      ? "Produk tersedia dan dapat ditemukan di katalog publik."
                      : "Toko terbuka, tetapi menu belum tampil publik sampai lokasi toko dilengkapi dan diperiksa."}
                </p>
                {storeStatusNotice && <p role="status" className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-brand-forest"><CheckCircle2 size={15} />{storeStatusNotice}</p>}
              </div>
            </div>
            <Button type="button" variant={user.merchant.is_open ? "outline" : "default"} disabled={isUpdatingStoreStatus} onClick={() => void toggleStoreStatus()} className="w-full shrink-0 sm:w-auto">
              <Store size={16} />{isUpdatingStoreStatus ? "Memperbarui..." : user.merchant.is_open ? "Tutup toko" : "Buka toko"}
            </Button>
          </section>
        )}

        {user?.merchant?.is_verified && !user.merchant.location_checked_at && token && (
          <MerchantLocationForm
            merchant={user.merchant}
            onSaved={(merchant) => setSession({ ...user, merchant }, token)}
          />
        )}

        {message && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>}

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm lg:sticky lg:top-24">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-muted">Menu toko</p>
            <nav aria-label="Navigasi dashboard" className="grid gap-1">
              <a href="#ringkasan" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-brand-forest">Ringkasan</a>
              <a href="#produk-saya" className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-emerald-50 hover:text-brand-forest">Produk saya</a>
              <a href="#pesanan-masuk" className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-emerald-50 hover:text-brand-forest">Pesanan masuk</a>
            </nav>
          </aside>
          <div className="min-w-0 space-y-6">
        <section id="produk-saya" className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Produk saya</h2>
          {isLoading ? <p className="mt-5 text-stone-500">Memuat produk...</p> : products.length === 0 ? (
            <div className="py-12 text-center text-stone-500">
              <p>Belum ada produk di toko Anda.</p>
              <Button onClick={openCreateDialog} variant="outline" className="mt-4"><Plus size={16} /> Tambah Produk</Button>
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
                    <Button variant="outline" onClick={() => openEditDialog(product)} aria-label={`Ubah ${product.name}`}><Pencil size={16} /> Ubah</Button>
                    <Button variant="outline" onClick={() => void deleteProduct(product)} aria-label={`Hapus ${product.name}`} className="text-red-600 hover:bg-red-50"><Trash2 size={16} /> Hapus</Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="pesanan-masuk" className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold">Pesanan masuk</h2>
          {orders.length === 0 ? <p className="mt-4 text-sm text-stone-500">Belum ada pesanan masuk.</p> : orders.map((order) => (
            <div key={order.id} className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <span className="min-w-0"><b>{order.order_number}</b><small className="block text-stone-500">{order.user.name} · Rp{Number(order.total_amount).toLocaleString("id-ID")} · {order.shipping_type === "delivery" ? "Diantar" : "Ambil di toko"}</small>{order.is_test && <small className="mt-1 block font-semibold text-amber-800">Pesanan uji · belum dibayar</small>}{order.shipping_type === "delivery" && order.delivery_address && <small className="mt-1 block max-w-xl whitespace-pre-wrap text-stone-600">Alamat: {order.delivery_address}</small>}<Link href={`/orders/${order.id}`} className="mt-2 inline-flex text-sm font-bold text-brand-forest hover:text-brand-secondary">Chat dengan pembeli</Link></span>
              <select value={order.status} onChange={async (event) => {
                try {
                  await api.patch(`/merchant/orders/${order.id}/status`, { status: event.target.value });
                  setOrders((currentOrders) => currentOrders.map((currentOrder) => currentOrder.id === order.id ? { ...currentOrder, status: event.target.value } : currentOrder));
                } catch {
                  setMessage("Status pesanan gagal diperbarui.");
                }
              }} aria-label={`Status pesanan ${order.order_number}`} className="rounded-control border border-brand-border bg-white p-2 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
                <option value="pending">Pending</option><option value="processing">Diproses</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option>
              </select>
            </div>
          ))}
        </section>
          </div>
        </div>
      </main>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-stone-950/50 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsDialogOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="product-dialog-title" className="text-xl font-bold">{editingProduct ? "Ubah Produk" : "Tambah Produk"}</h2>
              <button type="button" onClick={() => setIsDialogOpen(false)} aria-label="Tutup dialog" className="rounded-full p-2 text-stone-500 hover:bg-stone-100"><X size={20} /></button>
            </div>
            <form onSubmit={saveProduct} className="mt-5 grid gap-4">
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
              <label className="grid gap-1.5 text-sm font-medium">File Gambar Produk{editingProduct && " (opsional jika tidak diganti)"}
                <Input required={!editingProduct} type="file" accept="image/*" onChange={(event) => setForm({ ...form, image: event.target.files?.[0] ?? null })} className="h-auto py-2" />
                <span className="font-normal text-stone-500">Format gambar, maksimal 5 MB.</span>
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? "Menyimpan..." : editingProduct ? "Simpan Perubahan" : "Simpan Produk"}</Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

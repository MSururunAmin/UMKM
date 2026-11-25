"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import Link from "next/link";
import dynamic from "next/dynamic";
import { CheckCircle2, Plus, Store } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorDetails } from "@/lib/api-error";
import { createMerchantProductFormData } from "@/lib/merchant-product-form";
import { useAuthStore } from "@/store/auth-store";
import type { Category, Product, User } from "@/types/api";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { MerchantLocationForm } from "@/components/merchant-location-form";
import { IncomingOrders } from "@/components/merchant-dashboard/incoming-orders";
import { ProductList } from "@/components/merchant-dashboard/product-list";
import type { MerchantOrder, ProductForm } from "@/components/merchant-dashboard/types";

const emptyForm: ProductForm = { name: "", category_id: "", price: "", stock: "", description: "", image: null };
const ProductDialog = dynamic(
  () => import("@/components/merchant-dashboard/product-dialog").then((module) => module.ProductDialog),
  { loading: () => null },
);

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
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifyingAccount, setIsVerifyingAccount] = useState(true);
  const [isUpdatingStoreStatus, setIsUpdatingStoreStatus] = useState(false);
  const [storeStatusNotice, setStoreStatusNotice] = useState("");
  const [message, setMessage] = useState("");
  const isLoadingOrders = useRef(false);

  const loadProducts = useCallback(async () => {
    const response = await api.get("/merchant/products");
    setProducts(response.data.data);
  }, []);

  const loadOrders = useCallback(async () => {
    if (isLoadingOrders.current) return;
    isLoadingOrders.current = true;
    try {
      const response = await api.get<{ data: MerchantOrder[] }>("/merchant/orders");
      setOrders(response.data.data);
    } catch (error: unknown) {
      setMessage(apiErrorMessage(error, "Pesanan tidak dapat diperbarui."));
    } finally {
      isLoadingOrders.current = false;
    }
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

  useEffect(() => {
    if (!isHydrated || !token || !isMerchant || isVerifyingAccount) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void loadOrders();
    };
    const interval = window.setInterval(refreshWhenVisible, 5000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [isHydrated, token, isMerchant, isVerifyingAccount, loadOrders]);

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

  const updateOrderStatus = async (order: MerchantOrder, status: string) => {
    try {
      const response = await api.patch<{ data: MerchantOrder }>(`/merchant/orders/${order.id}/status`, { status });
      setOrders((currentOrders) => currentOrders.map((currentOrder) => currentOrder.id === order.id ? { ...currentOrder, ...response.data.data } : currentOrder));
      setMessage("");
    } catch (error: unknown) {
      setMessage(apiErrorMessage(error, "Status pesanan gagal diperbarui."));
    }
  };

  if (!isHydrated || (token && isVerifyingAccount)) return <><SiteHeader /><main className="p-12 text-center text-stone-500">Memuat dashboard...</main></>;
  if (!token || !isMerchant) return <><SiteHeader /><main className="mx-auto w-full max-w-3xl flex-1 px-5 py-20 text-center">{message && <p role="alert" className="mx-auto mb-4 max-w-xl rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<p className="text-lg font-bold text-stone-900">Dashboard hanya tersedia untuk toko yang sudah disetujui.</p><p className="mt-2 text-sm text-brand-muted">Kamu tetap dapat berbelanja dengan akun pelangganmu.</p><Link href="/seller/register" className="mt-5 inline-flex rounded-full bg-brand-forest px-5 py-3 font-bold text-white hover:bg-brand-secondary">Lihat status toko</Link></main></>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[radial-gradient(ellipse_at_90%_10%,rgba(93,128,93,0.44),transparent_34%),linear-gradient(125deg,#123d2b,#205238_58%,#386641)] px-5 py-6 text-white shadow-[0_26px_65px_-42px_rgba(18,61,43,0.8)] sm:px-7">
          <div>
            <p className="text-sm font-semibold text-emerald-200">Kelola toko Anda</p>
            <h1 id="ringkasan" className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Dashboard Merchant</h1>
            <p className="mt-1 text-sm text-emerald-50/80">Ringkasan dan aktivitas toko Anda.</p>
          </div>
          <Button onClick={openCreateDialog} className="bg-white text-brand-forest shadow-none hover:bg-emerald-50 hover:text-brand-forest"><Plus size={18} /> Tambah Produk</Button>
        </div>

        <section aria-label="Ringkasan toko" className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="min-w-0 rounded-2xl border border-brand-border/80 bg-white p-3 shadow-[0_16px_40px_-34px_rgba(18,61,43,0.55)] sm:p-5"><p className="min-h-8 text-[11px] font-medium leading-4 text-brand-muted sm:min-h-0 sm:text-sm">Total produk</p><p className="mt-1 text-2xl font-black text-brand-forest sm:mt-2 sm:text-3xl">{products.length}</p></div>
          <div className="min-w-0 rounded-2xl border border-brand-border/80 bg-white p-3 shadow-[0_16px_40px_-34px_rgba(18,61,43,0.55)] sm:p-5"><p className="min-h-8 text-[11px] font-medium leading-4 text-brand-muted sm:min-h-0 sm:text-sm">Pesanan masuk</p><p className="mt-1 text-2xl font-black text-brand-forest sm:mt-2 sm:text-3xl">{orders.length}</p></div>
          <div className="min-w-0 rounded-2xl border border-brand-border/80 bg-white p-3 shadow-[0_16px_40px_-34px_rgba(18,61,43,0.55)] sm:p-5"><p className="min-h-8 text-[11px] font-medium leading-4 text-brand-muted sm:min-h-0 sm:text-sm">Menunggu diproses</p><p className="mt-1 text-2xl font-black text-brand-forest sm:mt-2 sm:text-3xl">{orders.filter((order) => order.status === "pending").length}</p></div>
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
          <aside className="rounded-2xl border border-brand-border/80 bg-white p-3 shadow-[0_16px_40px_-34px_rgba(18,61,43,0.55)] lg:sticky lg:top-24">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-muted">Menu toko</p>
            <nav aria-label="Navigasi dashboard" className="flex gap-1 overflow-x-auto lg:grid">
              <a href="#ringkasan" className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-brand-forest">Ringkasan</a>
              <a href="#produk-saya" className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-emerald-50 hover:text-brand-forest">Produk saya</a>
              <a href="#pesanan-masuk" className="rounded-xl px-3 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-emerald-50 hover:text-brand-forest">Pesanan masuk</a>
            </nav>
          </aside>
          <div className="min-w-0 space-y-6">
        <ProductList products={products} loading={isLoading} onCreate={openCreateDialog} onEdit={openEditDialog} onDelete={(product) => void deleteProduct(product)} />
        <IncomingOrders orders={orders} onStatusChange={(order, status) => void updateOrderStatus(order, status)} />
          </div>
        </div>
      </main>

      <ProductDialog
        open={isDialogOpen}
        product={editingProduct}
        form={form}
        categories={categories}
        isSaving={isSaving}
        setForm={setForm}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={(event) => void saveProduct(event)}
      />
    </>
  );
}

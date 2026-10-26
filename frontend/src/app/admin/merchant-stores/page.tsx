"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/api";

type PendingStore = {
  id: number;
  store_name: string;
  address: string;
  province?: string | null;
  regency?: string | null;
  district?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_checked_at?: string | null;
  description: string | null;
  created_at: string;
  rejected_at?: string | null;
  user: { id: number; name: string } | null;
};

export default function AdminMerchantStoresPage() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isLoading, setIsLoading] = useState(true);
  const [stores, setStores] = useState<PendingStore[]>([]);
  const [rejectedStores, setRejectedStores] = useState<PendingStore[]>([]);
  const [actingStoreId, setActingStoreId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");

  const loadStores = useCallback(async () => {
    setError("");
    try {
      const [pendingResponse, rejectedResponse] = await Promise.all([
        api.get<{ data: PendingStore[] }>("/admin/merchant-stores/pending"),
        api.get<{ data: PendingStore[] }>("/admin/merchant-stores/rejected"),
      ]);
      setStores(pendingResponse.data.data);
      setRejectedStores(rejectedResponse.data.data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) return;

    let active = true;
    void api.get<{ user: User }>("/auth/me").then(async ({ data }) => {
      if (!active) return;
      setSession(data.user, token);
      if (data.user.role.toLowerCase() !== "admin") {
        setError("Halaman ini khusus administrator.");
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);
      await loadStores();
    }).catch((requestError: unknown) => {
      if (!active) return;
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        clearSession();
        setError("Sesi login sudah tidak berlaku. Silakan masuk kembali.");
      } else {
        setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
      }
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isHydrated, token, setSession, clearSession, loadStores]);

  const reviewStore = async (store: PendingStore, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm(`Tolak verifikasi toko "${store.store_name}"?`)) return;
    setActingStoreId(store.id);
    setError("");
    setNotice("");
    try {
      const response = await api.post<{ message: string }>(`/admin/merchant-stores/${store.id}/${action}`);
      setNotice(response.data.message);
      await loadStores();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
    } finally {
      setActingStoreId(null);
    }
  };

  const matchingStores = (storeList: PendingStore[]) => {
    const query = search.trim().toLocaleLowerCase("id");
    if (!query) return storeList;
    return storeList.filter((store) => [store.store_name, store.address, store.user?.name ?? "", store.description ?? ""]
      .some((value) => value.toLocaleLowerCase("id").includes(query)));
  };
  const visibleStores = matchingStores(stores);
  const visibleRejectedStores = matchingStores(rejectedStores);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <p className="text-sm font-semibold text-brand-secondary">Administrasi marketplace</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-stone-900">Verifikasi Toko Merchant</h1>
        <p className="mt-2 text-stone-600">Tinjau data toko sebelum produk merchant ditampilkan di katalog publik.</p>

        <label className="mt-6 flex max-w-xl items-center gap-3 rounded-2xl border border-brand-border bg-white px-4 py-3 shadow-sm focus-within:border-brand-secondary">
          <Search size={18} className="text-brand-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama toko, pemilik, atau alamat..." aria-label="Cari toko" className="w-full bg-transparent text-sm outline-none placeholder:text-brand-muted" />
        </label>

        {notice && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {!isHydrated || (Boolean(token) && !isAdmin && isLoading) ? (
          <p className="mt-8 text-stone-500">Memverifikasi akses administrator...</p>
        ) : !token || !isAdmin ? (
          <p className="mt-8 text-stone-600">Masuk menggunakan akun administrator untuk mengelola verifikasi toko.</p>
        ) : (
          <>
          <section className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Menunggu Verifikasi</h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-brand-forest">{visibleStores.length} toko</span>
            </div>

            {isLoading ? <p className="mt-5 text-stone-500">Memuat daftar toko...</p> : visibleStores.length === 0 ? (
              <p className="py-12 text-center text-stone-500">{stores.length === 0 ? "Tidak ada toko yang menunggu verifikasi." : "Tidak ada toko yang cocok dengan pencarian."}</p>
            ) : (
              <div className="mt-4 divide-y divide-stone-100">
                {visibleStores.map((store) => (
                  <article key={store.id} className="py-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold">{store.store_name}</h3>
                        <p className="mt-1 text-sm text-stone-600">Pemilik: {store.user?.name ?? "Data pemilik tidak tersedia"}</p>
                        <p className="mt-1 text-sm text-stone-600">Alamat: {store.address}</p>
                        <p className="mt-1 text-sm text-stone-600">Wilayah: {[store.village, store.district, store.regency, store.province].filter(Boolean).join(", ") || "Belum dilengkapi"}</p>
                        {store.latitude != null && store.longitude != null ? (
                          <p className="mt-1 text-sm text-stone-600">
                            Koordinat: {store.latitude}, {store.longitude} ·{" "}
                            <a href={`https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=18/${store.latitude}/${store.longitude}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-forest underline">Tinjau di OpenStreetMap</a>
                          </p>
                        ) : <p className="mt-1 text-sm font-semibold text-amber-800">Belum ada koordinat yang dicek; toko tidak dapat disetujui.</p>}
                        {store.location_checked_at && <p className="mt-1 text-xs text-stone-500">Titik dicek melalui OpenStreetMap pada {new Date(store.location_checked_at).toLocaleString("id-ID")}; bukan verifikasi pemerintah.</p>}
                        {store.description && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-500">{store.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button disabled={actingStoreId !== null || store.location_checked_at == null || store.latitude == null || store.longitude == null} onClick={() => void reviewStore(store, "approve")}>
                          <Check size={16} /> {actingStoreId === store.id ? "Memproses..." : "Setujui"}
                        </Button>
                        <Button variant="outline" disabled={actingStoreId !== null} onClick={() => void reviewStore(store, "reject")} className="text-red-700 hover:bg-red-50">
                          <X size={16} /> {actingStoreId === store.id ? "Memproses..." : "Tolak"}
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-stone-400">Diajukan {new Date(store.created_at).toLocaleDateString("id-ID")}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Toko Ditolak</h2>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">{rejectedStores.length} toko</span>
            </div>
            {isLoading ? <p className="mt-5 text-stone-500">Memuat daftar toko...</p> : visibleRejectedStores.length === 0 ? (
              <p className="py-8 text-center text-stone-500">{rejectedStores.length === 0 ? "Tidak ada toko yang ditolak." : "Tidak ada toko yang cocok dengan pencarian."}</p>
            ) : (
              <div className="mt-4 divide-y divide-stone-100">
                {visibleRejectedStores.map((store) => (
                  <article key={store.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold">{store.store_name}</h3>
                      <p className="mt-1 text-sm text-stone-600">Pemilik: {store.user?.name ?? "Data pemilik tidak tersedia"}</p>
                      <p className="mt-1 text-sm text-stone-600">Alamat: {store.address}</p>
                      <p className="mt-1 text-sm text-stone-600">Wilayah: {[store.village, store.district, store.regency, store.province].filter(Boolean).join(", ") || "Belum dilengkapi"}</p>
                      {store.latitude != null && store.longitude != null && (
                        <p className="mt-1 text-sm text-stone-600">
                          Koordinat: {store.latitude}, {store.longitude} ·{" "}
                          <a href={`https://www.openstreetmap.org/?mlat=${store.latitude}&mlon=${store.longitude}#map=18/${store.latitude}/${store.longitude}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-forest underline">Tinjau di OpenStreetMap</a>
                        </p>
                      )}
                      {store.description && <p className="mt-2 whitespace-pre-wrap text-sm text-stone-500">{store.description}</p>}
                    </div>
                    <Button disabled={actingStoreId !== null || store.location_checked_at == null || store.latitude == null || store.longitude == null} onClick={() => void reviewStore(store, "approve")}>
                      <Check size={16} /> {actingStoreId === store.id ? "Memproses..." : "Setujui"}
                    </Button>
                  </article>
                ))}
              </div>
            )}
          </section>
          </>
        )}
      </main>
    </>
  );
}

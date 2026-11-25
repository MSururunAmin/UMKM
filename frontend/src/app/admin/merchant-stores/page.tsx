"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Clock3, Search, ShieldCheck, Store, X } from "lucide-react";
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-20 sm:px-8 sm:py-10 lg:py-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(ellipse_at_85%_12%,rgba(245,190,84,0.22),transparent_28%),radial-gradient(ellipse_at_10%_100%,rgba(93,128,93,0.36),transparent_38%),linear-gradient(125deg,#102e22,#174a33_58%,#286044)] px-6 py-7 text-white shadow-[0_30px_75px_-42px_rgba(12,46,31,0.8)] sm:px-9 sm:py-9">
          <div aria-hidden="true" className="absolute -right-14 -top-20 size-64 rounded-full border-[34px] border-white/5" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-emerald-100"><ShieldCheck size={14} /> Administrasi marketplace</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Verifikasi toko</h1>
              <p className="mt-2 max-w-2xl leading-6 text-emerald-50/80">Tinjau kelengkapan data dan lokasi sebelum toko tampil di katalog publik.</p>
            </div>
            <span className="hidden items-center gap-2 rounded-2xl border border-white/15 bg-black/10 px-4 py-3 text-xs font-semibold text-emerald-50/90 sm:inline-flex">
              <Store size={17} className="text-amber-200" /> Pusat pemeriksaan merchant
            </span>
          </div>
        </div>

        <label className="mt-6 flex max-w-2xl items-center gap-3 rounded-2xl border border-brand-border/80 bg-white px-4 py-3.5 shadow-[0_16px_40px_-34px_rgba(18,61,43,0.5)] transition focus-within:border-brand-secondary focus-within:ring-4 focus-within:ring-brand-light/70">
          <Search size={18} className="text-brand-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama toko, pemilik, atau alamat..." aria-label="Cari toko" className="w-full bg-transparent text-sm outline-none placeholder:text-brand-muted" />
        </label>

        {notice && <p role="status" className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900"><CheckCircle2 size={18} />{notice}</p>}
        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        {!isHydrated || (Boolean(token) && !isAdmin && isLoading) ? (
          <div role="status" className="mt-8 flex items-center gap-4 rounded-3xl border border-brand-border/80 bg-white p-6 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)]">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-forest"><ShieldCheck size={21} /></span>
            <div><p className="font-bold text-stone-900">Memverifikasi akses administrator</p><p className="mt-1 text-sm text-brand-muted">Sebentar, kami sedang menyiapkan ruang kerja admin.</p></div>
          </div>
        ) : !token || !isAdmin ? (
          <section className="mt-8 flex flex-col gap-5 rounded-3xl border border-brand-border/80 bg-white p-6 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-brand-forest"><ShieldCheck size={22} /></span>
              <div><h2 className="font-bold text-stone-900">Area khusus administrator</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Masuk dengan akun administrator untuk meninjau dan memverifikasi toko.</p></div>
            </div>
            <Link href="/login?next=%2Fadmin%2Fmerchant-stores" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-forest px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-secondary">
              <ShieldCheck size={17} /> Masuk sebagai admin
            </Link>
          </section>
        ) : (
          <>
          <section aria-label="Ringkasan verifikasi" className="mt-7 grid grid-cols-2 gap-3">
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-3 shadow-sm sm:gap-4 sm:p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 sm:size-11"><Clock3 size={18} /></span>
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase leading-4 tracking-wide text-amber-800 sm:text-xs">Menunggu tinjauan</p><p className="mt-0.5 text-xl font-black text-stone-900 sm:text-2xl">{stores.length}</p></div>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-50 to-white p-3 shadow-sm sm:gap-4 sm:p-5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-600 sm:size-11"><Store size={18} /></span>
              <div className="min-w-0"><p className="text-[10px] font-semibold uppercase leading-4 tracking-wide text-stone-500 sm:text-xs">Perlu tindak lanjut</p><p className="mt-0.5 text-xl font-black text-stone-900 sm:text-2xl">{rejectedStores.length}</p></div>
            </div>
          </section>
          <section className="mt-8 rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><Clock3 size={19} /></span><div><h2 className="text-xl font-bold">Menunggu verifikasi</h2><p className="mt-0.5 text-xs text-brand-muted">Toko baru yang membutuhkan pemeriksaan</p></div></div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-bold text-amber-900">{visibleStores.length} toko</span>
            </div>

            {isLoading ? <p className="mt-5 text-stone-500">Memuat daftar toko...</p> : visibleStores.length === 0 ? (
              <p className="py-12 text-center text-stone-500">{stores.length === 0 ? "Tidak ada toko yang menunggu verifikasi." : "Tidak ada toko yang cocok dengan pencarian."}</p>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleStores.map((store) => (
                  <article key={store.id} className="rounded-2xl border border-brand-border/80 bg-gradient-to-br from-white to-stone-50/80 p-4 transition-shadow hover:shadow-md sm:p-5">
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
          <section className="mt-6 rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600"><X size={18} /></span><div><h2 className="text-xl font-bold">Toko ditolak</h2><p className="mt-0.5 text-xs text-brand-muted">Pengajuan yang perlu ditinjau kembali</p></div></div>
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-sm font-bold text-stone-700">{rejectedStores.length} toko</span>
            </div>
            {isLoading ? <p className="mt-5 text-stone-500">Memuat daftar toko...</p> : visibleRejectedStores.length === 0 ? (
              <p className="py-8 text-center text-stone-500">{rejectedStores.length === 0 ? "Tidak ada toko yang ditolak." : "Tidak ada toko yang cocok dengan pencarian."}</p>
            ) : (
              <div className="mt-5 space-y-3">
                {visibleRejectedStores.map((store) => (
                  <article key={store.id} className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-border/80 bg-gradient-to-br from-white to-stone-50/80 p-4 transition-shadow hover:shadow-md sm:p-5">
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

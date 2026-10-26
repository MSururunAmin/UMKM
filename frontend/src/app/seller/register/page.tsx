"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock3, Leaf, Store } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getApiErrorDetails } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";
import { TegalMap } from "@/components/tegal-map";
import type { MapPoint } from "@/components/tegal-map";
import { AddressLocationSearch, type AddressSearchResult } from "@/components/address-location-search";
import type { Merchant, User } from "@/types/api";

type ApplicationForm = {
  store_name: string;
  description: string;
  address: string;
  province: string;
  regency: string;
  district: string;
  village: string;
  latitude: string;
  longitude: string;
  phone: string;
};

const initialForm: ApplicationForm = {
  store_name: "",
  description: "",
  address: "",
  province: "Jawa Tengah",
  regency: "Kota Tegal",
  district: "",
  village: "",
  latitude: "",
  longitude: "",
  phone: "",
};

function getErrorMessage(error: unknown): { message: string; fields: Record<string, string> } {
  return getApiErrorDetails(error, "Pengajuan gagal dikirim. Silakan coba lagi.");
}

export default function SellerRegistrationPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [form, setForm] = useState<ApplicationForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [addressEdited, setAddressEdited] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadApplication = useCallback(async () => {
    if (!token) throw new Error("Sesi login sudah tidak berlaku. Silakan masuk kembali.");
    const [applicationResponse, userResponse] = await Promise.all([
      api.get<{ data: Merchant | null }>("/seller/store"),
      api.get<{ user: User }>("/auth/me"),
    ]);
    setMerchant(applicationResponse.data.data);
    setSession(userResponse.data.user, token);
  }, [setSession, token]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!token) {
      router.replace("/login?next=/seller/register");
      return;
    }

    let active = true;
    void Promise.all([
      api.get<{ data: Merchant | null }>("/seller/store"),
      api.get<{ user: User }>("/auth/me"),
    ]).then(([applicationResponse, userResponse]) => {
      if (!active) return;
      const currentUser = userResponse.data.user;
      setSession(currentUser, token);
        const currentMerchant = applicationResponse.data.data;
        if (currentMerchant) {
          setForm({
            store_name: currentMerchant.store_name,
            description: currentMerchant.description ?? "",
            address: currentMerchant.address,
            province: currentMerchant.province ?? "Jawa Tengah",
            regency: currentMerchant.regency ?? "Kota Tegal",
            district: currentMerchant.district ?? "",
            village: currentMerchant.village ?? "",
            latitude: currentMerchant.latitude == null ? "" : String(currentMerchant.latitude),
            longitude: currentMerchant.longitude == null ? "" : String(currentMerchant.longitude),
            phone: currentUser.phone ?? "",
          });
        } else {
          setForm((current) => ({ ...current, phone: currentUser.phone ?? "" }));
        }
        if (currentMerchant?.is_verified && !currentMerchant.rejected_at) {
        router.replace("/merchant/dashboard");
        return;
      }
      if (currentUser.role.toLowerCase() === "admin") {
        router.replace("/");
        return;
      }
      setMerchant(currentMerchant);
    }).catch((requestError: unknown) => {
      if (!active) return;
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        clearSession();
        router.replace("/login?next=/seller/register");
      } else {
        setError(getErrorMessage(requestError).message);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isHydrated, token, setSession, clearSession, router]);

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) };
      const response = merchant
        ? await api.put<{ data: Merchant }>("/seller/store", payload)
        : await api.post<{ data: Merchant }>("/seller/store", payload);
      setMerchant(response.data.data);
      await loadApplication();
    } catch (requestError: unknown) {
      const details = getErrorMessage(requestError);
      setError(details.message);
      setFieldErrors(details.fields);
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: keyof ApplicationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    if (field === "address") {
      setAddressEdited(true);
      setForm((current) => ({
        ...current,
        latitude: "",
        longitude: "",
        regency: "",
        district: "",
        village: "",
      }));
    }
  };

  const selectAddressResult = (result: AddressSearchResult) => {
    setForm((current) => ({
      ...current,
      latitude: result.latitude.toFixed(7),
      longitude: result.longitude.toFixed(7),
      province: result.province ?? "Jawa Tengah",
      regency: result.regency ?? "",
      district: result.district ?? "",
      village: result.village ?? "",
    }));
    setFieldErrors((current) => ({ ...current, province: "", regency: "", district: "", village: "", latitude: "", longitude: "" }));
  };

  const selectMapPoint = (point: MapPoint) => {
    setForm((current) => ({
      ...current,
      regency: "",
      district: "",
      village: "",
      latitude: point.latitude.toFixed(7),
      longitude: point.longitude.toFixed(7),
    }));
    setFieldErrors((current) => ({ ...current, regency: "", district: "", village: "", latitude: "", longitude: "" }));
  };

  const resolveMapPoint = async () => {
    if (!form.latitude || !form.longitude) {
      setError("Pilih titik lokasi toko di peta terlebih dahulu.");
      return;
    }

    setResolvingLocation(true);
    setError("");
    try {
      const response = await api.post<{ data: Pick<ApplicationForm, "province" | "regency" | "district" | "village"> }>(
        "/seller/location/resolve",
        { latitude: Number(form.latitude), longitude: Number(form.longitude) },
      );
      setForm((current) => ({ ...current, ...response.data.data }));
      setFieldErrors((current) => ({ ...current, province: "", regency: "", district: "", village: "" }));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError).message);
    } finally {
      setResolvingLocation(false);
    }
  };

  const selectedLocation = form.latitude && form.longitude
    ? { latitude: Number(form.latitude), longitude: Number(form.longitude) }
    : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <section className="rounded-3xl bg-brand-forest p-6 text-white sm:p-8">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-100"><Leaf size={24} /></span>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.15em] text-emerald-100">Tumbuh bersama Rasa Lokal</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Ceritakan rasa dari dapurmu.</h1>
            <p className="mt-4 leading-7 text-emerald-50/85">Daftarkan toko UMKM-mu menggunakan akun yang sedang kamu pakai. Akun pelanggan dan riwayat belanjamu tetap sama.</p>
            <div className="mt-8 space-y-4 text-sm text-emerald-50/90">
              <p className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 font-bold">1</span> Lengkapi informasi tokomu</p>
              <p className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 font-bold">2</span> Tunggu pemeriksaan administrator</p>
              <p className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 font-bold">3</span> Mulai kelola toko setelah disetujui</p>
            </div>
          </section>

          <section className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-8">
            {loading ? (
              <div role="status" className="py-12 text-center text-brand-muted">Memeriksa status tokomu...</div>
            ) : merchant?.is_verified && !merchant.rejected_at ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={44} className="mx-auto text-brand-secondary" />
                <h2 className="mt-4 text-2xl font-black text-stone-900">Toko sudah disetujui</h2>
                <p className="mt-2 text-brand-muted">{merchant.store_name} siap dikelola.</p>
                <Button asChild className="mt-6"><Link href="/merchant/dashboard">Buka dashboard penjual <ArrowRight size={17} /></Link></Button>
              </div>
            ) : merchant?.rejected_at ? (
              <div className="py-8">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800"><Store size={23} /></div>
                <h2 className="mt-4 text-2xl font-black text-stone-900">Pengajuan belum disetujui</h2>
                <p className="mt-2 leading-7 text-brand-muted">Pengajuan untuk <strong>{merchant.store_name}</strong> ditolak pada {new Date(merchant.rejected_at).toLocaleDateString("id-ID")}. Hubungi administrator untuk informasi lebih lanjut. Pengajuan ulang belum tersedia.</p>
                <Link href="/" className="mt-6 inline-flex font-bold text-brand-forest hover:text-brand-secondary">Kembali berbelanja</Link>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand-secondary">Formulir pendaftaran</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">{merchant ? "Perbarui pengajuan toko" : "Daftarkan toko"}</h2>
                <p className="mt-2 text-sm leading-6 text-brand-muted">Masuk sebagai <strong className="text-stone-800">{user?.name}</strong>. Nomor kontak toko akan menjadi nomor kontak akun pelanggan ini juga.</p>
                {merchant && <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Clock3 size={17} className="mt-0.5 shrink-0" />Pengajuan masih menunggu pemeriksaan. Perubahan lokasi akan diperiksa kembali oleh administrator.</p>}
                {error && <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <form onSubmit={submitApplication} className="mt-6 space-y-5">
                  <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                    Nama toko <span className="text-red-700">*</span>
                    <Input required maxLength={255} autoComplete="organization" value={form.store_name} onChange={(event) => updateField("store_name", event.target.value)} aria-invalid={Boolean(fieldErrors.store_name)} />
                    {fieldErrors.store_name && <span className="text-xs font-medium text-red-700">{fieldErrors.store_name}</span>}
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                    Deskripsi toko <span className="font-normal text-brand-muted">(opsional)</span>
                    <textarea maxLength={5000} rows={4} value={form.description} onChange={(event) => updateField("description", event.target.value)} aria-invalid={Boolean(fieldErrors.description)} placeholder="Ceritakan menu dan keistimewaan tokomu..." className="w-full resize-y rounded-control border border-brand-border bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-stone-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
                    {fieldErrors.description && <span className="text-xs font-medium text-red-700">{fieldErrors.description}</span>}
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                    Alamat toko <span className="text-red-700">*</span>
                    <textarea required maxLength={2000} rows={3} autoComplete="street-address" value={form.address} onChange={(event) => updateField("address", event.target.value)} aria-invalid={Boolean(fieldErrors.address)} placeholder="Alamat lengkap lokasi usaha" className="w-full resize-y rounded-control border border-brand-border bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-stone-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
                    <AddressLocationSearch address={form.address} enabled={addressEdited} onLocationSelect={selectAddressResult} />
                    {fieldErrors.address && <span className="text-xs font-medium text-red-700">{fieldErrors.address}</span>}
                  </label>
                  <section aria-labelledby="store-location-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-cream p-4">
                    <div>
                      <h3 id="store-location-heading" className="font-bold text-stone-900">Lokasi usaha di Tegal</h3>
                      <p className="mt-1 text-xs leading-5 text-brand-muted">Ketik alamat untuk mengarahkan pin secara otomatis, atau pilih titik pada peta. Wilayah administratif dan koordinat tetap diperiksa oleh server.</p>
                    </div>
                    <TegalMap selectedLocation={selectedLocation} onLocationSelect={selectMapPoint} height="19rem" />
                    <Button type="button" variant="outline" onClick={() => void resolveMapPoint()} disabled={!selectedLocation || resolvingLocation} className="w-full sm:w-auto">
                      {resolvingLocation ? "Memeriksa titik..." : "Isi wilayah dari titik peta"}
                    </Button>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                        Provinsi <span className="text-red-700">*</span>
                        <select required value={form.province} onChange={(event) => updateField("province", event.target.value)} className="h-11 rounded-control border border-brand-border bg-white px-3 text-sm font-normal outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
                          <option value="Jawa Tengah">Jawa Tengah</option>
                        </select>
                        {fieldErrors.province && <span className="text-xs font-medium text-red-700">{fieldErrors.province}</span>}
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                        Kabupaten/Kota <span className="text-red-700">*</span>
                        <select required value={form.regency} onChange={(event) => updateField("regency", event.target.value)} className="h-11 rounded-control border border-brand-border bg-white px-3 text-sm font-normal outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
                          <option value="" disabled>Pilih dari titik peta</option>
                          <option value="Kota Tegal">Kota Tegal</option>
                          <option value="Kabupaten Tegal">Kabupaten Tegal</option>
                        </select>
                        {fieldErrors.regency && <span className="text-xs font-medium text-red-700">{fieldErrors.regency}</span>}
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                        Kecamatan <span className="font-normal text-brand-muted">(jika tersedia di peta)</span>
                        <Input maxLength={150} value={form.district} onChange={(event) => updateField("district", event.target.value)} aria-invalid={Boolean(fieldErrors.district)} placeholder="Diisi dari titik peta bila tersedia" />
                        {fieldErrors.district && <span className="text-xs font-medium text-red-700">{fieldErrors.district}</span>}
                        {!form.district && <span className="text-xs font-normal text-brand-muted">Sebagian titik OpenStreetMap tidak mencantumkan kecamatan. Wilayah tetap diperiksa dari koordinat.</span>}
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                        Kelurahan/Desa <span className="text-red-700">*</span>
                        <Input required maxLength={150} value={form.village} onChange={(event) => updateField("village", event.target.value)} aria-invalid={Boolean(fieldErrors.village)} placeholder="Diisi dari titik peta" />
                        {fieldErrors.village && <span className="text-xs font-medium text-red-700">{fieldErrors.village}</span>}
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                        Latitude <span className="text-red-700">*</span>
                        <Input required type="number" step="any" min="-90" max="90" readOnly value={form.latitude} aria-invalid={Boolean(fieldErrors.latitude)} />
                        {fieldErrors.latitude && <span className="text-xs font-medium text-red-700">{fieldErrors.latitude}</span>}
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                        Longitude <span className="text-red-700">*</span>
                        <Input required type="number" step="any" min="-180" max="180" readOnly value={form.longitude} aria-invalid={Boolean(fieldErrors.longitude)} />
                        {fieldErrors.longitude && <span className="text-xs font-medium text-red-700">{fieldErrors.longitude}</span>}
                      </label>
                    </div>
                    <p className="text-xs leading-5 text-brand-muted">OpenStreetMap menyediakan pemeriksaan lokasi berbasis data komunitas. Administrator tetap meninjau informasi dan titik toko sebelum persetujuan.</p>
                  </section>
                  <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
                    Nomor kontak
                    <Input type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} aria-invalid={Boolean(fieldErrors.phone)} placeholder="Contoh: 0812..." />
                    {fieldErrors.phone && <span className="text-xs font-medium text-red-700">{fieldErrors.phone}</span>}
                  </label>
                  <p className="text-xs leading-5 text-brand-muted">Foto toko belum didukung pada formulir pendaftaran ini.</p>
                  <Button type="submit" size="lg" className="w-full" disabled={submitting || resolvingLocation}>{submitting ? "Mengirim pengajuan..." : merchant ? "Simpan perubahan untuk ditinjau" : "Kirim untuk ditinjau"}</Button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Leaf, Store } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getApiErrorDetails } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";
import type { MapPoint } from "@/components/tegal-map";
import type { AddressSearchResult } from "@/components/address-location-search";
import type { Merchant, User } from "@/types/api";
import { ApplicationEditor, type ApplicationForm } from "@/components/seller-registration/application-editor";

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
          <section className="relative overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_at_90%_10%,rgba(93,128,93,0.44),transparent_34%),linear-gradient(145deg,#123d2b,#205238_68%,#386641)] p-6 text-white shadow-[0_28px_70px_-42px_rgba(18,61,43,0.8)] sm:p-8">
            <div aria-hidden="true" className="absolute -right-14 -top-20 size-64 rounded-full border-[34px] border-white/5" />
            <div className="relative">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-100"><Leaf size={24} /></span>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.15em] text-emerald-100">Tumbuh bersama Rasa Lokal</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Ceritakan rasa dari dapurmu.</h1>
            <p className="mt-4 leading-7 text-emerald-50/85">Daftarkan toko UMKM-mu menggunakan akun yang sedang kamu pakai. Akun pelanggan dan riwayat belanjamu tetap sama.</p>
            <div className="mt-8 space-y-4 text-sm text-emerald-50/90">
              <p className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 font-bold">1</span> Lengkapi informasi tokomu</p>
              <p className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 font-bold">2</span> Tunggu pemeriksaan administrator</p>
              <p className="flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-white/10 font-bold">3</span> Mulai kelola toko setelah disetujui</p>
            </div>
            </div>
          </section>

          <section className="rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_22px_60px_-40px_rgba(18,61,43,0.42)] sm:p-8">
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
              <ApplicationEditor
                form={form}
                storeName={merchant?.store_name ?? null}
                accountName={user?.name ?? ""}
                submitting={submitting}
                resolvingLocation={resolvingLocation}
                addressEdited={addressEdited}
                error={error}
                fieldErrors={fieldErrors}
                selectedLocation={selectedLocation}
                onSubmit={(event) => void submitApplication(event)}
                updateField={updateField}
                selectAddressResult={selectAddressResult}
                selectMapPoint={selectMapPoint}
                resolveMapPoint={() => void resolveMapPoint()}
              />
            )}
          </section>
        </div>
      </main>
    </>
  );
}

"use client";

import axios from "axios";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LogIn, Megaphone, PanelsTopLeft, Pencil, Plus, ShieldCheck, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentHero } from "@/components/admin-content/content-hero";
import { SectionLinks } from "@/components/admin-content/section-links";
import { TextAreaField, TextField } from "@/components/admin-content/fields";
import { bannerToForm, categoryToForm, emptyBanner, emptyCategory, type BannerForm, type CategoryForm } from "@/components/admin-content/forms";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";
import type { Category, User } from "@/types/api";

type Settings = {
  home_badge: string;
  home_title: string;
  home_description: string;
  home_card_emoji: string;
  home_card_label: string;
  home_card_title: string;
  category_eyebrow: string;
  category_title: string;
  featured_eyebrow: string;
  featured_title: string;
  seller_eyebrow: string;
  seller_title: string;
  seller_description: string;
  seller_button: string;
};
type Banner = {
  id: number;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
};
type ContentResponse = { categories: Category[]; banners: Banner[]; settings: Settings };

export default function AdminContentPage() {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerForm>(emptyBanner);
  const [editingBannerId, setEditingBannerId] = useState<number | null>(null);

  const loadContent = useCallback(async () => {
    const { data } = await api.get<ContentResponse>("/admin/site-content");
    setSettings(data.settings);
    setCategories(data.categories);
    setBanners(data.banners);
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
      try {
        await loadContent();
      } catch (requestError: unknown) {
        if (active) setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
      } finally {
        if (active) setIsLoading(false);
      }
    }).catch((requestError: unknown) => {
      if (!active) return;
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        clearSession();
        setError("Sesi login sudah tidak berlaku. Silakan masuk kembali.");
      } else setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
      setIsLoading(false);
    });

    return () => { active = false; };
  }, [isHydrated, token, setSession, clearSession, loadContent]);

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put<{ data: Settings }>("/admin/site-content/settings", settings);
      setSettings(data.data);
      setNotice("Konten beranda berhasil disimpan.");
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
    } finally {
      setIsSaving(false);
    }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const path = editingCategoryId
        ? `/admin/site-content/categories/${editingCategoryId}`
        : "/admin/site-content/categories";
      await api[editingCategoryId ? "put" : "post"](path, categoryForm);
      setCategoryForm(emptyCategory);
      setEditingCategoryId(null);
      await loadContent();
      setNotice("Kategori berhasil disimpan.");
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
    } finally {
      setIsSaving(false);
    }
  };

  const saveBanner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = { ...bannerForm, sort_order: Number(bannerForm.sort_order) };
      const path = editingBannerId
        ? `/admin/site-content/banners/${editingBannerId}`
        : "/admin/site-content/banners";
      await api[editingBannerId ? "put" : "post"](path, payload);
      setBannerForm(emptyBanner);
      setEditingBannerId(null);
      await loadContent();
      setNotice("Banner berhasil disimpan.");
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async (path: string, label: string) => {
    if (!window.confirm(`Hapus ${label}?`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(path);
      await loadContent();
      setNotice(`${label} berhasil dihapus.`);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Permintaan gagal. Silakan coba lagi."));
    }
  };

  const editCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryForm(categoryToForm(category));
  };

  const editBanner = (banner: Banner) => {
    setEditingBannerId(banner.id);
    setBannerForm(bannerToForm(banner));
  };

  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-20 sm:px-8 sm:py-10 lg:py-10">
        <ContentHero />
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
              <div><h2 className="font-bold text-stone-900">Area khusus administrator</h2><p className="mt-1 text-sm leading-6 text-brand-muted">Masuk dengan akun administrator untuk mengelola konten website.</p></div>
            </div>
            <Link href="/login?next=%2Fadmin%2Fcontent" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-forest px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-secondary">
              <LogIn size={17} /> Masuk sebagai admin
            </Link>
          </section>
        ) : isLoading || !settings ? (
          <div role="status" className="mt-8 flex items-center gap-4 rounded-3xl border border-brand-border/80 bg-white p-6 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)]">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-forest"><PanelsTopLeft size={20} /></span>
            <div><p className="font-bold text-stone-900">Menyiapkan pengaturan website</p><p className="mt-1 text-sm text-brand-muted">Konten dan kategori sedang dimuat.</p></div>
          </div>
        ) : (
          <div className="mt-7">
            <SectionLinks categoryCount={categories.length} bannerCount={banners.length} />

            <form id="admin-home-content" onSubmit={(event) => void saveSettings(event)} className="mt-6 scroll-mt-28 space-y-5 rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-7">
              <div className="flex items-start gap-3 border-b border-brand-border pb-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-brand-forest"><PanelsTopLeft size={19} /></span>
                <div><h2 className="text-xl font-bold">Teks beranda</h2><p className="mt-1 text-sm text-brand-muted">Atur judul, deskripsi, dan ajakan pada halaman utama.</p></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="Label hero" value={settings.home_badge} onChange={(value) => setSettings({ ...settings, home_badge: value })} maxLength={120} />
                <TextField label="Judul hero" value={settings.home_title} onChange={(value) => setSettings({ ...settings, home_title: value })} maxLength={180} />
                <TextAreaField label="Deskripsi hero" value={settings.home_description} onChange={(value) => setSettings({ ...settings, home_description: value })} />
                <TextField label="Emoji kartu hero" value={settings.home_card_emoji} onChange={(value) => setSettings({ ...settings, home_card_emoji: value })} maxLength={16} />
                <TextField label="Label kartu hero" value={settings.home_card_label} onChange={(value) => setSettings({ ...settings, home_card_label: value })} maxLength={100} />
                <TextField label="Judul kartu hero" value={settings.home_card_title} onChange={(value) => setSettings({ ...settings, home_card_title: value })} maxLength={120} />
                <TextField label="Label bagian kategori" value={settings.category_eyebrow} onChange={(value) => setSettings({ ...settings, category_eyebrow: value })} maxLength={120} />
                <TextField label="Judul bagian kategori" value={settings.category_title} onChange={(value) => setSettings({ ...settings, category_title: value })} maxLength={120} />
                <TextField label="Label menu unggulan" value={settings.featured_eyebrow} onChange={(value) => setSettings({ ...settings, featured_eyebrow: value })} maxLength={120} />
                <TextField label="Judul menu unggulan" value={settings.featured_title} onChange={(value) => setSettings({ ...settings, featured_title: value })} maxLength={120} />
                <TextField label="Label ajakan penjual" value={settings.seller_eyebrow} onChange={(value) => setSettings({ ...settings, seller_eyebrow: value })} maxLength={120} />
                <TextField label="Judul ajakan penjual" value={settings.seller_title} onChange={(value) => setSettings({ ...settings, seller_title: value })} maxLength={180} />
                <TextAreaField label="Deskripsi ajakan penjual" value={settings.seller_description} onChange={(value) => setSettings({ ...settings, seller_description: value })} />
                <TextField label="Teks tombol penjual" value={settings.seller_button} onChange={(value) => setSettings({ ...settings, seller_button: value })} maxLength={80} />
              </div>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan teks beranda"}</Button>
            </form>

            <section className="mt-6 grid items-start gap-6 lg:grid-cols-2">
              <div id="admin-categories" className="scroll-mt-28 rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
                <div className="flex items-start gap-3 border-b border-brand-border pb-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-brand-forest"><Tags size={19} /></span>
                  <div><h2 className="text-xl font-bold">Kategori</h2>
                <p className="mt-1 text-sm text-brand-muted">Kategori yang dinonaktifkan tidak muncul untuk pelanggan dan penjual.</p>
                  </div>
                </div>
                <form onSubmit={(event) => void saveCategory(event)} className="mt-4 space-y-3">
                  <TextField label="Nama kategori" value={categoryForm.name} onChange={(value) => setCategoryForm({ ...categoryForm, name: value })} maxLength={100} />
                  <div className="grid grid-cols-[100px_1fr] gap-3">
                    <TextField label="Emoji" value={categoryForm.emoji} onChange={(value) => setCategoryForm({ ...categoryForm, emoji: value })} maxLength={16} />
                    <TextField label="Alamat gambar (opsional)" value={categoryForm.image_url} onChange={(value) => setCategoryForm({ ...categoryForm, image_url: value })} maxLength={2048} />
                  </div>
                  <TextAreaField label="Deskripsi singkat" value={categoryForm.caption} onChange={(value) => setCategoryForm({ ...categoryForm, caption: value })} rows={2} />
                  <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={categoryForm.is_active} onChange={(event) => setCategoryForm({ ...categoryForm, is_active: event.target.checked })} /> Aktif untuk pelanggan</label>
                  <div className="flex gap-2"><Button type="submit" disabled={isSaving}><Plus size={16} />{editingCategoryId ? "Simpan perubahan" : "Tambah kategori"}</Button>{editingCategoryId && <Button type="button" variant="outline" onClick={() => { setEditingCategoryId(null); setCategoryForm(emptyCategory); }}><X size={16} />Batal</Button>}</div>
                </form>
                <ul className="mt-5 divide-y divide-brand-border">
                  {categories.map((category) => (
                    <li key={category.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0"><b>{category.emoji} {category.name}</b><small className="block text-brand-muted">{category.is_active ? "Aktif" : "Nonaktif"} · {category.slug}</small></span>
                      <span className="flex shrink-0 gap-1">
                        <button type="button" aria-label={`Ubah ${category.name}`} onClick={() => editCategory(category)} className="rounded-lg p-2 text-brand-forest hover:bg-brand-light"><Pencil size={16} /></button>
                        <button type="button" aria-label={`Hapus ${category.name}`} onClick={() => void deleteRecord(`/admin/site-content/categories/${category.id}`, "Kategori")} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div id="admin-banners" className="scroll-mt-28 rounded-3xl border border-brand-border/80 bg-white p-5 shadow-[0_18px_48px_-38px_rgba(18,61,43,0.42)] sm:p-6">
                <div className="flex items-start gap-3 border-b border-brand-border pb-4">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800"><Megaphone size={19} /></span>
                  <div><h2 className="text-xl font-bold">Banner promosi</h2>
                <p className="mt-1 text-sm text-brand-muted">Gunakan URL gambar HTTPS atau biarkan kosong untuk banner warna.</p>
                  </div>
                </div>
                <form onSubmit={(event) => void saveBanner(event)} className="mt-4 space-y-3">
                  <TextField label="Judul banner" value={bannerForm.title} onChange={(value) => setBannerForm({ ...bannerForm, title: value })} maxLength={160} />
                  <TextAreaField label="Deskripsi" value={bannerForm.description} onChange={(value) => setBannerForm({ ...bannerForm, description: value })} rows={2} />
                  <TextField label="URL gambar HTTPS (opsional)" value={bannerForm.image_url} onChange={(value) => setBannerForm({ ...bannerForm, image_url: value })} maxLength={2048} />
                  <TextField label="Tautan tujuan (URL HTTPS atau path seperti /products)" value={bannerForm.link_url} onChange={(value) => setBannerForm({ ...bannerForm, link_url: value })} maxLength={2048} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Urutan tampil" value={bannerForm.sort_order} onChange={(value) => setBannerForm({ ...bannerForm, sort_order: value })} maxLength={5} />
                    <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium"><input type="checkbox" checked={bannerForm.is_active} onChange={(event) => setBannerForm({ ...bannerForm, is_active: event.target.checked })} /> Aktif</label>
                  </div>
                  <div className="flex gap-2"><Button type="submit" disabled={isSaving}><Plus size={16} />{editingBannerId ? "Simpan perubahan" : "Tambah banner"}</Button>{editingBannerId && <Button type="button" variant="outline" onClick={() => { setEditingBannerId(null); setBannerForm(emptyBanner); }}><X size={16} />Batal</Button>}</div>
                </form>
                <ul className="mt-5 divide-y divide-brand-border">
                  {banners.map((banner) => (
                    <li key={banner.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0"><b className="block truncate">{banner.title}</b><small className="text-brand-muted">{banner.is_active ? "Aktif" : "Nonaktif"} · Urutan {banner.sort_order}</small></span>
                      <span className="flex shrink-0 gap-1">
                        <button type="button" aria-label={`Ubah ${banner.title}`} onClick={() => editBanner(banner)} className="rounded-lg p-2 text-brand-forest hover:bg-brand-light"><Pencil size={16} /></button>
                        <button type="button" aria-label={`Hapus ${banner.title}`} onClick={() => void deleteRecord(`/admin/site-content/banners/${banner.id}`, "Banner")} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={16} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

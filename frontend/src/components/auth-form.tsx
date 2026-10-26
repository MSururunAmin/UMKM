"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/store/auth-store";
import type { User } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthResponse = { user: User; token: string };
type AuthFormProps = { mode: "login" | "register" };

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      const response = await api.post<AuthResponse>(isLogin ? "/auth/login" : "/auth/register", payload);
      setSession(response.data.user, response.data.token);
      const requestedPath = isLogin ? new URLSearchParams(window.location.search).get("next") : null;
      const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//") ? requestedPath : "/";
      router.replace(nextPath);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Terjadi kesalahan. Silakan coba lagi."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-[0_24px_70px_-35px_rgba(22,78,53,0.3)]">
      <CardHeader className="space-y-4 p-7 sm:p-8"><Link href="/" className="text-xl font-black tracking-tight text-brand-forest">rasa<span className="text-brand-secondary">lokal</span></Link><div><CardTitle className="text-2xl tracking-tight text-stone-900">{isLogin ? "Selamat datang kembali" : "Buat akun baru"}</CardTitle><CardDescription className="mt-2 leading-6">{isLogin ? "Masuk untuk melanjutkan pesananmu." : "Nikmati kuliner UMKM favoritmu dengan mudah."}</CardDescription></div></CardHeader>
      <CardContent className="px-7 pb-7 sm:px-8 sm:pb-8"><form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && <><Field label="Nama lengkap" name="name" autoComplete="name" required /><Field label="Nomor telepon" name="phone" type="tel" autoComplete="tel" /><label className="grid gap-1.5 text-sm font-medium text-stone-700">Daftar sebagai<select name="role" defaultValue="customer" className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light"><option value="customer">Pelanggan</option><option value="merchant">Penjual UMKM</option></select></label></>}
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <label className="grid gap-1.5 text-sm font-medium text-stone-700">Kata sandi<div className="relative"><Input name="password" type={showPassword ? "text" : "password"} autoComplete={isLogin ? "current-password" : "new-password"} minLength={8} required className="pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"} className="absolute inset-y-0 right-0 px-3 text-stone-400 hover:text-stone-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        {!isLogin && <Field label="Konfirmasi kata sandi" name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required />}
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting && <LoaderCircle size={18} className="animate-spin" />}{isSubmitting ? "Memproses..." : isLogin ? "Masuk" : "Buat akun"}</Button>
      </form><p className="mt-6 text-center text-sm text-brand-muted">{isLogin ? "Belum punya akun?" : "Sudah punya akun?"} <Link href={isLogin ? "/register" : "/login"} className="font-bold text-brand-forest hover:text-brand-secondary">{isLogin ? "Daftar sekarang" : "Masuk"}</Link></p></CardContent>
    </Card>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof Input> & { label: string }) { return <label className="grid gap-1.5 text-sm font-medium text-stone-700">{label}<Input {...props} /></label>; }

import { AuthForm } from "@/components/auth-form";
import { SiteHeader } from "@/components/site-header";

export default function RegisterPage() {
  return <><SiteHeader /><main className="flex min-h-[calc(100vh-272px)] items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100 via-brand-cream to-white px-5 py-12"><AuthForm mode="register" /></main></>;
}

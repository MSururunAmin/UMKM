import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-emerald-100 via-brand-cream to-white px-5 py-12"><AuthForm mode="login" /></main>;
}

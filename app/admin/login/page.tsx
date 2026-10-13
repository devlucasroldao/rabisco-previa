import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Entrar · Rabisco Prévia" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[360px] flex-col justify-center px-6 text-center">
      <h1 className="text-[18px] font-semibold">Rabisco Prévia</h1>
      <p className="mt-1 text-[14px] text-muted">Painel da equipe</p>
      <LoginForm />
    </main>
  );
}

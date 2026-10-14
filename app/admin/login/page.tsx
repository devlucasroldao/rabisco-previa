import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Entrar · Rabisco Prévia" };

// Duas colunas no desktop (marca em terracota + formulário); no celular, a
// marca vira uma faixa compacta no topo.
export default function Page() {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-none">
      <section className="relative flex flex-col justify-between bg-brand px-6 py-6 text-cream lg:px-14 lg:py-14">
        {/* eslint-disable-next-line @next/next/no-img-element -- arquivo estático da marca, 1x e 2x */}
        <img
          src="/brand/web/wordmark-creme-240.png"
          srcSet="/brand/web/wordmark-creme-240.png 1x, /brand/web/wordmark-creme-480.png 2x"
          alt="Rabisco"
          width={240}
          height={51}
          className="h-auto w-[132px] lg:w-[200px]"
        />
        <p className="font-display mt-6 text-[24px] leading-[1.15] font-semibold tracking-[-0.01em] lg:text-[44px]">
          Do Rabisco ao resultado!
        </p>
        {/* Filete mostarda: o ornamento de marca recorrente. */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-2" />
      </section>

      <main className="flex items-start justify-center px-6 py-10 lg:items-center lg:py-14">
        <div className="w-full max-w-[360px]">
          <h1 className="brand-dot text-[28px] leading-tight font-semibold">Entrar</h1>
          <p className="mt-1 text-[14px] text-fg-muted">Painel da equipe Rabisco Prévia</p>
          <LoginForm />
        </div>
      </main>
    </div>
  );
}

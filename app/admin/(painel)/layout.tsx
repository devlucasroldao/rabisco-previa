import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { StorageMeter } from "@/components/admin/storage-meter";
import { secondaryButtonClass } from "@/components/admin/ui";
import { getStaffEmail, getStorageUsage } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Painel · Rabisco Prévia" };

// A moldura não espera a sessão: o e-mail entra por streaming e cada página
// confere o login no próprio carregamento, porque o layout não renderiza de
// novo a cada navegação.
export default function Layout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="mx-auto min-h-dvh max-w-[960px] px-6">
      <header className="flex items-center gap-6 border-b border-line py-4">
        <Link href="/admin" className="text-[15px] font-semibold">
          Rabisco Prévia
        </Link>
        <nav className="flex flex-1 gap-4 text-[14px]">
          <Link href="/admin" className="hover:underline">
            Clientes
          </Link>
          <Link href="/admin/conta" className="hover:underline">
            Conta
          </Link>
        </nav>
        <Suspense fallback={null}>
          <Storage />
        </Suspense>
        <span className="text-[13px] text-muted">
          <Suspense fallback={null}>
            <StaffEmail />
          </Suspense>
        </span>
        <form action={logout}>
          <button type="submit" className={secondaryButtonClass}>
            Sair
          </button>
        </form>
      </header>
      <main className="py-8">{children}</main>
    </div>
  );
}

async function Storage() {
  return <StorageMeter bytes={await getStorageUsage()} />;
}

async function StaffEmail() {
  return await getStaffEmail();
}

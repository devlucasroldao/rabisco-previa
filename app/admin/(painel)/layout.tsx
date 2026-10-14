import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { House, Plus } from "lucide-react";
import { Skeleton } from "@/components/admin/primitives/skeleton";
import { Toaster } from "@/components/admin/primitives/toaster";
import { AccountMenu } from "@/components/admin/shell/account-menu";
import { ClientNav } from "@/components/admin/shell/client-nav";
import { MobileNav } from "@/components/admin/shell/mobile-nav";
import { NavLink } from "@/components/admin/shell/nav-link";
import { StorageMeter } from "@/components/admin/storage-meter";
import { buttonClass } from "@/components/admin/ui";
import { shellClients, shellEmail, shellStorage } from "@/lib/admin-shell";

export const metadata: Metadata = { title: "Painel · Rabisco Prévia" };

// A moldura não espera a sessão: clientes, medidor e e-mail entram por
// streaming, e cada página confere o login no próprio carregamento, porque o
// layout não renderiza de novo a cada navegação.
export default function Layout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      {/* usePathname lê a URL: fica dentro de Suspense pra a moldura poder ser
          pré-renderizada. O fallback é o mesmo topo, ainda sem o botão. */}
      <Suspense fallback={<MobileBarFallback />}>
        <MobileNav brand={<Brand />}>
          <Sidebar />
        </MobileNav>
      </Suspense>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[264px] border-r border-border bg-sidebar lg:block">
        <Sidebar />
      </aside>
      <Toaster />
      <main className="lg:pl-[264px]">
        <div className="mx-auto max-w-[960px] px-5 pt-8 pb-16 sm:px-8 lg:px-12 lg:pt-12">
          {children}
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex min-h-10 items-center gap-2.5 rounded-md px-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- arquivo estático da marca, 1x e 2x */}
      <img
        src="/brand/web/marca-32.png"
        srcSet="/brand/web/marca-32.png 1x, /brand/web/marca-64.png 2x"
        alt=""
        width={32}
        height={32}
        className="size-8 rounded-md"
      />
      <span className="font-display text-[16px] font-semibold tracking-[-0.01em]">
        Rabisco Prévia
      </span>
    </Link>
  );
}

function Sidebar() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-4 pb-3">
        <Brand />
      </div>
      <nav aria-label="Painel" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <Suspense fallback={<HomeLinkFallback />}>
          <NavLink href="/admin" icon={<House size={16} aria-hidden="true" />}>
            Início
          </NavLink>
        </Suspense>
        <div className="mt-5 mb-1 flex items-center justify-between px-3">
          <span className="text-[12px] font-semibold text-fg-muted">Clientes</span>
        </div>
        <Suspense fallback={<NavSkeleton />}>
          <Clients />
        </Suspense>
        <Link
          href="/admin/clientes/novo"
          className={`${buttonClass("ghost")} mt-1 w-full justify-start px-3 text-[14px] font-normal text-fg-muted`}
        >
          <Plus size={16} aria-hidden="true" />
          Novo cliente
        </Link>
      </nav>
      <div className="border-t border-border p-2">
        <Suspense fallback={<Skeleton className="m-3 h-8" />}>
          <Storage />
        </Suspense>
        <Suspense fallback={<Skeleton className="m-2 h-9" />}>
          <Account />
        </Suspense>
      </div>
    </div>
  );
}

function MobileBarFallback() {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-bg px-2 pl-12 lg:hidden">
      <Brand />
    </div>
  );
}

function HomeLinkFallback() {
  return (
    <Link href="/admin" className="flex min-h-10 items-center gap-2.5 rounded-md px-3 text-[14px] hover:bg-hover">
      <span className="flex w-6 justify-center text-fg-muted">
        <House size={16} aria-hidden="true" />
      </span>
      Início
    </Link>
  );
}

function NavSkeleton() {
  return (
    <div role="status" aria-label="Carregando os clientes" className="space-y-1 px-3 py-1">
      {[0, 1, 2].map((index) => (
        <div key={index} className="flex h-9 items-center gap-2.5">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}

async function Clients() {
  const clients = await shellClients();
  return (
    <ClientNav
      clients={clients.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }))}
    />
  );
}

async function Storage() {
  return <StorageMeter bytes={await shellStorage()} />;
}

async function Account() {
  return <AccountMenu email={await shellEmail()} />;
}

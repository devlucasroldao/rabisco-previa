import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, HardDrive, Plus } from "lucide-react";
import { Avatar } from "@/components/admin/avatar";
import { Badge } from "@/components/admin/primitives/badge";
import { EmptyState } from "@/components/admin/primitives/empty-state";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton } from "@/components/admin/primitives/skeleton";
import { buttonClass } from "@/components/admin/ui";
import { listRecentPresentations } from "@/lib/admin-data";
import { shellClients, shellStorage } from "@/lib/admin-shell";
import { ageLabel, meterShortLabel } from "@/lib/storage-rules";

const RECENT = 6;

export default function Page() {
  return (
    <>
      <PageHeader title="Início" />
      <Suspense fallback={<HomeSkeleton />}>
        <Home />
      </Suspense>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-10">
      <ListSkeleton label="Carregando os clientes" />
      <ListSkeleton rows={2} label="Carregando as apresentações" />
    </div>
  );
}

async function Home() {
  const [clients, presentations, bytes] = await Promise.all([
    shellClients(),
    listRecentPresentations(RECENT),
    shellStorage(),
  ]);

  if (clients.length === 0) {
    return (
      <EmptyState
        title="Cadastre seu primeiro cliente"
        action={
          <Link href="/admin/clientes/novo" className={buttonClass("primary")}>
            <Plus size={16} aria-hidden="true" />
            Novo cliente
          </Link>
        }
      >
        Com o cliente cadastrado (nome, @ e foto), você monta a apresentação da semana e
        manda o link.
      </EmptyState>
    );
  }

  // Os mais novos primeiro.
  const recentClients = [...clients]
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, RECENT);

  return (
    <div className="space-y-12">
      <section aria-labelledby="clientes-recentes">
        <h2 id="clientes-recentes" className="mb-3 text-[18px] font-semibold">
          Clientes recentes
        </h2>
        <ul className="divide-y divide-border border-y border-border">
          {recentClients.map((client) => (
            <li key={client.id} className="admin-list-in">
              <Link
                href={`/admin/clientes/${client.id}`}
                className="flex min-h-16 items-center gap-4 rounded-md px-2 py-3 transition-colors duration-(--dur-fast) hover:bg-hover"
              >
                <Avatar url={client.avatarUrl} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{client.name}</span>
                  <span className="block truncate text-[13px] text-fg-muted">@{client.handle}</span>
                </span>
                <span className="text-[13px] text-fg-muted">
                  {client.presentationCount}{" "}
                  {client.presentationCount === 1 ? "apresentação" : "apresentações"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="apresentacoes-recentes">
        <h2 id="apresentacoes-recentes" className="mb-3 text-[18px] font-semibold">
          Apresentações recentes
        </h2>
        {presentations.length === 0 ? (
          <EmptyState title="Nenhuma apresentação ainda">
            Abra um cliente e crie a apresentação da semana.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {presentations.map((presentation) => (
              <li key={presentation.id} className="admin-list-in">
                <Link
                  href={`/admin/apresentacoes/${presentation.id}`}
                  className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 rounded-md px-2 py-3 transition-colors duration-(--dur-fast) hover:bg-hover"
                >
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block truncate text-[14px] font-semibold">{presentation.title}</span>
                    <span className="block truncate text-[13px] text-fg-muted">
                      {presentation.clientName} · {presentation.postCount}{" "}
                      {presentation.postCount === 1 ? "post" : "posts"}
                      {presentation.ageDays !== null && ` · ${ageLabel(presentation.ageDays)}`}
                    </span>
                  </span>
                  <Badge tone={presentation.active ? "success" : "danger"}>
                    {presentation.active ? "Link ativo" : "Link desativado"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href="/admin/armazenamento"
        className="flex min-h-14 items-center gap-3 rounded-lg bg-bg-subtle px-4 py-3 transition-colors duration-(--dur-fast) hover:bg-hover"
      >
        <HardDrive size={18} aria-hidden="true" className="text-fg-muted" />
        <span className="flex-1 text-[14px]">
          <span className="font-semibold">Armazenamento:</span> {meterShortLabel(bytes)}
        </span>
        <span className="flex items-center gap-1 text-[13px] font-semibold text-accent">
          Limpar semanas antigas
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </Link>
    </div>
  );
}

import { Suspense } from "react";
import { Avatar } from "@/components/admin/avatar";
import { CalendarForm } from "@/components/admin/calendar-form";
import { CalendarRow } from "@/components/admin/calendar-row";
import { ClientActions } from "@/components/admin/client-actions";
import { PresentationForm } from "@/components/admin/presentation-form";
import { PresentationRow } from "@/components/admin/presentation-row";
import { EmptyState } from "@/components/admin/primitives/empty-state";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton, Skeleton } from "@/components/admin/primitives/skeleton";
import { listCalendars } from "@/lib/admin-calendar-data";
import { getClient } from "@/lib/admin-data";

export default function Page({ params }: PageProps<"/admin/clientes/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <ListSkeleton label="Carregando o cliente" />
        </>
      }
    >
      <ClientLoader params={params} />
    </Suspense>
  );
}

async function ClientLoader({ params }: Pick<PageProps<"/admin/clientes/[id]">, "params">) {
  const { id } = await params;
  const result = await getClient(id);

  if (!result) {
    return (
      <>
        <PageHeader title="Cliente não encontrado" crumbs={[{ label: "Início", href: "/admin" }]} />
        <p className="text-[14px] text-fg-muted">Este cliente não existe ou foi removido.</p>
      </>
    );
  }
  const { client, presentations } = result;
  const calendars = await listCalendars(client.id);

  return (
    <>
      <PageHeader
        title={client.name}
        crumbs={[{ label: "Início", href: "/admin" }]}
        leading={<Avatar url={client.avatarUrl} size={72} />}
        actions={<ClientActions client={client} />}
      >
        <p className="mt-3 text-[14px] font-semibold text-fg-muted">@{client.handle}</p>
        {client.bio && (
          <p className="mt-1 max-w-[560px] text-[14px] leading-[1.5] whitespace-pre-line">{client.bio}</p>
        )}
      </PageHeader>

      <section aria-labelledby="apresentacoes" className="mt-10">
        <h2 id="apresentacoes" className="mb-3 text-[18px] font-semibold">
          Apresentações <span className="font-normal text-fg-muted">· {presentations.length}</span>
        </h2>
        <PresentationForm clientId={client.id} />
        <div className="mt-6">
          {presentations.length === 0 ? (
            <EmptyState title="Nenhuma apresentação ainda">
              Dê um título acima (ex.: a semana que ela cobre) e monte os posts.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {presentations.map((presentation) => (
                <PresentationRow key={presentation.id} presentation={presentation} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="calendarios" className="mt-10">
        <h2 id="calendarios" className="mb-3 text-[18px] font-semibold">
          Calendários <span className="font-normal text-fg-muted">· {calendars.length}</span>
        </h2>
        <CalendarForm clientId={client.id} />
        <div className="mt-6">
          {calendars.length === 0 ? (
            <EmptyState title="Nenhum calendário ainda">
              Dê um título e escolha o mês para montar o planejamento de conteúdo.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {calendars.map((calendar) => (
                <CalendarRow key={calendar.id} calendar={calendar} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="mb-8 flex items-center gap-4">
      <Skeleton className="size-18 rounded-full" />
      <span className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
      </span>
    </div>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { ClientForm } from "@/components/admin/client-form";
import { DeleteClient } from "@/components/admin/delete-client";
import { DeletePresentationButton } from "@/components/admin/delete-presentation-button";
import { LinkControls } from "@/components/admin/link-controls";
import { PresentationForm } from "@/components/admin/presentation-form";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton, Skeleton } from "@/components/admin/primitives/skeleton";
import { secondaryButtonClass } from "@/components/admin/ui";
import { getClient, type AdminPresentation } from "@/lib/admin-data";
import { megabytes } from "@/lib/media";
import { ageLabel, isOld } from "@/lib/storage-rules";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "America/Sao_Paulo",
});

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

async function ClientLoader({
  params,
}: Pick<PageProps<"/admin/clientes/[id]">, "params">) {
  const { id } = await params;
  const result = await getClient(id);

  if (!result) {
    return (
      <>
        <PageHeader title="Cliente não encontrado" crumbs={[{ label: "Início", href: "/admin" }]} />
        <p className="text-[14px] text-muted">Este cliente não existe ou foi removido.</p>
      </>
    );
  }
  const { client, presentations } = result;

  return (
    <>
      <PageHeader title={client.name} crumbs={[{ label: "Início", href: "/admin" }]} />
      <ClientForm client={client} />

      <section className="mt-12">
        <h2 className="mb-4 text-[18px] font-semibold">Apresentações</h2>
        <PresentationForm clientId={client.id} />
        {presentations.length === 0 ? (
          <p className="mt-6 text-[14px] text-muted">
            Nenhuma apresentação ainda.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {presentations.map((presentation) => (
              <PresentationRow key={presentation.id} presentation={presentation} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-[18px] font-semibold">Excluir cliente</h2>
        <DeleteClient id={client.id} handle={client.handle} />
      </section>
    </>
  );
}

function PresentationRow({ presentation }: { presentation: AdminPresentation }) {
  const { id, title, token, active, createdAt, postCount, ageDays, bytes } =
    presentation;
  const age = ageLabel(ageDays);

  return (
    <li className="flex flex-wrap items-center gap-2 py-3">
      <span className="min-w-0 flex-1 basis-60">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-semibold">{title}</span>
          {isOld(ageDays) && (
            <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Antiga
            </span>
          )}
        </span>
        <span className="block text-[13px] text-muted tabular-nums">
          {createdAt && `${dateFormat.format(new Date(createdAt))} · `}
          {age && `${age} · `}
          {megabytes(bytes)} · {postCount} {postCount === 1 ? "post" : "posts"}
        </span>
      </span>
      <Link href={`/admin/apresentacoes/${id}`} className={secondaryButtonClass}>
        Editar
      </Link>
      <LinkControls presentationId={id} token={token} active={active} />
      <DeletePresentationButton id={id} title={title} />
    </li>
  );
}

function HeaderSkeleton() {
  return (
    <div role="status" aria-label="Carregando" className="mb-8 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-64" />
    </div>
  );
}

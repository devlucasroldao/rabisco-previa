import { Suspense } from "react";
import Link from "next/link";
import { ClientForm } from "@/components/admin/client-form";
import { CopyLinkButton } from "@/components/admin/copy-link-button";
import { DeleteClient } from "@/components/admin/delete-client";
import { DeletePresentationButton } from "@/components/admin/delete-presentation-button";
import { PresentationForm } from "@/components/admin/presentation-form";
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
    <>
      <Link href="/admin" className="text-[13px] text-muted hover:underline">
        ← Clientes
      </Link>
      <Suspense fallback={null}>
        <ClientLoader params={params} />
      </Suspense>
    </>
  );
}

async function ClientLoader({
  params,
}: Pick<PageProps<"/admin/clientes/[id]">, "params">) {
  const { id } = await params;
  const result = await getClient(id);

  if (!result) {
    return (
      <p className="mt-6 text-[14px] text-muted">
        Este cliente não existe ou foi removido.
      </p>
    );
  }
  const { client, presentations } = result;

  return (
    <>
      <h1 className="mt-2 mb-6 text-[20px] font-semibold">{client.name}</h1>
      <ClientForm client={client} />

      <section className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold">Apresentações</h2>
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
        <h2 className="mb-4 text-[16px] font-semibold">Excluir cliente</h2>
        <DeleteClient id={client.id} handle={client.handle} />
      </section>
    </>
  );
}

function PresentationRow({ presentation }: { presentation: AdminPresentation }) {
  const { id, title, token, createdAt, postCount, ageDays, bytes } = presentation;
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
      <CopyLinkButton token={token} />
      <a
        href={`/p/${token}`}
        target="_blank"
        rel="noreferrer"
        className={secondaryButtonClass}
      >
        Ver como cliente
      </a>
      <DeletePresentationButton id={id} title={title} />
    </li>
  );
}

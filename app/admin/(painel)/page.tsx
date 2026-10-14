import { Suspense } from "react";
import Link from "next/link";
import { Avatar } from "@/components/admin/avatar";
import { OldPresentations } from "@/components/admin/old-presentations";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton } from "@/components/admin/primitives/skeleton";
import { listClients, listOldPresentations } from "@/lib/admin-data";
import { OLD_PRESENTATION_DAYS } from "@/lib/storage-rules";

export default function Page() {
  return (
    <>
      <PageHeader title="Clientes" />
      <Suspense fallback={<ListSkeleton label="Carregando os clientes" />}>
        <ClientList />
      </Suspense>

      <section id="apresentacoes-antigas" className="mt-12 scroll-mt-20">
        <h2 className="text-[18px] font-semibold">Apresentações antigas</h2>
        <p className="mt-1 mb-4 text-[13px] text-muted">
          Com mais de {OLD_PRESENTATION_DAYS} dias. Os originais ficam no Drive e as
          legendas no Notion, então dá pra liberar espaço apagando as semanas que já
          passaram.
        </p>
        <Suspense fallback={<ListSkeleton rows={2} label="Carregando as apresentações antigas" />}>
          <OldList />
        </Suspense>
      </section>
    </>
  );
}

async function OldList() {
  return <OldPresentations presentations={await listOldPresentations()} />;
}

async function ClientList() {
  const clients = await listClients();

  if (clients.length === 0) {
    return (
      <p className="mt-8 text-[14px] text-muted">
        Nenhum cliente ainda. Crie o primeiro pra montar uma apresentação.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {clients.map((client) => (
        <li key={client.id}>
          <Link
            href={`/admin/clientes/${client.id}`}
            className="flex items-center gap-4 rounded-md px-2 py-3 transition-colors duration-(--dur-fast) hover:bg-hover"
          >
            <Avatar url={client.avatarUrl} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">
                {client.name}
              </span>
              <span className="block truncate text-[13px] text-muted">
                @{client.handle}
              </span>
            </span>
            <span className="text-[13px] text-muted">
              {client.presentationCount}{" "}
              {client.presentationCount === 1 ? "apresentação" : "apresentações"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

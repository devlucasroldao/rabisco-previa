import { Suspense } from "react";
import Link from "next/link";
import { Avatar } from "@/components/admin/avatar";
import { OldPresentations } from "@/components/admin/old-presentations";
import { primaryButtonClass } from "@/components/admin/ui";
import { listClients, listOldPresentations } from "@/lib/admin-data";
import { OLD_PRESENTATION_DAYS } from "@/lib/storage-rules";

export default function Page() {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold">Clientes</h1>
        <Link href="/admin/clientes/novo" className={primaryButtonClass}>
          Novo cliente
        </Link>
      </div>
      <Suspense fallback={null}>
        <ClientList />
      </Suspense>

      <section className="mt-12">
        <h2 className="text-[16px] font-semibold">Apresentações antigas</h2>
        <p className="mt-1 mb-4 text-[13px] text-muted">
          Com mais de {OLD_PRESENTATION_DAYS} dias. Os originais ficam no Drive e as
          legendas no Notion, então dá pra liberar espaço apagando as semanas que já
          passaram.
        </p>
        <Suspense fallback={null}>
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
    <ul className="mt-6 divide-y divide-line border-y border-line">
      {clients.map((client) => (
        <li key={client.id}>
          <Link
            href={`/admin/clientes/${client.id}`}
            className="flex items-center gap-4 py-3 hover:bg-surface"
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

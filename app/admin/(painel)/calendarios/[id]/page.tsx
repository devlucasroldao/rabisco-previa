import { Suspense } from "react";
import { CalendarItemsEditor } from "@/components/admin/calendar-items-editor";
import { CalendarLinkControls } from "@/components/admin/calendar-link-controls";
import { CalendarTitleForm } from "@/components/admin/calendar-title-form";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton, Skeleton } from "@/components/admin/primitives/skeleton";
import { getCalendar } from "@/lib/admin-calendar-data";

export default function Page({
  params,
}: PageProps<"/admin/calendarios/[id]">) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <ListSkeleton label="Carregando o calendário" />
        </>
      }
    >
      <CalendarLoader params={params} />
    </Suspense>
  );
}

async function CalendarLoader({
  params,
}: Pick<PageProps<"/admin/calendarios/[id]">, "params">) {
  const { id } = await params;
  const calendar = await getCalendar(id);

  if (!calendar) {
    return (
      <>
        <PageHeader
          title="Calendário não encontrado"
          crumbs={[{ label: "Início", href: "/admin" }]}
        />
        <p className="text-[14px] text-fg-muted">
          Este calendário não existe ou foi removido.
        </p>
      </>
    );
  }
  const { active, client, items, title, token, month } = calendar;

  return (
    <>
      <PageHeader
        title={title}
        crumbs={[
          { label: "Início", href: "/admin" },
          { label: client.name, href: `/admin/clientes/${client.id}` },
        ]}
        titleAction={<CalendarTitleForm id={calendar.id} title={title} />}
      >
        <div className="mt-4">
          <CalendarLinkControls calendarId={calendar.id} token={token} active={active} />
        </div>
      </PageHeader>

      <section aria-labelledby="itens" className="mt-10">
        <h2 id="itens" className="mb-3 text-[18px] font-semibold">
          Itens do calendário{" "}
          <span className="font-normal text-fg-muted">· {items.length}</span>
        </h2>
        <CalendarItemsEditor
          calendarId={calendar.id}
          month={month}
          items={items}
        />
      </section>
    </>
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

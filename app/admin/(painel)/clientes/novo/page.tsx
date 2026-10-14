import { Suspense } from "react";
import { ClientForm } from "@/components/admin/client-form";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { requireStaff } from "@/lib/supabase/session";

export default function Page() {
  return (
    <>
      <PageHeader title="Novo cliente" crumbs={[{ label: "Início", href: "/admin" }]} />
      <Suspense fallback={null}>
        <NewClient />
      </Suspense>
    </>
  );
}

async function NewClient() {
  await requireStaff();
  return <ClientForm />;
}

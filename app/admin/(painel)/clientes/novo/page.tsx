import { Suspense } from "react";
import Link from "next/link";
import { ClientForm } from "@/components/admin/client-form";
import { requireStaff } from "@/lib/supabase/session";

export default function Page() {
  return (
    <>
      <Link href="/admin" className="text-[13px] text-muted hover:underline">
        ← Clientes
      </Link>
      <h1 className="mt-2 mb-6 text-[20px] font-semibold">Novo cliente</h1>
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

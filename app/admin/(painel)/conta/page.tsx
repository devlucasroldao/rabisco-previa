import { Suspense } from "react";
import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { Skeleton } from "@/components/admin/primitives/skeleton";
import { getStaffEmail } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Conta · Rabisco Prévia" };

export default function Page() {
  return (
    <>
      <PageHeader title="Conta" crumbs={[{ label: "Início", href: "/admin" }]} />
      <Suspense fallback={<Skeleton className="h-4 w-48" />}>
        <Account />
      </Suspense>
    </>
  );
}

async function Account() {
  const email = await getStaffEmail();
  return (
    <>
      <p className="-mt-5 mb-8 text-[14px] text-fg-muted">{email}</p>
      <section
        aria-labelledby="trocar-senha"
        className="max-w-[460px] rounded-lg border border-border p-5 sm:p-6"
      >
        <h2 id="trocar-senha" className="text-[18px] font-semibold">
          Trocar a senha
        </h2>
        <p className="mt-1 mb-5 text-[13px] text-fg-muted">
          A senha atual é conferida antes. Depois de trocar, use a nova no próximo login.
        </p>
        <PasswordForm />
      </section>
    </>
  );
}

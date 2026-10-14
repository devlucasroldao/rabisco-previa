import { Suspense } from "react";
import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { getStaffEmail } from "@/lib/admin-data";

export const metadata: Metadata = { title: "Conta · Rabisco Prévia" };

export default function Page() {
  return (
    <>
      <h1 className="text-[20px] font-semibold">Conta</h1>
      <Suspense fallback={null}>
        <Account />
      </Suspense>
    </>
  );
}

async function Account() {
  const email = await getStaffEmail();
  return (
    <>
      <p className="mt-1 mb-6 text-[14px] text-muted">{email}</p>
      <h2 className="mb-4 text-[16px] font-semibold">Trocar a senha</h2>
      <PasswordForm />
    </>
  );
}

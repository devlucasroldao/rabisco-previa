import { Suspense } from "react";
import type { Metadata } from "next";
import { OldPresentations } from "@/components/admin/old-presentations";
import { PageHeader } from "@/components/admin/primitives/page-header";
import { ListSkeleton, Skeleton } from "@/components/admin/primitives/skeleton";
import { listOldPresentations } from "@/lib/admin-data";
import { shellStorage } from "@/lib/admin-shell";
import {
  meterLabel,
  meterLevel,
  meterShortLabel,
  OLD_PRESENTATION_DAYS,
  STORAGE_LIMIT_BYTES,
  usagePercent,
} from "@/lib/storage-rules";

export const metadata: Metadata = { title: "Armazenamento · Rabisco Prévia" };

const barColor = { normal: "bg-fg-muted", warning: "bg-highlight", danger: "bg-danger" };

export default function Page() {
  return (
    <>
      <PageHeader title="Armazenamento" crumbs={[{ label: "Início", href: "/admin" }]} />
      <Suspense fallback={<Skeleton className="mb-10 h-20" />}>
        <Usage />
      </Suspense>

      <section aria-labelledby="apresentacoes-antigas" className="mt-10">
        <h2 id="apresentacoes-antigas" className="text-[18px] font-semibold">
          Apresentações antigas
        </h2>
        <p className="mt-1 mb-4 text-[14px] text-fg-muted">
          Com mais de {OLD_PRESENTATION_DAYS} dias. Os originais ficam no Drive e as legendas
          no Notion, então dá pra liberar espaço apagando as semanas que já passaram.
        </p>
        <Suspense fallback={<ListSkeleton rows={2} label="Carregando as apresentações antigas" />}>
          <OldList />
        </Suspense>
      </section>
    </>
  );
}

async function Usage() {
  const bytes = await shellStorage();
  const percent = usagePercent(bytes);
  const level = meterLevel(percent);
  return (
    <div className="rounded-lg border border-border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-[22px] font-semibold tabular-nums">{meterShortLabel(bytes)}</p>
        <p className="text-[13px] text-fg-muted">
          {Math.max(0, Math.round(percent))}% do plano gratuito do Supabase
        </p>
      </div>
      <div
        role="meter"
        aria-label="Uso do armazenamento"
        aria-valuemin={0}
        aria-valuemax={STORAGE_LIMIT_BYTES}
        aria-valuenow={bytes}
        aria-valuetext={meterLabel(bytes)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-active"
      >
        <div
          className={`admin-progress h-full rounded-full ${barColor[level]}`}
          style={{ width: `${Math.max(1, Math.min(100, percent))}%` }}
        />
      </div>
      {level !== "normal" && (
        <p className={`mt-2 text-[13px] font-semibold ${level === "danger" ? "text-danger" : ""}`}>
          {level === "danger" ? "Quase cheio: apague semanas antigas." : "Acima de 70%: vale limpar."}
        </p>
      )}
    </div>
  );
}

async function OldList() {
  return <OldPresentations presentations={await listOldPresentations()} />;
}

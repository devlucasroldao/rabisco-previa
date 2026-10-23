import { Suspense } from "react";
import type { Metadata } from "next";
import { CalendarView } from "@/components/calendar-view";
import { PublicPage } from "@/components/public-page";
import { getCalendarByToken } from "@/lib/calendar-data";

export const metadata: Metadata = {
  title: "Calendário · Rabisco",
  robots: { index: false, follow: false },
};

export default function Page({ params }: PageProps<"/c/[token]">) {
  return (
    <Suspense fallback={null}>
      <CalendarLoader params={params} />
    </Suspense>
  );
}

async function CalendarLoader({
  params,
}: Pick<PageProps<"/c/[token]">, "params">) {
  const { token } = await params;
  const calendar = await getCalendarByToken(token);

  if (!calendar || calendar.items.length === 0) {
    return (
      <PublicPage title="Este calendário não existe ou foi removido">
        Confira se o link foi copiado completo ou peça um novo à Rabisco.
      </PublicPage>
    );
  }

  return <CalendarView calendar={calendar} />;
}

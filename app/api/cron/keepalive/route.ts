import { timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// Projeto gratuito do Supabase pausa depois de ~7 dias parado. O cron da
// Vercel (vercel.json) chama esta rota todo dia, com o CRON_SECRET no header.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !secret ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    // Nunca o segredo nem o header: só que a chamada não passou.
    console.warn("[keepalive] não autorizado");
    return Response.json({ ok: false }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("[keepalive] falhou", { status: null, code: "sem_configuracao" });
    return Response.json({ ok: false }, { status: 500 });
  }

  const { error, status } = await supabase.from("clients").select("id").limit(1);
  if (error) {
    console.error("[keepalive] falhou", { status, code: error.code });
    return Response.json({ ok: false }, { status: 500 });
  }

  console.info("[keepalive] ok");
  return Response.json({ ok: true });
}

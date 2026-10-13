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
    return Response.json({ ok: false }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return Response.json({ ok: false }, { status: 500 });

  const { error } = await supabase.from("clients").select("id").limit(1);
  if (error) return Response.json({ ok: false }, { status: 500 });

  return Response.json({ ok: true });
}

import { getSupabaseAdmin, MEDIA_BUCKET } from "./supabase/server";
import type { Calendar, CalendarItem, ContentType } from "./types";

// Alfabeto do nanoid, entre 10 e 32 caracteres.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,32}$/;

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

type CalendarRow = {
  active: boolean;
  title: string;
  month: string;
  token: string;
  client: {
    name: string;
    handle: string;
    bio: string | null;
    avatar_path: string | null;
  };
  calendar_items: {
    id: string;
    day: string;
    position: number;
    content_type: ContentType;
    title: string;
    description: string | null;
  }[];
};

export async function getCalendarByToken(
  token: string,
): Promise<Calendar | null> {
  if (!TOKEN_PATTERN.test(token)) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("calendars")
    .select(
      "active, title, month, token, client:clients!inner(name, handle, bio, avatar_path), calendar_items(id, day, position, content_type, title, description)",
    )
    .eq("token", token)
    .order("day", { referencedTable: "calendar_items" })
    .order("position", { referencedTable: "calendar_items" })
    .maybeSingle()
    .overrideTypes<CalendarRow, { merge: false }>();

  if (error) {
    throw new Error(`Falha ao buscar o calendário: ${error.message}`);
  }
  if (!data || !data.active) return null;

  // Assina o avatar do cliente (mesmo padrão das apresentações).
  let avatarUrl = EMPTY_IMAGE;
  if (data.client.avatar_path) {
    const { data: signed, error: signError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls([data.client.avatar_path], SIGNED_URL_TTL_SECONDS);

    if (!signError && signed[0]?.signedUrl) {
      avatarUrl = signed[0].signedUrl;
    }
  }

  return {
    title: data.title,
    month: data.month,
    token: data.token,
    client: {
      name: data.client.name,
      handle: data.client.handle,
      bio: data.client.bio ?? "",
      avatarUrl,
    },
    items: data.calendar_items.map(
      (item): CalendarItem => ({
        id: item.id,
        day: item.day,
        position: item.position,
        contentType: item.content_type,
        title: item.title,
        description: item.description,
      }),
    ),
  };
}

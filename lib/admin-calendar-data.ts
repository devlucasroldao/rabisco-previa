import "server-only";

import { isUuid } from "./admin-data";
import type { ContentType } from "./types";
import { requireStaff } from "./supabase/session";

export type AdminCalendar = {
  id: string;
  title: string;
  month: string;
  token: string;
  active: boolean;
  createdAt: string | null;
  itemCount: number;
};

export type AdminCalendarDetail = {
  id: string;
  title: string;
  month: string;
  token: string;
  active: boolean;
  client: { id: string; name: string; handle: string };
  items: AdminCalendarItem[];
};

export type AdminCalendarItem = {
  id: string;
  day: string;
  position: number;
  contentType: ContentType;
  description: string;
};

export async function listCalendars(
  clientId: string,
): Promise<AdminCalendar[]> {
  const { supabase } = await requireStaff();
  if (!isUuid(clientId)) return [];

  const { data, error } = await supabase
    .from("calendars")
    .select(
      "id, title, month, token, active, created_at, calendar_items(count)",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .overrideTypes<
      {
        id: string;
        title: string;
        month: string;
        token: string;
        active: boolean;
        created_at: string | null;
        calendar_items: { count: number }[];
      }[],
      { merge: false }
    >();
  if (error) throw new Error(`Falha ao listar os calendários: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    month: row.month,
    token: row.token,
    active: row.active,
    createdAt: row.created_at,
    itemCount: row.calendar_items[0]?.count ?? 0,
  }));
}

export async function getCalendar(
  id: string,
): Promise<AdminCalendarDetail | null> {
  const { supabase } = await requireStaff();
  if (!isUuid(id)) return null;

  const { data, error } = await supabase
    .from("calendars")
    .select(
      "id, title, month, token, active, client:clients!inner(id, name, handle), calendar_items(id, day, position, content_type, description)",
    )
    .eq("id", id)
    .order("day", { referencedTable: "calendar_items" })
    .order("position", { referencedTable: "calendar_items" })
    .maybeSingle()
    .overrideTypes<
      {
        id: string;
        title: string;
        month: string;
        token: string;
        active: boolean;
        client: { id: string; name: string; handle: string };
        calendar_items: {
          id: string;
          day: string;
          position: number;
          content_type: ContentType;
          description: string;
        }[];
      },
      { merge: false }
    >();

  if (error) throw new Error(`Falha ao buscar o calendário: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    month: data.month,
    token: data.token,
    active: data.active,
    client: data.client,
    items: data.calendar_items.map((item) => ({
      id: item.id,
      day: item.day,
      position: item.position,
      contentType: item.content_type,
      description: item.description,
    })),
  };
}

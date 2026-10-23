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
  title: string;
  description: string | null;
};

export type RecentCalendar = {
  id: string;
  title: string;
  month: string;
  active: boolean;
  clientName: string;
  itemCount: number;
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
      "id, title, month, token, active, client:clients!inner(id, name, handle), calendar_items(id, day, position, content_type, title, description)",
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
          title: string;
          description: string | null;
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
      title: item.title,
      description: item.description,
    })),
  };
}

// Os calendários mais novos de todos os clientes, pro início do painel.
export async function listRecentCalendars(limit = 6): Promise<RecentCalendar[]> {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("calendars")
    .select(
      "id, title, month, active, client:clients!inner(name), calendar_items(count)",
    )
    .order("created_at", { ascending: false })
    .limit(limit)
    .overrideTypes<
      {
        id: string;
        title: string;
        month: string;
        active: boolean | null;
        client: { name: string };
        calendar_items: { count: number }[];
      }[],
      { merge: false }
    >();
  if (error) throw new Error(`Falha ao listar os calendários: ${error.message}`);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    month: row.month,
    active: row.active !== false,
    clientName: row.client.name,
    itemCount: row.calendar_items[0]?.count ?? 0,
  }));
}

// Quantos calendários cada cliente tem, pro resumo do início. Uma consulta só,
// em vez de uma por cliente.
export async function countCalendarsByClient(): Promise<Map<string, number>> {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("calendars")
    .select("client_id")
    .overrideTypes<{ client_id: string }[], { merge: false }>();
  if (error) throw new Error(`Falha ao contar os calendários: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.client_id, (counts.get(row.client_id) ?? 0) + 1);
  }
  return counts;
}

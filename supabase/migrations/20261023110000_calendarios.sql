-- Módulo Calendário Mensal: planejamento de conteúdo visível pro cliente.
--
-- Mesmas regras de acesso das apresentações:
--   anon           nada.
--   authenticated  leitura e escrita (painel da Rabisco).
--   service_role   usado no servidor, pela rota /c/[token].

-- Tabelas ---------------------------------------------------------------

create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  -- Primeiro dia do mês (ex.: 2026-10-01). Garante que é sempre dia 1.
  month date not null check (extract(day from month) = 1),
  token text unique not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars (id) on delete cascade,
  day date not null,
  position int not null,
  content_type text not null
    check (content_type in ('post', 'carrossel', 'reels', 'story', 'campanha')),
  description text not null,
  created_at timestamptz default now()
);

create index calendars_client_id_idx on public.calendars (client_id);
create index calendar_items_calendar_id_day_idx
  on public.calendar_items (calendar_id, day, position);

-- Permissões e RLS ------------------------------------------------------

revoke all on public.calendars, public.calendar_items from anon;
grant select, insert, update, delete
  on public.calendars, public.calendar_items
  to authenticated, service_role;

alter table public.calendars enable row level security;
alter table public.calendar_items enable row level security;

create policy "Equipe lê e escreve calendários"
  on public.calendars for all to authenticated
  using (true) with check (true);

create policy "Equipe lê e escreve itens do calendário"
  on public.calendar_items for all to authenticated
  using (true) with check (true);

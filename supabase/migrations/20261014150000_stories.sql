-- Stories da semana (Etapa 5): só imagens, organizadas por dia de publicação.
--
-- O arquivo fica na mesma pasta dos posts, sem subpasta:
--   presentations/{presentation_id}/{uuid}.jpg
-- então a exclusão da apresentação, a limpeza em lote e o medidor de
-- armazenamento já cobrem os stories sem mudança.
--
-- Mesmo acesso das outras tabelas: anon nada, authenticated lê e escreve,
-- service_role só no servidor (rota /p/[token]).

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  -- Só a data, sem hora: o dia em que o story vai ao ar.
  day date not null,
  position int not null,
  path text not null,
  created_at timestamptz default now()
);

create index stories_presentation_id_day_position_idx
  on public.stories (presentation_id, day, position);

-- "Automatically expose new tables" está desligado: os privilégios são todos
-- explícitos, e anon fica sem nenhum.
revoke all on public.stories from anon;
grant select, insert, update, delete on public.stories to authenticated, service_role;

alter table public.stories enable row level security;

-- Nenhuma política para anon.
create policy "Equipe lê e escreve stories"
  on public.stories for all to authenticated
  using (true) with check (true);

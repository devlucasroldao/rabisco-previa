-- Rabisco Prévia: tabelas, RLS e storage (docs/SPEC.md §5).
--
-- Quem acessa o quê:
--   anon           nada. O público nunca lê as tabelas nem o bucket direto.
--   authenticated  leitura e escrita (painel da Rabisco, Etapa 3).
--   service_role   usado só no servidor, pela rota /p/[token] e pelo seed.

-- Tabelas ---------------------------------------------------------------

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null,
  bio text,
  avatar_path text,
  created_at timestamptz default now()
);

create table public.presentations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  token text unique not null,
  created_at timestamptz default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.presentations (id) on delete cascade,
  position int not null,
  type text check (type in ('post', 'carousel', 'reels')),
  caption text,
  -- [{ "path": "...", "kind": "image" | "video", "poster": "..." }]
  media jsonb not null,
  created_at timestamptz default now()
);

create index presentations_client_id_idx on public.presentations (client_id);
create index posts_presentation_id_position_idx on public.posts (presentation_id, position);

-- Permissões e RLS ------------------------------------------------------

-- Os privilégios são explícitos pra não depender do padrão do projeto:
-- anon fica sem nenhum, então um select direto falha antes mesmo do RLS.
revoke all on public.clients, public.presentations, public.posts from anon;
grant select, insert, update, delete
  on public.clients, public.presentations, public.posts
  to authenticated;
grant all on public.clients, public.presentations, public.posts to service_role;

alter table public.clients enable row level security;
alter table public.presentations enable row level security;
alter table public.posts enable row level security;

-- Nenhuma política para anon.
create policy "Equipe lê e escreve clientes"
  on public.clients for all to authenticated
  using (true) with check (true);

create policy "Equipe lê e escreve apresentações"
  on public.presentations for all to authenticated
  using (true) with check (true);

create policy "Equipe lê e escreve posts"
  on public.posts for all to authenticated
  using (true) with check (true);

-- Storage ---------------------------------------------------------------

-- Bucket privado. Caminhos:
--   clients/{client_id}/avatar.jpg
--   presentations/{presentation_id}/{arquivo}
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do update set public = false;

-- Nenhuma política para anon: a tela do cliente recebe URLs assinadas
-- geradas no servidor.
create policy "Equipe lê a mídia"
  on storage.objects for select to authenticated
  using (bucket_id = 'media');

create policy "Equipe envia mídia"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'media');

create policy "Equipe substitui mídia"
  on storage.objects for update to authenticated
  using (bucket_id = 'media') with check (bucket_id = 'media');

create policy "Equipe apaga mídia"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media');

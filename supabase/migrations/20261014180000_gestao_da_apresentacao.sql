-- Gestão da apresentação (Etapa 6): link ativo/desativado e reordenação
-- atômica dos posts.

-- Link desativado: a rota pública responde como se a prévia não existisse.
-- Toda apresentação existente continua ativa.
alter table public.presentations
  add column active boolean not null default true;

-- Reordena todos os posts de uma apresentação numa instrução só.
--
-- security invoker: roda com o papel de quem chama, então a RLS de
-- authenticated continua valendo. search_path vazio e nomes qualificados.
--
-- p_ids precisa ter exatamente os posts da apresentação: sem faltar, sem
-- sobrar, sem repetir e sem nulo. Qualquer diferença levanta erro 22023 e
-- nada muda. A position passa a ser 1..N na ordem recebida.
create function public.reorder_posts(p_presentation_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current uuid[];
  v_received uuid[];
begin
  -- Trava os posts da apresentação: um post criado ou apagado no meio
  -- espera esta transação terminar.
  perform 1
  from public.posts as p
  where p.presentation_id = p_presentation_id
  for update;

  select coalesce(array_agg(p.id order by p.id), '{}')
  into v_current
  from public.posts as p
  where p.presentation_id = p_presentation_id;

  select coalesce(array_agg(x order by x), '{}')
  into v_received
  from unnest(coalesce(p_ids, '{}')) as x;

  if cardinality(v_current) = 0
    or array_position(v_received, null) is not null
    or v_received is distinct from v_current
  then
    raise exception 'a lista não corresponde aos posts da apresentação'
      using errcode = '22023';
  end if;

  update public.posts as p
  set position = o.ord
  from unnest(p_ids) with ordinality as o (id, ord)
  where p.id = o.id
    and p.presentation_id = p_presentation_id;
end;
$$;

-- Só a equipe logada. Nem o público nem a service_role (o servidor não
-- reordena nada).
revoke all on function public.reorder_posts(uuid, uuid[]) from public, anon, service_role;
grant execute on function public.reorder_posts(uuid, uuid[]) to authenticated;

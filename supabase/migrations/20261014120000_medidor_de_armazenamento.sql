-- Medidor de armazenamento do painel (Etapa 4B).
--
-- O painel não usa a service_role e o authenticated não lê storage.objects
-- inteiro, então as somas saem de duas funções security definer que só
-- devolvem totais. search_path vazio e nomes qualificados: nada de objeto
-- trocado por outro schema.
--
-- Quem chama: só authenticated (o painel). anon e service_role ficam sem
-- EXECUTE, inclusive o que o Supabase concede por padrão a funções novas.

create function public.media_usage_bytes()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
  from storage.objects as o
  where o.bucket_id = 'media';
$$;

-- Bytes por apresentação, a partir do caminho presentations/<uuid>/<arquivo>.
-- Caminho fora desse formato (avatar do cliente, por exemplo) fica de fora.
create function public.media_usage_by_presentation()
returns table (presentation_id uuid, bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    split_part(o.name, '/', 2)::uuid as presentation_id,
    coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint as bytes
  from storage.objects as o
  where o.bucket_id = 'media'
    and o.name ~ '^presentations/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
  group by 1;
$$;

revoke all on function public.media_usage_bytes() from public, anon, service_role;
revoke all on function public.media_usage_by_presentation() from public, anon, service_role;

grant execute on function public.media_usage_bytes() to authenticated;
grant execute on function public.media_usage_by_presentation() to authenticated;

-- Calendário v2: o item ganha título e descrição separados, e dois tipos novos.
--
-- Na v1 havia só "description", mas na prática ela era usada como título
-- ("Stories — Feedback (29/10)"). Aqui ela vira o título de fato e abre espaço
-- pra uma descrição longa e opcional, que o cliente vê ao tocar no item.

-- Itens -----------------------------------------------------------------

alter table public.calendar_items rename column description to title;
alter table public.calendar_items add column description text;

-- Tipos novos: anúncio (tráfego pago) e enquete (caixinha).
alter table public.calendar_items
  drop constraint if exists calendar_items_content_type_check;
alter table public.calendar_items
  add constraint calendar_items_content_type_check
  check (
    content_type in (
      'post', 'carrossel', 'reels', 'story', 'campanha', 'anuncio', 'enquete'
    )
  );

-- Campanha com intervalo de dias: hoje todo item do calendário tem um único
-- "day". Campanha normalmente dura mais de um dia, então ganha um "end_day"
-- opcional. Os demais tipos continuam com um único dia (end_day fica null).
--
-- O item aparece em todos os dias do intervalo na tela do cliente e no
-- painel — é uma repetição visual, não várias linhas no banco.

alter table public.calendar_items add column end_day date;

alter table public.calendar_items
  add constraint calendar_items_end_day_check
  check (
    end_day is null
    or (
      end_day >= day
      and date_trunc('month', end_day) = date_trunc('month', day)
    )
  );

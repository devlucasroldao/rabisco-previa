-- Um cliente por @. O seed reaproveita o cliente por esta coluna.
alter table public.clients
  add constraint clients_handle_key unique (handle);

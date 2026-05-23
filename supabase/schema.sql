-- Cole este SQL no Supabase: SQL Editor → New query → Run

create table if not exists notas_fiscais (
  id text primary key,
  numero_nota text not null,
  valor_nota double precision not null,
  produtos jsonb not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_notas_criado_em on notas_fiscais (criado_em desc);

alter table notas_fiscais enable row level security;

create policy "Servidor pode tudo"
  on notas_fiscais
  for all
  using (true)
  with check (true);

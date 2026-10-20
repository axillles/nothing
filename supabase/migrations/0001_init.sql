create extension if not exists pgcrypto;

create sequence if not exists receipt_sequence start 1;

create table if not exists app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sequence_number bigint not null unique default nextval('receipt_sequence'),
  chain text not null check (chain in ('solana','bitcoin','ethereum')),
  currency text not null check (currency in ('SOL','USDC','BTC','ETH','USDT')),
  provider text not null,
  payer_address text,
  amount_crypto numeric(36,18),
  amount_usd numeric(18,2) not null check (amount_usd > 0),
  usd_rate numeric(36,12) not null check (usd_rate > 0),
  price_timestamp timestamptz not null,
  reference text unique,
  transaction_signature text unique,
  provider_payment_id text,
  status text not null check (status in ('created','pending','submitted','confirmed','verified','minted','failed','expired')) default 'created',
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  mint_id uuid
);

create unique index if not exists payments_provider_payment_unique
  on payments(provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists payments_status_idx on payments(status);
create index if not exists payments_created_idx on payments(created_at desc);
create index if not exists payments_payer_idx on payments(payer_address);

create table if not exists nft_mints (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references payments(id) on delete cascade,
  mint_address text unique,
  collection_address text,
  metadata_uri text,
  minted_at timestamptz,
  status text not null check (status in ('queued','minted','failed')) default 'queued'
);

alter table payments
  drop constraint if exists payments_mint_fk;

alter table payments
  add constraint payments_mint_fk foreign key (mint_id) references nft_mints(id) on delete set null;

create table if not exists payment_events (
  id bigint generated always as identity primary key,
  payment_id uuid not null references payments(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_events_payment_idx on payment_events(payment_id, created_at desc);

create or replace function reserve_receipt_sequence()
returns bigint
language sql
security definer
set search_path = public
as $$
  select nextval('receipt_sequence');
$$;

create or replace view leaderboard as
select
  payer_address,
  sum(amount_usd)::numeric as amount_usd,
  count(*)::bigint as payments_count,
  max(confirmed_at)::timestamptz as last_payment_at
from payments
where status in ('verified','minted')
group by payer_address;

create or replace view leaderboard_stats as
select
  coalesce(sum(amount_usd), 0)::numeric as total_usd,
  count(*)::bigint as verified_payments
from payments
where status in ('verified','minted');

alter table app_config enable row level security;
alter table payments enable row level security;
alter table nft_mints enable row level security;
alter table payment_events enable row level security;

revoke all on app_config from anon, authenticated;
revoke all on payments from anon, authenticated;
revoke all on nft_mints from anon, authenticated;
revoke all on payment_events from anon, authenticated;
revoke all on leaderboard from anon, authenticated;
revoke all on leaderboard_stats from anon, authenticated;

grant select on leaderboard to anon, authenticated;
grant select on leaderboard_stats to anon, authenticated;
grant execute on function reserve_receipt_sequence() to service_role;

insert into app_config(key, value)
values
  ('network', '"mainnet-beta"'::jsonb),
  ('minimum_payment', '1'::jsonb)
on conflict (key) do nothing;

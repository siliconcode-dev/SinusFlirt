-- Phase 7 monetization (Build_plan.md "Phase 7"): premium ad-unlock windows
-- and a per-account daily usage cap for the free tier.

create table public.premium_unlocks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index premium_unlocks_account_active
  on public.premium_unlocks (account_id, expires_at desc);

alter table public.premium_unlocks enable row level security;

create policy "Premium unlocks are only accessible by their owner"
  on public.premium_unlocks for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

-- One row per account per UTC day. No reset job needed — a new date just
-- gets a new row; checkUsageCap reads today's row directly.
create table public.daily_usage (
  account_id uuid not null references public.accounts (id) on delete cascade,
  usage_date date not null,
  turns_count integer not null default 0,
  primary key (account_id, usage_date)
);

alter table public.daily_usage enable row level security;

create policy "Daily usage is only accessible by its owner"
  on public.daily_usage for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

-- Atomic increment (avoids a read-then-write race between concurrent turns).
-- security definer bypasses RLS, so it's callable via Supabase's
-- auto-generated RPC endpoint directly (not just through our own route
-- handler) — the auth.uid() check keeps an authenticated user from
-- incrementing (griefing) another account's usage counter.
create or replace function public.increment_daily_usage(
  p_account_id uuid,
  p_usage_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_account_id then
    raise exception 'not authorized';
  end if;

  insert into public.daily_usage (account_id, usage_date, turns_count)
  values (p_account_id, p_usage_date, 1)
  on conflict (account_id, usage_date)
  do update set turns_count = public.daily_usage.turns_count + 1;
end;
$$;

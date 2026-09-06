-- Phase 1 foundation schema (Build_plan.md "Phase 1 — Foundation").
-- Every user — anonymous or permanent — is a real auth.users row (Supabase
-- native Anonymous Sign-ins). All app tables key off auth.uid() directly,
-- so the anonymous->Google upgrade (linkIdentity) never requires a data
-- migration: the id stays the same for the account's entire lifetime.

create extension if not exists pg_cron with schema pg_catalog;

-- 1:1 with auth.users. Holds the fields collected at the age-gate.
create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  date_of_birth date not null,
  tos_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- The 10-character roster (Masterdoc.md §5.1). Populated with placeholder
-- personality data now; Phase 4 replaces `personality` with the real
-- structured system-prompt data per character.
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tier text not null check (tier in ('free', 'premium')),
  personality jsonb not null default '{}'::jsonb,
  voice_id text,
  created_at timestamptz not null default now()
);

-- Interest score + running relationship memory, per account/character pair.
create table public.relationship_state (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  interest_score integer not null default 50,
  memory_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, character_id)
);

-- One row per conversation session.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

-- Row Level Security: every row is only visible/writable by its own account.
alter table public.accounts enable row level security;
alter table public.characters enable row level security;
alter table public.relationship_state enable row level security;
alter table public.sessions enable row level security;

create policy "Accounts are only accessible by their owner"
  on public.accounts for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Characters are readable by any signed-in user"
  on public.characters for select
  using (auth.role() = 'authenticated');

create policy "Relationship state is only accessible by its owner"
  on public.relationship_state for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "Sessions are only accessible by their owner"
  on public.sessions for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

-- Seed the roster (Masterdoc.md §5.1). Voice assignments and personality
-- data are finalized in Phase 4 once the Orpheus voice audition is done.
insert into public.characters (slug, name, tier) values
  ('aiko', 'Aiko', 'free'),
  ('mei', 'Mei', 'free'),
  ('sasha', 'Sasha', 'free'),
  ('priya', 'Priya', 'free'),
  ('luna', 'Luna', 'free'),
  ('freya', 'Freya', 'premium'),
  ('nova', 'Nova', 'premium'),
  ('elena', 'Elena', 'premium'),
  ('coral', 'Coral', 'premium'),
  ('hana', 'Hana', 'premium');

-- 48-hour silent deletion sweep (Masterdoc.md §11): anonymous accounts with
-- no linked Google identity are purged, cascading through every table above
-- via the FK chain — no application code involved.
create or replace function public.delete_expired_anonymous_users()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users
  where is_anonymous = true
    and created_at < now() - interval '48 hours';
end;
$$;

select cron.schedule(
  'delete-expired-anonymous-users',
  '0 * * * *', -- hourly
  $$select public.delete_expired_anonymous_users();$$
);

-- Phase 4: random-once-per-account character assignment (Build_plan.md
-- Phase 4). `is_permanent` marks the one free-tier character an account is
-- permanently assigned on first real use — the partial unique index below
-- guards against a double-assignment race, while leaving room for Phase 7's
-- additional (non-permanent) premium-unlock relationship_state rows on the
-- same account later.

alter table public.relationship_state
  add column is_permanent boolean not null default false;

create unique index relationship_state_one_permanent_per_account
  on public.relationship_state (account_id)
  where is_permanent;

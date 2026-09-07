-- Project-owner-directed roster rebalance: Sasha and Luna move to premium,
-- Nova and Freya move to free (randomly picked from the prior premium set
-- to fill the two open free slots) — keeps the 5-free/5-premium split from
-- Masterdoc §5.1 intact, just with a different membership.

update public.characters set tier = 'premium' where slug in ('sasha', 'luna');
update public.characters set tier = 'free' where slug in ('nova', 'freya');

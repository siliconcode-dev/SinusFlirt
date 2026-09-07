import type { Character } from "./types";
import { AIKO } from "./aiko";
import { MEI } from "./mei";
import { SASHA } from "./sasha";
import { PRIYA } from "./priya";
import { LUNA } from "./luna";

// The 5 free-tier characters (Masterdoc §5.1). Keyed by slug to match
// public.characters.slug, seeded in supabase/migrations/0001_init.sql.
export const ROSTER: Record<string, Character> = {
  aiko: AIKO,
  mei: MEI,
  sasha: SASHA,
  priya: PRIYA,
  luna: LUNA,
};

export const FREE_SLUGS = Object.keys(ROSTER);

import type { Character } from "./types";
import { AIKO } from "./aiko";
import { MEI } from "./mei";
import { SASHA } from "./sasha";
import { PRIYA } from "./priya";
import { LUNA } from "./luna";
import { FREYA } from "./freya";
import { NOVA } from "./nova";
import { ELENA } from "./elena";
import { CORAL } from "./coral";
import { HANA } from "./hana";

// The 5 free-tier characters (Masterdoc §5.1) + 5 premium (Phase 7). Keyed
// by slug to match public.characters.slug, seeded in
// supabase/migrations/20260906154358_init.sql.
export const ROSTER: Record<string, Character> = {
  aiko: AIKO,
  mei: MEI,
  sasha: SASHA,
  priya: PRIYA,
  luna: LUNA,
  freya: FREYA,
  nova: NOVA,
  elena: ELENA,
  coral: CORAL,
  hana: HANA,
};

export const FREE_SLUGS = ["aiko", "mei", "sasha", "priya", "luna"];
export const PREMIUM_SLUGS = ["freya", "nova", "elena", "coral", "hana"];

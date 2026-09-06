# Claude.md — standing rules for this repo

Read this first, every session. Full spec is `Masterdoc.md`; the phased build
order is `Build_plan.md`. This file is the short version that must never drift:
if something here conflicts with a specific instruction mid-session, flag the
conflict to the project owner rather than silently picking one.

## What this is

A voice-driven, anime-style AI companion web app ("Project Bloom", working
title). Player talks by voice to one AI-controlled character; she has a
personality, a mood meter, and a memory. Romantic ceiling is a scripted kiss
cutscene — nothing further, ever. See Masterdoc.md §1–3 for the full pitch.

## Absolute rules — do not "helpfully" work around these

1. **No sexual content, in any form, at any point.** Not in the character's
   dialogue, not in generated assets, not as a "creative option" offered to
   the project owner. If a change request would move toward this, stop and
   say so plainly instead of implementing a softened version of it.
2. **Output moderation is never optional, never removable, never a stub.**
   Every sentence of her spoken output passes through the Groq safety-model
   check before it reaches the user. If moderation is broken, that's a
   blocking bug, not a "ship it and fix later."
3. **No API rate-limit circumvention.** One Groq account, respected limits.
   Never implement multi-account key rotation or anything designed to evade
   Groq's free-tier caps — this is against Groq's own terms and risks losing
   the whole stack at once, not just the extra capacity.
4. **Age-gate is a hard block, not a soft warning.** Under-18 (by collected
   DOB) cannot reach the app's actual functionality, full stop.
5. **VRM models must pass the license filter before use** — personification
   permission AND commercial-use permission both required (Masterdoc §7).
   Never substitute "looks right" for "licensed right."
6. **The cast is randomly assigned per account, never user-picked from a
   visual roster.** This isn't a UX preference — it's the specific thing that
   keeps the character system from being a "sort by appearance" mechanic.
   Don't add a character-select screen without checking with the project
   owner first.
7. **Anonymous-by-default, 48-hour silent deletion, Google-login-to-persist**
   is the actual privacy model. Don't add upfront signup walls or "create an
   account to continue" — that's the opposite of what's specified.

## Tech stack quick reference

Next.js (App Router) · React Three Fiber + `@pixiv/three-vrm` · shadcn/ui ·
Anime.js v4 (has a `three` adapter — use it for camera/UI motion, keep it
separate from VRM skeletal animation) · Tailwind · Groq (STT: Whisper Large v3
Turbo, LLM: current open-weight offering, TTS: Orpheus, Moderation:
`openai/gpt-oss-safeguard-20b`) · Supabase (Postgres + Auth + `pg_cron`) ·
Vercel (hosting + free Web Analytics) · Google AdSense Rewarded Ads (not
AdMob — AdMob is native-app-only) · Sentry (free tier) · GitHub.

Full reasoning for every choice is in Masterdoc §4 — read it before proposing
a stack change, since several of these were picked specifically to avoid
introducing a paid vendor or a second account.

## Known open technical questions — resolve, don't assume

- **Does Orpheus TTS return word-level timing data?** This determines whether
  captions are exact-synced or estimated. Resolve in Phase 2, document the
  answer in this repo once known.
- **Does Orpheus's current voice list have 10 distinct female-coded voices?**
  Confirmed available so far: autumn, diana, hannah (plus austin, daniel,
  troy, which read male). Audition the live list in the Groq playground
  before finalizing the roster's voice assignments — some characters may
  need to share a voice and differentiate through writing instead.

## Working conventions

- The project owner runs Claude Code in bypass-permission mode, sandboxed to
  the workspace folder, with git safety on — don't run anything destructive
  or anything that touches outside the repo.
- They cross-check any command you give them against another AI before
  running it on Windows — favor clear, ordinary commands over clever
  one-liners, since they'll be manually verified anyway.
- Run `/compact` at the end of each completed phase in `Build_plan.md`.
  Never suggest `/clear` — it loses context this project depends on.
- Build order is the 8 phases in `Build_plan.md`, in order. Don't jump ahead
  to later-phase polish while an earlier phase's exit criteria are unmet.
- Failure states (daily cap, outage, moderation deflection, connection drop)
  all route through one shared in-character "interruption" system — don't
  build three separate error UIs for what's specified as one system with
  three triggers (Masterdoc §10).

## Explicitly out of scope for v1 — do not build unless asked

Stripe/PayPal or any real payment processing · a second paid cloud STT/TTS
vendor as a fallback tier · native mobile apps · non-English support ·
accessibility work beyond word-level captions · abuse-logging dashboards ·
custom domain · final branding/naming.

If a task seems to require one of these, stop and ask rather than scoping it
in quietly.

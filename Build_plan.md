# Build_plan.md — 8 phases

Companion to `Masterdoc.md` (full spec/reasoning) and `Claude.md` (standing rules).
Build and test each phase before moving to the next. Run `/compact` after each
completed phase — never `/clear`, per the project owner's standing workflow.

---

## Phase 1 — Foundation

**Goal:** empty but real skeleton — deployed, authenticated, age-gated.

- Init Next.js (App Router) repo, push to GitHub, connect to Vercel.
- Supabase project: schema for `accounts`, `characters`, `relationship_state`
  (interest score + memory summary per account/character pair), `sessions`.
- Supabase Auth wired up with Google OAuth (not yet required to use the app —
  just working and ready).
- Age-gate flow: DOB collection on first visit, hard-block under-18 with a
  clear explanation screen. This must be genuinely unbypassable via normal
  navigation, not just a client-side check.
- Anonymous session creation (no login required) with a device-scoped ID.
- Barebones ToS + Privacy Policy pages (boilerplate per Masterdoc §11 — mark
  clearly as a starting draft, not reviewed legal text).
- **Exit criteria:** a deployed URL that enforces the age-gate, creates an
  anonymous session, and has working (if unused) Google login.

## Phase 2 — Voice pipeline core (no 3D yet)

**Goal:** prove the voice loop works before spending time on rendering.

- Groq integration: STT (Whisper Large v3 Turbo), LLM chat completion, TTS
  (Orpheus). Use a plain, ugly UI — a text/audio log is fine.
- Push-to-talk working end to end: record → transcribe → LLM reply → speak.
- Add the open-mic toggle (desktop-only for now).
- **Technical spike:** determine whether Orpheus's response includes
  word-level timing data. Document the finding either way — this decides
  whether word-by-word captions are exact-sync or estimated.
- Basic latency logging (STT time, LLM time-to-first-token, TTS time) so
  later phases can tell if something regresses.
- **Exit criteria:** a full round-trip voice conversation works, end to end,
  against one hardcoded test character/personality, with no 3D avatar yet.

## Phase 3 — 3D avatar & lip sync

**Goal:** replace the placeholder UI with the actual rendered character.

- React Three Fiber scene setup inside Next.js (`'use client'` boundaries,
  dynamic import with `ssr: false` for the canvas).
- `@pixiv/three-vrm` integration: load and render a single test VRM model.
- Source real candidate models from VRoid Hub, **filtered for both required
  license flags** (personification permission + commercial use) per
  Masterdoc §7 — do not shortlist on appearance alone.
- Wire TTS audio output to viseme-driven lip sync.
- Idle animation: breathing, blinking.
- Basic camera/lighting setup matching the bright, convention-anime direction.
- **Exit criteria:** the voice loop from Phase 2 now drives a visible,
  lip-synced 3D anime avatar on screen.

## Phase 4 — Character system & personalities

**Goal:** turn "one test character" into the real roster mechanic.

- Implement all 5 free-tier character personality profiles (Masterdoc §5.1)
  as structured system-prompt data, not hardcoded strings scattered in code.
- Random-assignment-per-account logic: on first real (non-test) account
  creation, assign one free-tier character permanently.
- Interest/mood meter: per-turn scoring logic (LLM-assessed conversation
  quality against that character's specific preferences), persisted per
  account/character pair, visible in the UI at all times.
- Meter-driven tone shifts in her responses (warmer/cooler based on score).
- Early-exit logic: conversation can end if the meter bottoms out.
- **Exit criteria:** a new account gets randomly assigned one of the 5 free
  characters, talks to her with a personality-consistent voice, and watches
  her tone visibly shift with the meter.

## Phase 5 — Persistence & memory

**Goal:** she remembers, if he lets her.

- Relationship-summary generation: after each session (or periodically),
  summarize the conversation into the persisted memory record — not raw
  transcripts.
- Feed the stored summary + interest score back into her context at the
  start of future sessions.
- Contextual Google sign-in prompt on exit ("save your progress?") — not
  upfront, not forced.
- `pg_cron` job: sweep accounts with no linked Google auth and age > 48
  hours, delete their data silently. No warning, no email.
- **Exit criteria:** close the tab as an anonymous user, come back within 48
  hours — data's still there. Sign in with Google before 48 hours — data
  persists indefinitely. Don't sign in — it's gone after 48 hours.

## Phase 6 — Safety, moderation, and failure states

**Goal:** the app can't be walked into producing content this spec forbids,
and it never shows a bare error screen.

- Integrate Groq's safety model (`openai/gpt-oss-safeguard-20b`) as an
  **output-only** moderation pass, run sentence-by-sentence as her reply
  streams (not batched on the full response).
- Flagged sentence → replaced with an in-character deflection line, never a
  raw error.
- Enable Groq Zero Data Retention (console setting, not code — verify it's
  on before this phase is marked done).
- Build the shared "cinematic interruption" system used for: daily cap
  exhausted, full outage, and moderation deflection — one system, three
  triggers, not three separate UI states.
- Connection-drop handling: silent quick reconnect attempt, fall back to the
  interruption system if it fails.
- Full-outage fallback: browser Web Speech API, wrapped in the same
  in-character framing (not presented as a quality downgrade).
- Mic-permission-denied: block entry entirely with a clear explanation
  screen.
- **Exit criteria:** try to jailbreak her in conversation — get a graceful
  in-character deflection, not explicit content and not a stack trace. Kill
  the network mid-conversation — get a cinematic moment, not a crash.

## Phase 7 — Body animation, kiss cutscene, monetization

**Goal:** the full experience, including its one romantic payoff and its
business model.

- Body gesture animations reacting to mood (arms crossed, leaning in,
  turning away), layered on top of the existing idle/lip-sync system.
- Player's own VRM avatar, matching art direction — rendered only for the
  kiss cutscene, not during normal conversation.
- Custom hand-keyframed (Blender) two-character kiss animation, triggered
  when interest crosses the threshold, paired with a sound effect and her
  voiced reaction line. Treat this as animation work with its own timeline,
  not a quick asset drop-in.
- Implement the 5 premium characters (same process as Phase 4, extended).
- Google AdSense **Rewarded Ads** integration (confirm this is the Rewarded
  Ads unit type, not standard display ads, and not AdMob).
- Ad-unlock logic: watching an ad grants a time-windowed unlock (extra usage
  + premium character access) tracked per Google account; remaining time
  persists across sessions; no daily cap on re-watches; what's unlocked is
  shown before the ad, not hidden.
- Mobile responsive pass: enforce push-to-talk-only on mobile (no open-mic
  toggle there), verify performance of the 3D scene on mobile GPUs.
- **Exit criteria:** a player can build enough interest to trigger the kiss
  scene, and a capped-out free user can watch an ad to unlock premium
  characters/extra usage.

## Phase 8 — Polish & launch prep

**Goal:** ready for a friends-only beta.

- Visual pass: bright, convention-anime UI styling throughout (not just the
  character models) using shadcn theming + Anime.js v4 for UI/camera motion.
- Leave/reset button: end a conversation, or restart the relationship fresh,
  from a persistent UI control.
- Wire in Vercel Web Analytics (free tier) and Sentry (free tier).
- Full QA pass: desktop Chrome/Edge/Safari/Firefox, mobile Safari (iOS) and
  Chrome (Android) — pay particular attention to mic permission flows and
  audio-context unlock behavior on iOS.
- Verify the 48-hour deletion job actually runs on schedule in production
  (not just locally).
- Verify Groq Zero Data Retention is confirmed active in the production
  account.
- **Exit criteria:** v1-alpha is feature-complete against Masterdoc.md,
  self-tested, and ready to hand to friends for the v1-beta round per the
  project owner's standard rollout process.

---

## After Phase 8

Not part of v1 build — flagged here so they aren't lost:

- Public launch decision (currently friends-only by design)
- Real payment processing (Stripe/PayPal) to replace/supplement ad-gating
- Custom domain
- Abuse logging/monitoring
- Additional languages, accessibility work beyond captions
- Final branding pass (name/logo/palette — "Project Bloom" is a placeholder)

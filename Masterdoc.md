# Masterdoc — "Project Bloom" (working title, branding TBD)

A voice-driven, anime-style AI companion web app. The player speaks aloud to one
AI-controlled character at a time; she listens, responds in her own voice, remembers
him across visits, and reacts to how he treats her. The romantic ceiling is a
kiss — nothing further, ever.

This doc is the single source of truth for what we're building and why. `Build_plan.md`
breaks it into 8 build phases. `Claude.md` is the standing ruleset Claude Code should
load every session.

---

## 1. Vision

- Real-time, two-way voice conversation with an anime-style 3D character (VRM avatar),
  rendered in the browser with three.js.
- One character active at a time. She's drawn randomly from a small cast when the
  player's account is created, then fixed for that account going forward — no
  browsing a roster by appearance.
- An interest/mood meter tracks how the conversation is going. It rises with good
  conversation, falls with rudeness or boredom, and can end a session early if it
  bottoms out. It gates her warmth, and eventually gates the one romantic
  milestone the game has: a kiss.
- She remembers. Conversations, tone, how he's treated her — carried forward across
  sessions for any player who signs in, via a running relationship summary + her
  current interest score.
- Public web app, free to use, monetized later via optional ad-gated premium access
  — no payment processing in v1.

## 2. Design principles that are not up for renegotiation

These came out of how this project started and why it changed shape. Restate them
here so nobody "clarifies" them away in a later prompt to Claude Code:

1. **No sexual content, ever.** The romantic ceiling is a kiss. No exceptions, no
   fade-to-black-then-imply, no "the model already refused so we hardcoded it
   instead." This is enforced by moderation (§9), not just by the character prompt.
2. **No race-sorting mechanic.** The cast is diverse but the game is never organized
   around picking a character by appearance/race. Assignment is random, once, per
   account.
3. **18+ only, hard-enforced.** Date of birth collected at signup; under-18 is
   blocked outright, not soft-warned.
4. **No API rate-limit circumvention.** We use one Groq account and respect its
   terms. Extra usage comes from ads or eventual paid tiers, never from farming
   multiple accounts.
5. **VRM models must be license-checked**, not just visually approved (§7).

## 3. Core loop

1. Player opens the app → age-gate (DOB) → anonymous session starts immediately
   (no forced signup).
2. If new account: one of the 5 free-tier characters is randomly assigned. She's
   his for as long as the account exists.
3. Conversation: player speaks (push-to-talk or open-mic toggle, desktop only —
   mobile is push-to-talk only) → transcribed → sent to her personality-specific
   LLM context, along with her current interest score and relationship memory →
   she responds → spoken aloud + lip-synced + captioned word-by-word.
4. Her interest score moves based on conversation quality each turn. It's visible
   on screen at all times.
5. High enough interest → a scripted kiss cutscene becomes available (two-character
   animation + sound, not AI-generated).
6. On leaving without signing in: all data silently deleted after 48 hours.
   Signing in with Google (prompted contextually on exit, not upfront) makes it
   permanent.
7. Daily free usage is capped by Groq's free-tier limits. Watching a rewarded ad
   extends usage and/or temporarily unlocks the 5 premium characters for a set
   window; unlimited re-watches allowed; remaining unlocked time persists across
   sessions.

## 4. Tech stack (locked)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Pairs natively with Vercel hosting |
| 3D rendering | Three.js via React Three Fiber + drei | Client-side only; needs `'use client'` boundaries, no SSR for the canvas |
| Avatar format | VRM via `@pixiv/three-vrm` | See §7 for sourcing/licensing |
| UI components | shadcn/ui | Buttons, dialogs, settings, meter UI |
| Motion | Anime.js v4 | Has a built-in three.js adapter (`animejs/adapters/three`) — use it for camera/UI motion, keep VRM skeletal animation separate |
| Styling | Tailwind CSS | Bundled with shadcn |
| STT | Groq — Whisper Large v3 Turbo | Free tier: 20 RPM / 2,000 RPD / 7,200 audio-sec per hour |
| LLM | Groq — open-weight model (e.g. current Llama/GPT-OSS offering) | Free tier: 30 RPM / 14,400 RPD / 6,000 TPM |
| TTS | Groq — Orpheus (`canopylabs/orpheus-v1-english`) | Preview status; free tier is roughly 100 req/day — the actual bottleneck of the whole app |
| Moderation | Groq safety model (`openai/gpt-oss-safeguard-20b`) | Output-side only, see §9 |
| Fallback voice (full outage only) | Browser Web Speech API | **Decision**: we are NOT adding a second paid cloud vendor as a middle fallback tier. When Groq's daily cap is hit, the user gets the in-character "she's asleep/away" cinematic message (§10). True last-resort (Groq totally unreachable) uses the browser's free built-in speech tools so the app doesn't hard-fail. Two tiers, not three — simpler, still $0. |
| Auth + DB | Supabase (Postgres, free tier) | Google OAuth via Supabase Auth; `pg_cron` for the 48h deletion sweep |
| Hosting | Vercel (Hobby/free) | Free `*.vercel.app` domain for now; custom domain later |
| Ads | Google AdSense — **Rewarded Ads** unit | NOT AdMob (AdMob is native-app-only, doesn't work on a website) |
| Analytics | Vercel Web Analytics (free, bundled) | Cookieless, good enough for session/drop-off tracking |
| Error monitoring | Sentry (free tier) | |
| Repo | GitHub | Native Vercel git deploy |

**Cost reality check:** Groq's TTS free tier (~100 req/day) is the real ceiling on
this whole product, not the LLM or STT limits, which are far more generous. Every
capacity conversation should start there.

## 5. Character system

### 5.1 Roster

Randomly assigned once per account, then fixed. Free tier (5):

1. **Aiko** — genki, high-energy, playful, loves puns and games. Warms fast to
   attentive/funny players, cools fast on flatness or dismissiveness.
2. **Mei** — quiet, artistic, reserved (kuudere). Slow to trust, rewards patience
   and sincerity, shuts down on rushing or arrogance.
3. **Sasha** — confident, athletic, competitive, tsundere energy. Responds to
   banter and wit, turned off by neediness or over-eagerness.
4. **Priya** — warm, emotionally perceptive, genuinely curious about the player.
   Wants real conversation; bores quickly of surface-level lines.
5. **Luna** — dreamy, a bit chaotic, into music and stargazing. Responds to
   curiosity and creativity, checks out if the player is dismissive or boring.

Premium tier (5, ad-unlocked):

6. **Freya** — sharp-tongued, intellectual, treats conversation like sparring.
   Rewards cleverness hard, punishes blandness hard.
7. **Nova** — bubbly gamer-girl, thrives on inside jokes and teasing. Interest
   builds through humor/persistence more than smoothness.
8. **Elena** — poised, "class president" energy. Responds to respect and
   thoughtfulness, crudeness costs a lot.
9. **Coral** — free-spirited, adventurous, spontaneous. Bored by hesitation,
   rewards confidence and playfulness.
10. **Hana** — shy, gentle, the cast's slow burn. Needs the most patience, most
    rewarding arc once earned.

Each needs: a full written personality/backstory doc (feeds her system prompt), a
VRM model matching her description, and a Groq Orpheus voice assignment.

**Open item:** Orpheus's current English voice list is small (confirmed:
autumn, diana, hannah, austin, daniel, troy). We may not get 10 distinct
female-coded voices — audition the full current list in the Groq playground
before finalizing assignments, and expect to differentiate some characters by
writing rather than a fully unique voice each.

### 5.2 Interest/mood meter

- Numeric score per player-character pair, persisted with the relationship memory.
- Moves each turn based on an LLM-assessed read of conversation quality (tone,
  effort, respect, wit — per character's own preferences from §5.1).
- Visible to the player at all times, not hidden.
- Gates her warmth/tone in real time.
- Can bottom out and end the conversation early (she "leaves" — not literally
  the app closing, but the scene ending — if the player is rude or boring enough).
- Crossing a high threshold unlocks the kiss cutscene as an available action.

### 5.3 Memory

- Persisted only for signed-in (Google OAuth) accounts.
- Not raw transcripts — a running relationship summary ("how he's treated her,"
  key facts she'd remember, current interest score) that's rebuilt into her
  context each session.
- Anonymous players get the same experience for up to 48 hours, then everything
  is silently deleted (no warning) unless they've signed in with Google by then.

## 6. Voice pipeline & UX

- STT → LLM → TTS, cascaded (not speech-to-speech) — Groq's free tier is
  built around cascaded model access, and this keeps every layer swappable.
- Everything streams. TTS output is moderated **sentence-by-sentence as
  generated**, not batched on the full reply — this is the compromise between
  "output must be guardrailed" and "latency must stay low." A per-sentence check
  adds at most one sentence's worth of delay if something needs to be caught.
- Realistic target latency: ~700ms–1s round trip is good; sub-300ms is not
  achievable in a browser with cloud APIs — do not let this regress into a
  quoted target during build.
- Push-to-talk and open-mic toggle on desktop. Mobile: push-to-talk only
  (iOS Safari's mic/autoplay policies make always-listening unreliable there).
- Live captions, word-by-word, synced to her speech (karaoke-style highlighting).
  **Technical spike required early**: verify whether Orpheus returns word-level
  timing data. If not, fall back to estimated timing (avg speaking rate) rather
  than promising exact sync.
- Interest meter and a visible "leave / reset conversation" button are always
  on screen.
- Mic permission denied → block entry entirely with an explanation screen (no
  text-chat fallback).
- Connection drop mid-conversation → attempt a quick silent reconnect first;
  if that fails, fall back to the same in-character cinematic interruption used
  for cap-exhaustion (§10), rather than a distinct error state.

## 7. Avatar, animation, and licensing

- Player character: also anime-style VRM, matching art direction — but only
  rendered on-screen for the kiss cutscene. During normal conversation the
  player is camera-POV/voice-only.
- Her character: full animation scope — idle breathing/blinking, viseme-driven
  lip sync, body gestures reacting to her current mood (crossing arms, leaning
  in, turning away), plus the scripted kiss cutscene.
- **Kiss cutscene**: realistic pre-made two-character kiss animations don't
  exist as downloadable VRM assets. This will be a custom, hand-keyframed
  animation (Blender), intentionally simpler than mocap-quality for v1, paired
  with a sound effect + her voiced reaction line. Do not scope this as "find an
  asset" — it's an animation task.
- **Model sourcing — VRoid Hub, with a mandatory license filter.** VRoid Hub
  models each carry individual license flags. Two matter specifically here:
  - **Personification / characterization permission** — whether another entity
    (our LLM) is allowed to "perform as" this character. Required: yes.
  - **Commercial use** — VRoid Hub explicitly defines commercial use to include
    *advertising*, which this app has from day one via AdSense. Required: yes.
    **Staged requirement, decided 2026-09-07**: during the closed, friends-only
    beta, **individual commercial use: Allow is sufficient** — corporate use
    may be Disallow. Before any wider/public launch, this reverts to requiring
    **both individual and corporate: Allow**, and every beta-sourced model
    must be re-checked (or replaced) against that stricter bar at that point.
    Don't let this exception silently carry forward past beta.
  Do not select a model on appearance alone — filter for both flags first, then
  choose from what's left.
- Visual direction overall: **bright, convention-anime aesthetic** — not moody
  or photoreal. This applies to the whole UI, not just the character models.

## 8. Monetization (v1)

- No payment processing in v1. No Stripe/PayPal.
- Free tier: 5 characters, Groq free-tier usage caps.
- Premium: the other 5 characters + higher usage caps, unlocked temporarily by
  watching a Google AdSense **Rewarded Ad** — this is the correct product for a
  website (AdMob is native-app-only and doesn't apply here).
  **Staged exception, decided 2026-09-07**: AdSense site verification is
  pending (3-4 weeks per the project owner's region). **Adsterra** is
  registered as a temporary provisional network for the beta in the
  meantime, under two hard constraints: (1) Adsterra's per-site **"Adult
  ads" toggle must stay OFF** — non-negotiable, this is the only reason
  Adsterra is acceptable at all given Claude.md rule #1; (2) Adsterra has no
  confirmed Rewarded Video ad unit, so **the actual watch-to-unlock mechanic
  described below cannot be built on Adsterra as specified** — whatever
  ships during this window (e.g. a Native Banner/Social Bar placement) is a
  placeholder, not the real premium-unlock feature. Popunder is excluded
  entirely (disruptive UX, mismatched with the "bright, convention-anime,
  polished" direction). Revert to AdSense once verification clears, and
  build the actual rewarded-unlock mechanic against AdSense then — don't
  let a Popunder/interstitial substitute silently become the permanent
  implementation. Site registered under category "Social" (chosen honestly,
  not to maximize CPM).
- Unlock duration is time-windowed (minutes/hours/days — exact number TBD in
  build). Tracked per Google account, not per browser/device.
- Remaining unlocked time persists if the user closes the tab and returns.
- No cap on how many times per day someone can re-watch to re-unlock.
- What premium unlocks is shown up front, not discovered.
- This is understood as a stopgap: real payment processing is a post-v1
  decision once there's traffic worth monetizing properly.

## 9. Safety & moderation

- **Output-side moderation only** (per explicit decision), using Groq's hosted
  safety model. No input-side filter. This means the LLM sees raw user input —
  the backstop is entirely on what gets shown/spoken, so output moderation is
  not optional and not skippable in any build phase.
- Moderation runs sentence-by-sentence as her reply streams, not on the full
  response — preserves low latency, catches violations within one sentence
  instead of the whole reply.
- If a sentence is flagged: replace it with an in-character deflection line
  (she changes the subject), never a raw error message.
- No logging of flagged/blocked attempts in v1 (explicitly declined — deemed
  overkill for this stage).
- Groq **Zero Data Retention** should be enabled account-wide from day one,
  given how personal these conversations are. This is a self-serve setting in
  the Groq console, not a code change.
- This app began as a request for explicit content and was deliberately
  redirected to a non-sexual kiss-ceiling design. Expect users to test that
  boundary. The moderation layer is what keeps the deployed app matching this
  spec, not the character's system prompt alone — a strong system prompt is
  the floor, not the strategy.

## 10. Failure states & messaging

All failure states are handled in-character/cinematically, not as plain error
text, using one shared "interruption" system:

- Daily Groq cap exhausted → cinematic in-character moment (e.g., she "falls
  asleep" / "steps away"), not a bare "come back tomorrow."
- Full outage (Groq unreachable) → same system, backed by the browser's free
  Web Speech API so the app degrades gracefully instead of hard-failing.
- Connection drop → quick silent reconnect attempt, then the same interruption
  system if that fails.
- Blocked/moderated content → in-character deflection line, not an error.

## 11. Accounts, legal, privacy

- Anonymous by default. Google sign-in (via Supabase Auth) is offered
  contextually when the user tries to leave — not required upfront.
- No Google sign-in within 48 hours → all data silently deleted. No warning,
  no reminder email.
- Age-gate: collect date of birth at signup, hard-block anyone under 18 from
  entering at all (not a soft warning, not a locked landing page — full block).
- ToS acceptance required at signup.
- Basic ToS + Privacy Policy boilerplate to be drafted during build (clearly
  not legal advice — a reasonable starting point, not a substitute for review
  before this scales).
- No accessibility work beyond the planned word-level captions for v1
  (explicitly out of scope — revisit later if the app grows).

## 12. Rollout plan

1. Build to v1-alpha per `Build_plan.md`'s 8 phases.
2. Self-test, log issues.
3. Fix, release v1-beta to **friends only** — not public yet, despite the
   original "everyone on the internet" goal. Public launch is a later decision
   once the app is proven with a small trusted group.
4. Collect friend feedback, fix, release v1-stable.
5. Public launch decision + custom domain + real monetization are all
   post-v1-stable conversations.

## 13. Explicitly deferred / out of scope for v1

- Real payment processing (Stripe/PayPal)
- Second cloud STT/TTS vendor as a middle fallback tier (consolidated to
  Groq + browser-native, see §4)
- Native mobile apps (this is a mobile-responsive web app, not an App
  Store/Play Store product)
- Additional languages (English only)
- Accessibility beyond captions
- Analytics beyond Vercel's free tier
- Abuse logging/monitoring dashboards
- Custom domain (using free Vercel subdomain)
- Final branding (name, logo, palette) — placeholder name "Project Bloom" used
  throughout these docs; a real branding pass happens separately

## 14. Known risks to flag early in build

- Orpheus TTS free tier (~100 req/day) is the tightest constraint in the
  entire stack — size expectations accordingly, especially for a friends beta.
- Word-level caption sync depends on Orpheus exposing timing data we haven't
  confirmed yet.
- VRoid Hub license-compliant, art-direction-matching, 10-character-worthy
  models may take real search time to find — don't undersize this task.
- The kiss cutscene is custom animation work, not integration work.
- Orpheus's current voice list may not stretch to 10 distinct female-coded
  voices — confirm before finalizing the roster's voice assignments.

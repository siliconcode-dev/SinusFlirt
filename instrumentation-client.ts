import * as Sentry from "@sentry/nextjs";

// No-ops safely without a DSN (Phase 8 plan: scaffolded now, DSN wired in
// once a Sentry project exists — see NEXT_PUBLIC_SENTRY_DSN).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

import { AmbientBackground } from "@/components/ambient-background";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <AmbientBackground />
      <div className="max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-primary uppercase">
          Session started
        </span>
        <h1 className="font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          You&apos;re in.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Your anonymous session is live. The actual voice conversation with
          your companion ships in the next build phase — for now, this
          confirms the foundation works: age-gate, session, and sign-in.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <GoogleSignInButton />
          <p className="text-xs text-muted-foreground">
            Optional — without signing in, your session is remembered for
            48 hours only.
          </p>
        </div>
      </div>
      <footer className="absolute bottom-6 flex gap-4 text-xs text-muted-foreground">
        <a href="/legal/terms" className="underline underline-offset-4">
          Terms
        </a>
        <a href="/legal/privacy" className="underline underline-offset-4">
          Privacy
        </a>
      </footer>
    </main>
  );
}

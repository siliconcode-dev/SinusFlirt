import Link from "next/link";
import { AmbientBackground } from "@/components/ambient-background";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AdsterraNativeBanner } from "@/components/ads/adsterra-native-banner";
import { AdsterraSocialBar } from "@/components/ads/adsterra-social-bar";
import { AdsterraBanner300x250 } from "@/components/ads/adsterra-banner-300x250";

export default function Home() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-16 text-center">
      <AmbientBackground />
      <div className="max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Logo className="mx-auto mb-2 h-28 w-auto" />
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-primary uppercase">
          Session started
        </span>
        <h1 className="font-heading text-4xl font-semibold text-foreground sm:text-5xl">
          You&apos;re in.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Your anonymous session is live and your companion is waiting.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4">
          <Button asChild size="lg">
            <Link href="/voice-lab">Start talking</Link>
          </Button>
          <GoogleSignInButton />
          <p className="text-xs text-muted-foreground">
            Sign-in is optional — without it, your session is remembered for
            48 hours only.
          </p>
        </div>
        <div className="mt-10">
          <AdsterraNativeBanner />
        </div>
        <div className="mt-6 flex justify-center">
          <AdsterraBanner300x250 />
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
      <AdsterraSocialBar />
    </main>
  );
}

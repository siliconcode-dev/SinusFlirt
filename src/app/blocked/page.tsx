import { AmbientBackground } from "@/components/ambient-background";
import { BezelCard } from "@/components/bezel-card";
import { Logo } from "@/components/logo";

export default function BlockedPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-16">
      <AmbientBackground />
      <Logo className="mb-6 h-20 w-auto animate-in fade-in duration-700" />
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BezelCard>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            SinusFlirt is for adults only
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Based on the date of birth you entered, you don&apos;t meet the
            18+ age requirement to use this app. This isn&apos;t something
            you can bypass from here — there&apos;s no guest or workaround
            path into the rest of the site.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            If you believe this is a mistake, you&apos;re welcome to come
            back once you turn 18.
          </p>
        </BezelCard>
      </div>
    </main>
  );
}

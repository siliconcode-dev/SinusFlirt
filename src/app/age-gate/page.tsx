import { AmbientBackground } from "@/components/ambient-background";
import { BezelCard } from "@/components/bezel-card";
import { AgeGateForm } from "@/components/age-gate-form";

export default function AgeGatePage() {
  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center px-4 py-16">
      <AmbientBackground />
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <BezelCard>
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-primary uppercase">
            Before we begin
          </span>
          <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
            Just need to confirm your age
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            SinusFlirt is an 18+ experience. We ask for your date of birth to
            keep it that way — no exceptions.
          </p>
          <div className="mt-8">
            <AgeGateForm />
          </div>
        </BezelCard>
      </div>
    </main>
  );
}

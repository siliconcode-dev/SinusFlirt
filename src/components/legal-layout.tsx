import { AmbientBackground } from "@/components/ambient-background";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-[100dvh] px-4 py-20">
      <AmbientBackground />
      <article className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
          <strong className="font-heading font-medium">Draft, not legal advice.</strong>{" "}
          This is a reasonable starting point written for launch, not
          reviewed by a lawyer. Treat it as a placeholder to revisit before
          any wider release.
        </div>
        <h1 className="font-heading text-3xl font-semibold text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </div>
      </article>
    </main>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-heading text-lg font-semibold text-foreground">
        {heading}
      </h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

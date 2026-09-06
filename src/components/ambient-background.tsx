export function AmbientBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-32 -left-24 size-[28rem] rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute top-1/3 -right-32 size-[24rem] rounded-full bg-accent/20 blur-3xl" />
      <div className="absolute -bottom-40 left-1/4 size-[26rem] rounded-full bg-secondary/25 blur-3xl" />
    </div>
  );
}

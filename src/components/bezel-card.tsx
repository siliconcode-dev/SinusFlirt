import { cn } from "@/lib/utils";

export function BezelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="rounded-[2rem] bg-foreground/5 p-1.5 ring-1 ring-foreground/10">
      <div
        className={cn(
          "rounded-[calc(2rem-0.375rem)] bg-card p-8 shadow-[0_1px_1px_rgba(255,255,255,0.4)_inset,0_20px_50px_-20px_rgba(136,19,55,0.25)] sm:p-10",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

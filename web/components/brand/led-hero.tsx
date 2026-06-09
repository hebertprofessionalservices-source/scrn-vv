import { cn } from "@/lib/utils";

export function LedHero({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden bg-navy-900", className)}>
      <div className="absolute inset-0 bg-led-dots opacity-[0.08] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 py-12">{children}</div>
    </section>
  );
}

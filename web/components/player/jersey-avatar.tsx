import { cn } from "@/lib/utils";

export function JerseyAvatar({
  jersey,
  primary,
  secondary,
  size = 40,
}: {
  jersey: string | null;
  primary?: string | null;
  secondary?: string | null;
  size?: number;
}) {
  const bg = primary ?? "var(--color-navy-700)";
  const fg = secondary ?? "var(--color-chrome-100)";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-display font-bold"
      )}
      style={{
        background: bg,
        color: fg,
        width: size,
        height: size,
        fontSize: size * 0.42,
      }}
    >
      {jersey ?? "?"}
    </span>
  );
}

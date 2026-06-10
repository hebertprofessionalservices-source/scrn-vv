import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Team logo in a circular frame. Logos are mixed aspect ratios, so the
 * image is contained inside a padded circle rather than cropped.
 */
export function TeamLogo({
  src,
  size,
  className,
}: {
  src: string | null;
  size: number;
  className?: string;
}) {
  if (!src) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-chrome-100/5 ring-1 ring-chrome-500/20",
        className,
      )}
      style={{ width: size, height: size, padding: Math.max(2, size * 0.08) }}
    >
      <Image
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full rounded-full object-contain"
        unoptimized
      />
    </span>
  );
}

"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { classificationLabel } from "@/lib/team-format";

const CLASSES = [
  "7A", "6A", "5A", "4A", "3A", "2A", "1A",
  "MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A",
];

export function ClassFilter() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = params.get("class");

  function setClass(c: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (c) sp.set("class", c); else sp.delete("class");
    router.push(`${pathname}?${sp.toString()}` as any);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="cursor-pointer" onClick={() => setClass(null)}>
        <Badge variant={active === null ? "default" : "outline"}>All</Badge>
      </button>
      {CLASSES.map((c) => (
        <button key={c} className="cursor-pointer" onClick={() => setClass(c)}>
          <Badge variant={active === c ? "default" : "outline"}>{classificationLabel(c)}</Badge>
        </button>
      ))}
    </div>
  );
}

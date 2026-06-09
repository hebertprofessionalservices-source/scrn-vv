"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const CLASSES = ["1A","2A","3A","4A","5A","6A","7A"];

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
      <button onClick={() => setClass(null)}>
        <Badge variant={active === null ? "default" : "outline"}>All</Badge>
      </button>
      {CLASSES.map((c) => (
        <button key={c} onClick={() => setClass(c)}>
          <Badge variant={active === c ? "default" : "outline"}>{c}</Badge>
        </button>
      ))}
    </div>
  );
}

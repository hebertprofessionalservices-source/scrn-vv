"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","DB","K","P","ATH"];

export function PositionFilter() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = params.get("pos");

  function setPos(p: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (p) sp.set("pos", p); else sp.delete("pos");
    router.push(`${pathname}?${sp.toString()}` as any);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="cursor-pointer" onClick={() => setPos(null)}>
        <Badge variant={active === null ? "default" : "outline"}>All</Badge>
      </button>
      {POSITIONS.map((p) => (
        <button key={p} className="cursor-pointer" onClick={() => setPos(p)}>
          <Badge variant={active === p ? "default" : "outline"}>{p}</Badge>
        </button>
      ))}
    </div>
  );
}

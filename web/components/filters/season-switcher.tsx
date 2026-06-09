"use client";
import { useRouter } from "next/navigation";

export function SeasonSwitcher({ current, options }: { current: string; options: string[] }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => {
        document.cookie = `season=${e.target.value}; path=/; max-age=${60 * 60 * 24 * 365}`;
        router.refresh();
      }}
      className="bg-navy-700 border border-chrome-500/20 rounded px-2 py-1 text-xs"
    >
      {options.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}

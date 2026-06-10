"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { buildSearchIndex, type SearchEntry } from "@/lib/search-index";
import type { Player, Team } from "@/lib/types";

export function CommandPalette({
  teams,
  players,
}: {
  teams: Team[];
  players: Player[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const fuse = useMemo(() => buildSearchIndex(teams, players), [teams, players]);
  const results = useMemo<SearchEntry[]>(
    () =>
      query.trim() ? fuse.search(query, { limit: 25 }).map((r) => r.item) : [],
    [fuse, query],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && (key === "f" || key === "k")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-lg">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search teams or players…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {query ? "No results" : "Type to search"}
            </CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((r) => (
                  <CommandItem
                    key={`${r.kind}:${r.id}`}
                    onSelect={() => {
                      setOpen(false);
                      router.push(r.href as any);
                    }}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-2 text-xs text-chrome-500">
                      {r.subtitle}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

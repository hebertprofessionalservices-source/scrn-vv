"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/upcoming", label: "Upcoming Games" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/matchup", label: "Match Up" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  function openSearch() {
    setOpen(false);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true }));
  }

  return (
    <div className="md:hidden">
      <button
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer p-2 text-chrome-100"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          {open ? (
            <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M3 5.5h16M3 11h16M3 16.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>
      {open && (
        <nav className="absolute left-0 right-0 top-full z-50 border-b border-chrome-500/15 bg-navy-900/95 backdrop-blur px-4 py-2 flex flex-col font-display text-sm uppercase tracking-wide">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href as any}
              onClick={() => setOpen(false)}
              className="py-3 border-b border-chrome-500/10 last:border-b-0 hover:text-crimson-500"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={openSearch}
            className="cursor-pointer py-3 text-left uppercase tracking-wide hover:text-crimson-500"
          >
            Search
          </button>
        </nav>
      )}
    </div>
  );
}

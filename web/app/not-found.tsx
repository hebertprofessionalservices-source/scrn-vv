import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-6xl text-crimson-500">404</h1>
      <p className="mt-4 text-chrome-300">No team, player, or game by that name.</p>
      <Link
        href="/"
        className="mt-6 inline-block px-4 py-2 rounded border border-crimson-500 text-crimson-500 hover:bg-crimson-500 hover:text-white transition-colors"
      >
        Back to dashboard
      </Link>
    </main>
  );
}

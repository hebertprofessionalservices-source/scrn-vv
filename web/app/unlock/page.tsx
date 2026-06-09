export default async function UnlockPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; err?: string; admin?: string }> }) {
  const params = await searchParams;
  const isAdmin = params.admin === "1";
  return (
    <main className="min-h-screen bg-led-dots bg-cover flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-navy-900/80 backdrop-blur p-8 border border-chrome-500/20">
        <h1 className="font-display text-3xl text-chrome-100 mb-2">Varsity Voices</h1>
        <p className="text-chrome-300 text-sm mb-6">
          {isAdmin ? "Editorial controls — host only." : "Authorized SCRN staff only."}
        </p>
        <form action="/api/unlock" method="post" className="space-y-4">
          <input type="hidden" name="next" value={params.next ?? "/"} />
          {isAdmin && <input type="hidden" name="admin" value="1" />}
          <input
            type="password"
            name="password"
            autoFocus
            required
            placeholder={isAdmin ? "Admin password" : "Site password"}
            className="w-full px-4 py-3 rounded-lg bg-navy-700 text-chrome-100 placeholder:text-chrome-500 border border-chrome-500/20 focus:border-crimson-500 outline-none"
          />
          {params.err && (
            <p className="text-sm text-crimson-500">Incorrect password.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-chrome-100 font-display tracking-wide"
          >
            UNLOCK
          </button>
        </form>
      </div>
    </main>
  );
}

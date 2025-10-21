// app/TeamsBoard.tsx — Server Component (simplified)
import React from "react";

type ApiResponse = {
  teams: { team_name: string; players: string[] }[];
};

export default async function TeamsBoard() {
  const res = await fetch(
    "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod/teams",
    {
      headers: { Authorization: `Bearer ${process.env.API_KEY}` },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return (
      <div className="min-h-[60vh] grid place-items-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Teams unavailable</h2>
          <p className="mt-1 text-red-400">Status: {res.status}</p>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as ApiResponse;
  const teams = data?.teams ?? [];

  return (
    <section className=" w-full bg-black text-white">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold uppercase tracking-wider">
            Teams Board <span className="text-red-500">• Urodziny Asi</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Dwóch graczy na zespół. Będzie strasznie. Powodzenia
          </p>
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teams.map((team) => (
            <li key={team.team_name} className="">
              <div className="h-full rounded-xl border border-red-800/40 bg-zinc-950 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold uppercase tracking-wide">
                    {team.team_name}
                  </h3>
                  <span className="rounded-md border border-red-800/40 bg-red-900/20 px-2 py-0.5 text-xs text-red-200">
                    {team.players.length}/2
                  </span>
                </div>

                <div className="space-y-2">
                  {(team.players || []).slice(0, 2).map((m, i) => (
                    <div
                      key={`${team.team_name}-${m}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-red-700/60 text-red-400 text-sm">🦇</span>
                      <span>{m}</span>
                    </div>
                  ))}

                  {Array.from({ length: Math.max(0, 2 - (team.players?.length || 0)) }).map((_, i) => (
                    <div
                      key={`${team.team_name}-empty-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2 text-zinc-500"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 text-sm">☠️</span>
                      <span className="italic">empty</span>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}

          {/* If there are less than 7 teams, show empty placeholders to keep grid balanced */}
          {Array.from({ length: Math.max(0, 7 - teams.length) }).map((_, i) => (
            <li key={`placeholder-${i}`} className="">
              <div className="h-full rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-5 text-zinc-500">
                <h3 className="text-lg font-semibold">— Empty Team —</h3>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-sm">☠️</span>
                    <span className="italic">empty</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-sm">☠️</span>
                    <span className="italic">empty</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import type { DrawPlan, Team } from "../lib/api";
import { describeSizes, plural } from "../lib/format";

type Props = {
  teams: Team[];
  plan: DrawPlan | null;
};

const PLACEHOLDER_TEAMS = 6;

export default function TeamsBoard({ teams, plan }: Props) {
  const subtitle =
    plan && plan.teams_of_2 !== null && plan.teams_of_3 !== null
      ? `${plural(plan.players, "gracz", "gracze", "graczy")} • ${plural(plan.team_count, "drużyna", "drużyny", "drużyn")} (${describeSizes(plan.teams_of_2, plan.teams_of_3)})`
      : "Drużyny po 2–3 osoby. Będzie strasznie. Powodzenia";

  return (
    <section className="w-full text-white">
      <div className="mx-auto max-w-5xl px-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold uppercase tracking-wider">
            Teams Board <span className="text-red-500">• Urodziny Asi</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{subtitle}</p>
          {plan?.error && <p className="mt-1 text-sm text-amber-400">⚠️ {plan.error}</p>}
        </header>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
          {teams.map((team) => {
            const players = team.players ?? [];
            const emptySlots = Math.max(0, 2 - players.length);
            return (
              <li key={team.team_name}>
                <div data-testid="team-card" className="w-[230px] min-h-[190px] rounded-xl border border-red-800/40 bg-zinc-950 p-5 shadow-sm flex flex-col">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold uppercase tracking-wide">{team.team_name}</h3>
                    <span className="rounded-md border border-red-800/40 bg-red-900/20 px-2 py-0.5 text-xs text-red-200">
                      {players.length} os.
                    </span>
                  </div>

                  <div className="space-y-2">
                    {players.map((m, i) => (
                      <div
                        key={`${team.team_name}-${m}-${i}`}
                        className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full ring-red-700/60 ring-2 text-red-700/80 text-sm">
                          🎃
                        </span>
                        <span>{m}</span>
                      </div>
                    ))}

                    {Array.from({ length: emptySlots }).map((_, i) => (
                      <div
                        key={`${team.team_name}-empty-${i}`}
                        className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2 text-zinc-500"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-zinc-500 text-sm">
                          ☠️
                        </span>
                        <span className="italic">empty</span>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}

          {/* Before the draw starts, keep the grid balanced with placeholders */}
          {teams.length === 0 &&
            Array.from({ length: PLACEHOLDER_TEAMS }).map((_, i) => (
              <li key={`placeholder-${i}`}>
                <div className="w-[230px] h-full rounded-xl border border-dashed border-zinc-800 bg-zinc-950 p-5 text-zinc-500">
                  <h3 className="text-lg font-semibold">— Drużyna —</h3>
                  <div className="mt-4 space-y-2">
                    {[0, 1].map((j) => (
                      <div key={j} className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-sm">
                          ☠️
                        </span>
                        <span className="italic">empty</span>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}

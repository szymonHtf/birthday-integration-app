"use client";

import { useEffect, useState } from "react";
import { api, type LeaderboardResponse } from "../lib/api";
import { formatDuration, formatPoints } from "../lib/format";
import LeaderboardTable from "../components/LeaderboardTable";
import type { Identity } from "./useIdentity";

const POLL_MS = 5000;

/** Stage "finished": the team's result and the full ranking on the guest's phone. */
export default function Finale({ identity }: { identity: Identity }) {
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await api.leaderboard();
        if (alive) setBoard(next);
      } catch (e) {
        console.error("Leaderboard poll failed:", e);
      }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const mine = board?.teams.find((t) => t.team_name === identity.team);

  return (
    <section className="w-full bg-black text-red-100 min-h-screen flex flex-col items-center p-2 gap-4">
      <div className="w-full max-w-xl text-center border border-red-800/40 bg-zinc-950 rounded-2xl p-4 shadow-[0_0_40px_rgba(220,38,38,0.1)]">
        <h1 className="text-xl font-extrabold uppercase tracking-widest text-red-500 mb-2">🏆 Koniec gry 🏆</h1>
        {mine ? (
          <>
            <p className="text-3xl font-black text-red-200" data-testid="finale-rank">
              {mine.rank === 1 ? "🥇 1. miejsce!" : `${mine.rank}. miejsce`}
            </p>
            <p className="text-zinc-400">
              {identity.team} • {formatPoints(mine.total)}
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-1 text-left text-xs text-zinc-400">
              <li>
                Quiz: <span className="text-red-300">{mine.quiz.correct}/{mine.quiz.expected}</span> ({formatPoints(mine.quiz.points)})
              </li>
              {board?.quests.map((q) => {
                const st = mine.quests[q.id];
                const result =
                  !st || st.status !== "done"
                    ? "–"
                    : q.type === "timed"
                      ? formatDuration(st.elapsed_seconds)
                      : `${st.rounds} rund`;
                return (
                  <li key={q.id}>
                    {q.name}: <span className="text-red-300">{result}</span> ({formatPoints(st?.points ?? 0)})
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <p className="animate-pulse text-zinc-400">Liczę punkty…</p>
        )}
      </div>

      {board && (
        <div className="w-full max-w-xl rounded-2xl border border-red-800/40 bg-zinc-950 p-2">
          <LeaderboardTable rows={board.teams} quests={board.quests} highlight={identity.team} compact />
        </div>
      )}

      <p className="text-sm text-zinc-600 italic mb-8">Dziękujemy za grę… do zobaczenia w ciemności 👻</p>
    </section>
  );
}

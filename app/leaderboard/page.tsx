"use client";

import { useEffect, useState } from "react";
import { api, type LeaderboardResponse } from "../lib/api";
import LeaderboardTable from "../components/LeaderboardTable";

const POLL_MS = 5000;

const STAGE_LABEL = { quiz: "Quiz o drużynie", quests: "Questy", finished: "Koniec gry" } as const;

/** Projector: live ranking of all teams. */
export default function LeaderboardPage() {
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await api.leaderboard();
        if (alive) {
          setBoard(next);
          setError(null);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Błąd pobierania rankingu");
      }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-start justify-center p-6">
      <div className="w-full max-w-6xl">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold uppercase tracking-wider">
            Ranking <span className="text-red-500">• Urodziny Asi</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {board ? `Etap: ${STAGE_LABEL[board.stage]}` : "Ładowanie…"} • punkty za miejsce w każdym etapie (najlepsza drużyna = tyle punktów, ile drużyn)
          </p>
          {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
        </header>
        {board && <LeaderboardTable rows={board.teams} quests={board.quests} />}
      </div>
    </div>
  );
}

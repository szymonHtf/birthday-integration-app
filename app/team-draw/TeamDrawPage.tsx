"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type MembersResponse, type Team } from "../lib/api";
import TeamsBoard from "./TeamsBoard";
import DrawSetup from "./DrawSetup";
import { TeamDraw } from "./TeamDraw";

/**
 * Projector page for the draw:
 *  1. before the draw: tick who is present, pick the number of teams, start;
 *  2. during the draw: each guest picks their name and presses the button;
 *  3. latecomers can be added at any time.
 */
export default function TeamDrawPage() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [members, setMembers] = useState<MembersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, m] = await Promise.all([api.teams(), api.members()]);
      setTeams(t.teams);
      setMembers(m);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd pobierania danych 😢");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!teams || !members) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-white">
        <div className="text-center">
          {error ? (
            <>
              <h2 className="text-2xl font-bold">Nie można pobrać danych</h2>
              <p className="mt-1 text-red-400">{error}</p>
              <button
                onClick={load}
                className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800"
              >
                Spróbuj ponownie
              </button>
            </>
          ) : (
            <p className="animate-pulse text-zinc-400">Wywołuję duchy… 👻</p>
          )}
        </div>
      </div>
    );
  }

  const started = members.draw_started;

  return (
    <>
      <TeamsBoard teams={teams} plan={members.plan} />

      {error && (
        <div className="w-full max-w-md rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!started ? (
        <DrawSetup members={members.members} started={false} onStarted={load} />
      ) : (
        <>
          <TeamDraw members={members.members} onChanged={load} />

          <div className="w-full max-w-md px-4">
            <button
              onClick={() => setShowSetup((s) => !s)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
            >
              {showSetup ? "Ukryj ustawienia losowania" : "⚙️ Ustawienia losowania (od nowa)"}
            </button>
            {showSetup && (
              <DrawSetup
                members={members.members}
                started
                onStarted={async () => {
                  setShowSetup(false);
                  await load();
                }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

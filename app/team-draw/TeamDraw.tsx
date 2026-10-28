"use client";

import { useEffect, useMemo, useState } from "react";
import { api, type AssignResponse, type MemberInfo } from "../lib/api";
import LoadingBarFillOnce from "./LoadingBarFillOnce";

const SUSPENSE_MS = 3000; // matches the loading bar animation

type Props = {
  members: MemberInfo[];
  /** called after an assignment / presence change so the board can refresh */
  onChanged: () => void | Promise<void>;
};

export function TeamDraw({ members, onChanged }: Props) {
  const candidates = useMemo(
    () => members.filter((m) => m.present && !m.assigned).map((m) => m.member),
    [members]
  );
  const absent = useMemo(() => members.filter((m) => !m.present).map((m) => m.member), [members]);

  const [player, setPlayer] = useState<string>("");
  const [latecomer, setLatecomer] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AssignResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep the selects pointing at somebody who still qualifies.
  useEffect(() => {
    if (!candidates.includes(player)) setPlayer(candidates[0] ?? "");
  }, [candidates, player]);
  useEffect(() => {
    if (!absent.includes(latecomer)) setLatecomer(absent[0] ?? "");
  }, [absent, latecomer]);

  const spin = async () => {
    if (!player || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    const startedAt = Date.now();
    try {
      const data = await api.assign(player);
      // Keep the suspense going for the full bar even when the API is quick.
      await new Promise((r) => setTimeout(r, Math.max(0, SUSPENSE_MS - (Date.now() - startedAt))));
      setResult(data);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd przydzielania 😢");
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setResult(null);
    setError(null);
  };

  const addLatecomer = async () => {
    if (!latecomer) return;
    setError(null);
    try {
      await api.setPresent(latecomer, true);
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się dodać osoby 😢");
    }
  };

  const allDone = candidates.length === 0 && !result;

  return (
    <section className="w-full text-white">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-sm">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-wider">
            Przydział do drużyny
          </h2>

          {allDone ? (
            <p className="mt-4 text-center text-lg text-red-300">Wszyscy obecni są przydzieleni! 🎃</p>
          ) : (
            <>
              <p className="mt-2 text-center text-sm text-zinc-400">
                Wybierz swoje imię i wciśnij przycisk, aby zostać przydzielonym do drużyny!
              </p>

              <label className="mt-6 block text-xs uppercase tracking-widest text-red-400/80">Kto losuje?</label>
              <select
                data-testid="draw-player-select"
                value={player}
                onChange={(e) => setPlayer(e.target.value)}
                disabled={loading || !!result}
                className="mt-2 w-full rounded-lg border border-red-800/40 bg-zinc-900 px-4 py-3 text-lg font-semibold text-red-100 outline-none focus:border-red-500 disabled:opacity-60"
              >
                {candidates.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-right text-xs text-zinc-500">Do przydzielenia: {candidates.length}</p>

              <div className="mt-4 flex flex-col items-center">
                {!result ? (
                  <button
                    onClick={spin}
                    disabled={loading || !player}
                    className={`w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide transition ${
                      loading
                        ? "bg-red-900/60 text-red-200 cursor-not-allowed"
                        : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                    }`}
                  >
                    {loading ? "Losuję…" : "Przydziel!"}
                  </button>
                ) : (
                  <button
                    onClick={next}
                    className="w-full rounded-lg bg-red-700 px-6 py-3 text-base font-semibold uppercase tracking-wide transition hover:bg-red-800 active:bg-red-900"
                  >
                    Następna osoba ↻
                  </button>
                )}

                {loading && (
                  <div className="mt-6 w-full">
                    <LoadingBarFillOnce />
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-6 w-full" aria-live="polite">
            {result && (
              <div className="rounded-xl border border-red-800/40 bg-red-950 p-4">
                <p className="text-center text-sm text-zinc-400">
                  <span className="font-semibold text-red-200">{result.member}</span>, twoja drużyna to:
                </p>
                <p className="mt-2 text-center text-2xl font-black uppercase tracking-wide">
                  <span data-testid="draw-result-team" className="rounded-md border px-2 py-1 text-red-200">{result.team}</span>
                </p>
                <p className="mt-3 text-center text-sm text-zinc-400">
                  {result.teammates.length > 0
                    ? `Razem z: ${result.teammates.join(", ")}`
                    : "Jesteś pierwszą osobą w tej drużynie – reszta dołączy z mroku 👻"}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-200">{error}</div>
          )}

          {absent.length > 0 && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Spóźnialscy</p>
              <div className="mt-2 flex gap-2">
                <select
                  data-testid="latecomer-select"
                  value={latecomer}
                  onChange={(e) => setLatecomer(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-500"
                >
                  {absent.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={addLatecomer}
                  disabled={!latecomer || loading}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50"
                >
                  Dodaj do losowania
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

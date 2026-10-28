"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type GameState, type LeaderboardResponse, type LeaderboardRow, type QuestConfig, type Stage } from "../lib/api";
import { deleteCookie, getCookie, setCookie } from "../lib/cookies";
import { formatDuration } from "../lib/format";
import LeaderboardTable from "../components/LeaderboardTable";

const POLL_MS = 3000;
const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "quiz", label: "1. Quiz", hint: "telefony pokazują pytania o drużynie" },
  { id: "quests", label: "2. Questy", hint: "telefony pokazują 3 questy" },
  { id: "finished", label: "3. Koniec", hint: "telefony pokazują ranking" },
];

/** The host's phone/laptop: stages, quiz rounds, Beyblade results, fixing quests, ranking. */
export default function HostPanel() {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const [state, setState] = useState<GameState | null>(null);
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = getCookie("host_code");
    if (saved) setCode(saved);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([api.state(), api.leaderboard()]);
      setState(s);
      setBoard(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd pobierania danych");
    }
  }, []);

  useEffect(() => {
    if (!code) return;
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [code, refresh]);

  const login = async () => {
    setLoginError(null);
    try {
      await api.hostState(input.trim());
      setCookie("host_code", input.trim(), 2);
      setCode(input.trim());
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Nie udało się zalogować");
    }
  };

  const logout = () => {
    deleteCookie("host_code");
    setCode(null);
    setState(null);
    setBoard(null);
  };

  const run = async (action: () => Promise<unknown>) => {
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operacja nie powiodła się");
    } finally {
      setBusy(false);
    }
  };

  if (!code) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-red-800/40 bg-zinc-950 p-6">
          <h1 className="text-center text-2xl font-extrabold uppercase tracking-wider">Panel prowadzącego</h1>
          <p className="mt-2 text-center text-sm text-zinc-400">Wpisz kod prowadzącego (HostCode w backendzie).</p>
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") login();
            }}
            placeholder="kod"
            className="mt-6 w-full rounded-lg border border-red-800/40 bg-zinc-900 px-4 py-3 outline-none focus:border-red-500"
          />
          {loginError && <p className="mt-2 text-center text-sm text-red-300">{loginError}</p>}
          <button
            onClick={login}
            disabled={!input.trim()}
            className="mt-4 w-full rounded-lg bg-red-600 px-6 py-3 font-semibold uppercase tracking-wide hover:bg-red-700 disabled:opacity-50"
          >
            Wejdź
          </button>
        </div>
      </div>
    );
  }

  const quests = state?.quests ?? [];
  const rounds = state?.rounds ?? 6;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold uppercase tracking-wider">
          Panel <span className="text-red-500">• prowadzący</span>
        </h1>
        <button onClick={logout} className="rounded-md border border-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:text-white">
          Wyloguj
        </button>
      </header>

      {error && <div className="rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-200">{error}</div>}

      {/* Stage */}
      <section className="rounded-2xl border border-red-800/40 bg-zinc-950 p-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500">Etap imprezy</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STAGES.map((s) => {
            const active = state?.stage === s.id;
            return (
              <button
                key={s.id}
                data-testid={`stage-${s.id}`}
                aria-pressed={active}
                disabled={busy}
                onClick={() => run(() => api.hostState(code, { stage: s.id }))}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  active ? "border-red-500 bg-red-900/40 text-red-100" : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-white"
                }`}
              >
                <div className="font-bold">{s.label}</div>
                <div className="text-xs opacity-80">{s.hint}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quiz round */}
      <section className="rounded-2xl border border-red-800/40 bg-zinc-950 p-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500">Quiz – opublikowana runda</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-3xl font-black text-red-300" data-testid="host-round">
            {state ? state.question_number : "…"}
          </span>
          {Array.from({ length: rounds + 1 }, (_, n) => n).map((n) => (
            <button
              key={n}
              disabled={busy}
              onClick={() => run(() => api.hostState(code, { question_number: n }))}
              className={`h-10 w-10 rounded-lg border text-sm font-bold transition ${
                state?.question_number === n ? "border-red-500 bg-red-900/40 text-red-100" : "border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="text-xs text-zinc-500">0 = quiz nie wystartował; każda runda to jedno pytanie na telefon</span>
        </div>
      </section>

      {/* Teams & quests */}
      <section className="rounded-2xl border border-red-800/40 bg-zinc-950 p-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500">Drużyny i questy</h2>
        {!board ? (
          <p className="mt-3 animate-pulse text-zinc-500">Ładowanie…</p>
        ) : board.teams.length === 0 ? (
          <p className="mt-3 text-zinc-500">Brak drużyn – najpierw losowanie.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {board.teams.map((row) => (
              <TeamCard key={row.team_name} row={row} quests={quests} busy={busy} onAction={(fn) => run(fn)} code={code} />
            ))}
          </div>
        )}
      </section>

      {/* Ranking */}
      <section className="rounded-2xl border border-red-800/40 bg-zinc-950 p-4">
        <h2 className="text-xs uppercase tracking-widest text-zinc-500">Ranking</h2>
        <div className="mt-3">{board && <LeaderboardTable rows={board.teams} quests={quests} compact />}</div>
      </section>
    </div>
  );
}

function TeamCard({
  row,
  quests,
  busy,
  code,
  onAction,
}: {
  row: LeaderboardRow;
  quests: QuestConfig[];
  busy: boolean;
  code: string;
  onAction: (fn: () => Promise<unknown>) => void;
}) {
  const [rounds, setRounds] = useState<Record<string, string>>({});
  const [seconds, setSeconds] = useState<Record<string, string>>({});

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3" data-testid={`host-team-${row.team_name}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-extrabold uppercase tracking-wide text-red-200">{row.team_name}</span>{" "}
          <span className="text-xs text-zinc-500">{row.players.join(", ")}</span>
        </div>
        <span className="text-xs text-zinc-500">
          quiz {row.quiz.correct}/{row.quiz.expected}
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {quests.map((q) => {
          const st = row.quests[q.id];
          const status = st?.status ?? "available";
          return (
            <div key={q.id} className="rounded-lg border border-zinc-800 p-2 text-sm" data-testid={`host-quest-${row.team_name}-${q.id}`} data-status={status}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">
                  {q.type === "rounds" ? "🌀" : "⏱️"} {q.name}
                </span>
                <span
                  className={`text-xs ${status === "done" ? "text-green-300" : status === "running" ? "text-yellow-300" : "text-zinc-500"}`}
                >
                  {status === "done"
                    ? q.type === "timed"
                      ? formatDuration(st?.elapsed_seconds)
                      : `${st?.rounds} rund`
                    : status === "running"
                      ? q.type === "timed"
                        ? `w trakcie ${formatDuration(st?.elapsed_seconds)}`
                        : "walczą z Asią"
                      : "–"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {q.type === "rounds" ? (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={rounds[q.id] ?? ""}
                      onChange={(e) => setRounds((r) => ({ ...r, [q.id]: e.target.value }))}
                      placeholder="rundy"
                      className="w-20 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-red-500"
                    />
                    <button
                      disabled={busy || !rounds[q.id]}
                      onClick={() =>
                        onAction(() => api.hostQuest(code, row.team_name, q.id, "set_rounds", { rounds: Number(rounds[q.id]) }))
                      }
                      className="rounded-md bg-red-700 px-2 py-1 text-xs font-semibold hover:bg-red-800 disabled:opacity-40"
                    >
                      Zapisz
                    </button>
                  </>
                ) : (
                  <>
                    {status === "running" && (
                      <button
                        disabled={busy}
                        onClick={() => onAction(() => api.hostQuest(code, row.team_name, q.id, "finish"))}
                        className="rounded-md bg-yellow-600 px-2 py-1 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-40"
                      >
                        Stop teraz
                      </button>
                    )}
                    <input
                      type="number"
                      min={1}
                      value={seconds[q.id] ?? ""}
                      onChange={(e) => setSeconds((s) => ({ ...s, [q.id]: e.target.value }))}
                      placeholder="sekundy"
                      className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm outline-none focus:border-red-500"
                    />
                    <button
                      disabled={busy || !seconds[q.id]}
                      onClick={() =>
                        onAction(() =>
                          api.hostQuest(code, row.team_name, q.id, "set_elapsed", { elapsed_seconds: Number(seconds[q.id]) })
                        )
                      }
                      className="rounded-md bg-red-700 px-2 py-1 text-xs font-semibold hover:bg-red-800 disabled:opacity-40"
                    >
                      Ustaw czas
                    </button>
                  </>
                )}
                {status !== "available" && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Wyzerować „${q.name}” dla ${row.team_name}?`)) {
                        onAction(() => api.hostQuest(code, row.team_name, q.id, "reset"));
                      }
                    }}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-white disabled:opacity-40"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

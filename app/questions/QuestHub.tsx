"use client";

import { useEffect, useState } from "react";
import { api, type QuestConfig, type QuestState, type TeamQuests } from "../lib/api";
import { formatDuration } from "../lib/format";
import type { Identity } from "./useIdentity";

const POLL_MS = 3000;

type Props = { identity: Identity; quests: QuestConfig[] };

/** After the quiz: the team's three quests, in any order, one at a time. */
export default function QuestHub({ identity, quests }: Props) {
  const [team, setTeam] = useState<TeamQuests | null>(null);
  const [offset, setOffset] = useState(0); // server clock - phone clock (ms)
  const [, setTick] = useState(0); // re-render the running timer
  const [busy, setBusy] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const apply = (next: TeamQuests) => {
    setTeam(next);
    setOffset(next.now - Date.now());
  };

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const next = await api.teamQuests({ member: identity.member });
        if (alive) apply(next);
      } catch (e) {
        console.error("Quest poll failed:", e);
      }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    const clock = setInterval(() => setTick((t) => t + 1), 250);
    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [identity.member]);

  const liveElapsed = (state: QuestState): number | null => {
    if (state.status === "running" && state.started_at != null) {
      return Math.max(0, Date.now() + offset - state.started_at) / 1000;
    }
    return state.elapsed_seconds;
  };

  const start = async (quest: QuestConfig) => {
    setBusy(quest.id);
    setError(null);
    try {
      apply(await api.startQuest(identity.member, quest.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć questu 😢");
    } finally {
      setBusy(null);
    }
  };

  const finish = async (quest: QuestConfig) => {
    setBusy(quest.id);
    setError(null);
    try {
      apply(await api.finishQuest(identity.member, quest.id, codes[quest.id]?.trim() || undefined));
      setCodes((c) => ({ ...c, [quest.id]: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zakończyć questu 😢");
    } finally {
      setBusy(null);
    }
  };

  const states = team?.quests ?? {};
  const done = quests.filter((q) => states[q.id]?.status === "done").length;
  const running = team?.running ?? null;

  return (
    <section className="w-full bg-black text-red-100 min-h-screen flex flex-col items-center p-1 gap-4">
      {/* Header */}
      <div className="w-full max-w-xl text-center border border-red-800/40 bg-zinc-950 rounded-2xl p-3 shadow-[0_0_40px_rgba(220,38,38,0.1)]">
        <h1 className="text-xl font-extrabold uppercase tracking-widest text-red-500 mb-1">🗝️ Questy 🗝️</h1>
        <p className="text-sm text-zinc-400 italic">Kolejność dowolna, ale jeden quest na raz. Im szybciej, tym więcej punktów.</p>
        <div className="mt-2 text-left text-sm space-y-1">
          <p>
            🩸 <span className="text-red-400 font-semibold">Drużyna:</span>{" "}
            <span className="text-red-300">{identity.team}</span>
            {team && <span className="text-zinc-500"> ({team.players.join(", ")})</span>}
          </p>
          <p>
            ✅ <span className="text-red-400 font-semibold">Ukończone:</span>{" "}
            <span data-testid="quests-done" className="text-red-300">{done} / {quests.length}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="w-full max-w-xl rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-200">{error}</div>
      )}

      {!team ? (
        <p className="animate-pulse text-zinc-400">Ładuję questy…</p>
      ) : (
        <div className="w-full max-w-xl grid gap-3">
          {quests.map((quest) => {
            const state = states[quest.id] ?? { id: quest.id, status: "available", started_at: null, finished_at: null, elapsed_seconds: null, rounds: null };
            const isRunning = state.status === "running";
            const isDone = state.status === "done";
            const blocked = !!running && running !== quest.id;
            const elapsed = liveElapsed(state);
            return (
              <div
                key={quest.id}
                data-testid={`quest-${quest.id}`}
                data-status={state.status}
                className={`rounded-2xl border p-4 transition ${
                  isRunning
                    ? "border-yellow-500/60 bg-yellow-500/5 shadow-[0_0_30px_rgba(234,179,8,0.15)]"
                    : isDone
                      ? "border-green-600/50 bg-green-600/5"
                      : "border-red-800/40 bg-zinc-950"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold uppercase tracking-wide text-red-300">
                      {quest.type === "rounds" ? "🌀" : "⏱️"} {quest.name}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">{quest.description}</p>
                  </div>
                  <StatusBadge status={state.status} />
                </div>

                <div className="mt-4">
                  {state.status === "available" && (
                    <button
                      onClick={() => start(quest)}
                      disabled={busy !== null || blocked}
                      className="w-full rounded-lg bg-red-600 px-6 py-3 text-base font-semibold uppercase tracking-wide transition hover:bg-red-700 active:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {blocked ? "Najpierw skończcie bieżący quest" : busy === quest.id ? "Startuję…" : "Start!"}
                    </button>
                  )}

                  {isRunning && quest.type === "timed" && (
                    <div className="space-y-3">
                      <p className="text-center font-mono text-4xl text-yellow-300" data-testid={`timer-${quest.id}`}>
                        {formatDuration(elapsed)}
                      </p>
                      {quest.requires_code && (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={codes[quest.id] ?? ""}
                          onChange={(e) => setCodes((c) => ({ ...c, [quest.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") finish(quest);
                          }}
                          placeholder="Kod zakończenia od prowadzącego"
                          className="w-full rounded-lg border border-yellow-600/40 bg-zinc-900 px-4 py-3 text-center outline-none placeholder-zinc-600 focus:border-yellow-400"
                        />
                      )}
                      <button
                        onClick={() => finish(quest)}
                        disabled={busy !== null || (quest.requires_code && !(codes[quest.id] ?? "").trim())}
                        className="w-full rounded-lg bg-yellow-600 px-6 py-3 text-base font-semibold uppercase tracking-wide text-black transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busy === quest.id ? "Zatrzymuję…" : "Zakończ – stop!"}
                      </button>
                    </div>
                  )}

                  {isRunning && quest.type === "rounds" && (
                    <p className="text-center text-yellow-200">
                      🌀 Idźcie do Asi i walczcie! Liczbę rund wpisze prowadząca.
                    </p>
                  )}

                  {isDone && (
                    <p className="text-center text-lg text-green-300" data-testid={`result-${quest.id}`}>
                      {quest.type === "timed"
                        ? `✅ Wasz czas: ${formatDuration(state.elapsed_seconds)}`
                        : `✅ Pokonaliście Asię w ${state.rounds} ${roundsWord(state.rounds ?? 0)}!`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {done === quests.length && (
            <p className="text-center text-lg text-red-300 py-4">Wszystkie questy zaliczone! Czekajcie na wyniki 🎃</p>
          )}
        </div>
      )}

      <p className="text-sm text-zinc-600 italic mb-8">Strzeż się… czas płynie nawet w ciemności…</p>
    </section>
  );
}

function roundsWord(n: number): string {
  if (n === 1) return "rundzie";
  return "rundach";
}

function StatusBadge({ status }: { status: QuestState["status"] }) {
  const map = {
    available: ["Do zrobienia", "border-zinc-700 text-zinc-400"],
    running: ["W trakcie", "border-yellow-500/60 bg-yellow-500/10 text-yellow-200"],
    done: ["Zaliczony", "border-green-600/60 bg-green-600/10 text-green-200"],
  } as const;
  const [label, cls] = map[status];
  return <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${cls}`}>{label}</span>;
}

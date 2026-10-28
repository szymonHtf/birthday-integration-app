"use client";

import { useState } from "react";
import { api, type MemberInfo } from "../lib/api";
import { describeSizes, planSizes, plural, teamCountBounds } from "../lib/format";

type Props = {
  members: MemberInfo[];
  /** true when a draw is already running (starting again wipes it) */
  started: boolean;
  onStarted: () => void | Promise<void>;
};

export default function DrawSetup({ members, started, onStarted }: Props) {
  const [present, setPresent] = useState<Set<string>>(
    () => new Set(members.filter((m) => (started ? m.present : true)).map((m) => m.member))
  );
  const [teamCount, setTeamCount] = useState<number | null>(null); // null = automatic
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const n = present.size;
  const bounds = teamCountBounds(n);
  const effectiveCount =
    bounds === null
      ? null
      : teamCount !== null && teamCount >= bounds.lo && teamCount <= bounds.hi
        ? teamCount
        : bounds.hi;
  const sizes = bounds && effectiveCount ? planSizes(n, effectiveCount) : null;

  const toggle = (name: string) =>
    setPresent((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const setAll = (value: boolean) => setPresent(new Set(value ? members.map((m) => m.member) : []));

  const start = async () => {
    if (!effectiveCount) return;
    if (started && !window.confirm("To skasuje wszystkie dotychczasowe przydziały do drużyn. Losować od nowa?")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.startDraw(Array.from(present), effectiveCount);
      await onStarted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się rozpocząć losowania 😢");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="w-full text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-[0_0_40px_rgba(220,38,38,0.08)]">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-wider">
            Kto jest na imprezie?
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Zaznacz obecnych gości. Nieobecni nie biorą udziału w losowaniu – spóźnialskich dodasz później.
          </p>

          <div className="mt-4 flex justify-center gap-2 text-xs">
            <button onClick={() => setAll(true)} className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-400 hover:text-white">
              Zaznacz wszystkich
            </button>
            <button onClick={() => setAll(false)} className="rounded-md border border-zinc-800 px-3 py-1 text-zinc-400 hover:text-white">
              Odznacz wszystkich
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {members.map((m) => {
              const on = present.has(m.member);
              return (
                <button
                  key={m.member}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(m.member)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    on
                      ? "border-red-500/70 bg-red-900/30 text-red-100"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-500"
                  }`}
                >
                  <span className="text-lg leading-none">{on ? "🎃" : "☠️"}</span>
                  <span className="font-semibold">{m.member}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            {bounds && effectiveCount && sizes ? (
              <>
                <p className="text-center text-lg">
                  <span className="font-bold text-red-300">{plural(n, "gracz", "gracze", "graczy")}</span>
                  {" → "}
                  <span className="font-bold text-red-300">{plural(effectiveCount, "drużyna", "drużyny", "drużyn")}</span>
                  <span className="text-zinc-400"> ({describeSizes(sizes.twos, sizes.threes)})</span>
                </p>
                {bounds.lo !== bounds.hi && (
                  <label className="mt-3 flex items-center justify-center gap-3 text-sm text-zinc-400">
                    Liczba drużyn:
                    <select
                      value={effectiveCount}
                      onChange={(e) => setTeamCount(Number(e.target.value))}
                      className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-white"
                    >
                      {Array.from({ length: bounds.hi - bounds.lo + 1 }, (_, i) => bounds.lo + i).map((t) => {
                        const s = planSizes(n, t);
                        return (
                          <option key={t} value={t}>
                            {t} ({describeSizes(s.twos, s.threes)})
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
              </>
            ) : (
              <p className="text-center text-sm text-zinc-500">Zaznacz co najmniej 2 osoby.</p>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-sm text-red-200">{error}</div>
          )}

          <button
            onClick={start}
            disabled={busy || !effectiveCount}
            className={`mt-6 w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide transition ${
              busy
                ? "bg-red-900/60 text-red-200 cursor-wait"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {busy ? "Przygotowuję krypty…" : started ? "⚠️ Losuj od nowa" : "Rozpocznij losowanie 🎃"}
          </button>
        </div>
      </div>
    </section>
  );
}

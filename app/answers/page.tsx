// app/answers/page.tsx – projector view of everybody's answers, player by player, round by round.
// Open /answers?slide=12 to resume from a given slide (1-based).
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type AnswerType, type ApiAnswer, type ApiQuestion, type QuestionAnswer, type Slot } from "../lib/api";
import { AnswerContent, QuestionPhoto, hasPhotoAnswers } from "../components/AnswerContent";

const ROUNDS = 6;

/** One slide: a player's answer for one round (which question about whom comes from the draw). */
type Slide = Slot & { team: string };

type StepState = 0 | 1 | 2; // 0: question only, 1: show user's pick, 2: show correct & mark wrong

/** "answer1".."answer4" -> 0..3 */
const normalizeIndex = (val: string | number | undefined | null): number | null => {
  if (val == null) return null;
  if (typeof val === "string") {
    const m = val.match(/^answer([1-4])$/);
    if (m) return Number(m[1]) - 1;
  }
  const n = Number(val);
  if (Number.isFinite(n) && n >= 1 && n <= 4) return n - 1;
  return null;
};

const initialSlideFromUrl = (): number => {
  if (typeof window === "undefined") return 0;
  const n = Number(new URLSearchParams(window.location.search).get("slide"));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) - 1 : 0;
};

export default function ResultsPage() {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [slidesError, setSlidesError] = useState<string | null>(null);

  const [slideIndex, setSlideIndex] = useState(0);
  const [step, setStep] = useState<StepState>(0);

  // data for current slide
  const [qData, setQData] = useState<ApiQuestion | null>(null);
  const [userPick, setUserPick] = useState<number | null>(null); // 0..3
  const [correctPick, setCorrectPick] = useState<number | null>(null); // 0..3
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /** ---- Slides come from the draw: team by team, player by player, round by round ---- */
  useEffect(() => {
    (async () => {
      try {
        const { teams } = await api.teams();
        const all = teams.flatMap((t) => t.slots.map((s) => ({ ...s, team: t.team_name })));
        setSlideIndex(Math.min(initialSlideFromUrl(), Math.max(0, all.length - 1)));
        setSlides(all);
      } catch (e) {
        setSlidesError(e instanceof Error ? e.message : "Nie udało się pobrać drużyn.");
        setSlides([]);
      }
    })();
  }, []);

  const current = slides?.[slideIndex];
  const atLastSlide = !!slides && slideIndex >= slides.length - 1;

  // "Gracz 3 z 11": position of the current player among all players, in slide order
  const players = useMemo(() => {
    const seen: string[] = [];
    for (const s of slides ?? []) if (!seen.includes(s.member)) seen.push(s.member);
    return seen;
  }, [slides]);
  const playerIndex = current ? players.indexOf(current.member) : -1;

  const fetchAnswer = (type: AnswerType, slide: Slide) => api.answer(type, slide.subject, slide.question_number);

  /** ---- Load QUESTION_ONLY when the slide changes ---- */
  const loadQuestionOnly = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setErrorMsg(null);
    setUserPick(null);
    setCorrectPick(null);
    setStep(0);

    try {
      setQData(await fetchAnswer("QUESTION_ONLY", current));
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to load question.");
      setQData(null);
    } finally {
      setLoading(false);
    }
  }, [current]);

  useEffect(() => {
    loadQuestionOnly();
  }, [loadQuestionOnly]);

  /** ---- Step transitions via keyboard & button ---- */
  const advance = useCallback(async () => {
    if (!current || !qData || loading) return; // ignore key presses while a fetch is in flight

    try {
      if (step === 0) {
        setLoading(true);
        const raw: ApiAnswer = await fetchAnswer("USER_ANSWER", current);
        setUserPick(normalizeIndex(raw.user_answer));
        setStep(1);
      } else if (step === 1) {
        setLoading(true);
        const raw: ApiAnswer = await fetchAnswer("CORRECT_ANSWER", current);
        setCorrectPick(normalizeIndex(raw.correct_answer));
        setStep(2);
      } else {
        setSlideIndex((i) => (atLastSlide ? 0 : i + 1)); // finished everything → restart from beginning
        setStep(0);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [step, current, qData, atLastSlide, loading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowLeft") {
        // simple back step (no re-fetch; purely visual)
        setStep((s) => (s > 0 ? ((s - 1) as StepState) : 0));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (slides === null) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <p className="animate-pulse text-zinc-400">Ładowanie drużyn…</p>
      </div>
    );
  }

  if (slides.length === 0 || !current) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold uppercase tracking-widest">
            Wyniki • <span className="text-red-500">Urodziny Asi</span>
          </h1>
          <p className="mt-4 text-zinc-400">
            {slidesError ?? "Brak drużyn – najpierw zróbcie losowanie na stronie „Assign to teams”."}
          </p>
        </div>
      </div>
    );
  }

  const photoGrid = qData ? hasPhotoAnswers(qData.answers) : false;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Top bar */}
        <div className="mb-4 grid gap-2 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold uppercase tracking-widest">
              Wyniki • <span className="text-red-500">Urodziny Asi</span>
            </h1>
            <p className="text-zinc-400 text-sm">
              Strzałka → lub Spacja, by przechodzić:{" "}
              <span className="text-zinc-300">Pytanie → Odpowiedź gracza → Odpowiedź poprawna</span>
            </p>
          </div>

          {/* Player indicator */}
          <div className="text-right">
            <div className="text-sm text-zinc-400" data-testid="player-indicator">
              Gracz {playerIndex + 1} z {players.length} • <span className="uppercase text-red-400">{current.team}</span>
            </div>
            <div className="text-sm">
              🕯️ Odpowiada: <span className="text-red-300 font-semibold">{current.member}</span> • 🩸 O kim:{" "}
              <span data-testid="slide-subject" className="text-red-300 font-semibold">{current.subject}</span>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-red-800/40 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(220,38,38,0.15)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black tracking-wide text-red-400">
              Pytanie {current.round} / {ROUNDS}
              <span className="ml-2 text-sm font-normal text-zinc-500">
                (pytanie nr {current.question_number} o {current.subject})
              </span>
            </h2>
            <StepBadge step={step} />
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-red-200 text-sm">
              {errorMsg}
            </div>
          )}

          {qData ? (
            <div>
              <QuestionPhoto src={qData.image} alt={qData.question} />
              <p className="text-lg md:text-xl text-red-100 mb-5">{qData.question}</p>

              <div className={photoGrid ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "grid gap-3"} data-testid="answers">
                {qData.answers.map((ans: QuestionAnswer, i: number) => {
                  const isUser = userPick === i;
                  const isCorrect = correctPick === i;
                  const userWasWrong =
                    step === 2 && userPick != null && correctPick != null && userPick !== correctPick && userPick === i;

                  const base = `w-full text-left rounded-xl border transition bg-zinc-900/60 ${photoGrid ? "p-2" : "px-4 py-3"}`;
                  const neutral = "border-red-800/40";
                  const yellow = "border-yellow-500/70 bg-yellow-500/10 ring-1 ring-yellow-500/30";
                  const green = "border-green-600/60 bg-green-600/10 ring-1 ring-green-600/30";
                  const red = "border-red-600/70 bg-red-600/10 ring-1 ring-red-600/30";

                  let cls = `${base} ${neutral}`;
                  if (step === 1 && isUser) cls = `${base} ${yellow}`;
                  if (step === 2 && isCorrect) cls = `${base} ${green}`;
                  if (step === 2 && userWasWrong) cls = `${base} ${red}`;

                  return (
                    <div key={i} className={cls} data-testid="answer-option">
                      <AnswerContent answer={ans} index={i} photoGrid={photoGrid} />
                    </div>
                  );
                })}
              </div>

              {step >= 1 && userPick === null && (
                <p className="mt-4 text-sm italic text-zinc-400">
                  {current.member} nie odpowiedział(a) na to pytanie… mrok pożarł odpowiedź 👻
                </p>
              )}

              {/* Legend */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <Legend colorClass="border-yellow-500/70 bg-yellow-500/10 ring-yellow-500/30" label="Odpowiedź gracza" />
                <Legend colorClass="border-green-600/60 bg-green-600/10 ring-green-600/30" label="Poprawna odpowiedź" />
                <Legend colorClass="border-red-600/70 bg-red-600/10 ring-red-600/30" label="Błędna odpowiedź gracza" />
              </div>

              {/* Controls */}
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setStep((s) => (s > 0 ? ((s - 1) as StepState) : 0))}
                  className="rounded-lg px-4 py-2 text-sm border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                >
                  ⬅️ Cofnij krok
                </button>

                <div className="text-sm text-zinc-500" data-testid="slide-counter">
                  Slajd {slideIndex + 1}/{slides.length} • Pytanie {current.round}/{ROUNDS}
                </div>

                <button
                  onClick={advance}
                  disabled={loading}
                  className="rounded-lg px-4 py-2 text-sm border border-red-700 bg-red-700 hover:bg-red-800 disabled:opacity-60"
                >
                  {step < 2 ? "➡️ Pokaż dalej" : atLastSlide ? "🔁 Od nowa" : "➡️ Następne pytanie"}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-zinc-400">{loading ? "Ładowanie…" : "Brak danych."}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ---- Presentational helpers ---- */
function StepBadge({ step }: { step: StepState }) {
  const labels: Record<StepState, string> = {
    0: "Pytanie",
    1: "Odpowiedź gracza",
    2: "Poprawna odpowiedź",
  };
  return (
    <span data-testid="step-badge" className="rounded-md border border-red-800/40 bg-red-900/30 text-red-100 text-xs font-semibold px-2 py-1">
      {labels[step]}
    </span>
  );
}

function Legend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-block h-3 w-5 rounded-sm border ring-1 ${colorClass}`} />
      {label}
    </span>
  );
}

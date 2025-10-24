// app/results/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * 👉 Fill these with your real pairs (the person answering + the person the question is about).
 * Each pair will run 6 questions: 1..6
 */
const PAIRS: Array<{ member: string; teammate: string }> = [
    { member: "Zuza", teammate: "Natalia" },
    { member: "Natalia", teammate: "Zuza" },
    { member: "Monika", teammate: "Julita" },
    { member: "Julita", teammate: "Monika" },
    { member: "Hubert N", teammate: "Eryk" },
    { member: "Eryk", teammate: "Hubert N" },
    { member: "Adam", teammate: "Paweł" },
    { member: "Paweł", teammate: "Adam" },
    { member: "Oskar", teammate: "Hubert Cz" },
    { member: "Hubert Cz", teammate: "Oskar" },
    { member: "Łukasz", teammate: "Gaba" },
    { member: "Gaba", teammate: "Łukasz" },
];

const API_BASE = "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod";
const TOTAL_QUESTIONS_PER_PAIR = 6 as const;

// API "type" values your backend supports
type AnswerType = "QUESTION_ONLY" | "USER_ANSWER" | "CORRECT_ANSWER";

/** ---- API shapes ---- */
type ApiQuestionOnly =
    // Either 4 separate fields...
    ({
        question: string;
        question_number: number | string;
    } & {
        answer1: string;
        answer2: string;
        answer3: string;
        answer4: string;
    }) |
    // ...or a single array of answers
    {
        question: string;
        question_number: number | string;
        answers: string[];
    };

type ApiUserAnswer =
    | { answer_index: number }
    | { user_answer_index: number }
    | { selected_index: number }
    | { answer_text: string }
    | { user_answer: string };

type ApiCorrectAnswer =
    | { answer_index: number }
    | { correct_answer_index: number }
    | { answer_text: string }
    | { correct_answer: string };

/** ---- Normalized, UI-friendly ---- */
type NormalizedQuestion = {
    questionNumber: number;
    question: string;
    answers: [string, string, string, string];
};

type StepState = 0 | 1 | 2; // 0: question only, 1: show user's pick, 2: show correct & mark wrong

export default function ResultsPage() {
    // progression across PAIRS and question numbers
    const [pairIndex, setPairIndex] = useState(0);
    const [qNumber, setQNumber] = useState(1);
    const [step, setStep] = useState<StepState>(0);

    // data for current slide
    const [qData, setQData] = useState<NormalizedQuestion | null>(null);
    const [userPick, setUserPick] = useState<number | null>(null); // 0..3
    const [correctPick, setCorrectPick] = useState<number | null>(null); // 0..3
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const currentPair = PAIRS[pairIndex];
    const atLastPair = pairIndex >= PAIRS.length - 1;
    const atLastQuestion = qNumber >= TOTAL_QUESTIONS_PER_PAIR;

    /** ---- API ---- */
    const fetchAnswer = async <T,>(
        type: AnswerType,
        member: string,
        teammate: string,
        questionNumber: number
    ): Promise<T> => {
        const url = new URL(`${API_BASE}/answer`);
        url.searchParams.set("type", type);
        url.searchParams.set("member", member);
        url.searchParams.set("teammate", teammate);
        url.searchParams.set("question_number", String(questionNumber));
        const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
        if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`GET /answer ${type} failed (${res.status}) ${txt}`.slice(0, 300));
        }
        return (await res.json()) as T;
    };

    const normalizeIndex = (val: number | undefined | null): number | null => {
        if (val == null || Number.isNaN(val as any)) return null;
        const n = Number(val);
        if (n >= 0 && n <= 3) return n; // already 0..3
        if (n >= 1 && n <= 4) return n - 1; // convert 1..4 -> 0..3
        return null;
    };

    const normalizeQ = (raw: ApiQuestionOnly): NormalizedQuestion => {
        const question = raw.question;
        const n = Number((raw as any).question_number ?? 0) || 0;

        let answers: string[] = [];
        if ("answers" in raw && Array.isArray(raw.answers)) {
            answers = raw.answers;
        } else if ("answer1" in raw) {
            answers = [raw.answer1, raw.answer2, raw.answer3, raw.answer4];
        }

        // sanitize & pad
        answers = (answers ?? []).filter(Boolean).slice(0, 4);
        while (answers.length < 4) answers.push("—");

        return {
            questionNumber: n,
            question,
            answers: [answers[0], answers[1], answers[2], answers[3]] as [
                string,
                string,
                string,
                string
            ],
        };
    };

    /** ---- Load QUESTION_ONLY when pair or qNumber changes ---- */
    const loadQuestionOnly = useCallback(async () => {
        if (!currentPair) return;
        setLoading(true);
        setErrorMsg(null);
        setUserPick(null);
        setCorrectPick(null);
        setStep(0);

        try {
            const raw = await fetchAnswer<ApiQuestionOnly>(
                "QUESTION_ONLY",
                currentPair.member,
                currentPair.teammate,
                qNumber
            );
            const normalized = normalizeQ(raw);
            setQData(normalized);
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Failed to load question.");
            setQData(null);
        } finally {
            setLoading(false);
        }
    }, [currentPair, qNumber]);

    useEffect(() => {
        loadQuestionOnly();
    }, [loadQuestionOnly]);

    /** ---- Step transitions via keyboard & button ---- */
    const advance = useCallback(async () => {
        if (!currentPair || !qData) return;

        try {
            if (step === 0) {
                // Reveal user's answer
                setLoading(true);
                const raw = await fetchAnswer<ApiUserAnswer>(
                    "USER_ANSWER",
                    currentPair.member,
                    currentPair.teammate,
                    qNumber
                );

                // In advance() -> step === 0 (USER_ANSWER) block:
                let idx: number | null = null;

                if ("answer_index" in raw) idx = normalizeIndex(raw.answer_index as number);
                else if ("user_answer_index" in raw) idx = normalizeIndex((raw as any).user_answer_index);
                else if ("selected_index" in raw) idx = normalizeIndex((raw as any).selected_index);
                else if ("answer_text" in raw && typeof raw.answer_text === "string") {
                    const i = qData.answers.findIndex((a) => a === raw.answer_text);
                    idx = i >= 0 ? i : null;
                } else if ("user_answer" in raw && typeof raw.user_answer === "string") {   // NEW
                    // Expecting "answer1".."answer4"
                    const m = raw.user_answer.match(/^answer([1-4])$/);
                    if (m) idx = Number(m[1]) - 1;
                }

                setUserPick(idx);
                setStep(1);
            } else if (step === 1) {
                // Reveal correct answer
                setLoading(true);
                const raw = await fetchAnswer<ApiCorrectAnswer>(
                    "CORRECT_ANSWER",
                    currentPair.member,
                    currentPair.teammate,
                    qNumber
                );

                // In advance() -> step === 1 (CORRECT_ANSWER) block:
                let idx: number | null = null;

                if ("answer_index" in raw) idx = normalizeIndex(raw.answer_index as number);
                else if ("correct_answer_index" in raw) idx = normalizeIndex((raw as any).correct_answer_index);
                else if ("answer_text" in raw && typeof raw.answer_text === "string") {
                    const i = qData.answers.findIndex((a) => a === raw.answer_text);
                    idx = i >= 0 ? i : null;
                } else if ("correct_answer" in raw && typeof raw.correct_answer === "string") { // NEW
                    const m = raw.correct_answer.match(/^answer([1-4])$/);
                    if (m) idx = Number(m[1]) - 1;
                }

                setCorrectPick(idx);
                setStep(2);
            } else {
                // Next question / pair / loop
                if (!atLastQuestion) {
                    setQNumber((n) => n + 1);
                    setStep(0);
                } else if (!atLastPair) {
                    setPairIndex((p) => p + 1);
                    setQNumber(1);
                    setStep(0);
                } else {
                    // finished everything → restart from beginning
                    setPairIndex(0);
                    setQNumber(1);
                    setStep(0);
                }
            }
        } catch (e: any) {
            setErrorMsg(e?.message ?? "Request failed.");
        } finally {
            setLoading(false);
        }
    }, [step, currentPair, qData, qNumber, atLastPair, atLastQuestion]);

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

    const headerText = useMemo(() => {
        if (!currentPair) return "";
        return `Pytanie ${qNumber} / ${TOTAL_QUESTIONS_PER_PAIR}`;
    }, [currentPair, qNumber]);

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
                            <span className="text-zinc-300">
                                Pytanie → Odpowiedź gracza → Odpowiedź poprawna
                            </span>
                        </p>
                    </div>

                    {/* Pair indicator */}
                    <div className="text-right">
                        <div className="text-sm text-zinc-400">
                            Para {pairIndex + 1} z {PAIRS.length}
                        </div>
                        {currentPair && (
                            <div className="text-sm">
                                🕯️ Odpowiada:{" "}
                                <span className="text-red-300 font-semibold">{currentPair.member}</span>{" "}
                                • 🩸 O kim:{" "}
                                <span className="text-red-300 font-semibold">{currentPair.teammate}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-red-800/40 bg-zinc-950/90 p-6 shadow-[0_0_40px_rgba(220,38,38,0.15)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black tracking-wide text-red-400">{headerText}</h2>
                        <StepBadge step={step} />
                    </div>

                    {errorMsg && (
                        <div className="mb-4 rounded-lg border border-red-600/30 bg-red-900/20 p-3 text-red-200 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    {qData ? (
                        <div>
                            <p className="text-lg md:text-xl text-red-100 mb-5">{qData.question}</p>

                            <div className="grid gap-3">
                                {qData.answers.map((ans, i) => {
                                    const isUser = userPick === i;
                                    const isCorrect = correctPick === i;
                                    const userWasWrong =
                                        step === 2 &&
                                        userPick != null &&
                                        correctPick != null &&
                                        userPick !== correctPick &&
                                        userPick === i;

                                    const base =
                                        "w-full text-left px-4 py-3 rounded-xl border transition bg-zinc-900/60 hover:bg-zinc-900/80";
                                    const neutral = "border-red-800/40";
                                    const yellow = "border-yellow-500/70 bg-yellow-500/10 ring-1 ring-yellow-500/30";
                                    const green = "border-green-600/60 bg-green-600/10 ring-1 ring-green-600/30";
                                    const red = "border-red-600/70 bg-red-600/10 ring-1 ring-red-600/30";

                                    let cls = `${base} ${neutral}`;
                                    if (step === 1 && isUser) cls = `${base} ${yellow}`;
                                    if (step === 2 && isCorrect) cls = `${base} ${green}`;
                                    if (step === 2 && userWasWrong) cls = `${base} ${red}`;

                                    return (
                                        <div key={i} className={cls}>
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-zinc-700 text-xs">
                                                    {i + 1}
                                                </span>
                                                <span>{ans}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                                <Legend
                                    colorClass="border-yellow-500/70 bg-yellow-500/10 ring-yellow-500/30"
                                    label="Odpowiedź gracza"
                                />
                                <Legend
                                    colorClass="border-green-600/60 bg-green-600/10 ring-green-600/30"
                                    label="Poprawna odpowiedź"
                                />
                                <Legend
                                    colorClass="border-red-600/70 bg-red-600/10 ring-red-600/30"
                                    label="Błędna odpowiedź gracza"
                                />
                            </div>

                            {/* Controls */}
                            <div className="mt-6 flex items-center justify-between">
                                <button
                                    onClick={() => setStep((s) => (s > 0 ? ((s - 1) as StepState) : 0))}
                                    className="rounded-lg px-4 py-2 text-sm border border-zinc-700 bg-zinc-900 hover:bg-zinc-800"
                                >
                                    ⬅️ Cofnij krok
                                </button>

                                <div className="text-sm text-zinc-500">
                                    Para {pairIndex + 1}/{PAIRS.length} • Pytanie {qNumber}/{TOTAL_QUESTIONS_PER_PAIR}
                                </div>

                                <button
                                    onClick={advance}
                                    disabled={loading}
                                    className="rounded-lg px-4 py-2 text-sm border border-red-700 bg-red-700 hover:bg-red-800 disabled:opacity-60"
                                >
                                    {step < 2
                                        ? "➡️ Pokaż dalej"
                                        : atLastPair && atLastQuestion
                                            ? "🔁 Od nowa"
                                            : "➡️ Następne pytanie"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center text-zinc-400">
                            {loading ? "Ładowanie…" : "Brak danych."}
                        </div>
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
        <span className="rounded-md border border-red-800/40 bg-red-900/30 text-red-100 text-xs font-semibold px-2 py-1">
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

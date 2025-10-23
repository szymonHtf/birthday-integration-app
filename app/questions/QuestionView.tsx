"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  questionNumber: number;
  question: string;
  answers: string[];
  onAnswer: (choiceIndex: number) => void;
  durationSeconds?: number; // default 20
};

export default function QuestionView({
  questionNumber,
  question,
  answers,
  onAnswer,
  durationSeconds = 20,
}: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(durationSeconds * 1000);
  const endAtRef = useRef<number>(Date.now() + durationSeconds * 1000);
  const intervalRef = useRef<number | null>(null);

  // Start countdown when component mounts (or remounts via key)
  useEffect(() => {
    endAtRef.current = Date.now() + durationSeconds * 1000;

    // Smooth 60fps-ish updates without layout jank
    intervalRef.current = window.setInterval(() => {
      const left = Math.max(0, endAtRef.current - Date.now());
      setRemainingMs(left);
      if (left <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 100); // update every 100ms for smooth bar + readable seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [durationSeconds]);

  const secondsLeft = Math.ceil(remainingMs / 1000);
  const progress = Math.max(0, Math.min(100, (remainingMs / (durationSeconds * 1000)) * 100));
  const timeUp = remainingMs <= 0;

  const handleClick = (idx: number) => {
    if (picked !== null || timeUp) return; // prevent double/timed-out clicks
    setPicked(idx);
    onAnswer(idx);
  };

  return (
    <div className="w-full max-w-xl border border-red-800/40 bg-zinc-950/90 rounded-2xl p-6 shadow-[0_0_40px_rgba(220,38,38,0.15)]">
      {/* Header + timer */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-3xl font-extrabold text-red-500 tracking-wide">
          🔮 Pytanie {questionNumber}
        </h2>

        <div className="flex items-center gap-2">
          <span className={`font-mono text-lg ${timeUp ? "text-red-500" : "text-red-200"}`}>
            {secondsLeft}s
          </span>
          <span className="text-zinc-500 text-sm italic">(odliczanie)</span>
        </div>
      </div>

      {/* Pressure bar */}
      <div className="w-full h-2 rounded-full bg-red-950/40 overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-red-500 via-red-400 to-rose-400 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-lg text-red-100 mb-6">{question}</p>

      <div className="grid gap-3">
        {answers.map((a, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={picked !== null || timeUp}
            className={`w-full text-left px-4 py-3 rounded-xl border bg-zinc-900/70 hover:bg-red-900/20 transition
              ${picked === i ? "border-red-500" : "border-red-800/50"}
              ${timeUp ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Footer message */}
      {picked !== null ? (
        <p className="mt-4 text-sm text-zinc-400 italic">
          Zapisano odpowiedź. Czekamy na następną zagadkę z mroku…
        </p>
      ) : timeUp ? (
        <p className="mt-4 text-sm text-red-400 italic">
          ⏳ Czas minął! Mrok pożarł to pytanie…
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-500 italic">
          Pospiesz się, zanim płomień zgaśnie…
        </p>
      )}
    </div>
  );
}

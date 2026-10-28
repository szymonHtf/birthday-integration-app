"use client";

import { useEffect, useRef, useState } from "react";
import QuestionView from "./QuestionView";
import { api, type AnswerPayload, type ApiQuestion } from "../lib/api";
import { getCookieInt, setCookie } from "../lib/cookies";
import { answerLabel } from "../components/AnswerContent";
import { describeSchedule } from "../lib/format";
import type { Identity } from "./useIdentity";

const POLL_MS = 2000;

export default function Quiz({ identity }: { identity: Identity }) {
  const member = identity.member;
  const { schedule, teammates } = identity;
  const [team, setTeam] = useState<string>(identity.team);

  const [current, setCurrent] = useState<ApiQuestion | null>(null); // question of the current round

  const [lastAnswered, setLastAnswered] = useState<number>(() => getCookieInt("lastAnsweredQuestionNumber") ?? 0);
  const lastShownRef = useRef<number>(0);

  useEffect(() => {
    setTeam(identity.team);
  }, [identity.team]);

  useEffect(() => {
    if (!member) return;

    const tick = async () => {
      try {
        const data = await api.question(member);
        if (!data) return; // quiz not started yet

        // The server knows the real team – fix the cookie if it is stale.
        if (data.team && data.team !== team) {
          setTeam(data.team);
          setCookie("team", data.team);
        }

        const round = Number(data.round);
        if (!Number.isFinite(round)) {
          console.warn("Invalid round from API:", data.round);
          return;
        }

        if (round > lastAnswered && round !== lastShownRef.current) {
          lastShownRef.current = round;
          setCurrent(data);
        }
      } catch (error) {
        console.error("Question poll failed:", error);
      }
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [member, team, lastAnswered]);

  const submitAnswer = async (question: ApiQuestion, choiceIndex: number) => {
    if (!member || question.round == null || !question.answers[choiceIndex]) return;

    const payload: AnswerPayload = {
      member,
      round: question.round,
      answer_index: choiceIndex + 1,
      answer_text: answerLabel(question.answers[choiceIndex], choiceIndex),
    };

    try {
      await api.submitAnswer(payload);
      console.log("Answer submitted");
    } catch (e) {
      console.error("Answer submit error:", e);
    }
  };

  const handleAnswer = (choiceIndex: number) => {
    if (!current || current.round == null) return;
    const round = current.round;
    // Optimistic update (feels snappier)
    if (round > lastAnswered) {
      setLastAnswered(round);
      setCookie("lastAnsweredQuestionNumber", String(round));
    }
    submitAnswer(current, choiceIndex); // fire-and-forget

    // Hide current question; wait for a newer round via polling
    setCurrent(null);
  };

  return (
    <section className="w-full bg-black text-red-100 min-h-screen flex flex-col items-center justify-between p-1">
      {/* Header */}
      <div className="w-full max-w-xl text-center border border-red-800/40 bg-zinc-950 rounded-2xl p-2 shadow-[0_0_40px_rgba(220,38,38,0.1)]">
        <h1 className="text-xl font-extrabold uppercase tracking-widest text-red-500 mb-2 animate-pulse">
          👁 Halloween Quiz! 👁
        </h1>
        <p className="text-zinc-400 italic mb-2 text-sm">
          Zimne powietrze... migające świece... wasza przyszłość została przypieczętowana.
        </p>

        <div className="space-y-2 text-left text-sm md:text-base">
          <p>
            🕯️ <span className="text-red-400 font-semibold">Jesteś:</span>{" "}
            <span className="text-red-300">{member}</span>
          </p>
          <p>
            🩸 <span className="text-red-400 font-semibold">Twoja drużyna to:</span>{" "}
            <span className="text-red-300">{team ?? "…"}</span>
          </p>
          <p>
            💀 <span className="text-red-400 font-semibold">Odpowiadasz o:</span>{" "}
            <span data-testid="quiz-schedule" className="text-red-300">
              {schedule.length > 0 ? describeSchedule(schedule) : teammates.join(", ") || "…"}
            </span>
          </p>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-col items-center justify-center flex-grow text-center">
        {current && current.round != null ? (
          <QuestionView
            key={current.round} // forces a fresh timer per round
            round={current.round}
            subject={current.subject}
            question={current.question}
            image={current.image}
            answers={current.answers}
            onAnswer={handleAnswer}
            durationSeconds={20}
          />
        ) : (
          <>
            <h2 className="text-3xl font-bold text-red-600 mb-6">🔮 Prawdziwa próba się zaczyna...</h2>
            <p className="text-zinc-400 italic">(Czekamy na kolejne pytanie z ciemności 👻)</p>
          </>
        )}
      </div>

      {/* Footer */}
      <p className="text-sm text-zinc-600 italic mb-8">
        Strzeż się... ci, którzy odpowiadają źle, znikają w ciemnościach...
      </p>
    </section>
  );
}

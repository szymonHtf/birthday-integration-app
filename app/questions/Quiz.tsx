"use client";

import { useEffect, useRef, useState } from "react";
import QuestionView from "./QuestionView";

const QUESTION_ENDPOINT =
    "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod/question";

// ⬇️ change this if your API is different
const ANSWER_ENDPOINT =
    "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod/answer";

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 180) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(
        value
    )};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function getCookieInt(name: string): number | null {
    const v = getCookie(name);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

type ApiQuestion = {
    question: string;
    question_number: string; // API gives it as string
    answer1: string;
    answer2: string;
    answer3: string;
    answer4: string;
};

// (optional) TS type for payload you send
type AnswerPayload = {
    member: string;
    team: string;
    teammate: string;
    question_number: number;
    answer_index: number; // 0-3
    answer_text: string;
};

export default function Quiz() {
    const [member, setMember] = useState<string | null>(null);
    const [team, setTeam] = useState<string | null>(null);
    const [teammate, setTeammate] = useState<string | null>(null);

    const [question, setQuestion] = useState<string | null>(null);
    const [questionNumber, setQuestionNumber] = useState<number | null>(null);
    const [answers, setAnswers] = useState<string[] | null>(null);

    const [lastAnswered, setLastAnswered] = useState<number>(
        getCookieInt("lastAnsweredQuestionNumber") ?? 0
    );

    const lastShownRef = useRef<number>(0);

    useEffect(() => {
        setMember(getCookie("member"));
        setTeam(getCookie("team"));
        setTeammate(getCookie("teammate"));
    }, []);

    useEffect(() => {
        if (!member || !team || !teammate) return;

        const tick = async () => {
            try {
                const url = new URL(QUESTION_ENDPOINT);
                url.searchParams.append("member", member);
                url.searchParams.append("team", team);
                url.searchParams.append("teammate", teammate);

                const response = await fetch(url.toString(), { method: "GET" });
                console.log("Question response status:", response.status);

                if (response.status === 409) return;

                if (response.status === 200) {
                    const data: ApiQuestion = await response.json();
                    const num = Number(data.question_number);
                    if (!Number.isFinite(num)) {
                        console.warn("Invalid question_number from API:", data.question_number);
                        return;
                    }

                    if (num > lastAnswered && num !== lastShownRef.current) {
                        lastShownRef.current = num;
                        setQuestion(data.question);
                        setQuestionNumber(num);
                        setAnswers([data.answer1, data.answer2, data.answer3, data.answer4]);
                    }
                }
            } catch (error) {
                console.error("Question poll failed:", error);
            }
        };

        tick();
        const interval = setInterval(tick, 2000);
        return () => clearInterval(interval);
    }, [member, team, teammate, lastAnswered]);

    // ⬇️ POSTS the answer
    const submitAnswer = async (choiceIndex: number) => {
        if (
            !member ||
            !team ||
            !teammate ||
            questionNumber == null ||
            !answers ||
            !answers[choiceIndex]
        ) {
            return;
        }

        const payload: AnswerPayload = {
            member,
            team,
            teammate,
            question_number: questionNumber,
            answer_index: choiceIndex + 1,
            answer_text: answers[choiceIndex],
        };

        try {
            const res = await fetch(ANSWER_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                // If your API Gateway expects CORS with credentials,
                // add: credentials: "include",
                body: JSON.stringify(payload),
                // keepalive helps when the user navigates away right after clicking
                keepalive: true,
            });

            // Optional: handle response body if your API returns result/score
            if (!res.ok) {
                const text = await res.text().catch(() => "");
                console.error("Answer submit failed:", res.status, text);
            } else {
                console.log("Answer submitted:", res.status);
            }
        } catch (e) {
            console.error("Answer submit error:", e);
        }
    };

    const handleAnswer = async (choiceIndex: number) => {
        // (A) Optimistic update (feels snappier)
        if (questionNumber && questionNumber > lastAnswered) {
            setLastAnswered(questionNumber);
            setCookie("lastAnsweredQuestionNumber", String(questionNumber));
        }
        // Post the answer (await if you want to block UI until done)
        // await submitAnswer(choiceIndex); // to block UI till it finishes
        submitAnswer(choiceIndex); // fire-and-forget

        // Hide current question; wait for a newer one via polling
        setQuestion(null);
        setQuestionNumber(null);
        setAnswers(null);
    };

    if (!member || !team || !teammate) return null;

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
                        <span className="text-red-300">{team}</span>
                    </p>
                    <p>
                        💀 <span className="text-red-400 font-semibold">Twój partner to:</span>{" "}
                        <span className="text-red-300">{teammate}</span>
                    </p>
                </div>
            </div>

            {/* Main */}
            <div className="flex flex-col items-center justify-center flex-grow text-center">
                {question && questionNumber && answers ? (
                    <QuestionView
                        key={questionNumber}                // 🔑 forces a fresh timer per question
                        questionNumber={questionNumber}
                        question={question}
                        answers={answers}
                        onAnswer={handleAnswer}
                        durationSeconds={20}                // ⏱️ optional; defaults to 20 if omitted
                    />
                ) : (
                    <>
                        <h2 className="text-3xl font-bold text-red-600 mb-6">
                            🔮 Prawdziwa próba się zaczyna...
                        </h2>
                        <p className="text-zinc-400 italic">
                            (Czekamy na kolejne pytanie z ciemności 👻)
                        </p>
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

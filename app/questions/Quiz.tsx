"use client";

import { useEffect, useState } from "react";

function getCookie(name: string) {
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

export default function Quiz() {
    const [member, setMember] = useState<string | null>(null);
    const [team, setTeam] = useState<string | null>(null);
    const [teammate, setTeammate] = useState<string | null>(null);

    useEffect(() => {
        setMember(getCookie("member"));
        setTeam(getCookie("team"));
        setTeammate(getCookie("teammate"));
    }, []);

    if (!member || !team || !teammate) return null;

    return (
        <section className="w-full bg-black text-red-100 min-h-screen flex flex-col items-center justify-between p-6">
            {/* 🕯️ Header (Top Info) */}
            <div className="w-full max-w-xl text-center border border-red-800/40 bg-zinc-950 rounded-2xl p-6 shadow-[0_0_40px_rgba(220,38,38,0.1)]">
                <h1 className="text-2xl font-extrabold uppercase tracking-widest text-red-500 mb-2 animate-pulse">
                    👁 Witaj w halloweenowym quizie! 👁
                </h1>
                <p className="text-zinc-400 italic mb-4">
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

            {/* 🧛 Main Quiz Area (Center) */}
            <div className="flex flex-col items-center justify-center flex-grow text-center">
                <h2 className="text-3xl font-bold text-red-600 mb-6">
                    🔮 Prawdziwa próba się zaczyna...
                </h2>
                <p className="text-zinc-400 italic">
                    (Tu pojawią się pytania quizu... przygotuj się na mrok 👻)
                </p>
            </div>

            {/* 🕸️ Footer */}
            <p className="text-sm text-zinc-600 italic mb-4">
                Strzeż się... ci, którzy odpowiadają źle, znikają w ciemnościach...
            </p>
        </section>
    );
}

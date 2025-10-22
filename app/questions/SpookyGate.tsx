"use client";

import { useState } from "react";

function setCookie(name: string, value: string, days = 180) {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(
        value
    )};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}


export default function SpookyGate() {
    const [code, setCode] = useState("");
    const [shake, setShake] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!code) return;
        setLoading(true);

        // optional spooky delay
        await new Promise((r) => setTimeout(r, 1000));
        const res = await fetch(
            "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod/code",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: code }),
            }
        );
        
        if (!res.ok) {
            setShake(true);
            setTimeout(() => setShake(false), 400);
        } else {
            const data = await res.json();
            setCookie("member", data.data.member);
            setCookie("teammate", data.data.teammate);
            setCookie("team", data.data.assigned);

            window.location.reload();
        }


        // if (target && code === target) {
        //   setCookie(cookieName, code);
        //   setStatus("unlocked");
        //   onUnlocked?.();
        // } else {
        //   // wrong code → shake
        //   setShake(true);
        //   setTimeout(() => setShake(false), 400);
        // }
        setLoading(false);
    };


    //   if (status === "checking") {
    //     return (
    //       <section className="w-full bg-black text-white">
    //         <div className="mx-auto max-w-md px-4 py-10">
    //           <div className="rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-sm">
    //             <p className="animate-pulse text-center text-sm text-zinc-400">
    //               Sprawdzam kryptę…
    //             </p>
    //           </div>
    //         </div>
    //       </section>
    //     );
    //   }

    return (
        <section className="w-full bg-black text-white">
            <div className="mx-auto max-w-md px-4 py-10">
                <div
                    className={`rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-[0_0_40px_rgba(220,38,38,0.08)] ${shake ? "animate-[shake_0.4s_ease]" : ""
                        }`}
                    style={{
                        // simple keyframes without global CSS file
                        ["--tw-animate-shake" as any]: "shake",
                    }}
                >
                    <style jsx>{`
            @keyframes shake {
              10% {
                transform: translateX(-2px);
              }
              20% {
                transform: translateX(3px);
              }
              30% {
                transform: translateX(-4px);
              }
              40% {
                transform: translateX(4px);
              }
              50% {
                transform: translateX(-2px);
              }
              60% {
                transform: translateX(2px);
              }
              70% {
                transform: translateX(-1px);
              }
              80% {
                transform: translateX(1px);
              }
              90% {
                transform: translateX(-1px);
              }
              100% {
                transform: translateX(0);
              }
            }
          `}</style>

                    <h2 className="text-center text-2xl font-extrabold uppercase tracking-wider">
                        Wejście tylko dla wybranych
                    </h2>
                    <p className="mt-2 text-center text-sm text-zinc-400">
                        Wpisz sekretny kod, aby rozproszyć mrok…
                    </p>

                    <div className="mt-6 space-y-3">
                        <label className="block text-xs uppercase tracking-widest text-red-400/80">
                            Sekretny kod
                        </label>
                        <input
                            type="password"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="•••••"
                            className="w-full rounded-lg border border-red-800/40 bg-zinc-900 px-4 py-3 outline-none ring-0 placeholder-zinc-600 focus:border-red-500"
                        />

                        <button
                            onClick={handleSubmit}
                            disabled={loading || !code}
                            className={`w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide transition ${loading
                                    ? "bg-red-900/60 text-red-200 cursor-wait"
                                    : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                                }`}
                        >
                            {loading ? "Weryfikuję…" : "Otwórz wrota"}
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

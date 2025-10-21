// app/TeamDraw.tsx — Client Component (simplified, spooky style)
"use client";
import { useState } from "react";
import LoadingBarFillOnce from "./LoadingBarFillOnce";

export function TeamDraw() {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const spin = () => {
        setLoading(true);
        setResult(null);
        setTimeout(() => {
            setResult("CZERWONI"); // <- plug in your actual random draw logic when ready
            setLoading(false);
        }, 3000);
    };

    return (
        <section className="w-full bg-black text-white">
            <div className="mx-auto max-w-md px-4 py-10">
                <div className="rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-sm">
                    <h2 className="text-center text-2xl font-extrabold uppercase tracking-wider">
                        Przydział do Drużyny
                    </h2>
                    <p className="mt-2 text-center text-sm text-zinc-400">
                        Wciśnij przycisk, aby zostać przydzielonym do drużyny!
                    </p>

                    <div className="mt-6 flex flex-col items-center">
                        <button
                            onClick={spin}
                            disabled={loading}
                            className={`w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide transition
                ${loading
                                    ? "bg-red-900/60 text-red-200 cursor-not-allowed"
                                    : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                                }
              `}
                        >
                            {loading ? "Losuję…" : "Przydziel!"}
                        </button>

                        {loading && (
                            <div className="mt-6 w-full">
                                <LoadingBarFillOnce />
                            </div>
                        )}

                        <div className="mt-6 w-full min-h-[80px]" aria-live="polite">
                            {result && (
                                <div className="rounded-xl border border-red-800/40 bg-zinc-900 p-4">
                                    <p className="text-center text-sm text-zinc-400">Twoja drużyna to:</p>
                                    <p className="mt-2 text-center text-2xl font-black uppercase tracking-wide">
                                        <span className="rounded-md border border-red-800/40 bg-red-900/20 px-2 py-1 text-red-200">
                                            {result}
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

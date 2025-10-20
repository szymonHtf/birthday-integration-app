// app/page.tsx (or wherever you want it)
"use client";
import { useState, useRef } from "react";
import LoadingBarFillOnce from "./LoadingBarFillOnce";

export default function TeamDraw() {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const spin = () => {
        setLoading(true)
        setResult(null);

          setTimeout(() => {
            setResult("Czerwoni");
            setLoading(false);
        }, 5000); // 5000 ms = 5 seconds
    };

    return (
        <div className="min-h-400px flex flex-col items-center justify-center text-white p-2 border-white border-2 rounded-md">
            <h1 className="text-2xl mb-4">Wciśnij przycisk, aby zostać przydzielonym do drużyny!</h1>
            <button onClick={spin} className={`px-6 py-3 rounded-lg mb-8 transition
    ${loading ? "bg-orange-800 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"}
  `} disabled={loading}>
                {loading ? "Losuję..." : "Przydziel!"}
            </button>
            {loading && <LoadingBarFillOnce />}
            {result && <p className="mt-6 text-2xl">You got: <strong>{result}</strong></p>}
        </div>
    );
}

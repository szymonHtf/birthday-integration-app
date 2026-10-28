"use client";

import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { setCookie } from "../lib/cookies";

export default function SpookyGate() {
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!code) return;
    setLoading(true);
    setMessage(null);

    // optional spooky delay
    await new Promise((r) => setTimeout(r, 1000));

    try {
      const { data } = await api.code(code.trim());
      setCookie("code", code.trim());
      setCookie("member", data.member);
      setCookie("team", data.team ?? data.assigned);
      setCookie("teammates", JSON.stringify(data.teammates ?? []));
      setCookie("schedule", JSON.stringify(data.schedule ?? []));
      window.location.reload();
      return;
    } catch (e) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (e instanceof ApiError && e.status === 409) {
        setMessage(e.message); // not assigned to a team yet
      } else if (e instanceof ApiError && e.status === 400) {
        setMessage("Zły kod… mrok nie ustępuje.");
      } else {
        setMessage("Krypta nie odpowiada. Spróbuj ponownie.");
      }
    }
    setLoading(false);
  };

  return (
    <section className="w-full bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <div
          className={`rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-[0_0_40px_rgba(220,38,38,0.08)] ${
            shake ? "animate-[shake_0.4s_ease]" : ""
          }`}
        >
          <style jsx>{`
            @keyframes shake {
              10% { transform: translateX(-2px); }
              20% { transform: translateX(3px); }
              30% { transform: translateX(-4px); }
              40% { transform: translateX(4px); }
              50% { transform: translateX(-2px); }
              60% { transform: translateX(2px); }
              70% { transform: translateX(-1px); }
              80% { transform: translateX(1px); }
              90% { transform: translateX(-1px); }
              100% { transform: translateX(0); }
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
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder="•••••"
              className="w-full rounded-lg border border-red-800/40 bg-zinc-900 px-4 py-3 outline-none ring-0 placeholder-zinc-600 focus:border-red-500"
            />

            {message && <p className="text-center text-sm text-red-300">{message}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !code}
              className={`w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide transition ${
                loading
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

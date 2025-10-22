// app/TeamDraw.tsx — Client Component (simplified, spooky style)
"use client";
import { useEffect, useState } from "react";
import LoadingBarFillOnce from "./LoadingBarFillOnce";

export function TeamDraw() {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [player, setPlayer] = useState<string>("");

    useEffect(() => {
        async function fetchUnassignedMember() {
            try {
                const res = await fetch(
                    "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod/unassigned-member"
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const memberName = data?.unassigned_member?.member;
                if (memberName) {
                    setPlayer(memberName);
                } else {
                    setPlayer("Brak nieprzydzielonych 😅");
                }
            } catch (err) {
                console.error("Failed to fetch unassigned member:", err);
                setPlayer("Błąd pobierania gracza 😢");
            }
        }
        fetchUnassignedMember();
    }, []);

    const spin = async () => {
        if (!player || player.startsWith("Brak") || player.startsWith("Błąd")) return;

        setLoading(true);
        setResult(null);

        try {
            // 🔥 POST to assign the player
            const res = await fetch(
                "https://rqonsjtbbk.execute-api.eu-central-1.amazonaws.com/Prod/assign",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ member: player }),
                }
            );

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            console.log("✅ Assignment response:", data);

            // Assuming the backend returns something like { team: "CZERWONI" }
            const team = data?.team || "Nieznana drużyna 🤔";

            // Simulate suspense delay (optional)
            setTimeout(() => {
                setResult(team);
                setLoading(false);
            }, 3000);
        } catch (err) {
            console.error("Failed to assign member:", err);
            setLoading(false);
            setResult("Błąd przydzielania 😢");
        }
    };

  // 👇 reload page to get the next unassigned player
  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <section className="w-full text-white">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border border-red-800/40 bg-zinc-950 p-6 shadow-sm">
          <h2 className="text-center text-2xl font-extrabold uppercase tracking-wider">
            Przydział do Drużyny{" "}
            <span className="text-red-500">{player}</span>
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Wciśnij przycisk, aby zostać przydzielonym do drużyny!
          </p>

          <div className="mt-6 flex flex-col items-center">
            {!result ? (
              <button
                onClick={spin}
                disabled={loading || !player || player.startsWith("Brak")}
                className={`w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide transition
                  ${
                    loading
                      ? "bg-red-900/60 text-red-200 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 active:bg-red-800"
                  }
                `}
              >
                {loading ? "Losuję…" : "Przydziel!"}
              </button>
            ) : (
              <button
                onClick={reloadPage}
                className="w-full rounded-lg px-6 py-3 text-base font-semibold uppercase tracking-wide bg-red-700 hover:bg-red-800 active:bg-red-900 transition"
              >
                Następna osoba ↻
              </button>
            )}

            {loading && (
              <div className="mt-6 w-full">
                <LoadingBarFillOnce />
              </div>
            )}

            <div className="mt-6 w-full" aria-live="polite">
              {result && (
                <div className="rounded-xl border border-red-800/40 bg-red-950 p-4">
                  <p className="text-center text-sm text-zinc-400">
                    Twoja drużyna to:
                  </p>
                  <p className="mt-2 text-center text-2xl font-black uppercase tracking-wide">
                    <span className="rounded-md border px-2 py-1 text-red-200">
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
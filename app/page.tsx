const LINKS = [
  { href: "/team-draw", title: "Losowanie drużyn", hint: "projektor – obecność, losowanie, spóźnialscy", icon: "🎃" },
  { href: "/questions", title: "Telefony gości", hint: "kod → quiz → questy → wyniki", icon: "📱" },
  { href: "/host", title: "Panel prowadzącego", hint: "etapy, rundy quizu, Beyblade", icon: "🗝️" },
  { href: "/answers", title: "Odpowiedzi z quizu", hint: "projektor – slajd po slajdzie", icon: "🔮" },
  { href: "/leaderboard", title: "Ranking", hint: "projektor – punkty na żywo", icon: "🏆" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <main className="w-full max-w-2xl">
        <h1 className="text-center text-3xl font-extrabold uppercase tracking-widest">
          Spoooky <span className="text-red-500">• Urodziny Asi</span>
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-400">Get ready to have some fun!</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="flex items-center gap-4 rounded-2xl border border-red-800/40 bg-zinc-950 p-4 transition hover:border-red-500 hover:bg-red-900/20"
              >
                <span className="text-3xl">{l.icon}</span>
                <span>
                  <span className="block font-bold uppercase tracking-wide text-red-200">{l.title}</span>
                  <span className="block text-xs text-zinc-500">{l.hint}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

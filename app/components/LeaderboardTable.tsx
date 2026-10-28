import type { LeaderboardRow, QuestConfig, QuestState } from "../lib/api";
import { formatDuration, formatPoints } from "../lib/format";

type Props = {
  rows: LeaderboardRow[];
  quests: QuestConfig[];
  highlight?: string; // team name to emphasise (the viewer's team)
  compact?: boolean; // phones: only rank, team and total
};

function questCell(quest: QuestConfig, state: QuestState | undefined) {
  if (!state || state.status === "available") return <span className="text-zinc-600">–</span>;
  if (state.status === "running") return <span className="text-yellow-300">w trakcie…</span>;
  const result = quest.type === "timed" ? formatDuration(state.elapsed_seconds) : `${state.rounds} rund`;
  return (
    <span>
      <span className="text-zinc-200">{result}</span>{" "}
      <span className="text-red-300">({formatPoints(state.points)})</span>
    </span>
  );
}

const medal = (rank: number) => (rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`);

export default function LeaderboardTable({ rows, quests, highlight, compact }: Props) {
  if (rows.length === 0) {
    return <p className="text-center text-zinc-500">Brak drużyn – najpierw losowanie.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-separate border-spacing-y-2 ${compact ? "text-sm" : "text-base"}`}>
        <thead className="text-xs uppercase tracking-widest text-zinc-500">
          <tr>
            <th className="px-3 text-left">#</th>
            <th className="px-3 text-left">Drużyna</th>
            {!compact && <th className="px-3 text-left">Quiz</th>}
            {!compact &&
              quests.map((q) => (
                <th key={q.id} className="px-3 text-left">
                  {q.type === "rounds" ? "🌀" : "⏱️"} {q.name}
                </th>
              ))}
            <th className="px-3 text-right">Razem</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const mine = highlight === row.team_name;
            return (
              <tr
                key={row.team_name}
                data-testid="leaderboard-row"
                className={`rounded-xl ${mine ? "bg-red-900/30 ring-1 ring-red-500/60" : "bg-zinc-950"}`}
              >
                <td className="rounded-l-xl px-3 py-3 text-2xl">{medal(row.rank)}</td>
                <td className="px-3 py-3">
                  <div className="font-extrabold uppercase tracking-wide text-red-200">{row.team_name}</div>
                  <div className="text-xs text-zinc-500">{row.players.join(", ")}</div>
                </td>
                {!compact && (
                  <td className="px-3 py-3">
                    <span className="text-zinc-200">
                      {row.quiz.correct}/{row.quiz.expected}
                    </span>{" "}
                    <span className="text-red-300">({formatPoints(row.quiz.points)})</span>
                  </td>
                )}
                {!compact &&
                  quests.map((q) => (
                    <td key={q.id} className="px-3 py-3">
                      {questCell(q, row.quests[q.id])}
                    </td>
                  ))}
                <td className="rounded-r-xl px-3 py-3 text-right text-xl font-black text-red-400" data-testid="leaderboard-total">
                  {formatPoints(row.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

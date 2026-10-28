/** Polish plural: plural(1, "gracz", "gracze", "graczy") -> "1 gracz". */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = many;
  if (n === 1) word = one;
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = few;
  return `${n} ${word}`;
}

export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 3;

/** Allowed number of teams for n players (every team 2..3 players), or null if n < 2. */
export function teamCountBounds(n: number): { lo: number; hi: number } | null {
  if (n < MIN_TEAM_SIZE) return null;
  return { lo: Math.ceil(n / MAX_TEAM_SIZE), hi: Math.floor(n / MIN_TEAM_SIZE) };
}

/** How many teams of 2 and of 3 for n players in t teams. */
export function planSizes(n: number, t: number): { twos: number; threes: number } {
  const threes = n - MIN_TEAM_SIZE * t;
  return { twos: t - threes, threes };
}

export function describeSizes(twos: number, threes: number): string {
  const parts: string[] = [];
  if (twos > 0) parts.push(`${twos} × 2 os.`);
  if (threes > 0) parts.push(`${threes} × 3 os.`);
  return parts.join(" + ");
}

/** "Monika (1–3), Zuza (4–6)" – contiguous rounds grouped by subject; a pair gives just "Zuza". */
export function describeSchedule(schedule: { round: number; subject: string }[]): string {
  const groups: { subject: string; from: number; to: number }[] = [];
  for (const entry of [...schedule].sort((a, b) => a.round - b.round)) {
    const last = groups[groups.length - 1];
    if (last && last.subject === entry.subject && last.to === entry.round - 1) last.to = entry.round;
    else groups.push({ subject: entry.subject, from: entry.round, to: entry.round });
  }
  if (groups.length === 1) return groups[0].subject;
  return groups.map((g) => `${g.subject} (${g.from === g.to ? g.from : `${g.from}–${g.to}`})`).join(", ");
}

/** 65.4 -> "1:05", 3725 -> "1:02:05" */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "–";
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** 2 -> "2 pkt", 1 -> "1 pkt", 2.5 -> "2,5 pkt" */
export function formatPoints(points: number | null | undefined): string {
  if (points == null) return "–";
  return `${Number.isInteger(points) ? points : points.toFixed(1).replace(".", ",")} pkt`;
}

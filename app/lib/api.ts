// Single place for the backend URL and typed API calls.
// Override the backend with NEXT_PUBLIC_API_BASE (see .env.example).
export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/+$/, "") ||
  "https://lvtaqauac9.execute-api.eu-central-1.amazonaws.com/Prod";

/** ---- Shapes returned by the backend ---- */

/** One round of one player: in round `round` they answer question `question_number` about `subject`. */
export type Slot = { member: string; round: number; subject: string; question_number: number };

export type ScheduleEntry = Omit<Slot, "member">;

export type Team = { team_name: string; players: string[]; slots: Slot[] };

export type MemberInfo = {
  member: string;
  present: boolean;
  assigned: string | null;
};

export type DrawPlan = {
  team_count: number;
  players: number;
  teams_of_2: number | null;
  teams_of_3: number | null;
  min_teams?: number;
  max_teams?: number;
  error?: string;
};

export type MembersResponse = {
  members: MemberInfo[];
  draw_started: boolean;
  plan: DrawPlan | null;
};

export type TeamsResponse = { teams: Team[] };

export type StartDrawResponse = { teams: Team[]; members: MemberInfo[]; plan: DrawPlan };

export type AssignResponse = { member: string; team: string; teammates: string[] };

export type CodeResponse = {
  data: {
    member: string;
    assigned: string;
    team: string;
    teammates: string[];
    schedule: ScheduleEntry[];
    rounds: number;
  };
};

/** An answer option: text, a photo, or a photo with a caption. */
export type QuestionAnswer = { text: string | null; image: string | null };

export type ApiQuestion = {
  subject: string; // who the question is about
  question_number: number; // 1..6 within the subject's questions
  question: string;
  image: string | null; // optional photo shown with the question
  answers: QuestionAnswer[]; // always 4
  round?: number; // GET /question only
  team?: string;
  teammates?: string[];
};

export type AnswerType = "QUESTION_ONLY" | "USER_ANSWER" | "CORRECT_ANSWER";

export type ApiAnswer = ApiQuestion & {
  user_answer?: string | null; // "answer1".."answer4"
  who_answered?: string | null;
  answer_text?: string | null;
  correct_answer?: string | null; // "answer1".."answer4"
};

export type AnswerPayload = {
  member: string;
  round: number;
  answer_index: number; // 1..4
  answer_text?: string;
};

/** ---- Party stages, quests, host panel, leaderboard ---- */
export type Stage = "quiz" | "quests" | "finished";
export type QuestType = "timed" | "rounds";
export type QuestStatus = "available" | "running" | "done";

export type QuestConfig = {
  id: string;
  name: string;
  type: QuestType;
  description: string;
  requires_code: boolean;
};

export type QuestState = {
  id: string;
  status: QuestStatus;
  started_at: number | null; // epoch ms (server clock)
  finished_at: number | null;
  elapsed_seconds: number | null; // timed quests; keeps counting while running
  rounds: number | null; // Beyblade result
  metric?: number | null; // leaderboard only
  rank?: number | null;
  points?: number;
};

export type GameState = {
  stage: Stage;
  question_number: number; // published quiz round, 0 = not started
  rounds: number;
  quests: QuestConfig[];
  now: number;
};

export type TeamQuests = {
  team: string;
  players: string[];
  running: string | null;
  quests: Record<string, QuestState>;
  now: number;
};

export type QuizScore = {
  correct: number;
  answered: number;
  expected: number;
  ratio: number | null;
  rank: number | null;
  points: number;
};

export type LeaderboardRow = {
  team_name: string;
  players: string[];
  quiz: QuizScore;
  quests: Record<string, QuestState>;
  total: number;
  rank: number;
};

export type LeaderboardResponse = { stage: Stage; quests: QuestConfig[]; teams: LeaderboardRow[]; now: number };

export type HostQuestAction = "reset" | "finish" | "set_rounds" | "set_elapsed";

export class ApiError extends Error {
  status: number;
  code: string | undefined;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string | undefined>;
  keepalive?: boolean;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value) url.searchParams.set(key, value);
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    cache: "no-store",
    keepalive: options.keepalive,
  };
  if (options.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(url.toString(), init);
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const obj = (data && typeof data === "object" ? data : {}) as {
      message?: string;
      error?: string;
      details?: string;
    };
    throw new ApiError(
      res.status,
      obj.message ?? obj.details ?? obj.error ?? `${init.method} ${path} failed (${res.status})`,
      obj.error
    );
  }
  return data as T;
}

export const api = {
  teams: () => request<TeamsResponse>("/teams"),

  members: () => request<MembersResponse>("/members"),

  /** (Re)starts the draw: who is present and how many teams. Wipes previous assignments. */
  startDraw: (members: string[], teamCount?: number) =>
    request<StartDrawResponse>("/draw/start", {
      method: "POST",
      body: { members, team_count: teamCount ?? null },
    }),

  setPresent: (member: string, present: boolean) =>
    request<{ member: MemberInfo }>("/draw/present", { method: "POST", body: { member, present } }),

  assign: (member: string) => request<AssignResponse>("/assign", { method: "POST", body: { member } }),

  code: (code: string) => request<CodeResponse>("/code", { method: "POST", body: { code } }),

  /** The member's question for the published round; null while the quiz has not started (HTTP 409). */
  question: async (member: string) => {
    try {
      return await request<ApiQuestion>("/question", { query: { member } });
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) return null;
      throw e;
    }
  },

  answer: (type: AnswerType, subject: string, questionNumber: number) =>
    request<ApiAnswer>("/answer", {
      query: { type, subject, question_number: String(questionNumber) },
    }),

  submitAnswer: (payload: AnswerPayload) =>
    request<{ status: string }>("/answer", { method: "POST", body: payload, keepalive: true }),

  state: () => request<GameState>("/state"),

  teamQuests: (by: { member?: string; team?: string }) => request<TeamQuests>("/quests", { query: by }),

  startQuest: (member: string, quest: string) =>
    request<TeamQuests>("/quests/start", { method: "POST", body: { member, quest } }),

  finishQuest: (member: string, quest: string, code?: string) =>
    request<TeamQuests>("/quests/finish", { method: "POST", body: { member, quest, code } }),

  leaderboard: () => request<LeaderboardResponse>("/leaderboard"),

  /** Host panel. An empty patch just checks the code. */
  hostState: (hostCode: string, patch: { stage?: Stage; question_number?: number } = {}) =>
    request<GameState>("/host/state", { method: "POST", body: { host_code: hostCode, ...patch } }),

  hostQuest: (
    hostCode: string,
    team: string,
    quest: string,
    action: HostQuestAction,
    extra: { rounds?: number; elapsed_seconds?: number } = {}
  ) =>
    request<TeamQuests>("/host/quest", {
      method: "POST",
      body: { host_code: hostCode, team, quest, action, ...extra },
    }),
};

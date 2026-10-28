// Browser smoke test of the whole party flow (draw → phone quiz → results → restart).
//
//   backend:  python local_server.py                       (in ../birthday-integration-app-backend)
//   frontend: NEXT_PUBLIC_API_BASE=http://127.0.0.1:8787 npm run dev
//   test:     npm run e2e                                  (needs Google Chrome installed)
//
// Env: APP_BASE (default http://127.0.0.1:3000), API_BASE (default http://127.0.0.1:8787), OUT_DIR for screenshots.
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.APP_BASE || "http://127.0.0.1:3000";
const API = process.env.API_BASE || "http://127.0.0.1:8787";
const SHOTS = path.resolve(process.env.OUT_DIR || "e2e/shots");
fs.mkdirSync(SHOTS, { recursive: true });

const problems = [];
const log = (...a) => console.log(...a);
const assert = (cond, msg) => {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
  log(`   ✓ ${msg}`);
};
const apiJson = async (p, init) => {
  const r = await fetch(`${API}${p}`, init);
  return { status: r.status, data: await r.json().catch(() => null) };
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const watch = (page, label) => {
  page.on("pageerror", (e) => problems.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => {
    // "Failed to load resource" is Chrome's own log for expected non-2xx replies (409 before quiz start, 400 wrong code).
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) problems.push(`[${label}] console.error: ${m.text()}`);
  });
  page.on("dialog", (d) => d.accept());
};
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, name), fullPage: true });

const projector = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await projector.newPage();
watch(page, "projector");

try {
  // ------------------------------------------------------------ 1. setup
  log("\n== 1. /team-draw setup");
  await page.goto(`${BASE}/team-draw`);
  await page.getByRole("heading", { name: "Kto jest na imprezie?" }).waitFor({ timeout: 60000 });
  const chip = (name) =>
    page.locator("button[aria-pressed]").filter({ has: page.locator("span.font-semibold", { hasText: new RegExp(`^${name}$`) }) });
  assert((await page.locator("button[aria-pressed]").count()) === 12, "12 guests listed");
  assert(!(await chip("Gaba").textContent()).includes("💞"), "no partner hint on Gaba (couples stay secret)");
  await chip("Łukasz").click();
  await chip("Gaba").click();
  assert((await chip("Gaba").getAttribute("aria-pressed")) === "false", "Gaba unticked");
  let summary = await page.locator("p.text-center.text-lg").textContent();
  assert(summary.includes("10 graczy") && summary.includes("5 drużyn") && summary.includes("5 × 2 os."), `summary for 10 players: ${summary.trim()}`);
  await page.locator("select").selectOption("4");
  summary = await page.locator("p.text-center.text-lg").textContent();
  assert(summary.includes("4 drużyny") && summary.includes("2 × 2 os. + 2 × 3 os."), `summary for 4 teams: ${summary.trim()}`);
  await shot(page, "01-setup.png");

  await page.getByRole("button", { name: /Rozpocznij losowanie/ }).click();
  await page.getByRole("heading", { name: "Przydział do drużyny" }).waitFor({ timeout: 20000 });
  assert((await page.locator('[data-testid="team-card"]').count()) === 4, "board shows 4 teams");
  const header = await page.locator("header p").first().textContent();
  assert(header.includes("10 graczy") && header.includes("4 drużyny"), `board header: ${header.trim()}`);
  await shot(page, "02-draw-started.png");

  // ------------------------------------------------------------ 2. draw everybody
  log("\n== 2. drawing 10 guests");
  const drawn = {};
  for (let i = 0; i < 10; i++) {
    const select = page.locator('[data-testid="draw-player-select"]');
    const options = await select.locator("option").allTextContents();
    assert(options.length === 10 - i, `${options.length} guests left to draw`);
    const pick = options[Math.floor(Math.random() * options.length)];
    await select.selectOption(pick);
    const t0 = Date.now();
    await page.getByRole("button", { name: "Przydziel!" }).click();
    const team = (await page.locator('[data-testid="draw-result-team"]').textContent({ timeout: 15000 })).trim();
    const elapsed = Date.now() - t0;
    assert(elapsed >= 2900, `suspense kept for ${elapsed} ms`);
    drawn[pick] = team;
    log(`   🎃 ${pick} → ${team}`);
    if (i === 0) await shot(page, "03-first-reveal.png");
    await page.getByRole("button", { name: /Następna osoba/ }).click();
  }
  await page.getByText("Wszyscy obecni są przydzieleni!").waitFor();
  await shot(page, "04-all-assigned.png");

  let { data: teamsData } = await apiJson("/teams");
  const sizes = teamsData.teams.map((t) => t.players.length).sort().join(",");
  assert(sizes === "2,2,3,3", `team sizes ${sizes}`);
  const teamOf = (n) => teamsData.teams.find((t) => t.players.includes(n))?.team_name;
  assert(teamOf("Zuza") && teamOf("Zuza") !== teamOf("Hubert N"), "couple Zuza / Hubert N kept apart");
  for (const [name, team] of Object.entries(drawn)) assert(teamOf(name) === team, `${name} really is in ${team}`);
  for (const t of teamsData.teams) {
    const answered = new Set(t.slots.map((s) => `${s.subject}#${s.question_number}`));
    assert(t.slots.length === t.players.length * 6 && answered.size === t.slots.length, `${t.team_name}: every question about every player is answered exactly once`);
    for (const member of t.players) {
      const rounds = t.slots.filter((s) => s.member === member).map((s) => s.round).join(",");
      assert(rounds === "1,2,3,4,5,6", `${member} answers rounds 1-6`);
    }
  }

  // ------------------------------------------------------------ 3. latecomer
  log("\n== 3. latecomer");
  await page.locator('[data-testid="latecomer-select"]').selectOption("Łukasz");
  await page.getByRole("button", { name: "Dodaj do losowania" }).click();
  await page.locator('[data-testid="draw-player-select"]').waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Przydziel!" }).click();
  const lateTeam = (await page.locator('[data-testid="draw-result-team"]').textContent({ timeout: 15000 })).trim();
  await page.getByRole("button", { name: /Następna osoba/ }).click();
  ({ data: teamsData } = await apiJson("/teams"));
  const lt = teamsData.teams.find((t) => t.team_name === lateTeam);
  assert(lt && lt.players.length === 3 && lt.players.includes("Łukasz"), `Łukasz became the 3rd of ${lateTeam}`);
  const header2 = await page.locator("header p").first().textContent();
  assert(header2.includes("11 graczy") && header2.includes("1 × 2 os. + 3 × 3 os."), `board header after latecomer: ${header2.trim()}`);
  await shot(page, "05-latecomer.png");

  // ------------------------------------------------------------ 4. phone quiz (a member of a triple)
  log("\n== 4. /questions on a phone");
  const MEMBERS = ["Zuza", "Natalia", "Monika", "Julita", "Hubert N", "Eryk", "Adam", "Paweł", "Oskar", "Hubert Cz", "Łukasz", "Gaba"];
  const triple = teamsData.teams.find((t) => t.players.length === 3);
  const who = triple.players[0];
  const code = String(10000 + MEMBERS.indexOf(who));
  const mySlots = triple.slots.filter((s) => s.member === who);
  const slotFor = (round) => mySlots.find((s) => s.round === round);
  const subjects = [...new Set(mySlots.map((s) => s.subject))];
  assert(mySlots.length === 6 && subjects.length === 2, `${who} answers 6 rounds about 2 teammates (${subjects.join(", ")})`);
  assert(mySlots.slice(0, 3).every((s) => s.subject === subjects[0]) && mySlots.slice(3).every((s) => s.subject === subjects[1]), "rounds 1-3 about one teammate, 4-6 about the other");

  const phoneCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const phone = await phoneCtx.newPage();
  watch(phone, "phone");
  await phone.goto(`${BASE}/questions`);
  await phone.getByPlaceholder("•••••").fill("99999");
  await phone.getByRole("button", { name: "Otwórz wrota" }).click();
  await phone.getByText("Zły kod").waitFor({ timeout: 10000 });
  assert(true, "wrong code rejected");
  await phone.getByPlaceholder("•••••").fill(code);
  await phone.getByRole("button", { name: "Otwórz wrota" }).click();
  const scheduleText = (await phone.locator('[data-testid="quiz-schedule"]').textContent({ timeout: 15000 })).trim();
  assert(scheduleText === `${subjects[0]} (1–3), ${subjects[1]} (4–6)`, `phone shows the schedule: ${scheduleText}`);
  await phone.getByText("Czekamy na kolejne pytanie").waitFor();
  await shot(phone, "06-quiz-waiting.png");

  const setRound = (n) => apiJson("/__admin/state", { method: "POST", body: JSON.stringify({ question_number: n }) });
  const storedAnswer = async (slot) => (await apiJson(`/answer?type=USER_ANSWER&subject=${encodeURIComponent(slot.subject)}&question_number=${slot.question_number}`)).data;

  // Round 1: text question about the first teammate.
  await setRound(1);
  await phone.getByRole("heading", { name: /Pytanie 1/ }).waitFor({ timeout: 10000 });
  let slot = slotFor(1);
  assert((await phone.locator('[data-testid="question-subject"]').textContent()).trim() === slot.subject, `round 1 is about ${slot.subject}`);
  const qText = await phone.locator("p.text-lg.text-red-100").textContent();
  assert(qText.startsWith(`Pytanie ${slot.question_number}:`) && qText.includes(slot.subject), `shows question #${slot.question_number} about ${slot.subject}: ${qText.trim()}`);
  await shot(phone, "07-quiz-question.png");
  await phone.getByRole("button", { name: "Duchy" }).click();
  await phone.getByText("Czekamy na kolejne pytanie").waitFor({ timeout: 10000 });
  await phone.waitForTimeout(500);
  let ans = await storedAnswer(slot);
  assert(ans.user_answer === "answer2" && ans.who_answered === who, "round 1 answer stored under the right subject/question");

  // Round 2: the question carries a photo, answers are text.
  await setRound(2);
  await phone.getByRole("heading", { name: /Pytanie 2/ }).waitFor({ timeout: 10000 });
  slot = slotFor(2);
  assert(slot.question_number === 5, "round 2 of a triple's first player is question 5 (photo in the question)");
  assert((await phone.locator("div.rounded-2xl img").count()) === 1, "question photo rendered");
  await shot(phone, "08-quiz-question-photo.png");
  await phone.getByRole("button", { name: "Cukierki" }).click();
  await phone.getByText("Czekamy na kolejne pytanie").waitFor({ timeout: 10000 });
  await phone.waitForTimeout(500);
  ans = await storedAnswer(slot);
  assert(ans.user_answer === "answer3", "round 2 answer stored");

  // Round 5: switches to the second teammate; 4 photo answers.
  await setRound(5);
  await phone.getByRole("heading", { name: /Pytanie 5/ }).waitFor({ timeout: 10000 });
  slot = slotFor(5);
  assert(slot.subject === subjects[1] && slot.question_number === 2, `round 5 is question 2 about ${subjects[1]} (photo answers)`);
  assert((await phone.locator('[data-testid="question-subject"]').textContent()).trim() === subjects[1], "phone shows the second teammate");
  assert((await phone.locator('[data-testid="answers"] img').count()) === 4, "4 photo answers rendered");
  await shot(phone, "09-quiz-photo-answers.png");
  await phone.getByRole("button", { name: "odpowiedź 2" }).click();
  await phone.getByText("Czekamy na kolejne pytanie").waitFor({ timeout: 10000 });
  await phone.waitForTimeout(500);
  ans = await storedAnswer(slot);
  assert(ans.user_answer === "answer2" && ans.answer_text === "zdjęcie 2", "photo answer stored");

  await phone.reload();
  const again = (await phone.locator('[data-testid="quiz-schedule"]').textContent({ timeout: 15000 })).trim();
  assert(again === scheduleText, "reload keeps the identity (code re-validated)");

  // ------------------------------------------------------------ 4b. host panel → quests → leaderboard → finale
  log("\n== 4b. /host, quests on the phone, /leaderboard, finale");
  const host = await projector.newPage();
  watch(host, "host");
  await host.goto(`${BASE}/host`);
  await host.getByPlaceholder("kod").fill("0000");
  await host.getByRole("button", { name: "Wejdź" }).click();
  await host.getByText("Zły kod prowadzącego").waitFor({ timeout: 10000 });
  assert(true, "wrong host code rejected");
  await host.getByPlaceholder("kod").fill("1234");
  await host.getByRole("button", { name: "Wejdź" }).click();
  await host.locator('[data-testid="stage-quiz"][aria-pressed="true"]').waitFor({ timeout: 15000 });
  await host.locator('[data-testid="host-round"]', { hasText: "5" }).waitFor({ timeout: 10000 });
  assert(true, "host sees the published round (5)");
  await host.getByRole("button", { name: "6", exact: true }).click();
  await host.locator('[data-testid="host-round"]', { hasText: "6" }).waitFor({ timeout: 10000 });
  assert((await apiJson("/state")).data.question_number === 6, "round 6 published from the panel");
  await host.locator('[data-testid="stage-quests"]').click();
  await host.locator('[data-testid="stage-quests"][aria-pressed="true"]').waitFor({ timeout: 10000 });
  assert((await apiJson("/state")).data.stage === "quests", "stage switched to quests");
  await shot(host, "4b-host.png");

  // the phone switches to the quest hub by itself
  await phone.getByRole("heading", { name: /Questy/ }).waitFor({ timeout: 15000 });
  assert((await phone.locator('[data-testid="quests-done"]').textContent()).trim() === "0 / 3", "hub shows 0 / 3 done");
  const q1 = phone.locator('[data-testid="quest-quest1"]');
  await q1.getByRole("button", { name: "Start!" }).click();
  await phone.locator('[data-testid="quest-quest1"][data-status="running"]').waitFor({ timeout: 10000 });
  await phone.waitForTimeout(1500);
  const timerText = (await phone.locator('[data-testid="timer-quest1"]').textContent()).trim();
  assert(/^\d+:\d\d$/.test(timerText) && timerText !== "0:00", `timer is running (${timerText})`);
  assert(
    (await phone.locator('[data-testid="quest-quest2"]').getByRole("button", { name: /Najpierw skończcie/ }).count()) === 1,
    "other quests are blocked while one is running"
  );
  await shot(phone, "4b-quest-running.png");
  await q1.getByPlaceholder(/Kod zakończenia/).fill("0000");
  await q1.getByRole("button", { name: /Zakończ/ }).click();
  await phone.getByText("Zły kod").waitFor({ timeout: 10000 });
  assert(true, "wrong finish code rejected");
  await q1.getByPlaceholder(/Kod zakończenia/).fill("7311");
  await q1.getByRole("button", { name: /Zakończ/ }).click();
  await phone.locator('[data-testid="quest-quest1"][data-status="done"]').waitFor({ timeout: 10000 });
  const r1 = (await phone.locator('[data-testid="result-quest1"]').textContent()).trim();
  assert(r1.startsWith("✅ Wasz czas:"), `quest 1 done: ${r1}`);
  assert((await phone.locator('[data-testid="quests-done"]').textContent()).trim() === "1 / 3", "hub shows 1 / 3 done");

  // Beyblade: the team presses start, the host enters the rounds
  await phone.locator('[data-testid="quest-beyblade"]').getByRole("button", { name: "Start!" }).click();
  await phone.locator('[data-testid="quest-beyblade"][data-status="running"]').waitFor({ timeout: 10000 });
  await phone.getByText("Idźcie do Asi i walczcie").waitFor();
  const teamName = triple.team_name;
  await host.locator(`[data-testid="host-quest-${teamName}-beyblade"][data-status="running"]`).waitFor({ timeout: 15000 });
  const hostBey = host.locator(`[data-testid="host-quest-${teamName}-beyblade"]`);
  await hostBey.getByPlaceholder("rundy").fill("3");
  await hostBey.getByRole("button", { name: "Zapisz" }).click();
  await phone.locator('[data-testid="quest-beyblade"][data-status="done"]').waitFor({ timeout: 15000 });
  assert((await phone.locator('[data-testid="result-beyblade"]').textContent()).includes("3 rundach"), "phone shows the Beyblade result");
  await shot(phone, "4b-quests-progress.png");

  // leaderboard
  const lb = await projector.newPage();
  watch(lb, "leaderboard");
  await lb.goto(`${BASE}/leaderboard`);
  await lb.locator('[data-testid="leaderboard-row"]').first().waitFor({ timeout: 15000 });
  assert((await lb.locator('[data-testid="leaderboard-row"]').count()) === 4, "4 teams on the leaderboard");
  const { data: board } = await apiJson("/leaderboard");
  const myRow = board.teams.find((t) => t.team_name === teamName);
  assert(myRow.quests.quest1.points === 4 && myRow.quests.beyblade.points === 4, "sole finisher gets full points (4 teams)");
  assert(myRow.quests.quest2.points === 0 && myRow.quiz.points === 4, `quiz points ${myRow.quiz.points} (only team with correct answers)`);
  assert(myRow.rank === 1 && myRow.total === 12, `tested team leads with ${myRow.total} points`);
  await shot(lb, "4b-leaderboard.png");

  // finale on the phones
  await host.locator('[data-testid="stage-finished"]').click();
  await phone.locator('[data-testid="finale-rank"]').waitFor({ timeout: 15000 });
  assert((await phone.locator('[data-testid="finale-rank"]').textContent()).includes("1. miejsce"), "phone shows 1st place in the finale");
  await shot(phone, "4b-finale.png");
  await host.locator('[data-testid="stage-quiz"]').click();
  await host.locator('[data-testid="stage-quiz"][aria-pressed="true"]').waitFor({ timeout: 10000 });

  // ------------------------------------------------------------ 5. results
  log("\n== 5. /answers");
  const allSlides = teamsData.teams.flatMap((t) => t.slots.map((s) => ({ ...s, team: t.team_name })));
  const results = await projector.newPage();
  watch(results, "results");
  await results.goto(`${BASE}/answers`);
  await results.getByText("Gracz 1 z 11").waitFor({ timeout: 15000 });
  const badge = results.locator('[data-testid="step-badge"]');
  const nextReady = results.locator("button:not([disabled])", { hasText: /Pokaż dalej|Następne pytanie|Od nowa/ });
  // A key press while a fetch is in flight is ignored on purpose, so wait for the page to settle first.
  const pressUntil = async (locator) => {
    await nextReady.waitFor({ timeout: 10000 });
    await results.waitForTimeout(150);
    await results.keyboard.press("ArrowRight");
    await locator.waitFor({ timeout: 10000 });
  };
  // The question text only changes once the new question has been fetched (test data is "Pytanie n: ...").
  const waitQuestion = (qn) =>
    results.locator("p.text-lg.text-red-100", { hasText: new RegExp(`^Pytanie ${qn}:`) }).waitFor({ timeout: 10000 });
  await nextReady.waitFor({ timeout: 15000 });
  assert((await badge.textContent()) === "Pytanie", "step 0: question");
  assert((await results.locator('[data-testid="slide-subject"]').textContent()).trim() === allSlides[0].subject, "slide 1 is about the right subject");
  await pressUntil(badge.filter({ hasText: "Odpowiedź gracza" }));
  await pressUntil(badge.filter({ hasText: "Poprawna odpowiedź" }));
  assert((await results.locator("div.ring-green-600\\/30").count()) === 1, "correct answer row highlighted");
  await pressUntil(results.locator('[data-testid="slide-counter"]', { hasText: `Slajd 2/${allSlides.length}` }));
  await waitQuestion(allSlides[1].question_number);
  assert(true, "advances to slide 2");
  await shot(results, "10-results.png");

  // Jump straight to the tested player's photo round (round 5) via ?slide=.
  const photoSlideIdx = allSlides.findIndex((s) => s.member === who && s.round === 5);
  await results.goto(`${BASE}/answers?slide=${photoSlideIdx + 1}`);
  await results.locator('[data-testid="slide-counter"]', { hasText: `Slajd ${photoSlideIdx + 1}/${allSlides.length}` }).waitFor({ timeout: 15000 });
  await waitQuestion(2);
  assert((await results.locator('[data-testid="answers"] img').count()) === 4, "results show the 4 photo answers");
  await pressUntil(badge.filter({ hasText: "Odpowiedź gracza" }));
  const yellowRow = results.locator("div.ring-yellow-500\\/30");
  assert((await yellowRow.count()) === 1 && (await yellowRow.locator("img").getAttribute("src")).endsWith("kid-2.svg"), `${who}'s photo pick highlighted`);
  await pressUntil(badge.filter({ hasText: "Poprawna odpowiedź" }));
  assert((await results.locator("div.ring-green-600\\/30 img").getAttribute("src")).endsWith("kid-2.svg"), "...and it was correct (green)");
  await shot(results, "11-results-photo.png");

  // ------------------------------------------------------------ 6. restart the draw
  log("\n== 6. restart draw from settings");
  await page.getByRole("button", { name: /Ustawienia losowania/ }).click();
  await page.getByRole("heading", { name: "Kto jest na imprezie?" }).waitFor();
  assert((await chip("Gaba").getAttribute("aria-pressed")) === "false", "settings pre-tick the present guests only");
  await chip("Gaba").click();
  await page.getByRole("button", { name: /Losuj od nowa/ }).click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="team-card"]').length === 6, null, { timeout: 20000 });
  await page.getByRole("heading", { name: "Kto jest na imprezie?" }).waitFor({ state: "hidden", timeout: 10000 });
  assert((await page.locator('[data-testid="team-card"]').count()) === 6, "restart: 6 fresh teams for 12 guests");
  ({ data: teamsData } = await apiJson("/teams"));
  assert(teamsData.teams.every((t) => t.players.length === 0), "restart wiped all assignments");
  await shot(page, "12-restarted.png");

  await phone.reload();
  await phone.getByRole("heading", { name: "Wejście tylko dla wybranych" }).waitFor({ timeout: 15000 });
  assert(true, "phone falls back to the gate after the draw was restarted");
  await shot(phone, "13-phone-gate-again.png");
} catch (e) {
  problems.push(`FAILED: ${e.message}`);
  let k = 0;
  for (const c of browser.contexts()) for (const p of c.pages()) await shot(p, `zz-failure-${k++}.png`).catch(() => {});
} finally {
  await browser.close();
}

if (problems.length) {
  console.log("\nPROBLEMS:\n" + problems.map((p) => " - " + p).join("\n"));
  process.exit(1);
}
console.log("\nALL GOOD ✔  screenshots in", SHOTS);

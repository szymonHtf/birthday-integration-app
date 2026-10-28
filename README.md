# birthday-integration-app

Next.js 15 / React 19 / Tailwind 4 frontend for the birthday party game. The backend
(AWS SAM) lives in `../birthday-integration-app-backend`.

## Pages

| Route | Who uses it | What it does |
|-------|-------------|--------------|
| `/` | – | Landing page with links |
| `/team-draw` | Projector | Tick who is present, choose the number of teams (2–3 players each), start the draw. Guests then pick their name and press **Przydziel!** to get a random team (couples are never put together). Latecomers can be added at any time; **Ustawienia losowania** restarts the draw. |
| `/questions` | Guests' phones | Enter the secret code; then whatever stage the host has opened: the quiz (one question per round, 6 rounds, in a triple 3 about each teammate; questions and answers can be photos), the three quests (start/stop timed quests with a finish code, Beyblade duel), and finally the ranking. |
| `/host` | Host's phone | Password-protected panel: switch the stage (quiz → quests → finished), publish quiz rounds, enter Beyblade rounds, stop/set/reset any team's quest, see the ranking. |
| `/answers` | Projector | Walk player by player through the 6 rounds (→ / Space), revealing the guest's answer and the correct one. `/answers?slide=N` resumes from slide N. |
| `/leaderboard` | Projector | Live ranking: rank points per stage and totals. |

Shared code: `app/lib/api.ts` (backend URL + typed calls), `app/lib/cookies.ts`, `app/lib/format.ts`,
`app/components/AnswerContent.tsx` (text / photo answer rendering shared by the quiz and the results),
`app/components/LeaderboardTable.tsx`, `app/questions/useIdentity.ts` (who this phone is; re-checks the code).

Photos for photo questions live in `public/photos/<name>/` (see `public/photos/README.md`) and are
referenced from the backend's `questions.json` as `/photos/<name>/file.jpg`.

## Running

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (also type-checks)
```

The backend URL defaults to the deployed API; override it with `NEXT_PUBLIC_API_BASE`
(see `.env.example`, e.g. in `.env.local`).

## Deploying

The site is a static export (`output: "export"` in `next.config.ts`, result in `out/`) hosted on
AWS Amplify Hosting as a manual deployment (no Git connection). With AWS credentials for the party
account (`aws login`):

```bash
./deploy.sh      # next build → zip → Amplify app "birthday-integration-app" (eu-central-1), branch main
```

The script creates the app and branch when they are missing, keeps the clean-URL rules
(`/host` → `host.html`) in sync with the exported pages, and prints the site URL at the end
(currently https://main.d2pdy4fhx2d8w.amplifyapp.com). The API URL baked into the build is the
default in `app/lib/api.ts`; after a backend redeploy that changes the URL, update it there and in
`.env.example` (or pass `NEXT_PUBLIC_API_BASE`) and run the script again.

## Developing offline + end-to-end check

```bash
# terminal 1 – real Lambda code on an in-memory DynamoDB with test guests (codes 10000..10011)
cd ../birthday-integration-app-backend && pip install -r tests/requirements.txt && python local_server.py

# terminal 2
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8787 npm run dev

# terminal 3 – drives Google Chrome through the whole party: draw, latecomer, phone quiz, results, restart
npm run e2e            # screenshots land in e2e/shots/
```

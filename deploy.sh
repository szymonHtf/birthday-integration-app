#!/usr/bin/env bash
# Build the static export and publish it to AWS Amplify Hosting as a manual deployment
# (no Git connection). Idempotent: the Amplify app is looked up by name and created if missing.
# Env: AWS_PROFILE/AWS_REGION as usual, AMPLIFY_APP_NAME (default birthday-integration-app),
#      AMPLIFY_BRANCH (default main), NEXT_PUBLIC_API_BASE to override the API URL baked into the build.
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="${AMPLIFY_APP_NAME:-birthday-integration-app}"
BRANCH="${AMPLIFY_BRANCH:-main}"
REGION="${AWS_REGION:-eu-central-1}"
amp() { aws amplify "$@" --region "$REGION"; }

echo "==> next build (static export)"
npm run build 2>&1 | tail -3
[ -f out/index.html ] || { echo "out/index.html missing – is output: \"export\" set in next.config.ts?" >&2; exit 1; }

echo "==> Amplify app '$APP_NAME' in $REGION"
APP_ID="$(amp list-apps --query "apps[?name=='$APP_NAME'].appId | [0]" --output text)"
if [ -z "$APP_ID" ] || [ "$APP_ID" = "None" ]; then
  APP_ID="$(amp create-app --name "$APP_NAME" --platform WEB --query app.appId --output text)"
  echo "    created app $APP_ID"
fi
if ! amp get-branch --app-id "$APP_ID" --branch-name "$BRANCH" >/dev/null 2>&1; then
  amp create-branch --app-id "$APP_ID" --branch-name "$BRANCH" --stage PRODUCTION >/dev/null
  echo "    created branch $BRANCH"
fi

# Clean URLs: /host and /host/ serve host.html (one rule pair per exported page).
RULES="$(python3 - <<'PY'
import json, pathlib
rules = []
for page in sorted(pathlib.Path("out").glob("*.html")):
    name = page.stem
    if name in ("index", "404"):
        continue
    rules.append({"source": f"/{name}", "target": f"/{name}.html", "status": "200"})
    rules.append({"source": f"/{name}/", "target": f"/{name}.html", "status": "200"})
print(json.dumps(rules))
PY
)"
amp update-app --app-id "$APP_ID" --custom-rules "$RULES" >/dev/null

echo "==> uploading"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
(cd out && zip -qr "$TMP/site.zip" .)
read -r JOB_ID UPLOAD_URL < <(amp create-deployment --app-id "$APP_ID" --branch-name "$BRANCH" \
  --query '[jobId, zipUploadUrl]' --output text)
curl -sS -f -X PUT -H 'Content-Type: application/zip' -T "$TMP/site.zip" "$UPLOAD_URL"
amp start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

printf "==> deploying job %s " "$JOB_ID"
for _ in $(seq 1 120); do
  STATUS="$(amp get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" --query 'job.summary.status' --output text)"
  case "$STATUS" in
    SUCCEED) echo; break ;;
    FAILED|CANCELLED) echo; echo "deployment $STATUS" >&2; exit 1 ;;
    *) printf '.'; sleep 5 ;;
  esac
done
[ "$STATUS" = "SUCCEED" ] || { echo "timed out waiting for the deployment" >&2; exit 1; }

echo "Site: https://$BRANCH.$APP_ID.amplifyapp.com"

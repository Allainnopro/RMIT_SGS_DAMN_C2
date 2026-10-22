#!/usr/bin/env bash
# grant-demo-roles.sh — raise the SafeVoice demo grants as IGA change requests.
#
# The realm is governed (multiAdmin), so every write below becomes a PENDING change request.
# Nothing takes effect until a tide-realm-admin approves it in the enclave:
#   http://localhost:8080/realms/safevoice/tide-console/  ->  Change Requests
#
# Users are named by the short id SafeVoice shows in its top-right chip ("a1b2c3…9f0e"),
# or by their full username (e.g. "admin").
#
# Usage:
#   bash scripts/grant-demo-roles.sh --it-admin admin --reporter 'a1b2c3…9f0e' --committee 'd4e5f6…1a2b'
#   bash scripts/grant-demo-roles.sh --realm-admin '…' --it-admin '…'
#   bash scripts/grant-demo-roles.sh --create reporter1 --create committee1   # CREATE_USER requests
#   bash scripts/grant-demo-roles.sh --invite reporter1   # prints the Tide account invite link (after approval)
#
# Needs: curl, jq, and KC_BOOTSTRAP_ADMIN_PASSWORD in .env (never printed).
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
[ -f .env ] && . ./.env
set +a
: "${KC_BOOTSTRAP_ADMIN_PASSWORD:?KC_BOOTSTRAP_ADMIN_PASSWORD is not set (put it in .env)}"
URL="${TIDECLOAK_URL:-http://localhost:8080}"
REALM="${REALM_NAME:-safevoice}"
ADMIN_USER="${KC_BOOTSTRAP_ADMIN_USERNAME:-admin}"

[ $# -gt 0 ] || { sed -n '2,17p' "$0"; exit 2; }

token() {
  curl -sf -X POST "$URL/realms/master/protocol/openid-connect/token" \
    --data-urlencode "client_id=admin-cli" --data-urlencode "grant_type=password" \
    --data-urlencode "username=$ADMIN_USER" --data-urlencode "password=$KC_BOOTSTRAP_ADMIN_PASSWORD" | jq -r .access_token
}
api() { # METHOD PATH [JSON] -> prints "<http code> <first 300 chars of body>"
  local out
  out=$(curl -s -w '\n%{http_code}' -X "$1" "$URL/admin/realms/$REALM$2" \
    -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" ${3:+--data "$3"})
  echo "$(tail -n1 <<<"$out") $(sed '$d' <<<"$out" | head -c 300)"
}

# "a1b2c3…9f0e" -> the one user whose username starts with a1b2c3 and ends with 9f0e; otherwise an exact username.
user_id() {
  local who="$1" users
  users=$(curl -sf "$URL/admin/realms/$REALM/users?max=500" -H "Authorization: Bearer $(token)")
  local ids
  if [[ "$who" == *"…"* ]]; then
    ids=$(echo "$users" | jq -r --arg p "${who%%…*}" --arg s "${who##*…}" '.[] | select((.username | startswith($p)) and (.username | endswith($s))) | .id')
  else
    ids=$(echo "$users" | jq -r --arg u "$who" '.[] | select(.username == $u) | .id')
  fi
  local n
  n=$(printf '%s\n' "$ids" | grep -c . || true)
  [ "$n" -eq 1 ] || { echo "ERROR: '$who' matches $n users" >&2; exit 1; }
  echo "$ids"
}

realm_roles() { # USER_ID ROLE... -> one request, so one change request
  local id="$1" reps="" r
  shift
  for r in "$@"; do
    reps+="${reps:+,}$(curl -sf "$URL/admin/realms/$REALM/roles/$r" -H "Authorization: Bearer $(token)")"
  done
  echo "  realm roles $*: HTTP $(api POST "/users/$id/role-mappings/realm" "[$reps]")"
}
create_user() { # USERNAME   (join the committee separately with --committee-group)
  # The realm requires an email. Use a real plus-address of the operator's own licence email
  # (never an invented placeholder, AP-85); duplicateEmailsAllowed is on in the realm.
  : "${TIDE_LICENSE_EMAIL:?TIDE_LICENSE_EMAIL is not set (put it in .env)}"
  local email="${TIDE_LICENSE_EMAIL%@*}+$1@${TIDE_LICENSE_EMAIL#*@}" body
  body=$(jq -nc --arg u "$1" --arg e "$email" --arg g "${2:-}" '{username: $u, email: $e, enabled: true} + (if $g == "" then {} else {groups: [$g]} end)')
  echo "create $1${2:+ in $2}: HTTP $(api POST "/users" "$body")"
}
invite() { # USER_ID -> Tide account invite link, valid 12 h
  curl -s -X POST "$URL/admin/realms/$REALM/tideAdminResources/get-required-action-link?userId=$1&lifespan=43200" \
    -H "Authorization: Bearer $(token)" -H "Content-Type: application/json" -d '["link-tide-account-action"]'
  echo
}
committee() { # USER_ID
  local gid
  gid=$(curl -sf "$URL/admin/realms/$REALM/groups?search=committee&exact=true" -H "Authorization: Bearer $(token)" | jq -r '.[] | select(.path == "/committee") | .id')
  [ -n "$gid" ] || { echo "ERROR: group /committee not found" >&2; exit 1; }
  echo "  group /committee: HTTP $(api PUT "/users/$1/groups/$gid")"
}
realm_admin() { # USER_ID
  local cid rep
  cid=$(curl -sf "$URL/admin/realms/$REALM/clients?clientId=realm-management" -H "Authorization: Bearer $(token)" | jq -r '.[0].id')
  rep=$(curl -sf "$URL/admin/realms/$REALM/clients/$cid/roles/tide-realm-admin" -H "Authorization: Bearer $(token)")
  echo "  client role tide-realm-admin: HTTP $(api POST "/users/$1/role-mappings/clients/$cid" "[$rep]")"
}

while [ $# -gt 0 ]; do
  flag="$1" who="${2:?missing user after $1}"
  shift 2
  case "$flag" in
    --create) create_user "$who"; continue ;;
  esac
  id=$(user_id "$who")
  echo "$flag $who ($id)"
  case "$flag" in
    --reporter) realm_roles "$id" reporter _tide_encryptor ;;
    --committee) realm_roles "$id" _tide_decryptor ;;
    --committee-group) committee "$id" ;;
    --it-admin) realm_roles "$id" it-admin ;;
    --invite) invite "$id"; continue ;;
    --realm-admin) realm_admin "$id" ;;
    *) echo "ERROR: unknown flag $flag" >&2; exit 2 ;;
  esac
done

echo
echo "Pending change requests:"
curl -s "$URL/admin/realms/$REALM/iga/change-requests?status=PENDING" -H "Authorization: Bearer $(token)" \
  | jq -r '.[] | "  \(.actionType // .type // "?")  \(.entityType // "")  \(.id)"' 2>/dev/null || true
echo "Approve them at $URL/realms/$REALM/tide-console/ -> Change Requests. Then each user signs in again."

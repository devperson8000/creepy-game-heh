#!/usr/bin/env bash
# Isolated real PostgreSQL tests. Requires Docker; no Supabase keys needed.
set -euo pipefail
cd "$(dirname "$0")/../.."
container="creepy-game-db-tests-$$"
logs="$(mktemp -d /tmp/creepy-game-db-tests.XXXXXX)"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$logs"' EXIT
docker run --rm -d --name "$container" -e POSTGRES_PASSWORD=local-tests-only postgres:17-alpine -c wal_level=logical >/dev/null
for attempt in {1..60}; do
  if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  if [ "$attempt" -eq 60 ]; then docker logs "$container"; exit 1; fi
  sleep 1
done
run_sql() { docker exec -i "$container" psql -X -q -U postgres -v ON_ERROR_STOP=1 "$@"; }
run_sql < supabase/tests/bootstrap.sql > "$logs/bootstrap.log"
for migration in supabase/migrations/*.sql; do run_sql < "$migration" >> "$logs/migration.log"; done
run_sql < supabase/tests/movement.sql > "$logs/movement.log"
run_sql < supabase/tests/microphone.sql > "$logs/microphone.log"
run_sql < supabase/tests/security.sql > "$logs/security.log"
run_sql < supabase/tests/expiry.sql > "$logs/expiry.log"
run_sql < supabase/tests/concurrency.sql > "$logs/concurrency.log"
(printf '%s\n' "begin; set local role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true); select public.game_approve('10000000-0000-0000-0000-000000000004',true); select pg_sleep(0.2); commit;" | run_sql > "$logs/a.log" 2>&1) &
first=$!
(printf '%s\n' "begin; set local role authenticated; select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true); select public.game_approve('10000000-0000-0000-0000-000000000005',true); select pg_sleep(0.2); commit;" | run_sql > "$logs/b.log" 2>&1) &
second=$!
if wait "$first"; then first_status=0; else first_status=$?; fi
if wait "$second"; then second_status=0; else second_status=$?; fi
if [ "$first_status" -eq 0 ] && [ "$second_status" -ne 0 ]; then rg -q 'ROOM_FULL' "$logs/b.log";
elif [ "$second_status" -eq 0 ] && [ "$first_status" -ne 0 ]; then rg -q 'ROOM_FULL' "$logs/a.log";
else cat "$logs/a.log" "$logs/b.log"; exit 1; fi
members="$(printf '%s\n' 'select count(*) from public.game_members;' | run_sql -tA)"
[ "$members" = '4' ] || { echo "Expected four members, got $members"; exit 1; }
echo 'PostgreSQL migration, RLS, validation, owner authorization, expiry, rate limits and concurrent max-four approval checks passed.'

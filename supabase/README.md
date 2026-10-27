# Multiplayer setup

Vercel serves the Three.js game. Supabase stores lobbies, join requests and membership, then synchronizes authenticated player inputs and owner snapshots through Realtime. No separate always-running game server is required.

## Activate the supplied project

The public browser configuration already points to the supplied Supabase project. Two project-owner actions are required because the public anon key cannot administer a project:

1. In **Supabase → Authentication → Sign In / Providers → Anonymous Sign-Ins**, enable anonymous sign-ins. Players do not need email accounts.
2. In **Supabase → SQL Editor**, run [migrations/202610180001_multiplayer.sql](migrations/202610180001_multiplayer.sql) once, followed by [migrations/20261018203801_movement_command_replay.sql](migrations/20261018203801_movement_command_replay.sql). The first creates the tables and access rules; the second adds bounded movement-command history. Skip migrations already applied. Both are active on the supplied project. Then apply subsequent migrations in filename order, skipping those already recorded. The microphone-hearing extension [migrations/20261027233932_microphone_hearing_inputs.sql](migrations/20261027233932_microphone_hearing_inputs.sql) is also active on the supplied project.

[Open this project's SQL Editor](https://supabase.com/dashboard/project/kfzmzzskorqecsnimtcc/sql/new).

After both steps, reload the game and select Multiplayer. Create a room in one browser, request entry from a second browser, approve the request as the owner, mark all members ready and start. Maximum occupancy is four, including the owner.

The client reports disabled anonymous sign-ins, missing SQL and connection failures explicitly. It never displays fake active lobbies. A fresh project needs these settings before multiplayer can connect.

## Configuration

[src/multiplayer-config.js](../src/multiplayer-config.js) contains only the project's public URL and public anon key, intended for use in the browser. Access depends on authenticated sessions and the migration's policies. To point another deployment at a different project, set these Vercel build environment variables and redeploy:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (or the older `VITE_SUPABASE_ANON_KEY`)

Never put a service-role key into a browser build. The game uses a new anonymous identity for each connection and closes its membership on leaving. A browser that vanishes without closing is removed after the 90-second heartbeat expiry; directory and heartbeat requests perform cleanup.

## Authority and limits

Only lobby owners approve requests, start rounds or publish snapshots. Membership creation is serialized with PostgreSQL row locks so concurrent approvals cannot exceed four players. Inputs and actions are attributed to the authenticated database user, rather than trusting a player ID sent by the browser. Direct table writes are revoked; authenticated RPCs enforce names, sizes, rates and ownership.

The lobby owner runs the game simulation and collision checks. Guests send input, not positions. The database fallback caps input at roughly 18 updates per second and snapshots at roughly nine. It carries numbered command history so clients can replay unacknowledged movement rather than snap to stale positions. The existing WebRTC mesh supplies team voice and, after DTLS fingerprints are bound through authenticated database messages, a 20 Hz gameplay path. The host still simulates all movement and collisions; peers never submit trusted positions. Teammates and the creature use buffered pose interpolation. Optional sequenced microphone loudness travels on the top-level movement packet; it never enters replayed movement history. The host supplies sound coordinates from its own simulation and expires stale reports. Older clients without microphone fields remain compatible. The database path remains available when peer connectivity is blocked. Usage counts toward the selected Supabase plan's database and Realtime limits.

If the owner leaves, the room closes rather than migrating a partially running simulation. The game stops on a lost Realtime channel or stale host snapshots and offers a return to the menu. Banked progress is shared within a round, not persisted across new rooms.

## Verification

```sh
npm test
npm run build
bash supabase/tests/run-postgres.sh
```

The PostgreSQL runner uses a disposable local container and mock `auth.uid()` scaffolding to exercise the actual migration, grants, RLS, validation, expiry and concurrent approvals. Browser checks use real authenticated test players against the configured Supabase service. The movement runner covers both the database fallback and peer gameplay (`VOICE_TEST_ICE_SERVERS` can provide a test TURN relay); the full two-tab runner also verifies actual microphone audio, voice recovery, hidden-host simulation and remote animation. Movement measurements disable GPU drawing while retaining the real simulation, avatar interpolation and transport; separate browser checks inspect rendered desktop/mobile screens.

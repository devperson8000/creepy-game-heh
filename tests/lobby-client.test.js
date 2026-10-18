import test from 'node:test';
import assert from 'node:assert/strict';
import { createLobbyClient, getMultiplayerConfig, getMultiplayerUrl } from '../src/lobby-client.js';

function backend() {
  const calls = [], handlers = [], values = new Map();
  const client = {
    auth: { async signInAnonymously() { calls.push(['auth']); return { data: { user: { id: 'user-1' } } }; } },
    async rpc(name, args) { calls.push([name, args]); return values.get(name) || { data: null, error: null }; },
    channel() { return { on(event, filter, callback) { handlers.push({ filter, callback }); return this; }, subscribe(callback) { queueMicrotask(() => callback('SUBSCRIBED')); return this; } }; },
    async removeChannel() {},
  };
  values.set('game_directory', { data: [] });
  return { client, calls, values, subscriptions: handlers, change(table, payload) { for (const h of handlers) if (h.filter.table === table) h.callback(payload); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const room = { id: 'room-1', name: 'Hall', ownerId: 'user-1', status: 'waiting', seed: null, members: [{ id: 'user-1', name: 'Host', slot: 0, ready: false }], requests: [] };

test('missing production configuration fails explicitly without creating a fake connection', async () => {
  assert.deepEqual(getMultiplayerConfig({}, {}), { url: '', key: '' });
  assert.match(getMultiplayerUrl(), /^https:\/\//);
  const client = createLobbyClient({ url: '', key: '' });
  assert.equal(client.connected, false);
  assert.equal(client.send('create', { name: 'Hall' }), false);
  await assert.rejects(client.connect(), /Supabase/);
});

test('client authenticates lazily, maps lobby commands to authenticated RPCs and unsubscribes', async t => {
  const b = backend(), events = [];
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  const off = client.subscribe(e => events.push(e));
  assert.equal(b.calls.length, 0);
  await client.connect();
  assert.equal(client.id, 'user-1');
  assert.equal(client.connected, true);
  assert.ok(events.some(e => e.type === 'welcome' && e.id === client.id));
  b.values.set('game_room', { data: room });
  client.send('create', { name: 'Hall', playerName: 'Host' });
  await tick();
  assert.ok(b.calls.some(([name, args]) => name === 'game_create' && args.p_name === 'Hall' && args.p_player_name === 'Host'));
  assert.ok(events.some(e => e.type === 'lobby' && e.lobby.id === room.id));
  off();
  const before = events.length;
  client.send('ready', { ready: true }); await tick();
  assert.equal(events.length, before);
  client.close();
  assert.equal(client.connected, false);
  assert.equal(client.send('ready', { ready: true }), false);
});

test('started and gameplay events use authenticated row identity and owner-only snapshots', async t => {
  const b = backend(), events = [];
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  client.subscribe(e => events.push(e));
  b.values.set('game_room', { data: { ...room, status: 'running', seed: 123 } });
  await client.connect();
  assert.equal(events.filter(e => e.type === 'started').length, 1);
  b.change('game_members', { eventType: 'UPDATE', new: { lobby_id: room.id, user_id: 'user-2', input: { forward: 1 }, input_seq: 1 }, old: {} });
  assert.deepEqual(events.find(e => e.type === 'input'), { type: 'input', playerId: 'user-2', input: { forward: 1 } });
  b.change('game_members', { eventType: 'UPDATE', new: { lobby_id: room.id, user_id: 'user-2', input: { forward: 1 }, input_seq: 1 }, old: {} });
  assert.equal(events.filter(e => e.type === 'input').length, 1);
  client.send('snapshot', { snapshot: { tick: 1 } });
  await tick();
  assert.ok(b.calls.some(([name]) => name === 'game_publish_snapshot'));
  b.values.set('game_room', { data: { ...room, ownerId: 'other', status: 'running', seed: 123 } });
  client.send('ready', { ready: true }); await tick();
  b.change('game_snapshots', { eventType: 'UPDATE', new: { lobby_id: room.id, payload: { tick: 2 } } });
  assert.deepEqual(events.find(e => e.type === 'snapshot'), { type: 'snapshot', snapshot: { tick: 2 } });
});

test('join pending/rejection, host loss and database errors are translated into protocol events', async t => {
  const b = backend(), events = [];
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  client.subscribe(e => events.push(e));
  await client.connect();
  client.send('join', { lobbyId: room.id, playerName: 'Guest' }); await tick();
  assert.ok(events.some(e => e.type === 'pending' && e.lobbyId === room.id));
  b.change('game_requests', { eventType: 'UPDATE', new: { user_id: 'user-1', lobby_id: room.id, status: 'rejected', reason: 'expired' } });
  assert.ok(events.some(e => e.type === 'rejected' && e.reason === 'expired'));
  b.values.set('game_room', { data: room });
  client.send('create', { name: 'Hall', playerName: 'Host' }); await tick();
  b.values.set('game_room', { data: null });
  b.change('game_lobbies', { eventType: 'DELETE', old: { id: room.id } }); await tick();
  assert.ok(events.some(e => e.type === 'roomClosed'));
  b.values.set('game_ready', { error: { message: 'NOT_MEMBER' } });
  client.send('ready', { ready: true }); await tick();
  assert.ok(events.some(e => e.type === 'error' && e.code === 'NOT_MEMBER'));
});

test('config overrides bundled public settings and maps disabled anonymous auth into useful setup guidance', async () => {
  assert.deepEqual(getMultiplayerConfig({ VITE_SUPABASE_URL: 'https://override.supabase.co', VITE_SUPABASE_ANON_KEY: 'override' }, { url: 'bundled', publishableKey: 'bundled' }), { url: 'https://override.supabase.co', key: 'override' });
  const b = backend(), events = [];
  b.client.auth.signInAnonymously = async () => ({ error: { message: 'Anonymous sign-ins are disabled' } });
  const client = createLobbyClient({ client: b.client });
  client.subscribe(event => events.push(event));
  await assert.rejects(client.connect(), /Enable Anonymous/);
  assert.equal(client.connected, false);
  assert.ok(events.some(event => event.type === 'error' && event.code === 'AUTH_DISABLED'));
});

test('explicit reconnect gets a fresh identity and close prevents late authentication from restoring connection', async () => {
  const b = backend(); let identity = 0;
  b.client.auth.signInAnonymously = async () => ({ data: { user: { id: `player-${++identity}` } } });
  const client = createLobbyClient({ client: b.client });
  await client.connect();
  assert.equal(client.id, 'player-1');
  client.close();
  await client.connect();
  assert.equal(client.id, 'player-2');
  client.close();
  let finishAuth;
  b.client.auth.signInAnonymously = () => new Promise(resolve => { finishAuth = resolve; });
  const pending = client.connect();
  await tick();
  client.close();
  finishAuth({ data: { user: { id: 'too-late' } } });
  await pending;
  assert.equal(client.connected, false);
  assert.equal(client.id, null);
});

test('input and snapshot throttling does not flood RPC or refresh the roster for each replicated input', async t => {
  const b = backend();
  b.values.set('game_room', { data: { ...room, status: 'running', seed: 1, members: [...room.members, { id: 'guest', name: 'Guest', slot: 1, ready: true }] } });
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  await client.connect();
  const before = b.calls.filter(([name]) => name === 'game_room').length;
  b.change('game_members', { eventType: 'UPDATE', new: { lobby_id: room.id, user_id: 'guest', name: 'Guest', slot: 1, ready: true, input: { forward: 1 }, input_seq: 1 } });
  await tick();
  assert.equal(b.calls.filter(([name]) => name === 'game_room').length, before);
  assert.equal(client.send('input', { input: { forward: 1 } }), true);
  assert.equal(client.send('input', { input: { forward: 1 } }), false);
  assert.equal(client.send('snapshot', { snapshot: { tick: 1 } }), true);
  assert.equal(client.send('snapshot', { snapshot: { tick: 2 } }), false);
  await tick();
  assert.equal(b.calls.filter(([name]) => name === 'game_send_input').length, 1);
  assert.equal(b.calls.filter(([name]) => name === 'game_publish_snapshot').length, 1);
});


test('connect waits for the authenticated realtime subscription before reporting connected', async t => {
  const b = backend(); let subscribe;
  b.client.channel = () => ({ on() { return this; }, subscribe(callback) { subscribe = callback; return this; } });
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  const connecting = client.connect();
  await tick();
  assert.equal(client.connected, false);
  subscribe('SUBSCRIBED');
  await connecting;
  assert.equal(client.connected, true);
});

test('a room closed immediately after a join request clears pending even when the request row is already gone', async t => {
  const b = backend(), events = [];
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  client.subscribe(event => events.push(event));
  await client.connect();
  client.send('join', { lobbyId: room.id, playerName: 'Guest' });
  await tick();
  assert.ok(events.some(event => event.type === 'rejected' && event.reason === 'host_left'));
});

test('close waits for an in-flight create before leaving, and reconnect waits for old identity cleanup', async () => {
  const b = backend(); const order = []; let finishCreate, finishLeave;
  const regularRpc = b.client.rpc;
  b.client.rpc = (name, args) => {
    if (name === 'game_create') { order.push('create'); return new Promise(resolve => { finishCreate = () => { order.push('created'); resolve({ data: 'room-1' }); }; }); }
    if (name === 'game_leave') { order.push('leave'); return new Promise(resolve => { finishLeave = () => { order.push('left'); resolve({ data: null }); }; }); }
    return regularRpc(name, args);
  };
  let count = 0;
  b.client.auth.signInAnonymously = async () => { order.push(`auth-${++count}`); return { data: { user: { id: `player-${count}` } } }; };
  const client = createLobbyClient({ client: b.client });
  await client.connect();
  client.send('create', { name: 'Hall', playerName: 'Host' }); await tick();
  const closing = client.close();
  assert.equal(typeof closing?.then, 'function');
  assert.equal(client.connected, false);
  const reconnecting = client.connect();
  await tick();
  assert.deepEqual(order, ['auth-1', 'create']);
  finishCreate(); await tick();
  assert.deepEqual(order, ['auth-1', 'create', 'created', 'leave']);
  finishLeave(); await closing; await reconnecting;
  assert.deepEqual(order, ['auth-1', 'create', 'created', 'leave', 'left', 'auth-2']);
  const lastClose = client.close(); await tick(); finishLeave(); await lastClose;
});

test('leave requests survive page navigation without applying keepalive to large gameplay snapshots', async () => {
  const { createMultiplayerFetch } = await import('../src/lobby-client.js');
  const requests = [];
  const fetcher = createMultiplayerFetch(async (url, init) => { requests.push({ url, init }); return new Response(null, { status: 204 }); });
  const headers = { Authorization: 'Bearer test-session' };
  await fetcher('https://project.supabase.co/rest/v1/rpc/game_leave', { method: 'POST', headers, body: '{}' });
  await fetcher('https://project.supabase.co/rest/v1/rpc/game_publish_snapshot', { method: 'POST', headers, body: '{}' });
  assert.equal(requests[0].init.keepalive, true);
  assert.equal(requests[0].init.headers.Authorization, 'Bearer test-session');
  assert.notEqual(requests[1].init.keepalive, true);
});

test('server channel closure produces an explicit realtime error while manual close remains quiet', async t => {
  const b = backend(), events = []; let subscription;
  b.client.channel = () => ({ on() { return this; }, subscribe(callback) { subscription = callback; queueMicrotask(() => callback('SUBSCRIBED')); return this; } });
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  client.subscribe(event => events.push(event));
  await client.connect();
  subscription('CLOSED');
  assert.ok(events.some(event => event.type === 'error' && event.code === 'REALTIME_ERROR'));
  const before = events.filter(event => event.type === 'error').length;
  await client.close();
  subscription('CLOSED');
  assert.equal(events.filter(event => event.type === 'error').length, before);
});


test('only the host subscribes to member input rows and guests subscribe to snapshots for their room', async t => {
  const hostBackend = backend();
  hostBackend.values.set('game_room', { data: room });
  const host = createLobbyClient({ client: hostBackend.client });
  t.after(() => host.close());
  await host.connect();
  assert.ok(hostBackend.subscriptions.some(s => s.filter.table === 'game_members' && s.filter.filter === `lobby_id=eq.${room.id}`));
  assert.equal(hostBackend.subscriptions.some(s => s.filter.table === 'game_snapshots'), false);
  const guestBackend = backend();
  guestBackend.values.set('game_room', { data: { ...room, ownerId: 'different-owner' } });
  const guest = createLobbyClient({ client: guestBackend.client });
  t.after(() => guest.close());
  await guest.connect();
  assert.equal(guestBackend.subscriptions.some(s => s.filter.table === 'game_members'), false);
  assert.ok(guestBackend.subscriptions.some(s => s.filter.table === 'game_snapshots' && s.filter.filter === `lobby_id=eq.${room.id}`));
});

test('missing SQL is diagnosed before attempting subscriptions to missing tables', async () => {
  const b = backend(), events = [];
  b.values.set('game_room', { error: { code: 'PGRST202', message: 'Could not find the function public.game_room' } });
  b.client.channel = () => ({ on() { return this; }, subscribe(callback) { queueMicrotask(() => callback('CHANNEL_ERROR')); return this; } });
  const client = createLobbyClient({ client: b.client });
  client.subscribe(event => events.push(event));
  await assert.rejects(client.connect(), /SQL migration/);
  assert.ok(events.some(event => event.type === 'error' && event.code === 'SETUP_REQUIRED'));
  await client.close();
});

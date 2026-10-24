import test from 'node:test';
import assert from 'node:assert/strict';
import { createLobbyClient, getMultiplayerConfig, getMultiplayerUrl } from '../src/lobby-client.js';

function backend() {
  const calls = [], handlers = [], values = new Map();
  const client = {
    auth: { async signInAnonymously() { calls.push(['auth']); return { data: { user: { id: 'user-1' } } }; } },
    async rpc(name, args) { calls.push([name, args]); return values.get(name) || { data: null, error: null }; },
    channel() { return { async send(message){calls.push(['broadcast',message]);return 'ok';}, on(event, filter, callback) { handlers.push({ filter, callback }); return this; }, subscribe(callback) { queueMicrotask(() => callback('SUBSCRIBED')); return this; } }; },
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

test('server channel closure enters recovery while manual close remains quiet', async t => {
  const b = backend(), events = []; let subscription;
  b.client.channel = () => ({ on() { return this; }, subscribe(callback) { subscription = callback; queueMicrotask(() => callback('SUBSCRIBED')); return this; } });
  const client = createLobbyClient({ client: b.client });
  t.after(() => client.close());
  client.subscribe(event => events.push(event));
  await client.connect();
  subscription('CLOSED');
  assert.ok(events.some(event => event.type === 'connection' && event.status === 'reconnecting'));assert.equal(client.connected,true);
  const before = events.filter(event => event.type === 'error').length;
  await client.close();
  subscription('CLOSED');
  assert.equal(events.filter(event => event.type === 'error').length, before);
});


test('only the host subscribes to member input rows and guests subscribe to snapshots for their room', async t => {
  const hostBackend = backend();
  hostBackend.values.set('game_room', { data: {...room,status:'running'} });
  const host = createLobbyClient({ client: hostBackend.client });
  t.after(() => host.close());
  await host.connect();
  assert.ok(hostBackend.subscriptions.some(s => s.filter.table === 'game_members' && s.filter.filter === `lobby_id=eq.${room.id}`));
  assert.equal(hostBackend.subscriptions.some(s => s.filter.table === 'game_snapshots'), false);
  const guestBackend = backend();
  guestBackend.values.set('game_room', { data: { ...room, status:'running', ownerId: 'different-owner' } });
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

test('waiting-room poses are bounded cosmetic broadcasts for accepted members only',async t=>{
 const b=backend(),events=[];
 b.values.set('game_room',{data:{...room,members:[...room.members,{id:'guest',name:'Guest',slot:1,ready:false}]}});
 const c=createLobbyClient({client:b.client});t.after(()=>c.close());c.subscribe(e=>events.push(e));await c.connect();
 assert.equal(c.send('waitingPose',{pose:{x:0,z:3,yaw:0,pitch:0,torch:true}}),true);
 assert.ok(b.calls.some(([type,p])=>type==='broadcast'&&p.payload.id==='user-1'));
 assert.equal(c.send('waitingPose',{pose:{x:99,z:0,yaw:0,pitch:0}}),false);
 const callback=b.subscriptions.find(s=>s.filter.event==='pose').callback;
 callback({payload:{id:'outsider',pose:{x:0,z:0,yaw:0,pitch:0}}});
 assert.equal(events.some(e=>e.type==='waitingPose'),false);
 callback({payload:{id:'guest',pose:{x:1,z:2,yaw:.2,pitch:.1,torch:true}}});
 assert.equal(events.filter(e=>e.type==='waitingPose').length,1);
 assert.equal(events.find(e=>e.type==='waitingPose').playerId,'guest');
});

 test('welcome exposes controls only after commands can be sent', async t => {
  const b=backend(),client=createLobbyClient({client:b.client});t.after(()=>client.close());
  let accepted=false;
  client.subscribe(e=>{if(e.type==='welcome')accepted=client.send('create',{name:'Ready connection',playerName:'Host'});});
  await client.connect();await tick();assert.equal(accepted,true);
  assert.ok(b.calls.some(([name])=>name==='game_create'));
 });

test('voice signalling targets accepted members and survives waiting-to-game transitions',async t=>{
 const b=backend(),client=createLobbyClient({client:b.client}),events=[];t.after(()=>client.close());client.subscribe(e=>events.push(e));
 b.values.set('game_room',{data:{...room,members:[...room.members,{id:'peer',name:'Peer',slot:1}]}});await client.connect();
 assert.equal(client.send('voice',{to:'outsider',signal:{type:'hello'}}),false);
 assert.equal(client.send('voice',{to:'peer',signal:{type:'hello'}}),true);await tick();
 const sent=b.calls.find(([type,p])=>type==='broadcast'&&p.event==='voice');assert.equal(sent?.[1].payload.from,client.id);
 const receive=payload=>b.subscriptions.filter(h=>h.filter.event==='voice').forEach(h=>h.callback({payload}));
 receive({from:'outsider',to:client.id,signal:{type:'hello'}});assert.equal(events.filter(e=>e.type==='voice').length,0);
 receive({from:'peer',to:'another',signal:{type:'hello'}});assert.equal(events.filter(e=>e.type==='voice').length,0);
 receive({from:'peer',to:client.id,signal:{type:'hello'}});assert.equal(events.filter(e=>e.type==='voice').length,1);
 const count=b.subscriptions.filter(h=>h.filter.event==='voice').length;
 b.values.set('game_room',{data:{...room,status:'running',seed:123,members:[...room.members,{id:'peer',slot:1}]}});client.send('ready',{ready:true});await tick();await tick();
 assert.equal(b.subscriptions.filter(h=>h.filter.event==='voice').length,count);
 assert.equal(client.send('voice',{to:'peer',signal:{type:'state',muted:true}}),true);
});

test('temporary recovery reuses the authenticated identity and fetches current authority without restarting the room',async t=>{
 const b=backend(),events=[],running={...room,status:'running',seed:123,ownerId:'other',ownerEpoch:2};b.values.set('game_room',{data:running});b.values.set('game_recover',{data:{room:running,snapshot:{sequence:20,authority:{ownerId:'other',epoch:2}},serverNow:100}});const client=createLobbyClient({client:b.client});t.after(()=>client.close());client.subscribe(e=>events.push(e));await client.connect();await client.recover();assert.equal(client.id,'user-1');assert.equal(b.calls.filter(([name])=>name==='auth').length,1);assert.equal(events.filter(e=>e.type==='started').length,1);assert.equal(events.find(e=>e.type==='recovered').snapshot.sequence,20);assert.ok(b.calls.some(([name])=>name==='game_support_recovery'));
});
test('a failed transport recovery keeps the identity and can retry; a late result after close is ignored',async t=>{
 const b=backend(),events=[];b.values.set('game_room',{data:{...room,status:'running',seed:123}});const client=createLobbyClient({client:b.client});t.after(()=>client.close());client.subscribe(e=>events.push(e));await client.connect();b.values.set('game_recover',{error:{message:'temporary network failure'}});await assert.rejects(client.recover(),/temporary network failure/);assert.equal(client.id,'user-1');let release;const rpc=b.client.rpc;b.client.rpc=async(name,args)=>name==='game_recover'?new Promise(r=>release=r):rpc(name,args);const recovering=client.recover();await tick();const closing=client.close({leave:false});release({data:{room:{...room,status:'running',seed:123},snapshot:{sequence:5}}});await recovering;await closing;assert.equal(events.some(e=>e.type==='recovered'),false);assert.equal(b.calls.filter(([name])=>name==='game_leave').length,0,'reload suspension does not leave the lobby');
});
test('an authenticated page reload resumes its current checkpoint instead of signing in as another anonymous user',async t=>{
 const b=backend(),events=[],running={...room,status:'running',seed:123,ownerEpoch:1};b.client.auth.getSession=async()=>({data:{session:{user:{id:'user-1'}}}});b.values.set('game_room',{data:running});b.values.set('game_recover',{data:{room:running,snapshot:{sequence:12,state:{run:{halloween:{maze:true},initialPlayerCount:4}}}}});const client=createLobbyClient({client:b.client,restoreSession:true});t.after(()=>client.close());client.subscribe(e=>events.push(e));await client.connect();assert.equal(b.calls.filter(([name])=>name==='auth').length,0);const start=events.find(e=>e.type==='started');assert.equal(start.checkpoint.sequence,12);assert.equal(start.ownerEpoch,1);assert.equal(start.halloween,true);assert.ok(b.calls.some(([name,args])=>name==='game_recover'&&args.p_resume===true));
});

test('an owner flushes the final checkpoint before leaving and retries a rate-limited flush', async () => {
 const b=backend(),original=b.client.rpc;let publishes=0;
 b.values.set('game_room',{data:{...room,status:'running',seed:17}});
 b.client.rpc=async(name,args)=>{if(name==='game_publish_snapshot'&&++publishes===1){b.calls.push([name,args]);return {error:{message:'RATE_LIMIT'}};}return original(name,args);};
 const client=createLobbyClient({client:b.client});await client.connect();b.calls.length=0;
 const checkpoint={sequence:42,authority:{ownerId:client.id,epoch:0}};await client.close({checkpoint});
 assert.deepEqual(b.calls.map(([name])=>name),['game_publish_snapshot','game_publish_snapshot','game_leave']);assert.deepEqual(b.calls[1][1],{p_snapshot:checkpoint});
});

test('suspending a guest never publishes an owner checkpoint or leaves the room', async () => {
 const b=backend();b.values.set('game_room',{data:{...room,ownerId:'other',status:'running',seed:1}});
 const client=createLobbyClient({client:b.client});await client.connect();b.calls.length=0;
 await client.close({leave:false,checkpoint:{sequence:42}});assert.deepEqual(b.calls,[]);
});

test('only bounded unload checkpoints opt into keepalive', async () => {
 const {createMultiplayerFetch}=await import('../src/lobby-client.js'),requests=[];let unloading=false;
 const fetcher=createMultiplayerFetch(async(url,init)=>{requests.push(init);return new Response(null,{status:204});},{isSuspending:()=>unloading});
 const url='https://project.supabase.co/rest/v1/rpc/game_publish_snapshot';await fetcher(url,{body:'{}'});unloading=true;await fetcher(url,{body:'{}'});await fetcher(url,{body:'x'.repeat(50000)});
 assert.notEqual(requests[0].keepalive,true);assert.equal(requests[1].keepalive,true);assert.notEqual(requests[2].keepalive,true);
});

test('an owner transport recovery rotates server authority before rebuilding the simulation; guests do not',async()=>{
 for(const owner of [true,false]){const b=backend(),running={...room,status:'running',seed:42,ownerId:owner?'user-1':'another',ownerEpoch:3};b.values.set('game_room',{data:running});b.values.set('game_recover',{data:{room:{...running,ownerEpoch:owner?4:3},snapshot:{sequence:22}}});const client=createLobbyClient({client:b.client});await client.connect();await client.recover();assert.deepEqual(b.calls.find(([name])=>name==='game_recover')[1],{p_resume:owner});await client.close();}
});

// A just-elected successor already has a new server epoch; only a rebuilt
// existing owner's simulation needs another rotation.
test('a newly elected owner can accept the server handoff without rotating its epoch again',async()=>{
 const b=backend(),running={...room,status:'running',seed:42,ownerEpoch:1};b.values.set('game_room',{data:running});b.values.set('game_recover',{data:{room:running,snapshot:{sequence:22}}});const client=createLobbyClient({client:b.client});await client.connect();await client.recover({resumeOwner:false});assert.deepEqual(b.calls.find(([name])=>name==='game_recover')[1],{p_resume:false});await client.close();
});

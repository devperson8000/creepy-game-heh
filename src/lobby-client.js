import { createClient } from '@supabase/supabase-js';
import {createTabAuthOptions} from './lobby-session.js';
import { multiplayerConfig } from './multiplayer-config.js';

export function getMultiplayerConfig(env = import.meta.env || {}, fallback = multiplayerConfig) {
  return {
    url: env.VITE_SUPABASE_URL || fallback.url || '',
    key: env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || fallback.publishableKey || fallback.key || '',
  };
}
export function getMultiplayerUrl() { return getMultiplayerConfig().url; }

// Ordinary snapshots keep normal fetch semantics. Only a bounded final unload
// checkpoint shares the browser keepalive budget with the tiny leave request.
export function createMultiplayerFetch(fetcher = globalThis.fetch,{isSuspending=()=>false}={}) {
  return (input, init = {}) => {
    const target = typeof input === 'string' ? input : input.url || String(input);
    const checkpoint=isSuspending()&&/\/rpc\/game_publish_snapshot(?:\?|$)/.test(target)&&typeof init.body==='string'&&new TextEncoder().encode(init.body).length<48000;
    return fetcher(input, checkpoint||/\/rpc\/game_leave(?:\?|$)/.test(target) ? { ...init, keepalive: true } : init);
  };
}

export function validVoiceSignal(signal){
  if(!signal||typeof signal!=='object')return false;
  if(signal.type==='hello')return true;
  if(signal.type==='state')return typeof signal.muted==='boolean';
  if(signal.type==='offer'||signal.type==='answer')return typeof signal.sdp==='string'&&signal.sdp.length<32000;
  if(signal.type==='candidate')return signal.candidate&&typeof signal.candidate.candidate==='string'&&signal.candidate.candidate.length<2048&&Number.isInteger(signal.candidate.sdpMLineIndex)&&signal.candidate.sdpMLineIndex>=0&&signal.candidate.sdpMLineIndex<8;
  return false;
}
const commands = {
  create: p => ['game_create', { p_name: p.name, p_player_name: p.playerName }],
  join: p => ['game_request', { p_lobby_id: p.lobbyId, p_player_name: p.playerName }],
  approve: p => ['game_approve', { p_request_id: p.requestId, p_accept: p.accept }],
  ready: p => ['game_ready', { p_ready: p.ready }],
  start: () => ['game_start', {}],
  leave: () => ['game_leave', {}],
  input: p => ['game_send_input', { p_input: p.input }],
  action: p => ['game_send_action', { p_action: p.action }],
  snapshot: p => ['game_publish_snapshot', { p_snapshot: p.snapshot }],
};
const errorMessages = {
  AUTH_DISABLED: 'Enable Anonymous Sign-Ins in Supabase Authentication settings.',
  SETUP_REQUIRED: 'Run the multiplayer SQL migration in your Supabase SQL editor.',
  NOT_OWNER: 'Only the lobby owner can do that.',
  NOT_MEMBER: 'Join a lobby first.',
  NOT_READY: 'Two to four players must all be ready before starting.',
  ROOM_FULL: 'That lobby is full.',
  ROOM_RUNNING: 'That game has already started.',
  ROOM_NOT_FOUND: 'That lobby has closed.',
  REQUEST_EXPIRED: 'That join request has expired.',
  INVALID_NAME: 'Use a player name up to 24 characters and a lobby name up to 48 characters.',
  RATE_LIMIT: 'Please wait a moment before trying again.',
  REALTIME_ERROR: 'Realtime connection interrupted. Retry to connect again.',
  ALREADY_MEMBER: 'Leave your current lobby first.',
};
function normalizeError(error) {
  const raw = error?.message || String(error);
  let code = /^[A-Z_]+$/.test(raw) ? raw : 'CONNECTION_ERROR';
  if (/anonymous sign.ins.*disabled/i.test(raw)) code = 'AUTH_DISABLED';
  if (error?.code === 'PGRST202' || /could not find.*function|function .*does not exist/i.test(raw)) code = 'SETUP_REQUIRED';
  return { type: 'error', code, message: errorMessages[code] || raw };
}

// No network work happens until connect(). An injected client makes the protocol
// adapter testable without imitating Supabase's Auth, Postgres or RLS server.
export function createLobbyClient(options = {}) {
  const defaults = getMultiplayerConfig();
  const url = options.url ?? defaults.url;
  const key = options.key ?? options.publishableKey ?? defaults.key;
  const tabSession=createTabAuthOptions(),restoreSession=options.restoreSession??tabSession.restoreSession,recoveryRooms=new Set();
  const listeners = new Set();
  const lastSent = new Map(), inFlight = new Set(), inputSequences = new Map(), actionSequences = new Map();
  let db = options.client, id = null, connected = false, connecting = null, generation = 0;
  let closing = Promise.resolve(),recoveryPromise=null,suspending=false;
  let channel = null, cancelSubscription = null, pollTimer = null, heartbeatTimer = null, room = null, roomJson = '', requestJson = '';
  let roomSubscription = null, voiceChannel = null, voiceRoom = null;
  let pendingRoom = null, startedRoom = null, refreshPromise = null, refreshAgain = false, commandQueue = Promise.resolve();
  const configured = Boolean(db || (url && key));
  const emit = event => { for (const listener of listeners) listener(event); };
  async function rpc(name, args = {}) {
    const result = await db.rpc(name, args);
    if (result.error) throw result.error;
    return result.data;
  }
  function removeRoomSubscription() {
    const previous = roomSubscription;
    roomSubscription = null;
    if (previous) { previous.cancel(); void db.removeChannel(previous.channel); }
  }
  function subscribeVoice(nextRoom){
    if(voiceRoom===nextRoom.id)return;
    if(voiceChannel)void db.removeChannel(voiceChannel);
    voiceRoom=nextRoom.id;
    voiceChannel=db.channel(`voice:${nextRoom.id}`);
    voiceChannel.on('broadcast',{event:'voice'},({payload:p})=>{
      if(!room||room.id!==nextRoom.id||p?.to!==id||p.from===id||!room.members.some(m=>m.id===p.from)||!validVoiceSignal(p.signal))return;
      emit({type:'voice',playerId:p.from,signal:p.signal});
    }).subscribe(status=>{if(status==='SUBSCRIBED')emit({type:'voiceReady'});});
  }
  function removeVoice(){if(voiceChannel)void db.removeChannel(voiceChannel);voiceChannel=null;voiceRoom=null;}
  function subscribeToRoom(nextRoom) {
    subscribeVoice(nextRoom);
    const waiting=nextRoom.status==='waiting';
    const table = waiting || nextRoom.ownerId === id ? 'game_members' : 'game_snapshots';
    const key = `${nextRoom.id}:${waiting?'waiting':table}`;
    if (roomSubscription?.key === key) return roomSubscription.ready;
    removeRoomSubscription();
    const currentGeneration = generation;
    const nextChannel = db.channel(waiting?`waiting:${nextRoom.id}`:`room:${key}:${currentGeneration}`);
    const subscription = { key, channel: nextChannel, cancel: () => {}, ready: null };
    roomSubscription = subscription;
    nextChannel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `lobby_id=eq.${nextRoom.id}` }, change => onChange(table, change));
    if(waiting)nextChannel.on('broadcast',{event:'pose'},({payload})=>{
      const p=payload?.pose;
      if(room?.status!=='waiting'||room.id!==nextRoom.id||payload.id===id||!room.members.some(m=>m.id===payload.id)||!p||!['x','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))||Math.abs(p.x)>5.75||Math.abs(p.z)>6.75)return;
      emit({type:'waitingPose',playerId:payload.id,pose:{x:p.x,z:p.z,yaw:p.yaw,pitch:Math.max(-1.3,Math.min(1.3,p.pitch)),torch:!!p.torch,moving:!!p.moving}});
    });
    subscription.ready = new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => { settled = true; reject(new Error('REALTIME_ERROR')); }, 15000);
      subscription.cancel = () => { clearTimeout(timer); settled = true; resolve(); };
      nextChannel.subscribe(status => {
        if (currentGeneration !== generation || roomSubscription !== subscription) return;
        if (status === 'SUBSCRIBED') { const returning=settled;clearTimeout(timer);settled=true;resolve();if(returning)emit({type:'connection',status:'connected'}); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timer);
          if (!settled) { settled = true; reject(new Error('REALTIME_ERROR')); }
          else emit({type:'connection',status:'reconnecting'});
        }
      });
    });
    return subscription.ready;
  }
  function clearRoom(voluntary = false) {
    removeRoomSubscription();removeVoice();
    if (room && !voluntary) emit({ type: 'roomClosed', lobbyId: room.id, reason: 'host_left' });
    room = null; roomJson = ''; startedRoom = null; inputSequences.clear(); actionSequences.clear();
  }
  function applyRequest(request) {
    const json = request ? `${request.lobbyId}|${request.status}|${request.reason || ''}` : 'none';
    if (json === requestJson && !(pendingRoom && !request)) return;
    requestJson = json;
    if (request?.status === 'pending') {
      if (pendingRoom !== request.lobbyId) emit({ type: 'pending', lobbyId: request.lobbyId });
      pendingRoom = request.lobbyId;
    } else if (request?.status === 'rejected') {
      pendingRoom = null;
      emit({ type: 'rejected', lobbyId: request.lobbyId, reason: request.reason || 'declined' });
    } else if (request?.status === 'approved') pendingRoom = null;
    else if (pendingRoom) {
      emit({ type: 'rejected', lobbyId: pendingRoom, reason: 'host_left' });
      pendingRoom = null;
    }
  }
  function refresh() {
    if (refreshPromise) { refreshAgain = true; return refreshPromise; }
    const currentGeneration = generation;
    refreshPromise = (async () => {
      do {
        refreshAgain = false;
        const [lobbies, nextRoom, request] = await Promise.all([
          rpc('game_directory'), rpc('game_room'), rpc('game_request_state'),
        ]);
        if (currentGeneration !== generation) return;
        emit({ type: 'lobbies', lobbies: lobbies || [] });
        if (nextRoom) {
          const json = JSON.stringify(nextRoom);
          room = nextRoom;
          if(!recoveryRooms.has(room.id)){await rpc('game_support_recovery');recoveryRooms.add(room.id);}
          // Route frequent gameplay rows only to their actual recipient.
          // Lobby metadata updates and polling keep every roster current.
          await subscribeToRoom(nextRoom);
          if (currentGeneration !== generation) return;
          if (json !== roomJson) { roomJson = json; emit({ type: 'lobby', lobby: room }); }
          if (room.status === 'running' && startedRoom !== room.id) {
            let restored=null;if(restoreSession){restored=await rpc('game_recover',{p_resume:true});if(currentGeneration!==generation)return;if(restored?.room){room=restored.room;roomJson=JSON.stringify(room);emit({type:'lobby',lobby:room});}}
            startedRoom = room.id;
            emit({ type: 'started', lobbyId: room.id, seed: room.seed, ownerId: room.ownerId,ownerEpoch:room.ownerEpoch??0,players: room.members,...(restored?.snapshot?{checkpoint:restored.snapshot,halloween:!!restored.snapshot.state?.run?.halloween}:{} ) });
          }
        } else if (room) clearRoom();
        applyRequest(request);
      } while (refreshAgain && currentGeneration === generation);
    })().finally(() => {
      if (currentGeneration === generation) {
        refreshPromise = null;
        // A command may finish after the loop exits but before this finally.
        if (refreshAgain) { refreshAgain = false; return refresh(); }
      }
    });
    return refreshPromise;
  }
  function backgroundRefresh() {
    if (connected) refresh().catch(error => emit(normalizeError(error)));
  }
  function onChange(table, change) {
    if (!connected) return;
    const row = change.new || {};
    if (table === 'game_members' && change.eventType !== 'DELETE' && row.lobby_id === room?.id) {
      if (room.ownerId === id && row.user_id !== id && room.status === 'running') {
        if (row.input && row.input_seq > (inputSequences.get(row.user_id) || 0)) {
          inputSequences.set(row.user_id, row.input_seq);
          emit({ type: 'input', playerId: row.user_id, input: row.input });
        }
        if (row.action && row.action_seq > (actionSequences.get(row.user_id) || 0)) {
          actionSequences.set(row.user_id, row.action_seq);
          emit({ type: 'action', playerId: row.user_id, action: row.action });
        }
      }
      // Input/heartbeat writes are frequent; refresh the roster only when its
      // presentation fields changed. The polling fallback handles lost events.
      if (change.eventType === 'UPDATE' && room.members.some(m => m.id === row.user_id && m.name === row.name && m.ready === row.ready && m.slot === row.slot)) return;
    }
    if (table === 'game_snapshots') {
      if (room?.status === 'running' && room.ownerId !== id && row.lobby_id === room.id && row.payload) {
        emit({ type: 'snapshot', snapshot: row.payload });
      }
      return;
    }
    if (table === 'game_requests' && row.user_id === id) applyRequest({ lobbyId: row.lobby_id, status: row.status, reason: row.reason });
    backgroundRefresh();
  }
  function stop() {
    removeRoomSubscription();removeVoice();
    cancelSubscription?.(); cancelSubscription = null;
    clearInterval(pollTimer); clearInterval(heartbeatTimer);
    pollTimer = null; heartbeatTimer = null;
    if (channel && db) void db.removeChannel(channel);
    channel = null;
  }
  const api = {
    get id() { return id; },
    get connected() { return connected; },
    get configured() { return configured; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    connect() {
      if (connected) return Promise.resolve();
      if (connecting) return connecting;
      const currentGeneration = ++generation;
      emit({ type: 'connection', status: 'connecting' });
      connecting = (async () => {
        // Reuse this SDK client only after the previous identity has left.
        await closing;
        if (currentGeneration !== generation) return;
        if (!configured) throw new Error('Supabase multiplayer is not configured. Set the Supabase URL and publishable key.');
        db ||= createClient(url, key, { auth: { ...tabSession.auth, autoRefreshToken: true, detectSessionInUrl: false }, global: { fetch: createMultiplayerFetch(globalThis.fetch,{isSuspending:()=>suspending}) } });
        suspending=false;void db.auth.startAutoRefresh?.();
        let result;if(restoreSession&&db.auth.getSession){const saved=await db.auth.getSession();if(saved.data?.session?.user)result={data:{user:saved.data.session.user}};}result??=await db.auth.signInAnonymously();
        if (result.error) throw result.error;
        if (currentGeneration !== generation) return;
        id = result.data?.user?.id;
        if (!id) throw new Error('Supabase authentication did not return a player identity.');
        // Diagnose an absent migration before Realtime can report a generic
        // subscription error for its missing tables. This RPC is read only.
        await rpc('game_room');
        if (currentGeneration !== generation) return;
        channel = db.channel(`game:${id}:${currentGeneration}`);
        for (const table of ['game_lobbies', 'game_requests']) {
          channel.on('postgres_changes', { event: '*', schema: 'public', table }, change => onChange(table, change));
        }
        const realtimeReady = new Promise((resolve, reject) => {
          let settled = false;
          const timer = setTimeout(() => { settled = true; reject(new Error('REALTIME_ERROR')); }, 15000);
          cancelSubscription = () => { clearTimeout(timer); settled = true; resolve(); };
          channel.subscribe(status => {
            if (currentGeneration !== generation) return;
            if (status === 'SUBSCRIBED') { const returning=settled;clearTimeout(timer);settled=true;resolve();if(returning)emit({type:'connection',status:'connected'}); }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              clearTimeout(timer);
              if (!settled) { settled = true; reject(new Error('REALTIME_ERROR')); }
              else emit({type:'connection',status:'reconnecting'});
            }
          });
        });
        await realtimeReady;
        if (currentGeneration !== generation) return;
        await refresh();
        if (currentGeneration !== generation) return;
        connected = true;
        emit({ type: 'welcome', id });
        pollTimer = setInterval(backgroundRefresh, 5000);
        heartbeatTimer = setInterval(() => {
          rpc('game_heartbeat').then(backgroundRefresh).catch(error => emit(normalizeError(error)));
        }, 15000);
        pollTimer.unref?.(); heartbeatTimer.unref?.();
        emit({ type: 'connection', status: 'connected' });
      })().catch(error => {
        if (currentGeneration === generation) { connected = false; id = null; stop(); emit(normalizeError(error)); }
        throw new Error(normalizeError(error).message, { cause: error });
      }).finally(() => { if (currentGeneration === generation) connecting = null; });
      return connecting;
    },
    send(type, payload = {}) {
      if (!connected) return false;
      if(type==='voice'){
        if(!voiceChannel||!room?.members.some(m=>m.id===payload.to&&m.id!==id)||!validVoiceSignal(payload.signal))return false;
        void voiceChannel.send({type:'broadcast',event:'voice',payload:{from:id,to:payload.to,signal:payload.signal}}).catch(()=>{});
        return true;
      }
      if(type==='waitingPose'){
        const p=payload.pose;
        if(room?.status!=='waiting'||!roomSubscription||!p||!['x','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))||Math.abs(p.x)>5.75||Math.abs(p.z)>6.75||Date.now()-(lastSent.get(type)||0)<100)return false;
        lastSent.set(type,Date.now());
        void roomSubscription.channel.send({type:'broadcast',event:'pose',payload:{id,pose:{x:p.x,z:p.z,yaw:p.yaw,pitch:p.pitch,torch:!!p.torch,moving:!!p.moving}}}).catch(()=>{});
        return true;
      }
      if (!Object.hasOwn(commands, type)) { emit({ type: 'error', code: 'INVALID_MESSAGE', message: 'Unknown multiplayer command.' }); return false; }
      const realtime = ['input', 'action', 'snapshot'].includes(type);
      if (realtime) {
        const gap = type === 'input' ? 55 : 110;
        if (inFlight.has(type) || Date.now() - (lastSent.get(type) || 0) < gap) return false;
        lastSent.set(type, Date.now()); inFlight.add(type);
      }
      const currentGeneration = generation;
      const execute = async () => {
        if (!connected || generation !== currentGeneration) return;
        try {
          const [name, args] = commands[type](payload);
          await rpc(name, args);
          if (generation !== currentGeneration) return;
          if (type === 'join') { pendingRoom = payload.lobbyId; emit({ type: 'pending', lobbyId: payload.lobbyId }); }
          if (type === 'leave') { pendingRoom = null; requestJson = ''; clearRoom(true); emit({ type: 'left' }); emit({ type: 'lobby', lobby: null }); }
          if (!realtime) await refresh();
        } catch (error) {
          if (generation === currentGeneration && !(realtime && error.message === 'RATE_LIMIT')) emit(normalizeError(error));
        } finally { inFlight.delete(type); }
      };
      if (realtime) void execute();
      else commandQueue = commandQueue.then(execute, execute);
      return true;
    },
    recover({resumeOwner=room?.ownerId===id}={}) {
      if(!connected||!id)return Promise.reject(new Error('The session is closed.'));
      if(recoveryPromise)return recoveryPromise;const currentGeneration=generation;
      recoveryPromise=(async()=>{try{const data=await rpc('game_recover',{p_resume:resumeOwner});if(currentGeneration!==generation||!connected)return;
        if(!data?.room)throw new Error('NOT_MEMBER');removeRoomSubscription();removeVoice();room=data.room;await subscribeToRoom(room);if(currentGeneration!==generation||!connected)return;
        roomJson=JSON.stringify(room);emit({type:'lobby',lobby:room});emit({type:'recovered',lobby:room,snapshot:data.snapshot,serverNow:data.serverNow});emit({type:'connection',status:'connected'});return data;
      }catch(error){if(currentGeneration===generation){if(error.message==='NOT_MEMBER'||error.message==='ROOM_NOT_FOUND')clearRoom();else emit({type:'connection',status:'reconnecting'});}throw new Error(normalizeError(error).message,{cause:error});
      }finally{if(currentGeneration===generation)recoveryPromise=null;}})();return recoveryPromise;
    },
    close({leave=true,checkpoint}={}) {
      const wasConnected = connected,wasOwner=room?.status==='running'&&room.ownerId===id;suspending=!leave;
      const pendingCommands = commandQueue;
      ++generation; connected = false; connecting = null; refreshPromise = null;recoveryPromise=null;
      stop();void db?.auth.stopAutoRefresh?.();
      // A create/approve may already be on the wire. Leave after it commits,
      // and let callers await this before navigating away.
      closing = Promise.allSettled([closing, pendingCommands]).then(async () => {
        if(wasConnected&&wasOwner&&checkpoint&&db){try{await rpc('game_publish_snapshot',{p_snapshot:checkpoint});}catch(error){if(error.message==='RATE_LIMIT'&&leave){await new Promise(resolve=>setTimeout(resolve,110));await rpc('game_publish_snapshot',{p_snapshot:checkpoint}).catch(()=>{});}}}
        if (leave && wasConnected && db) await rpc('game_leave').catch(() => {});
        if(leave&&tabSession.auth.storageKey)try{tabSession.auth.storage?.removeItem(tabSession.auth.storageKey);}catch{}
      });
      clearRoom(true); id = null; pendingRoom = null; requestJson = ''; commandQueue = Promise.resolve();
      lastSent.clear(); inFlight.clear();
      emit({ type: 'connection', status: leave?'closed':'suspended' });
      return closing;
    },
  };
  return api;
}

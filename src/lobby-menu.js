import {startMenuHallway} from './menu-hallway.js';
import {createWaitingRoom} from './waiting-room.js';
const NAME_KEY = 'monochrome.playerName';

function element(tag, className, text) {
 const node = document.createElement(tag);
 if (className) node.className = className;
 if (text !== undefined) node.textContent = text;
 return node;
}

function storedName() {
 try { return localStorage.getItem(NAME_KEY)?.slice(0, 24) || ''; }
 catch { return ''; }
}

/** Owns its connection until a started session is handed to onMultiplayer. */
export function createLobbyMenu({onSingleplayer = () => {}, onMultiplayer = () => {}, createClient, initialPlayerName, onClient} = {}) {
 const root = element('main', 'lobby-menu');
 root.id = 'lobby-menu';
 root.setAttribute('aria-label', 'Monochrome game menu');
 const atmosphere = element('div', 'lobby-atmosphere');
 atmosphere.setAttribute('aria-hidden', 'true');
 atmosphere.append(element('div', 'lobby-corridor'), element('div', 'lobby-door'), element('div', 'lobby-floor'));
 const header = element('header', 'lobby-header');
 const brand = element('div', 'lobby-brand', 'MONOCHROME');
 brand.append(element('span', '', 'SUBLEVEL ACCESS / B1'));
 header.append(brand, element('span', 'lobby-header-tag', 'NO SIGNAL BELOW THIS POINT'));
 const content = element('div', 'lobby-content');
 const footer = element('footer', 'lobby-footer');
 footer.append(element('span', '', 'HEADPHONES RECOMMENDED'), element('span', '', 'KEEP YOUR LIGHT CLOSE.'));
 const notice = element('p', 'lobby-notice');
 notice.id = 'lobby-notice';
 notice.setAttribute('role', 'status');
 notice.setAttribute('aria-live', 'polite');
 root.append(atmosphere, header, content, notice, footer);
 document.body.append(root);
 const hallway=element('div','lobby-hallway');atmosphere.prepend(hallway);
 let menuHallway;
 try{menuHallway=startMenuHallway(hallway);}catch(error){console.warn('Menu hallway unavailable',error);}

 let screen = 'mode', playerName = initialPlayerName ?? storedName(), lobbyName = '', client = null, unsubscribe = null;
 let network = 'idle', lobbies = [], room = null, pendingLobby = null, actionPending = false;
 let message = '', isError = false, disposed = false, generation = 0;
 let waiting=null,waitingId=null;
 function releaseWaiting(){waiting?.dispose();waiting=null;waitingId=null;root.classList.remove('in-waiting-room','terminal-open');}

 function button(label, id, run, {primary = false, disabled = false, small = false} = {}) {
  const node = element('button', `lobby-button${primary ? ' lobby-button-primary' : ''}${small ? ' lobby-button-small' : ''}`, label);
  node.type = 'button';
  if (id) node.id = id;
  node.disabled = disabled;
  node.addEventListener('click', run);
  return node;
 }

 function field(label, id, value, placeholder, onInput, maxLength = 24) {
  const wrap = element('label', 'lobby-field', label);
  const input = element('input');
  input.id = id;
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.autocomplete = id === 'lobby-player-name' ? 'nickname' : 'off';
  input.addEventListener('input', () => onInput(input.value));
  wrap.append(input);
  return wrap;
 }

 function setNotice(text = '', error = false) {
  message = text;
  isError = error;
  notice.textContent = text;
  notice.classList.toggle('lobby-notice-error', error);
 }

 function suit(slot = 0) {
  const figure = element('div', 'lobby-suit');
  figure.dataset.slot = String(slot);
  figure.setAttribute('aria-hidden', 'true');
  for (const part of ['hood', 'visor', 'body', 'arm-left', 'arm-right', 'leg-left', 'leg-right']) {
   figure.append(element('i', `lobby-suit-${part}`));
  }
  return figure;
 }

 function heading(kicker, title, description) {
  const intro = element('div', 'lobby-intro');
  intro.append(element('p', 'lobby-eyebrow', kicker), element('h1', '', title), element('p', 'lobby-description', description));
  return intro;
 }

 function modeScreen() {
  const intro = heading('AN ESCAPE THROUGH THE BASEMENT', 'SOMETHING\nIS DOWN THERE.', 'Four keys. One number. A way back to the light. Enter alone, or bring someone you trust.');
  const detail = element('div', 'lobby-route');
  for (const text of ['SEARCH THE ROOMS', 'STAY QUIET', 'FIND THE ELEVATOR']) detail.append(element('span', '', text));
  intro.append(detail);
  const options = element('section', 'lobby-mode-options');
  options.setAttribute('aria-label', 'Choose a game mode');
  const solo = button('', 'lobby-singleplayer', () => { dispose(); onSingleplayer(); });
  solo.classList.add('lobby-mode-card');
  solo.append(element('span', 'lobby-mode-number', '01 / SOLO DESCENT'), element('strong', '', 'Singleplayer'), element('span', 'lobby-mode-detail', 'Just you. Your torch. Whatever is listening.'), element('span', 'lobby-mode-arrow'));
  const multiplayer = button('', 'lobby-multiplayer', openMultiplayer);
  multiplayer.classList.add('lobby-mode-card');
  multiplayer.append(element('span', 'lobby-mode-number', '02 / SHARED DESCENT'), element('strong', '', 'Multiplayer'), element('span', 'lobby-mode-detail', '2–4 players · Private entry · Host approval'), element('span', 'lobby-mode-arrow'));
  const study = element('a', 'lobby-study', 'Creature study');
  study.href = '?mode=study';
  const test=element('a','lobby-study','Two-tab co-op test');test.href='?mode=coop-test';
  options.append(solo, multiplayer, study,test);
  content.append(intro, options);
 }

 function sessionPanel() {
  const aside = element('aside', 'lobby-uniform-panel');
  const portrait = element('div', 'lobby-uniform-portrait');
  portrait.append(suit(), element('span', 'lobby-uniform-crosshair', '+'));
  aside.append(portrait, element('p', 'lobby-eyebrow', 'ISSUED UNIFORM'), element('h2', '', 'Sealed hazmat'), element('p', 'lobby-muted', 'Smooth hood. Dark visor. One small light in a very large dark.'), element('span', 'lobby-uniform-tag', 'STANDARD ISSUE / ALL PLAYERS'));
  return aside;
 }

 function connectionLabel() {
  const label = element('span', `lobby-connection lobby-connection-${network}`, network === 'connected' ? 'CONNECTION ESTABLISHED' : network === 'connecting' ? 'ESTABLISHING CONNECTION' : 'CONNECTION UNAVAILABLE');
  label.id = 'lobby-connection';
  return label;
 }

 function multiplayerScreen() {
  const panel = element('section', 'lobby-panel');
  const top = element('div', 'lobby-panel-top');
  top.append(button('← Back', 'lobby-back', backToModes, {small:true}), connectionLabel());
  panel.append(top, heading('SHARED DESCENT / 2–4 PLAYERS', 'FIND YOUR PEOPLE.', 'Create a lobby or request entry. The host decides who comes downstairs.'));
  if (network !== 'connected') {
   const state = element('div', 'lobby-empty');
   if (network === 'connecting') {
    state.append(element('h2', '', 'Listening for a signal…'), element('p', '', 'Connecting to the multiplayer service.'));
   } else {
    state.append(element('h2', '', client?.configured === false ? 'Multiplayer is not configured' : 'The signal did not reach us'), element('p', '', client?.configured === false ? 'The shared Supabase service has not been set up for this deployment. Singleplayer is available now.' : 'Check your connection and try again. No lobby has been joined.'));
    state.append(button('Try again', 'lobby-retry', openMultiplayer, {small:true}));
   }
   panel.append(state);
  } else {
   panel.append(field('YOUR CALLSIGN', 'lobby-player-name', playerName, 'Enter your name', value => {
    playerName = value;
    try { localStorage.setItem(NAME_KEY, value); } catch { /* Storage is optional. */ }
   }));
   if (pendingLobby) {
    const pending = element('div', 'lobby-pending');
    pending.id = 'lobby-pending';
    pending.append(element('h2', '', 'Waiting for host approval'), element('p', '', 'Your request has been sent. Stay here while the host decides.'), button('Cancel request', 'lobby-cancel-request', () => {
     if (send('leave')) { pendingLobby = null; actionPending = false; setNotice('Join request cancelled.'); render(); }
    }, {small:true}));
    panel.append(pending);
   } else {
    const form = element('form', 'lobby-create-form');
    form.append(field('NEW LOBBY', 'lobby-create-name', lobbyName, 'Give your lobby a name', value => { lobbyName = value; }, 40));
    const create = button('Create lobby +', 'lobby-create', () => form.requestSubmit(), {primary:true,disabled:actionPending});
    form.append(create);
    form.addEventListener('submit', event => {
     event.preventDefault();
     if (actionPending) return;
     if (!validName()) return;
     if (!lobbyName.trim()) { setNotice('Give your lobby a name first.', true); content.querySelector('#lobby-create-name')?.focus(); return; }
     if (send('create', {name:lobbyName.trim(), playerName:playerName.trim()})) { actionPending = true; setNotice('Creating your lobby…'); render(); }
    });
    panel.append(form, lobbyList());
   }
  }
  content.append(panel, sessionPanel());
 }

 function lobbyList() {
  const list = element('section', 'lobby-list');
  list.id = 'lobby-list';
  const title = element('div', 'lobby-list-heading');
  title.append(element('h2', '', 'Active lobbies'), element('span', '', `${lobbies.length} ${lobbies.length === 1 ? 'SIGNAL' : 'SIGNALS'}`));
  list.append(title);
  if (!lobbies.length) list.append(element('p', 'lobby-empty-copy', 'No active lobbies. Create one and be the first to descend.'));
  for (const lobby of lobbies) {
   const row = element('div', 'lobby-list-row');
   row.dataset.lobbyId = lobby.id;
   const copy = element('div', 'lobby-list-copy');
   copy.append(element('h3', '', lobby.name), element('p', '', `Host: ${lobby.hostName || 'Unknown'} · ${lobby.count || 0}/4 players`));
   const full = lobby.count >= 4;
   const started = lobby.status && lobby.status !== 'waiting';
   row.append(copy, button(full ? 'Full' : started ? 'In progress' : 'Enter lobby', null, () => {
    if (!validName()) return;
    if (send('join', {lobbyId:lobby.id, playerName:playerName.trim()})) { pendingLobby = lobby.id; setNotice('Request sent. Waiting for the host.'); render(); }
   }, {small:true,disabled:full || Boolean(started) || actionPending}));
   list.append(row);
  }
  return list;
 }

 function waitingRoom() {
  const panel = element('section', 'lobby-panel');
  const top = element('div', 'lobby-panel-top');
  top.append(button('← Leave lobby', 'lobby-leave', leaveRoom, {small:true}), connectionLabel());
  const members = room.members || [];
  const owner = room.ownerId === client?.id;
  const me = members.find(member => member.id === client?.id);
  panel.append(top, heading('ASSEMBLING THE TEAM', room.name, owner ? 'You are the host. Approve your team, then begin the descent when everyone is ready.' : 'You are inside. Ready up when you are prepared to descend.'));
  const roster = element('div', 'lobby-roster');
  roster.id = 'lobby-roster';
  for (let slot = 0; slot < 4; slot++) {
   const member = members.find(item => item.slot === slot) || (members.every(item => item.slot === undefined) ? members[slot] : null);
   const card = element('div', `lobby-player${member ? '' : ' lobby-player-empty'}`);
   if (member) {
    const ready = member.id === room.ownerId || member.ready;
    card.append(suit(slot), element('h3', '', member.name), element('span', 'lobby-player-role', member.id === room.ownerId ? 'HOST' : member.id === client?.id ? 'YOU' : `PLAYER ${slot + 1}`), element('span', `lobby-ready-state${ready ? ' is-ready' : ''}`, ready ? '● Ready' : '○ Not ready'));
   } else card.append(element('span', 'lobby-empty-slot', '+'), element('h3', '', 'Empty slot'), element('span', 'lobby-player-role', 'AWAITING PLAYER'));
   roster.append(card);
  }
  panel.append(roster);
  if (owner) {
   const requests = element('section', 'lobby-requests');
   requests.id = 'lobby-requests';
   requests.append(element('h2', '', `Join requests (${room.requests?.length || 0})`));
   if (!room.requests?.length) requests.append(element('p', 'lobby-muted', 'New requests will appear here. Only approved players can enter.'));
   for (const request of room.requests || []) {
    const row = element('div', 'lobby-request-row');
    const actions = element('div', 'lobby-request-actions');
    actions.append(button('Approve', null, () => send('approve', {requestId:request.id,accept:true}), {small:true,disabled:members.length >= 4}), button('Decline', null, () => send('approve', {requestId:request.id,accept:false}), {small:true}));
    row.append(element('span', '', request.name), actions);
    requests.append(row);
   }
   panel.append(requests);
  }
  const actions = element('div', 'lobby-room-actions');
  const readyCount = members.filter(member => member.ready || member.id === room.ownerId).length;
  if (owner) {
   const canStart = members.length >= 2 && members.length <= 4 && readyCount === members.length && !actionPending && network === 'connected';
   actions.append(button('Begin descent', 'lobby-start', () => {
    if (send('start')) { actionPending = true; setNotice('Opening the descent…'); render(); }
   }, {primary:true,disabled:!canStart}), element('p', 'lobby-muted', members.length < 2 ? 'Waiting for at least one more player.' : `${readyCount}/${members.length} players ready. Everyone must be ready to start.`));
  } else {
   const ready = Boolean(me?.ready);
   const readyButton = button(ready ? 'Ready — click to cancel' : 'I am ready', 'lobby-ready', () => send('ready', {ready:!ready}), {primary:!ready,disabled:network !== 'connected'});
   readyButton.setAttribute('aria-pressed', String(ready));
   actions.append(readyButton, element('p', 'lobby-muted', 'The host starts the game once everyone is ready.'));
  }
  panel.append(actions);
  content.append(panel, sessionPanel());
 }

 function validName() {
  if (playerName.trim()) return true;
  setNotice('Enter your callsign before creating or joining a lobby.', true);
  content.querySelector('#lobby-player-name')?.focus();
  return false;
 }

 function render() {
  if (disposed) return;
  const container=document.querySelector('#scene');
  if(room?.status==='waiting'&&container){
   if(waitingId!==room.id){releaseWaiting();waiting=createWaitingRoom(container,{client,room,onTerminal:open=>root.classList.toggle('terminal-open',open)});waitingId=room.id;}
   waiting.setRoom(room);root.classList.add('in-waiting-room');
  }else releaseWaiting();
  const active = root.contains(document.activeElement) ? document.activeElement : null;
  const focusedId = active?.id;
  const selection = active?.tagName === 'INPUT' ? [active.selectionStart, active.selectionEnd] : null;
  content.replaceChildren();
  root.dataset.screen = screen;
  if (screen === 'mode') modeScreen();
  else if (room) waitingRoom();
  else multiplayerScreen();
  setNotice(message, isError);
  const next = focusedId && content.querySelector(`#${focusedId}`);
  if (next && !next.disabled) {
   next.focus({preventScroll:true});
   if (selection) next.setSelectionRange(...selection);
  }
 }

 function send(type, payload = {}) {
  if (client?.send(type, payload)) return true;
  actionPending = false;
  network = 'failed';
  room = null;
  pendingLobby = null;
  setNotice('The connection is unavailable. Reconnect and try again.', true);
  render();
  return false;
 }

 function receive(event) {
  if (disposed) return;
  const data = event.payload ? {...event.payload,type:event.type} : event;
  switch (data.type) {
   case 'welcome': network = 'connected'; break;
   case 'lobbies': lobbies = data.lobbies || []; break;
   case 'lobby':
    room = data.lobby;
    pendingLobby = null;
    actionPending = false;
    setNotice('');
    break;
   case 'left': room = null; pendingLobby = null; actionPending = false; setNotice('You left the lobby.'); break;
   case 'pending': pendingLobby = data.lobbyId || pendingLobby; setNotice('Request sent. Waiting for host approval.'); break;
   case 'rejected': pendingLobby = null; actionPending = false; setNotice('The host declined your request. You can try another lobby.'); break;
   case 'roomClosed': room = null; pendingLobby = null; actionPending = false; setNotice('The host closed the lobby. Choose another or create your own.'); break;
   case 'disconnected':
   case 'closed': network = 'failed'; room = null; pendingLobby = null; actionPending = false; setNotice('Connection lost. Reconnect to find your team again.', true); break;
   case 'error':
    actionPending = false;
    if (!room) pendingLobby = null;
    if (data.code === 'NOT_CONFIGURED') network = 'failed';
    setNotice(data.message || 'The multiplayer service could not complete that request.', true);
    break;
   case 'started': {
    const activeClient = client;
    dispose({keepClient:true});
    onMultiplayer({client:activeClient,session:data});
    return;
   }
   default: return;
  }
  render();
 }

 function releaseClient() {
  generation++;
  unsubscribe?.();
  unsubscribe = null;
  client?.close();
  client = null;
 }

 async function openMultiplayer() {
  releaseClient();
  screen = 'multiplayer'; network = 'connecting'; room = null; pendingLobby = null; actionPending = false; lobbies = [];
  setNotice(''); render();
  const attempt = generation;
  try {
   client = createClient?.() || {configured:false,close() {}};
   if (client.configured === false) {
    network = 'failed';
    setNotice('Supabase multiplayer setup is missing for this deployment.', true);
    render(); return;
   }
   unsubscribe = client.subscribe(receive);
   onClient?.(client);
   await client.connect();
   if (disposed || attempt !== generation) return;
   network = 'connected'; render();
  } catch (error) {
   if (disposed || attempt !== generation) return;
   network = 'failed';
   setNotice(error?.message || 'Could not connect to the multiplayer service.', true);
   render();
  }
 }

 function leaveRoom() {
  if (!send('leave')) { backToModes(); return; }
  room = null; pendingLobby = null; actionPending = false;
  setNotice('You left the lobby.'); render();
 }

 function backToModes() {
  if (room || pendingLobby) client?.send('leave');
  releaseClient();
  screen = 'mode'; room = null; pendingLobby = null; network = 'idle';
  setNotice(''); render();
 }

 function dispose({keepClient = false} = {}) {
  if (disposed) return;
  disposed = true;
  menuHallway?.dispose();
  releaseWaiting();
  if (keepClient) { generation++; unsubscribe?.(); unsubscribe = null; }
  else releaseClient();
  root.remove();
 }

 render();
 return {root, dispose, openMultiplayer, get waitingRoom(){return waiting;}};
}

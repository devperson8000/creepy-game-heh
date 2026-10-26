import {bindGameplayChannel} from './peer-gameplay.js';
import {createProximityVoice,proximityVoiceMix} from './proximity-voice.js';
// One small WebRTC mesh per accepted lobby, retained through the game transition.
// Supabase carries signalling only; microphone audio travels over encrypted WebRTC.
export function createSpeechGate(){
 let until=0;
 return (samples,now,enabled=true)=>{
  if(!enabled){until=0;return false;}
  let energy=0;for(const x of samples)energy+=x*x;
  if(samples.length&&Math.sqrt(energy/samples.length)>.025)until=now+220;
  return now<until;
 };
}
export function readIceServers(value){
 const defaults=[{urls:'stun:stun.cloudflare.com:3478'},{urls:'stun:stun.l.google.com:19302'}];
 if(!value)return defaults;
 try{const list=JSON.parse(value);if(Array.isArray(list)&&list.length&&list.every(s=>{if(!s)return false;const urls=typeof s.urls==='string'?[s.urls]:s.urls;if(!Array.isArray(urls)||!urls.length||!urls.every(u=>typeof u==='string'&&/^(stuns?|turns?):/.test(u)))return false;return !urls.some(u=>/^turns?:/.test(u))||(typeof s.username==='string'&&typeof s.credential==='string');}))return list;}catch{}
 return defaults;
}
export function createVoiceChat({client,iceServers=readIceServers(import.meta.env?.VITE_WEBRTC_ICE_SERVERS)}={}){
 const peers=new Map(),speaking=new Map(),meters=new Map(),gameListeners=new Set();
 let members=[],roomId=null,context=null,stream=null,disposed=false,busy=false,notice='',retryAt=0,captureGeneration=0,spatialFrame=null;
 const supported=typeof RTCPeerConnection!=='undefined'&&!!navigator.mediaDevices?.getUserMedia;
 const panel=document.createElement('aside');panel.id='voice-chat';panel.hidden=true;panel.setAttribute('aria-label','Team voice chat');
 panel.innerHTML='<button type="button" id="voice-toggle" aria-pressed="false">Mic off</button><button type="button" id="voice-listen" hidden>Enable voice audio</button><span id="voice-notice" role="status"></span><ul id="voice-roster"></ul>';
 document.body.append(panel);
 const button=panel.querySelector('#voice-toggle'),listen=panel.querySelector('#voice-listen'),status=panel.querySelector('#voice-notice'),roster=panel.querySelector('#voice-roster');
 function muted(){return !stream;}
 function render(){
  panel.hidden=!roomId;button.disabled=busy||!supported;button.setAttribute('aria-pressed',String(!muted()));button.classList.toggle('mic-live',!muted());
  button.textContent=busy?'Opening mic…':!supported?'Voice unavailable':muted()?'Mic off · click to talk':'Mic on · click to mute';
  status.textContent=notice;roster.replaceChildren();
  for(const member of members){
   const li=document.createElement('li');li.classList.toggle('is-speaking',!!speaking.get(member.id));li.dataset.playerId=member.id;
   const mic=document.createElement('span');mic.className='voice-mic-icon';mic.setAttribute('aria-hidden','true');
   const label=document.createElement('span');label.textContent=member.id===client.id?'You':member.name||'Survivor';
   const peer=peers.get(member.id),active=member.id===client.id?!muted():peer?.remoteMuted===false;
   li.title=speaking.get(member.id)?'Speaking':active?'Microphone on':'Microphone muted';li.classList.toggle('is-muted',!active);li.append(mic,label);roster.append(li);
  }
 }
 function send(id,signal){return client.send('voice',{to:id,signal});}
 function announce(){for(const id of peers.keys())send(id,{type:'state',muted:muted()});}
 function audioContext(){
  if(!context){const C=window.AudioContext||window.webkitAudioContext;if(C)context=new C();}
  return context;
 }
 function meter(id,media){
  unmeter(id);const ctx=audioContext();if(!ctx)return;
  const source=ctx.createMediaStreamSource(media),analyser=ctx.createAnalyser();analyser.fftSize=512;source.connect(analyser);
  meters.set(id,{source,analyser,samples:new Float32Array(analyser.fftSize),gate:createSpeechGate()});
 }
 function unmeter(id){const m=meters.get(id);if(m){m.source.disconnect();m.analyser.disconnect();meters.delete(id);}speaking.delete(id);}
 function positionPeer(p){
  const position=spatialFrame?.players?.find(player=>player.id===p.id),active=spatialFrame?.active!==false&&p.remoteMuted===false;
  if(p.spatial)p.spatial.update(spatialFrame?.listener,position,active);
  else p.audio.volume=proximityVoiceMix(spatialFrame?.listener,position,active).gain;
 }
 function updateSpatial(frame){spatialFrame=frame;for(const p of peers.values())positionPeer(p);}
 async function unlock(){
  if(context?.state==='suspended')listen.hidden=false;
  try{await context?.resume();}catch{}
  let blocked=!!context&&context.state!=='running';await Promise.all([...peers.values()].map(async p=>{if(p.audio.srcObject)try{await p.audio.play();}catch{blocked=true;}}));if(!disposed)listen.hidden=!blocked;
 }
 const unlockGesture=()=>{if(roomId&&context?.state==='suspended')void unlock();};
 document.addEventListener('pointerdown',unlockGesture);document.addEventListener('keydown',unlockGesture);
 function drop(id){const p=peers.get(id);if(!p)return;peers.delete(id);p.spatial?.dispose();p.pc.onconnectionstatechange=null;p.pc.onicecandidate=null;p.pc.ontrack=null;p.pc.ondatachannel=null;p.gameChannel?.close();p.pc.close();p.audio.pause();p.audio.srcObject=null;p.audio.remove();unmeter(id);}
 function enqueue(p,fn){p.queue=p.queue.then(()=>peers.get(p.id)===p&&!disposed?fn():undefined).catch(()=>{if(peers.get(p.id)===p){p.failed=true;notice='Voice connection interrupted. Retrying…';render();}});return p.queue;}
 async function offer(p,restart=false){
  if(p.pc.signalingState!=='stable')return;
  const description=await p.pc.createOffer(restart?{iceRestart:true}:undefined);await p.pc.setLocalDescription(description);
  send(p.id,{type:'offer',sdp:p.pc.localDescription.sdp});p.offered=true;
 }
 function peer(id){
  if(peers.has(id))return peers.get(id);
  const pc=new RTCPeerConnection({iceServers}),audio=document.createElement('audio');audio.autoplay=true;audio.muted=true;audio.volume=0;audio.setAttribute('playsinline','');audio.hidden=true;panel.append(audio);
  const transceiver=pc.addTransceiver('audio',{direction:'sendrecv'});
  const p={id,pc,audio,sender:transceiver.sender,queue:Promise.resolve(),candidates:[],remoteMuted:true,offered:false,failed:false};peers.set(id,p);
  function attach(channel){
   if(channel.label!=='monochrome-game'){channel.close();return;}
   p.gameChannel=channel;p.game=bindGameplayChannel(channel,message=>{for(const listener of gameListeners)listener({playerId:id,...message});});
  }
  pc.ondatachannel=event=>attach(event.channel);
  if(client.id<id&&pc.createDataChannel)attach(pc.createDataChannel('monochrome-game',{ordered:false,maxRetransmits:0}));
  if(stream)void p.sender.replaceTrack(stream.getAudioTracks()[0]);
  pc.onicecandidate=event=>{if(event.candidate)send(id,{type:'candidate',candidate:event.candidate.toJSON()});};
  pc.ontrack=event=>{
   const media=event.streams[0]||new MediaStream([event.track]);p.spatial?.dispose();p.spatial=null;audio.muted=true;audio.volume=0;audio.srcObject=media;meter(id,media);
   try{const ctx=audioContext();if(ctx?.createPanner)p.spatial=createProximityVoice(ctx,media);}catch{}
   // Keep the element playing for WebRTC compatibility, but never duplicate its audio output.
   audio.muted=!!p.spatial;positionPeer(p);void unlock();
  };
  pc.onconnectionstatechange=()=>{
   if(pc.connectionState==='failed'){p.failed=true;notice='Voice connection interrupted. Retrying…';render();}
   if(pc.connectionState==='connected'){p.failed=false;notice='';render();}
  };
  return p;
 }
 function sync(nextRoom){
  if(disposed)return;
  if(!nextRoom){reset();return;}
  if(roomId&&roomId!==nextRoom.id)reset();
  roomId=nextRoom.id;members=nextRoom.members||[];
  for(const id of peers.keys())if(!members.some(m=>m.id===id))drop(id);
  if(supported)for(const m of members){if(m.id===client.id)continue;try{const fresh=!peers.has(m.id),p=peer(m.id);if(fresh){send(m.id,{type:'hello'});send(m.id,{type:'state',muted:muted()});if(client.id<m.id)void enqueue(p,()=>offer(p));}}catch{notice='Voice is unavailable. You can keep playing.';}}
  render();
 }
 async function signal(id,s){
  if(!roomId||!members.some(m=>m.id===id)||id===client.id||!supported)return;
  const p=peer(id);
  if(s.type==='state'){p.remoteMuted=s.muted;positionPeer(p);if(s.muted)speaking.delete(id);render();return;}
  if(s.type==='hello'){
   send(id,{type:'state',muted:muted()});
   if(client.id<id)void enqueue(p,async()=>{if(p.pc.signalingState==='have-local-offer')send(id,{type:'offer',sdp:p.pc.localDescription.sdp});else if(!p.offered||p.failed)await offer(p,p.failed);});return;
  }
  await enqueue(p,async()=>{
   if(s.type==='candidate'){
    if(p.pc.remoteDescription)await p.pc.addIceCandidate(s.candidate);else if(p.candidates.length<64)p.candidates.push(s.candidate);return;
   }
   if(s.type==='offer'){
    // A stable deterministic offerer avoids simultaneous offers and renegotiation glare.
    if(client.id<id)return;
    await p.pc.setRemoteDescription({type:'offer',sdp:s.sdp});
    // Use the negotiated audio transceiver when the offer creates/reuses it.
    const negotiated=p.pc.getTransceivers().find(t=>t.mid!==null&&t.receiver.track.kind==='audio');
    negotiated.direction='sendrecv';p.sender=negotiated.sender;
    await p.sender.replaceTrack(stream?.getAudioTracks()[0]??null);
    const answer=await p.pc.createAnswer();await p.pc.setLocalDescription(answer);send(id,{type:'answer',sdp:p.pc.localDescription.sdp});
   }else if(s.type==='answer'&&p.pc.signalingState==='have-local-offer')await p.pc.setRemoteDescription({type:'answer',sdp:s.sdp});
   if(p.pc.remoteDescription)for(const candidate of p.candidates.splice(0))await p.pc.addIceCandidate(candidate);
  });
 }
 async function mute(){
  captureGeneration++;const old=stream;stream=null;old?.getTracks().forEach(track=>track.stop());unmeter(client.id);
  await Promise.all([...peers.values()].map(p=>p.sender.replaceTrack(null).catch(()=>{})));announce();render();
 }
 async function toggle(){
  if(disposed||busy||!roomId||!supported)return;
  void unlock();notice='';
  if(stream){await mute();return;}
  busy=true;render();const generation=++captureGeneration;
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
   if(disposed||generation!==captureGeneration||!roomId){media.getTracks().forEach(t=>t.stop());return;}
   stream=media;const track=media.getAudioTracks()[0];track.onended=()=>{if(stream===media){notice='Microphone disconnected. Turn it on to retry.';void mute();}};
   meter(client.id,media);await audioContext()?.resume();
   await Promise.all([...peers.values()].map(p=>p.sender.replaceTrack(track)));announce();
  }catch(e){await mute();notice=e.name==='NotAllowedError'?'Microphone blocked. Allow it in your browser to talk.':e.name==='NotFoundError'?'No microphone found.':'Could not open the microphone. Try again.';}
  finally{busy=false;render();}
 }
 function reset(){
  roomId=null;members=[];spatialFrame=null;captureGeneration++;stream?.getTracks().forEach(t=>t.stop());stream=null;
  for(const id of [...peers.keys()])drop(id);for(const id of [...meters.keys()])unmeter(id);speaking.clear();notice='';render();
 }
 button.addEventListener('click',toggle);listen.addEventListener('click',unlock);
 const unsubscribe=client.subscribe(e=>{
  if(e.type==='lobby')sync(e.lobby);
  else if(e.type==='voice')void signal(e.playerId,e.signal).catch(()=>{notice='Voice connection interrupted. You can keep playing.';render();});
  else if(e.type==='voiceReady')for(const id of peers.keys()){send(id,{type:'hello'});send(id,{type:'state',muted:muted()});}
  else if(['left','roomClosed','disconnected'].includes(e.type))reset();
  else if(e.type==='connection'&&['closed','suspended'].includes(e.status))dispose();
 });
 const timer=setInterval(()=>{
  if(!roomId||disposed)return;let changed=false;const now=performance.now();
  for(const [id,m] of meters){m.analyser.getFloatTimeDomainData(m.samples);const active=m.gate(m.samples,now,id===client.id?!muted():peers.get(id)?.remoteMuted===false);if(!!speaking.get(id)!==active){speaking.set(id,active);changed=true;}}
  if(changed)render();
  if(now-retryAt>5000){retryAt=now;for(const [id,p] of peers)if(p.pc.connectionState!=='connected'){send(id,{type:'hello'});if(client.id<id)void enqueue(p,()=>offer(p,true));}}
 },100);
 function dispose(){if(disposed)return;disposed=true;window.removeEventListener('pagehide',onPageHide);document.removeEventListener('pointerdown',unlockGesture);document.removeEventListener('keydown',unlockGesture);reset();clearInterval(timer);unsubscribe();button.removeEventListener('click',toggle);listen.removeEventListener('click',unlock);panel.remove();void context?.close();}
 const onPageHide=()=>dispose();window.addEventListener('pagehide',onPageHide,{once:true});
 render();return {toggle,mute,dispose,updateSpatial,subscribeGameplay(fn){gameListeners.add(fn);return()=>gameListeners.delete(fn);},gameConnected:id=>!!peers.get(id)?.game?.ready,localFingerprint:id=>peers.get(id)?.pc.localDescription?.sdp.match(/^a=fingerprint:sha-256 (.+)$/mi)?.[1].replace(/:/g,'').toLowerCase(),remoteFingerprint:id=>peers.get(id)?.pc.remoteDescription?.sdp.match(/^a=fingerprint:sha-256 (.+)$/mi)?.[1].replace(/:/g,'').toLowerCase(),sendGameplay:(id,type,payload)=>peers.get(id)?.game?.send(type,payload)??false,isSpeaking:id=>!!speaking.get(id),get muted(){return muted();},get peers(){return peers;}};
}

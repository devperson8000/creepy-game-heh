import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5182');
 const result=await page.evaluate(async()=>{
  const starts=[],stops=[],decoded=[],envelopes=[],bytesToUrl=new WeakMap(),arrayBuffer=Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer=async function(){const bytes=await arrayBuffer.call(this);bytesToUrl.set(bytes,this.url);return bytes;};
  const decode=AudioContext.prototype.decodeAudioData,source=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.decodeAudioData=async function(bytes){const b=await decode.call(this,bytes);b.sourceUrl=bytesToUrl.get(bytes);if(b.sourceUrl?.includes('/sfx/'))decoded.push({url:b.sourceUrl,duration:b.duration});return b;};
  AudioContext.prototype.createBufferSource=function(){const s=source.call(this),start=s.start,stop=s.stop;s.start=function(...a){if(s.buffer?.sourceUrl)starts.push({url:s.buffer.sourceUrl,offset:a[1]??0});return start.apply(this,a);};s.stop=function(...a){if(s.buffer?.sourceUrl)stops.push(s.buffer.sourceUrl);return stop.apply(this,a);};return s;};
  const {createUpdateSamples}=await import('/src/update-samples.js'),{createRoomAmbience}=await import('/src/room-ambience.js'),{createHalloweenSoundscape}=await import('/src/halloween-soundscape.js'),{createTeaserAudio}=await import('/src/teaser-audio.js'),{NEEDLELIMBS_RECORDED_CUES}=await import('/src/needlelimbs-timeline.js');
  const normal=createRoomAmbience();await normal.resume();normal.update({delta:.2});normal.dispose();const normalDownloads=decoded.length;
  const c=new AudioContext();await c.resume();const bank=createUpdateSamples(c);await bank.ready;bank.volume(.5);for(const id of ['room','wind','static'])bank.play(id,{duration:.2,offset:.3});bank.stop();const stoppedBank=bank.activeCount===0;bank.dispose();await c.close();
  const teaser=createTeaserAudio({voices:[],monsterCue:null,soundCues:[],footsteps:false,recordedCues:NEEDLELIMBS_RECORDED_CUES});teaser.resume();
  const limit=performance.now()+20000;while(!decoded.some(d=>d.url.endsWith('/needle-breath.mp3'))||!decoded.some(d=>d.url.endsWith('/needle-breath-heavy.mp3'))){if(performance.now()>limit)throw Error('Sample decode timeout');await new Promise(r=>setTimeout(r,30));}
  const makeGain=AudioContext.prototype.createGain;
  AudioContext.prototype.createGain=function(){const g=makeGain.call(this),events=[];for(const method of ['setValueAtTime','linearRampToValueAtTime']){const original=g.gain[method].bind(g.gain);g.gain[method]=(...args)=>{events.push({method,value:args[0],at:args[1]});return original(...args);};}envelopes.push(events);return g;};
  teaser.update(4.7);teaser.pause();teaser.update(7.4);teaser.pause();teaser.dispose();AudioContext.prototype.createGain=makeGain;
  const c2=new AudioContext();await c2.resume();const room=createHalloweenSoundscape(c2);await room.ready;for(let i=0;i<20;i++)room.update({delta:.2,volume:.5,threat:0});room.pause();room.dispose();await c2.close();
  // Render the actual bank with real decoded samples, including a long-session offset.
  const offline=new OfflineAudioContext(2,Math.ceil(12.5*24000),24000),adapter={state:'running',get currentTime(){return offline.currentTime;},destination:offline.destination};
  for(const method of ['createGain','createBufferSource','createBiquadFilter','createStereoPanner','decodeAudioData'])adapter[method]=offline[method].bind(offline);
  const renderedBank=createUpdateSamples(adapter,{files:{room:'/audio/halloween/sfx/room-dread.mp3',wind:'/audio/halloween/sfx/vent-wind.mp3'}});await renderedBank.ready;renderedBank.volume(1);
  renderedBank.play('room',{offset:12000,duration:12,gain:.13/Math.sqrt(2),fade:2.2,wrapOffset:true,pan:-.5});renderedBank.play('wind',{offset:12000,duration:7,gain:.15/Math.sqrt(2),fade:1.4,wrapOffset:true,pan:.5});
  const rendered=await offline.startRendering();let peak=0,tail=0,early=0,middle=0;
  for(let ch=0;ch<2;ch++){const data=rendered.getChannelData(ch);for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));if(i>=12*24000)tail=Math.max(tail,Math.abs(data[i]));if(i<2400)early+=data[i]**2;if(i>=24000&&i<26400)middle+=data[i]**2;}}
  renderedBank.dispose();return {normalDownloads,decoded,starts,stops,stoppedBank,envelopes,mix:{peak,tail,early,middle}};
 });
 assert.equal(result.normalDownloads,0,'standard game must not fetch update sounds');assert.equal(result.stoppedBank,true);
 for(const file of ['room-dread','vent-wind','monitor-static','needle-breath','needle-breath-heavy']){assert.ok(result.decoded.some(r=>r.url.endsWith('/'+file+'.mp3')));assert.ok(result.starts.some(r=>r.url.endsWith('/'+file+'.mp3')));assert.ok(result.stops.some(r=>r.endsWith('/'+file+'.mp3')));}
 assert.ok(result.envelopes.some(events=>events.length===4&&Math.abs(events[3].at-events[2].at-.32)<.001),'recorded exhale uses its natural release envelope');
 assert.ok(result.mix.peak>.0001&&result.mix.peak<.1,'overlapping passages retain ample mix headroom');assert.ok(result.mix.tail<1e-6,'no clipped tail or residual sound after passages end');assert.ok(result.mix.early<result.mix.middle*.1,'ambience eases in gently');
 assert.deepEqual(errors,[]);console.log('PASS real playback of five update sounds, exhale release, long-session offline mix, standard-game isolation and scene cleanup',result.mix);
}finally{await browser.close();}

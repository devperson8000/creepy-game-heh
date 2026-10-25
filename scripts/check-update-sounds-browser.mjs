import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(process.env.GAME_TEST_URL||'http://localhost:5182');
 const result=await page.evaluate(async()=>{
  const starts=[],stops=[],decoded=[],bytesToUrl=new WeakMap(),arrayBuffer=Response.prototype.arrayBuffer;
  Response.prototype.arrayBuffer=async function(){const bytes=await arrayBuffer.call(this);bytesToUrl.set(bytes,this.url);return bytes;};
  const decode=AudioContext.prototype.decodeAudioData,source=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.decodeAudioData=async function(bytes){const b=await decode.call(this,bytes);b.sourceUrl=bytesToUrl.get(bytes);if(b.sourceUrl?.includes('/sfx/'))decoded.push({url:b.sourceUrl,duration:b.duration});return b;};
  AudioContext.prototype.createBufferSource=function(){const s=source.call(this),start=s.start,stop=s.stop;s.start=function(...a){if(s.buffer?.sourceUrl)starts.push({url:s.buffer.sourceUrl,offset:a[1]??0});return start.apply(this,a);};s.stop=function(...a){if(s.buffer?.sourceUrl)stops.push(s.buffer.sourceUrl);return stop.apply(this,a);};return s;};
  const {createUpdateSamples}=await import('/src/update-samples.js'),{createRoomAmbience}=await import('/src/room-ambience.js'),{createHalloweenSoundscape}=await import('/src/halloween-soundscape.js'),{createTeaserAudio}=await import('/src/teaser-audio.js'),{NEEDLELIMBS_RECORDED_CUES}=await import('/src/needlelimbs-timeline.js');
  const normal=createRoomAmbience();await normal.resume();normal.update({delta:.2});normal.dispose();const normalDownloads=decoded.length;
  const c=new AudioContext();await c.resume();const bank=createUpdateSamples(c);await bank.ready;bank.volume(.5);for(const id of ['room','wind','static'])bank.play(id,{duration:.2,offset:.3});bank.stop();const stoppedBank=bank.activeCount===0;bank.dispose();await c.close();
  const teaser=createTeaserAudio({voices:[],monsterCue:null,soundCues:[],footsteps:false,recordedCues:NEEDLELIMBS_RECORDED_CUES});teaser.resume();
  const limit=performance.now()+20000;while(!decoded.some(d=>d.url.endsWith('/needle-breath.mp3'))||!decoded.some(d=>d.url.endsWith('/needle-breath-heavy.mp3'))){if(performance.now()>limit)throw Error('Sample decode timeout');await new Promise(r=>setTimeout(r,30));}
  teaser.update(4.7);teaser.pause();teaser.update(7.4);teaser.pause();teaser.dispose();
  const c2=new AudioContext();await c2.resume();const room=createHalloweenSoundscape(c2);await room.ready;for(let i=0;i<20;i++)room.update({delta:.2,volume:.5,threat:0});room.pause();room.dispose();await c2.close();
  return {normalDownloads,decoded,starts,stops,stoppedBank};
 });
 assert.equal(result.normalDownloads,0,'standard game must not fetch update sounds');assert.equal(result.stoppedBank,true);
 for(const file of ['room-dread','vent-wind','monitor-static','needle-breath','needle-breath-heavy']){assert.ok(result.decoded.some(r=>r.url.endsWith('/'+file+'.mp3')));assert.ok(result.starts.some(r=>r.url.endsWith('/'+file+'.mp3')));assert.ok(result.stops.some(r=>r.endsWith('/'+file+'.mp3')));}
 assert.deepEqual(errors,[]);console.log('PASS real decoding/playback of all five update sounds, standard-game isolation, scene pause and disposal',result.decoded);
}finally{await browser.close();}

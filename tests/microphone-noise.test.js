import test from 'node:test';
import assert from 'node:assert/strict';
import {createMicrophoneDetector,voiceNoise} from '../src/microphone-noise.js';

const wave=amplitude=>Float32Array.from({length:512},(_,i)=>Math.sin(i*Math.PI/16)*amplitude);
function sustain(detector,amplitude,options){let result;for(const now of [0,100,200,300])result=detector.sample(wave(amplitude),now,options);return result;}

test('background noise and a short loud spike do not become gameplay voice',()=>{
 const detector=createMicrophoneDetector();
 assert.equal(sustain(detector,.007).level,0);
 assert.equal(detector.sample(wave(.6),400).level,0);
 assert.equal(detector.sample(wave(.007),500).level,0);
 assert.equal(detector.sample(new Float32Array(512).fill(.9),600).level,0,'DC offset is not speech energy');
});
test('sustained quiet speech, talking, shouting and screams have distinct tiers',()=>{
 for(const [amplitude,level] of [[.024,1],[.08,2],[.2,3],[.5,4]]){
  const result=sustain(createMicrophoneDetector(),amplitude);
  assert.equal(result.level,level);assert.ok(result.meter>0&&result.meter<=1);
 }
});
test('fluctuating loud speech qualifies its sustained lower tiers without promoting brief scream peaks',()=>{
 const detector=createMicrophoneDetector(),levels=[];
 for(let i=0;i<20;i++)levels.push(detector.sample(wave(i%2?.5:.2),i*100).level);
 assert.ok(levels.slice(2).every(level=>level>=3),'continuously loud audio must never remain silent');
 assert.ok(levels.every(level=>level<4),'isolated scream peaks must not qualify as sustained screams');
 const speech=createMicrophoneDetector();
 for(let i=0;i<10;i++)speech.sample(wave(i%2?.2:.08),i*100);
 assert.equal(speech.sample(wave(.08),1000).level,2,'variable conversation stays audible');
});
test('silence and mute clear immediately and invalid or stalled samples cannot hold a scream',()=>{
 const detector=createMicrophoneDetector();assert.equal(sustain(detector,.5).level,4);
 assert.equal(detector.sample(wave(.5),310,{enabled:false}).level,0);
 assert.equal(detector.sample(wave(.5),320).level,0,'unmute needs fresh sustained sound');
 assert.equal(detector.sample(wave(.5),1000).level,0,'a stalled sampling clock restarts qualification');
 assert.equal(detector.sample([NaN,Infinity],1100).level,0);
 detector.reset();assert.equal(detector.sample(wave(.5),1200).level,0);
 assert.equal(sustain(createMicrophoneDetector(),.5).level,4);
 const quiet=createMicrophoneDetector();sustain(quiet,.5);assert.equal(quiet.sample(wave(0),310).level,0);
});
test('bounded microphone sensitivity changes recognition without amplifying chat playback',()=>{
 assert.equal(sustain(createMicrophoneDetector(),.08,{sensitivity:.5}).level,1);
 assert.equal(sustain(createMicrophoneDetector(),.08,{sensitivity:2}).level,3);
 assert.equal(sustain(createMicrophoneDetector(),.08,{sensitivity:NaN}).level,2);
});
test('screams carry farther than sprinting; combined panic requires actual running',()=>{
 const p={x:2,z:3,height:-7.2,status:'alive'};
 assert.equal(voiceNoise(0,p),null);
 assert.equal(voiceNoise(1,p).radius,5);assert.equal(voiceNoise(2,p).radius,12);
 assert.equal(voiceNoise(3,p).radius,24);assert.equal(voiceNoise(4,p).radius,36);
 assert.equal(voiceNoise(4,{...p,sprint:true,moving:false}).radius,36);
 const panic=voiceNoise(4,{...p,sprint:true,moving:true});assert.equal(panic.radius,44);assert.equal(panic.urgent,true);
 for(const level of [-1,5,2.5,NaN,'4'])assert.equal(voiceNoise(level,p),null);
 assert.equal(voiceNoise(4,{...p,status:'downed'}),null);
});
test('closets muffle speech at the entrance; they do not publish concealed body positions',()=>{
 const sound=voiceNoise(4,{id:'guest',x:7,z:8,height:-7.2,status:'alive',hidden:true,closetExit:{x:6,z:8,height:-7.2}});
 assert.equal(sound.x,6);assert.equal(sound.radius,12.6);assert.equal(sound.playerId,'guest');
 assert.equal(voiceNoise(4,{hidden:true,status:'alive',x:7,z:8}),null);
});

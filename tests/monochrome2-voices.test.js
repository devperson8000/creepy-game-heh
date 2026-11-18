import test from 'node:test';
import assert from 'node:assert/strict';
import {selectMonochrome2Voices,monochrome2SpeechSettings} from '../src/monochrome2-voices.js';

test('Riley prefers a natural Australian female voice and remains distinct from the other survivors',()=>{
 const voices=[
  {name:'Microsoft David Online (Natural) - English (Australia)',lang:'en-AU',localService:false},
  {name:'Microsoft Sonia Online (Natural) - English (Australia)',lang:'en-AU',localService:false},
  {name:'Microsoft Ryan Online (Natural) - English (Australia)',lang:'en-AU',localService:false},
  {name:'Google UK English Female',lang:'en-GB',localService:true},
  {name:'Alex',lang:'en-US',localService:true}
 ];
 const selected=selectMonochrome2Voices(voices);
 assert.match(selected.get('lead')?.name??'',/David/);
 assert.match(selected.get('friend1')?.name??'',/Sonia/);
 assert.match(selected.get('friend2')?.name??'',/Ryan/);
 assert.equal(new Set([...selected.values()].map(voice=>voice.name)).size,3);
});

test('Riley gets a slightly brighter, quicker delivery without changing other voices',()=>{
 const riley=monochrome2SpeechSettings({voice:'friend1',rate:.98,pitch:1});
 const lead=monochrome2SpeechSettings({voice:'lead',rate:.97,pitch:1});
 assert.ok(riley.rate>1&&riley.rate<1.06);
 assert.ok(riley.pitch>1.04&&riley.pitch<1.12);
 assert.equal(lead.rate,.97);
 assert.equal(lead.pitch,1);
});

test('voice selector handles unavailable or non-English system voices safely',()=>{
 assert.equal(selectMonochrome2Voices([]).size,0);
 assert.equal(selectMonochrome2Voices([{name:'Sonia',lang:'fr-FR'}]).size,0);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechGate,readIceServers} from '../src/voice-chat.js';
test('speech detection ignores quiet noise, holds short pauses, and clears immediately on mute',()=>{
 const gate=createSpeechGate(),quiet=new Float32Array(512).fill(.004),voice=new Float32Array(512).fill(.08);
 assert.equal(gate(quiet,100),false);assert.equal(gate(voice,200),true);assert.equal(gate(quiet,350),true);assert.equal(gate(quiet,450),false);
 assert.equal(gate(voice,500),true);assert.equal(gate(voice,510,false),false);assert.equal(gate(quiet,520),false);
});
test('ICE configuration supports an operator TURN service and falls back safely for malformed configuration',()=>{
 assert.ok(readIceServers().some(s=>s.urls.startsWith('stun:')));
 const turn=[{urls:['turn:relay.example:3478'],username:'public-short-lived',credential:'example'}];
 assert.deepEqual(readIceServers(JSON.stringify(turn)),turn);
 assert.deepEqual(readIceServers('broken'),readIceServers());assert.deepEqual(readIceServers('{}'),readIceServers());
});
test('a TURN URL without browser credentials falls back without breaking lobby joins',()=>{
 assert.deepEqual(readIceServers(JSON.stringify([{urls:'turn:relay.example:3478'}])),readIceServers());
 assert.deepEqual(readIceServers(JSON.stringify([{urls:'https://not-an-ice-server'}])),readIceServers());
});

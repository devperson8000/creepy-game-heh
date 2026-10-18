import test from 'node:test';import assert from 'node:assert/strict';
import {bindGameplayChannel} from '../src/peer-gameplay.js';
test('game channel bounds backpressure and rejects malformed or unrelated messages',()=>{
 const messages=[],sent=[],channel={readyState:'open',bufferedAmount:0,send:data=>sent.push(JSON.parse(data))};
 const transport=bindGameplayChannel(channel,message=>messages.push(message));
 assert.equal(transport.send('input',{input:{forward:1}}),true);assert.equal(sent[0].type,'input');
 channel.onmessage({data:JSON.stringify({type:'snapshot',payload:{snapshot:{sequence:2}}})});assert.equal(messages[0].payload.snapshot.sequence,2);
 for(const data of ['broken',JSON.stringify({type:'voice',payload:{}}),'x'.repeat(64001),new ArrayBuffer(4)])channel.onmessage({data});
 assert.equal(messages.length,1);
 channel.bufferedAmount=65000;assert.equal(transport.send('input',{}),false);
 channel.bufferedAmount=0;channel.readyState='closed';assert.equal(transport.send('input',{}),false);
});

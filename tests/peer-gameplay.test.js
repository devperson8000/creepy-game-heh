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
test('team chat is identity-bound and rejects oversized text',()=>{
 const received=[],channel={readyState:'open',bufferedAmount:0,send(){}},wire=bindGameplayChannel(channel,m=>received.push(m));
 assert.equal(wire.send('chat',{text:'Stay together'}),true);assert.equal(wire.send('chat',{text:'x'.repeat(241)}),false);
 channel.onmessage({data:JSON.stringify({type:'chat',payload:{text:'hello'}})});assert.equal(received[0].payload.text,'hello');
 channel.onmessage({data:JSON.stringify({type:'chat',payload:{text:42}})});assert.equal(received.length,1);
});

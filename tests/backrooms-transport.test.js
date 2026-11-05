import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackroomsCoop,validBackroomsSnapshot} from '../src/backrooms-coop.js';
import {createLevelZero} from '../src/backrooms-layout.js';
import {createBackroomsCoopState} from '../src/backrooms-coop-state.js';
import {gridX,gridZ} from '../src/backrooms-pitfalls.js';
const players=[{id:'h',slot:0},{id:'g',slot:1}];
const idle={forward:0,right:0,yaw:0,pitch:0,sprint:false,torch:false,paused:false};
function host(){
 let receive;
 const net=createBackroomsCoop({client:{id:'h',subscribe(fn){receive=fn;return()=>{};},send(){return true;}},session:{ownerId:'h',players,classic:true},world:{map:createLevelZero()}});
 return {net,send(command,top={}){receive({type:'input',playerId:'g',input:{...idle,...top,motionId:'20000000-0000-0000-0000-000000000001',commands:[{...idle,sequence:1,duration:.025,...command}]}});net.step(.025,idle);}};
}
test('host rejects malformed optional lean and crouch before acknowledging commands',()=>{
 for(const command of [{lean:1.01},{lean:-1.01},{lean:'1'},{lean:null},{lean:NaN},{lean:Infinity},{crouch:1},{crouch:'true'},{crouch:null}]){
  const {net,send}=host();try{send(command);assert.equal(net.state.players.g.inputSequence,0,JSON.stringify(command));}finally{net.dispose();}
 }
});
test('host accepts legacy commands and independently optional bounded lean/crouch',()=>{
 for(const command of [{},{lean:-1},{lean:.5},{lean:1},{crouch:false},{crouch:true},{lean:-.5,crouch:true}]){
  const {net,send}=host();try{send(command);assert.equal(net.state.players.g.inputSequence,1,JSON.stringify(command));}finally{net.dispose();}
 }
});
test('guest preserves lean and crouch on the packet and each unacknowledged command',()=>{
 let packet;
 const net=createBackroomsCoop({client:{id:'g',subscribe(){return()=>{};},send(type,p){if(type==='input')packet=p.input;return true;}},session:{ownerId:'h',players,classic:true},world:{map:createLevelZero()}});
 try{
  net.step(.025,{...idle,lean:-1,crouch:true});net.step(.025,{...idle,lean:.5,crouch:false});
  assert.equal(packet.lean,.5);assert.equal(packet.crouch,false);
  assert.deepEqual(packet.commands.map(({lean,crouch})=>({lean,crouch})),[{lean:-1,crouch:true},{lean:.5,crouch:false}]);
 }finally{net.dispose();}
});
test('snapshot validation includes the full far exit corridor and retains other bounds',()=>{
 const state=createBackroomsCoopState(players),packet={game:'backrooms',tick:1,state};
 for(const x of [75,78,81]){state.players.g.x=x;assert.equal(validBackroomsSnapshot(packet),true,`x=${x}`);}
 state.players.g.x=81.001;assert.equal(validBackroomsSnapshot(packet),false);
 state.players.g.x=78;for(const y of [-6.501,2.001]){state.players.g.y=y;assert.equal(validBackroomsSnapshot(packet),false);}
});

test('host validates optional posture on the top-level packet as well as commands',()=>{
 for(const top of [{lean:2},{lean:null},{crouch:0}]){
  const {net,send}=host();try{send({},top);assert.equal(net.state.players.g.inputSequence,0,JSON.stringify(top));}finally{net.dispose();}
 }
});

test('host executes posture and guest snapshot reconciliation replays unacknowledged posture',()=>{
 const {net:authority,send}=host();
 let receive;
 const guest=createBackroomsCoop({client:{id:'g',subscribe(fn){receive=fn;return()=>{};},send(){return true;}},session:{ownerId:'h',players,classic:true},world:{map:createLevelZero()}});
 try{
  for(const net of [authority,guest]){net.state.round.doorOpen=true;Object.assign(net.state.players.g,{x:gridX()[2],z:gridZ()[2]+1.6,y:0});}
  const snapshot={game:'backrooms',tick:1,state:structuredClone(guest.state)};
  send({lean:-1,crouch:true});
  assert.equal(authority.state.players.g.crouch,true);assert.ok(authority.state.players.g.balance.angle<.035);
  guest.step(.025,{...idle,lean:-1,crouch:true});
  const predicted=structuredClone(guest.player);
  receive({type:'snapshot',snapshot});
  assert.equal(guest.player.crouch,true);assert.deepEqual(guest.player.balance,predicted.balance);
  assert.deepEqual(guest.player.balance,authority.state.players.g.balance);
 }finally{authority.dispose();guest.dispose();}
});

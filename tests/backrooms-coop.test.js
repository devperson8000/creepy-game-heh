import {PITFALLS} from '../src/backrooms-pitfalls.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createBackroomsCoopState,stepBackroomsPlayer,interactBackroomsCoop,backroomsCoopView,resetBackroomsCoop} from '../src/backrooms-coop-state.js';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
import {encodeBackroomsRoom,parseBackroomsRoom,backroomsRoomCode} from '../src/backrooms-room.js';
test('Backrooms lobby metadata stays separate from Monochrome and codes are stable',()=>{
 const name=encodeBackroomsRoom('My room',{classic:false,friendsOnly:true});assert.deepEqual(parseBackroomsRoom(name),{name:'My room',classic:false,friendsOnly:true});assert.equal(parseBackroomsRoom('Original game'),null);assert.equal(backroomsRoomCode('abcdef12-4567-8900-abcd-123456789012'),'ABCDEF12');
});
test('co-op objectives are shared but ladder height and falling belong to the interacting player',()=>{
 const map=createLevelZero(),s=createBackroomsCoopState([{id:'h',slot:0},{id:'g',slot:1}]);const h=s.players.h,g=s.players.g;
 const interact=(p,id)=>{const target=[...s.round.parts,s.round.ladder,s.round.key,s.round.door,s.round.vent].find(t=>t.id===id);p.x=target.x;p.z=target.z;p.yaw=0;return interactBackroomsCoop(s,p.id,id,()=>true);};
 assert.equal(interactBackroomsCoop(s,'g','part-3',()=>true).ok,false);
 for(const part of s.round.parts)assert.equal(interact(g,part.id).ok,true);
 for(let i=0;i<4;i++)assert.equal(interact(h,'ladder').ok,true);assert.equal(s.round.repaired,true);assert.equal(interact(g,'ladder').ok,true);
 for(let i=0;i<50;i++)stepBackroomsPlayer(s,g,{forward:0,right:0,yaw:0,pitch:0},.025,map);
 assert.ok(g.y>.75);assert.equal(h.y,0);assert.equal(interact(g,'key').ok,true);assert.equal(s.round.hasKey,true);assert.equal(backroomsCoopView(s,h.id).climbing,false);
 assert.equal(interact(h,'door').ok,true);assert.equal(s.round.doorOpen,true);
 g.x=52;g.z=-18;g.y=0;for(let i=0;i<80;i++)stepBackroomsPlayer(s,g,{forward:0,right:0,yaw:0,pitch:0},.025,map);assert.equal(g.y,PITFALLS.floorY);assert.equal(h.y,0);
 assert.ok(canWalkLevelZero(map,h.x,h.z));
});
test('co-op exit waits for all players, remote actions require real proximity, and retry resets the team',()=>{
 const s=createBackroomsCoopState([{id:'h',slot:0},{id:'g',slot:1}]);s.round.doorOpen=true;s.round.upperExitOpen=true;
 const h=s.players.h,g=s.players.g;h.x=s.round.vent.x-.5;h.z=-15.8;h.y=0;h.yaw=-Math.PI/2;h.crouch=true;
 assert.equal(interactBackroomsCoop(s,'h','vent',()=>true).ok,true);assert.equal(s.round.phase,'playing');
 assert.equal(interactBackroomsCoop(s,'g','vent',()=>true).ok,false);
 g.x=s.round.vent.x-.5;g.z=-15.8;g.y=0;g.yaw=-Math.PI/2;g.crouch=true;assert.equal(interactBackroomsCoop(s,'g','vent',()=>true).ok,true);assert.equal(s.round.phase,'won');
 resetBackroomsCoop(s);assert.equal(s.round.phase,'playing');assert.equal(s.round.collected,0);assert.equal(s.epoch,1);assert.equal(s.players.g.exitReady,false);
});
test('host movement remains bounded and respects walls, stale packets cannot move paused players',()=>{
 const m=createLevelZero(),s=createBackroomsCoopState([{id:'h',slot:0},{id:'g',slot:1}]),p=s.players.g;
 const start={...p};for(let i=0;i<100;i++)stepBackroomsPlayer(s,p,{forward:1,right:0,yaw:0,pitch:0,sprint:true},.025,m);assert.ok(Math.hypot(p.x-start.x,p.z-start.z)<=23.01);assert.ok(canWalkLevelZero(m,p.x,p.z));
 const before={...p};stepBackroomsPlayer(s,p,{forward:1,right:0,yaw:0,pitch:0,paused:true},.1,m);assert.equal(p.x,before.x);assert.equal(p.z,before.z);
});
test('a rope must be collected and lowered, then the fallen player climbs it over time',()=>{
 const s=createBackroomsCoopState([{id:'h',slot:0},{id:'g',slot:1}]),m=createLevelZero();s.round.doorOpen=true;Object.assign(s.players.h,{x:52,z:-16,y:0});Object.assign(s.players.g,{x:52,z:-18,y:PITFALLS.floorY});
 assert.equal(interactBackroomsCoop(s,'h','deploy-rope:g',()=>true).ok,false);s.round.hasRope=true;assert.equal(interactBackroomsCoop(s,'h','deploy-rope:g',()=>true).ok,true);assert.equal(s.players.g.y,PITFALLS.floorY);
 assert.equal(interactBackroomsCoop(s,'g','rope:g',()=>true).ok,true);stepBackroomsPlayer(s,s.players.g,{forward:0,right:0,yaw:0,pitch:0},.05,m);assert.ok(s.players.g.y>PITFALLS.floorY&&s.players.g.y<0);
 for(let i=0;i<80;i++)stepBackroomsPlayer(s,s.players.g,{forward:0,right:0,yaw:0,pitch:0},.05,m);assert.equal(s.players.g.y,0);assert.equal(s.players.g.z,-16);
 s.players.g.y=PITFALLS.floorY;s.players.g.x=65;assert.equal(interactBackroomsCoop(s,'h','deploy-rope:g',()=>true).ok,false);
});
test('the remaining team completes the exit if its last waiting member disconnects',async()=>{
 const {createBackroomsCoop}=await import('../src/backrooms-coop.js');let listener;
 const client={id:'h',subscribe(fn){listener=fn;return()=>{};},send(){return true;}};
 const net=createBackroomsCoop({client,session:{ownerId:'h',players:[{id:'h',slot:0},{id:'g',slot:1}],classic:true},world:{map:createLevelZero()}});
 net.state.round.doorOpen=true;net.state.round.upperExitOpen=true;Object.assign(net.player,{x:net.state.round.vent.x-.5,z:-15.8,y:0,yaw:-Math.PI/2,crouch:true});net.interact('vent');assert.equal(net.state.round.phase,'playing');
 listener({type:'lobby',lobby:{ownerId:'h',members:[{id:'h'}]}});assert.equal(net.state.round.phase,'won');net.dispose();
});
test('replayed guest movement is acknowledged, duplicate commands never move twice, and snapshots reconcile prediction',async()=>{
 const {createBackroomsCoop}=await import('../src/backrooms-coop.js');let fromHost,fromGuest;
 const events={h:null,g:null},hostClient={id:'h',subscribe(fn){events.h=fn;return()=>{};},send(type,p){if(type==='snapshot'){fromHost=p.snapshot;events.g({type:'snapshot',snapshot:p.snapshot});}return true;}},guestClient={id:'g',subscribe(fn){events.g=fn;return()=>{};},send(type,p){if(type==='input'){fromGuest=p.input;events.h({type:'input',playerId:'g',input:p.input});}return true;}};
 const session={ownerId:'h',players:[{id:'h',slot:0},{id:'g',slot:1}],classic:true},world={map:createLevelZero()},h=createBackroomsCoop({client:hostClient,session,world}),g=createBackroomsCoop({client:guestClient,session,world});
 const input={forward:0,right:1,yaw:0,pitch:0,sprint:false,torch:false,paused:false},idle={...input,right:0},encounter={simulation:{state:{position:{x:0,z:0}}},hunter:null};
 for(let i=0;i<50;i++){g.step(.025,input);h.step(.025,idle);h.publish(encounter);}
 const position={...h.state.players.g};events.h({type:'input',playerId:'g',input:fromGuest});for(let i=0;i<5;i++){h.step(.025,idle);h.publish(encounter);}assert.equal(h.state.players.g.x,position.x);assert.ok(Math.abs(g.player.x-h.state.players.g.x)<.15);
 const before=g.player.x;events.g({type:'snapshot',snapshot:{...fromHost,tick:fromHost.tick-1}});assert.equal(g.player.x,before);
 h.dispose();g.dispose();
});

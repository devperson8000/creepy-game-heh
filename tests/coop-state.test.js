import test from 'node:test';
import assert from 'node:assert/strict';
import * as coop from '../src/coop-state.js';

const members=[{id:'a',name:'Ada'},{id:'b',name:'Bo'}];
const make=()=>coop.createCoopState(42,members);
test('persistent lobby slots survive roster gaps without increasing map player count',()=>{
 const s=coop.createCoopState(42,[{id:'a',slot:0},{id:'b',slot:3}]);
 assert.deepEqual([...s.players.values()].map(p=>p.slot),[0,3]);
 assert.deepEqual([s.players.get('b').x,s.players.get('b').z],[-2.6+.65,-30.8+.65]);
 assert.equal(s.run.layout.size,17);assert.equal(s.run.layout.rooms.length,6);
 assert.deepEqual(coop.serializeCoopState(s).players.map(p=>p.slot),[0,3]);
});
test('implicit slots use free positions while invalid and duplicate explicit slots are rejected',()=>{
 assert.deepEqual([...coop.createCoopState(1,['a','b']).players.values()].map(p=>p.slot),[0,1]);
 assert.deepEqual([...coop.createCoopState(1,['a',{id:'b',slot:0}]).players.values()].map(p=>p.slot),[1,0]);
 for(const slot of [-1,4,1.5,'2',null])assert.throws(()=>coop.createCoopState(1,[{id:'a',slot}]),RangeError);
 assert.throws(()=>coop.createCoopState(1,[{id:'a',slot:2},{id:'b',slot:2}]),RangeError);
});
function target(state,type,id=type,extra={}){
 const p=state.players.get('a');return new Map([[id,{id,type,position:{x:p.x,z:p.z,height:p.height},...extra}]]);
}
function act(state,id,type,targets,extra={}){return coop.coopInteract(state,id,{type,targetId:[...targets.keys()][0],...extra},{targets});}
function acquire(state,id,drawer){
 const p=state.players.get(id),targets=new Map([[`drawer-${drawer.id}`,{id:`drawer-${drawer.id}`,type:'drawer',drawerId:drawer.id,position:{x:p.x,z:p.z,height:p.height}}]]);
 if(!drawer.opened)assert.equal(act(state,id,'drawer',targets).ok,true);
 return act(state,id,'drawer',targets);
}

test('players race for one shared key and can bank only their own inventory',()=>{
 const s=make(),d=s.run.drawers.find(d=>d.key);assert.equal(acquire(s,'a',d).ok,true);
 s.players.get('b').x=s.players.get('a').x;s.players.get('b').z=s.players.get('a').z;
 acquire(s,'b',d);
 assert.deepEqual([...s.players.get('a').carried],[d.id]);assert.equal(s.players.get('b').carried.size,0);
 assert.equal(act(s,'b','locks',target(s,'locks')).count,0);
 assert.equal(act(s,'a','locks',target(s,'locks')).count,1);assert.ok(s.run.banked.has(d.id));
});
test('interactions reject remote, occluded, mismatched and dead player actions',()=>{
 const s=make(),targets=target(s,'clue');targets.get('clue').position.x+=4;
 assert.equal(act(s,'a','clue',targets).ok,false);assert.equal(s.run.clueRead,false);
 const near=target(s,'clue');assert.equal(coop.coopInteract(s,'a',{type:'clue',targetId:'clue'},{targets:near,canSee:()=>false}).ok,false);
 assert.equal(act(s,'a','boards',near).ok,false);assert.equal(s.run.boardsOpen,false);
 s.players.get('a').status='dead';assert.equal(act(s,'a','clue',near).ok,false);
});
test('downing drops only personal unbanked keys and rescue grants a short catch cooldown',()=>{
 const s=make(),[one,two,three]=s.run.drawers.filter(d=>d.key);acquire(s,'a',one);act(s,'a','locks',target(s,'locks'));
 acquire(s,'a',two);acquire(s,'b',three);coop.downPlayer(s,'a',10);
 assert.equal(two.taken,false);assert.equal(one.taken,true);assert.equal(three.taken,true);
 assert.equal(s.players.get('a').downedUntil,55);assert.equal(s.run.phase,'playing');
 const p=s.players.get('a'),rescuer=s.players.get('b');rescuer.x=p.x;rescuer.z=p.z;
 assert.equal(coop.revivePlayer(s,'b','a',11).ok,true);assert.equal(p.status,'alive');assert.equal(p.invulnerableUntil,14);
 assert.equal(coop.downPlayer(s,'a',12),false);assert.equal(coop.downPlayer(s,'a',15),true);
 coop.expireDowned(s,60);assert.equal(p.status,'dead');
});
test('a full downed team loses immediately and cannot be revived after expiry',()=>{
 const s=make();coop.downPlayer(s,'a',1);assert.equal(s.run.phase,'playing');
 coop.downPlayer(s,'b',1);assert.equal(s.run.phase,'dead');assert.equal(coop.revivePlayer(s,'b','a',2).ok,false);
 const t=make();coop.downPlayer(t,'a',1);coop.expireDowned(t,46);assert.equal(coop.revivePlayer(t,'b','a',47).ok,false);
});
test('rescue requires a living nearby visible rescuer and an unexpired target',()=>{
 const s=make();coop.downPlayer(s,'a',1);const b=s.players.get('b');b.x+=8;
 assert.equal(coop.revivePlayer(s,'b','a',2).ok,false);b.x=s.players.get('a').x;b.z=s.players.get('a').z;
 assert.equal(coop.revivePlayer(s,'b','a',2,{canSee:()=>false}).ok,false);
 assert.equal(coop.revivePlayer(s,'b','a',46).ok,false);
});
test('wrong codes leave the elevator locked and escape waits for every surviving teammate',()=>{
 const s=make();assert.equal(act(s,'a','keypad',target(s,'keypad'),{code:'wrong'}).ok,false);
 assert.equal(act(s,'a','elevator',target(s,'elevator')).ok,false);
 for(const d of s.run.drawers.filter(d=>d.key))acquire(s,'a',d);
 act(s,'a','locks',target(s,'locks'));assert.equal(act(s,'a','keypad',target(s,'keypad'),{code:s.run.code}).ok,true);
 assert.equal(act(s,'a','elevator',target(s,'elevator')).ok,true);
 s.players.get('a').z=-34;assert.equal(coop.markEscaped(s,'a'),true);assert.equal(s.run.phase,'playing');
 s.players.get('b').z=-34;assert.equal(coop.markEscaped(s,'b'),true);assert.equal(s.run.phase,'won');
});
test('closets have one occupant and leaving uses the registered exit',()=>{
 const s=make(),p=s.players.get('a'),targets=target(s,'closet','closet-1',{hide:{x:p.x,z:p.z+.3},exit:{x:p.x,z:p.z-1}});
 assert.equal(act(s,'a','closet',targets).ok,true);assert.equal(p.hidden,true);
 assert.equal(act(s,'b','closet',targets).ok,false);
 assert.equal(coop.coopInteract(s,'a',{type:'leave'},{targets}).ok,true);assert.equal(p.hidden,false);assert.equal(p.z,targets.get('closet-1').exit.z);
 assert.equal(act(s,'b','closet',targets).ok,true);coop.removeCoopPlayer(s,'b');assert.equal(s.closets.size,0);
});
test('snapshots are JSON safe and apply in place without losing shared references',()=>{
 const host=make(),client=make(),d=host.run.drawers.find(d=>d.key);acquire(host,'a',d);
 const snap=JSON.parse(JSON.stringify(coop.serializeCoopState(host))),run=client.run,banked=run.banked,layout=run.layout,carried=client.players.get('a').carried;
 assert.equal(snap.run.code,undefined);coop.applyCoopSnapshot(client,snap);
 assert.equal(client.run,run);assert.equal(run.layout,layout);assert.equal(run.banked,banked);assert.equal(client.players.get('a').carried,carried);
 assert.ok(carried.has(d.id));assert.equal(run.drawers[d.id].taken,true);
 host.run.clueRead=true;assert.equal(coop.serializeCoopState(host).run.code,host.run.code);
});
test('disconnect drops personal keys while preserving teammate inventory and banked progress',()=>{
 const s=make(),[one,two,three]=s.run.drawers.filter(d=>d.key);acquire(s,'a',one);act(s,'a','locks',target(s,'locks'));acquire(s,'a',two);acquire(s,'b',three);
 assert.equal(coop.removeCoopPlayer(s,'a'),true);assert.equal(coop.removeCoopPlayer(s,'a'),false);
 assert.equal(one.taken,true);assert.equal(two.taken,false);assert.equal(three.taken,true);assert.equal(s.run.banked.size,1);assert.equal(s.players.get('b').carried.size,1);
});
test('a player caught inside a closet falls outside so rescue never revives them inside its collider',()=>{
 const s=make(),p=s.players.get('a'),targets=target(s,'closet','closet-1',{hide:{x:p.x,z:p.z+.3},exit:{x:p.x,z:p.z-1}});
 act(s,'a','closet',targets);p.hideWitnessed=true;coop.downPlayer(s,'a',2);
 assert.equal(p.z,targets.get('closet-1').exit.z);assert.equal(p.hidden,false);assert.equal(p.hideWitnessed,false);assert.equal(s.closets.size,0);
});
test('revive rejects invalid positions rather than allowing distance checks to fail open',()=>{
 const s=make();coop.downPlayer(s,'a',1);s.players.get('b').x=NaN;
 assert.equal(coop.revivePlayer(s,'b','a',2).ok,false);
});

test('teammates can rescue well after twelve seconds, until the full 45-second deadline',()=>{
 const s=make();coop.downPlayer(s,'a',10);
 assert.equal(coop.expireDowned(s,54.999),0);
 assert.equal(s.players.get('a').status,'downed');
 assert.equal(coop.serializeCoopState(s).players.find(p=>p.id==='a').downedUntil,55);
 assert.equal(coop.revivePlayer(s,'b','a',54.999).ok,true);
 const expired=make();coop.downPlayer(expired,'a',10);
 assert.equal(coop.revivePlayer(expired,'b','a',55).ok,false);
 assert.equal(coop.expireDowned(expired,55),1);assert.equal(expired.players.get('a').status,'dead');
});

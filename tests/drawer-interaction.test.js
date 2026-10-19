import test from 'node:test';
import assert from 'node:assert/strict';
const load=()=>import('../src/drawer-interaction.js');
const run=()=>({drawers:[{id:0,opened:false,key:false,taken:false},{id:1,opened:false,key:true,taken:false}]});
test('cabinet frames resolve to their drawer row and a held drawer survives aim jitter',async()=>{
 const {drawerTargetFromHit,retainDrawerTarget}=await load();
 const targets=new Map(Array.from({length:3},(_,id)=>[`drawer-${id}`,{id:`drawer-${id}`,type:'drawer',drawerId:id}]));
 const target=drawerTargetFromHit(targets,{object:{userData:{cabinetIndex:0}},point:{y:.7}});
 assert.equal(target.id,'drawer-1');
 assert.equal(retainDrawerTarget(targets.get('drawer-2'),'drawer-1',targets,true).id,'drawer-1');
 assert.equal(retainDrawerTarget(targets.get('drawer-2'),'drawer-1',targets,false).id,'drawer-2');
 assert.equal(drawerTargetFromHit(targets,{object:{userData:{}},point:{y:.7}}),undefined);
});
test('drawer preview opens immediately and retries a refused send without a second E hold',async()=>{
 const {createDrawerRequests}=await load(),r=run(),sent=[];
 const requests=createDrawerRequests({send:a=>{sent.push(a);return sent.length>1;}});
 requests.request(r,0);assert.equal(r.drawers[0].opened,true);
 requests.tick(0);requests.tick(.1);requests.tick(.4);
 assert.equal(sent.length,2);assert.equal(sent[0].code,sent[1].code);
 assert.equal(sent[0].code.startsWith('drawer:open:'),true);
});
test('stale snapshots cannot snap a predicted drawer closed; acknowledged requests stop retrying',async()=>{
 const {createDrawerRequests}=await load(),r=run(),sent=[],requests=createDrawerRequests({send:a=>{sent.push(a);return true;}});
 requests.request(r,0);requests.tick(0);
 r.drawers[0].opened=false;requests.reconcile(r,null);assert.equal(r.drawers[0].opened,true);
 r.drawers[0].opened=true;requests.reconcile(r,sent[0].code);requests.tick(2);assert.equal(sent.length,1);
});
test('rapid open and close holds send in order and key preview never invents inventory',async()=>{
 const {createDrawerRequests}=await load(),r=run(),sent=[],requests=createDrawerRequests({send:a=>{sent.push(a);return true;}});
 requests.request(r,0);requests.request(r,0);assert.equal(r.drawers[0].opened,false);requests.tick(0);assert.equal(sent.length,1);
 r.drawers[0].opened=true;requests.reconcile(r,sent[0].code);assert.equal(r.drawers[0].opened,false);requests.tick(.4);
 assert.equal(sent[1].code.startsWith('drawer:close:'),true);
 requests.reconcile(r,sent[1].code);requests.request(r,1);requests.tick(.8);
 requests.reconcile(r,sent[2].code);requests.request(r,1);assert.equal(r.drawers[1].taken,true);assert.equal(r.carried,undefined);
});

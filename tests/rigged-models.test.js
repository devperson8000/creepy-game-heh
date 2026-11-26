import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

/** Reads the JSON chunk of a .glb without three, so the rig files are checked even where three is not installed. */
function glb(name){
 const b=readFileSync(new URL('../public/models/backrooms/'+name,import.meta.url));
 assert.equal(b.toString('latin1',0,4),'glTF',name+' is a real glb, not a renamed Blender file');
 assert.equal(b.readUInt32LE(8),b.length,'declared length matches');
 const clen=b.readUInt32LE(12);return {json:JSON.parse(b.toString('utf8',20,20+clen)),size:b.length};
}
const clips=j=>Object.fromEntries((j.animations??[]).map(a=>[a.name,a]));
const duration=(j,a)=>j.accessors[a.samplers[0].input].max[0];

test('hazmat.glb is a skinned suit with idle, jog, sprint and both crouch clips',()=>{
 const {json:j}=glb('hazmat.glb'),c=clips(j);
 assert.equal(j.skins.length,1);assert.ok(j.skins[0].joints.length>=60,'full Mixamo skeleton');
 for(const n of ['idle','walk','run','crouch','crouchwalk'])assert.ok(c[n],'clip '+n);
 for(const n of ['walk','run','crouchwalk'])assert.ok(duration(j,c[n])<1,n+' is one short stride cycle');
 assert.ok(c.walk.channels.some(ch=>ch.target.path==='translation'),'the hips bob');
 for(const a of j.animations)for(const s of a.samplers)assert.equal(s.interpolation,'LINEAR');
});

test('bacteria.glb is a skinned monster with its behaviour clips and a sensible rig',()=>{
 const {json:j,size}=glb('bacteria.glb'),c=clips(j);
 assert.ok(size<6e6,'welded and trimmed: '+(size/1e6).toFixed(1)+' MB');
 assert.equal(j.skins.length,1);assert.ok(j.skins[0].joints.length>=35,"spine, two legs, two arms and six claw fingers");
 for(const n of ['idle','walk','run','search','notice','knock'])assert.ok(c[n],'clip '+n);
 const prim=j.meshes[0].primitives[0];for(const k of ['POSITION','NORMAL','JOINTS_0','WEIGHTS_0'])assert.ok(prim.attributes[k]!==undefined,k);
 const pos=j.accessors[prim.attributes.POSITION];assert.ok(pos.max[1]>2.3&&pos.max[1]<2.6,'stands about 2.45 m tall: '+pos.max[1].toFixed(2));assert.ok(pos.min[1]>-.5,'feet near the floor');
 assert.ok(j.scenes[0].extras.nominalSpeed.run<9.2,'its sprint is slower than the players\'');
 assert.ok(duration(j,c.notice)>1&&duration(j,c.notice)<2,'the screech lasts a beat');
});

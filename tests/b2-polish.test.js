import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {createRun} from '../src/game-state.js';import {createWorld} from '../src/world.js';import {interactHalloween,advanceHalloween} from '../src/halloween-state.js';
import {b2Frame} from '../src/b2-director.js';import {TEASER_START,TEASER_END,B2_CONVERSATION_DURATION} from '../src/teaser-timeline.js';
import {createHoodedStranger} from '../src/hooded-stranger.js';
function world(run){const old=globalThis.document,ctx={beginPath(){},moveTo(){},lineTo(){},stroke(){},fillRect(){},strokeRect(){},fillText(){}};globalThis.document={createElement:()=>({getContext:()=>ctx})};try{return createWorld(run);}finally{globalThis.document=old;}}
test('key panel backing sits against the real hub wall and key insertion precedes descent',()=>{
 const run=createRun(42,{halloween:true}),w=world(run),target=w.targets.get('halloween:b2-panel');w.scene.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(target.mesh.parent.getObjectByName('b2-panel-backing'));assert.ok(bounds.min.z<-32.88&&bounds.min.z>-32.92,'backing must meet the north wall');
 const p={id:'solo',slot:0,status:'alive',x:-4.5,z:-31.3,height:3.6};run.halloween.key=true;run.halloween.stage=5;assert.ok(interactHalloween(run,'halloween:b2-panel',{players:[p],now:100}).ok);assert.equal(run.halloween.visit.stage,'unlock');
 advanceHalloween(run,[p],102.9);assert.equal(run.halloween.visit.stage,'descent');assert.equal(p.height,3.6);advanceHalloween(run,[p],108);assert.equal(run.halloween.visit.stage,'archive');assert.equal(p.height,0);
});
test('B2 camera starts and finishes at the actual player view and holds the whole monitor on phones',()=>{
 const entry={position:[-1.2,1.65,-.6],look:[-.2,1.4,-3]},first=b2Frame(0,{entry,aspect:.46}),last=b2Frame(B2_CONVERSATION_DURATION,{entry,aspect:.46});assert.deepEqual(first.camera,entry.position);assert.deepEqual(first.look,entry.look);assert.deepEqual(last.camera,entry.position);assert.deepEqual(last.look,entry.look);
 let previous=null;for(let t=0;t<B2_CONVERSATION_DURATION;t+=1/60){const f=b2Frame(t,{entry,aspect:.46});assert.ok([...f.camera,...f.look,f.reach,f.fade].every(Number.isFinite));if(previous)assert.ok(Math.hypot(...f.camera.map((v,i)=>v-previous.camera[i]))<.1);previous=f;}
 assert.equal(b2Frame(TEASER_START+1,{entry}).watching,true);assert.equal(b2Frame(TEASER_END+8,{entry}).strangerVisible,false);
});
test('hooded figure reaches the actual switch with its fingers and keeps its feet grounded',()=>{
 const npc=createHoodedStranger(),switchAt=[.4,1.11,-2.13];npc.sample(10,{reach:1,press:1,switchAt});const tip=npc.fingerTip.getWorldPosition(new THREE.Vector3());assert.ok(tip.distanceTo(new THREE.Vector3(...switchAt))<.06);assert.equal(npc.root.position.y,.06);assert.ok(npc.root.getObjectByName('hood-opening'));assert.ok(new THREE.Box3().setFromObject(npc.root).max.y>1.9);npc.dispose();npc.dispose();
});

test('the complete monitor bezel fits both viewport axes including a short ultrawide test frame',()=>{
 for(const [width,height]of [[390,600],[1100,570],[1600,500],[950,240],[1920,1080]])for(const fov of [49,66,75]){
  const aspect=width/height,frame=b2Frame(30,{aspect,fov,viewportHeight:height}),camera=new THREE.PerspectiveCamera(fov,aspect,.06,85);camera.position.fromArray(frame.camera);camera.lookAt(new THREE.Vector3(...frame.look));camera.updateMatrixWorld();
  for(const x of [-.65-.775,-.65+.775])for(const y of [1.57-.52,1.57+.52]){const p=new THREE.Vector3(x,y,-1.94).project(camera);assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.88,`clipped bezel ${width}x${height} fov${fov}: ${p.toArray()}`);}
 }
});

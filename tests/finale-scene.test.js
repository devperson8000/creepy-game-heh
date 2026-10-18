import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createFinaleSet} from '../src/finale-set.js';
test('elevator cab moves while shaft remains fixed, then opens into daylight',()=>{
 const s=createFinaleSet({quality:'low'});const fixed=s.shaftFrame.position.y;
 s.sample(24);const before=s.cab.position.y;assert.equal(before,0);
 s.sample(34);assert.ok(s.cab.position.y>0);assert.equal(s.shaftFrame.position.y,fixed);
 s.sample(47);assert.equal(s.exit.visible,true);assert.ok(s.doors.left.position.x<-.97);
 s.dispose();s.dispose();
});
test('finale has a purpose-built Three.js scene and timeline uses the same models',async()=>{
 const {createFinaleScene}=await import('../src/finale-scene.js');
 const dummy={scene:new THREE.Group(),animations:[]};
 const finale=createFinaleScene({asset:dummy,cast:[{id:'a',name:'A',slot:0},{id:'b',name:'B',slot:1}],runnerId:'a',buttonId:'b',reducedMotion:true});
 for(const [t,name] of [[1,'fade'],[7,'chase'],[15,'stairs'],[21,'dive'],[26,'doors'],[32,'ascent'],[37,'defeat'],[41,'silence'],[46,'daylight']]){
  const frame=finale.sample(t);assert.equal(frame.shot,name);assert.ok(Number.isFinite(finale.camera.position.z));
 }
 assert.equal(finale.sample(50).title,'TOGETHER.');
 assert.equal(finale.sample(52).complete,true);
 finale.resize(.55);assert.ok(finale.camera.fov>58);
 finale.dispose();finale.dispose();
});

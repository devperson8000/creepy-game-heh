import * as THREE from 'three';
import {createHalloweenSurfaces} from './halloween-surfaces.js';
import {openingEase as ease} from './opening-sequence.js';

/** View-relative hands remain in the world depth buffer: the wallpaper really
 * occludes the fingers as they pass through, rather than drawing over the wall. */
export function createOpeningHands(camera,{hazmat=false}={}){
 const root=new THREE.Group(),left=new THREE.Group(),right=new THREE.Group();camera.add(root);root.add(left,right);
 const surfaces=createHalloweenSurfaces(),materials=[],geometries=[];
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,...extra});materials.push(m);return m;};
 const skin=mat(hazmat?0x242b29:0x9e7155,{roughness:hazmat?.7:.68,...(hazmat?surfaces.get('cloth'):{})}),nails=mat(hazmat?0x242b29:0xb28b74,{roughness:.43}),sleeve=mat(hazmat?0xc3a52b:0x263132,surfaces.get('cloth')),cuff=mat(0x192122,surfaces.get('cloth')),metal=mat(0x434b4b,{metalness:.8,roughness:.35,...surfaces.get('iron')}),rubber=mat(0x101615),lens=mat(0xd8e6d5,{emissive:0xb5cdb9,emissiveIntensity:.5});
 const sphere=new THREE.SphereGeometry(1,16,12);geometries.push(sphere);
 function ellipsoid(group,m,x,y,z,sx,sy,sz){const mesh=new THREE.Mesh(sphere,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh;}
 function segment(group,a,b,r,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),g=new THREE.CapsuleGeometry(r,A.distanceTo(B),4,10);geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.position.copy(A).add(B).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());group.add(mesh);return mesh;}
 ellipsoid(left,skin,0,0,0,.069,.088,.027);
 segment(left,[0,-.08,.012],[-.035,-.19,.12],.041,skin);
 segment(left,[-.035,-.2,.13],[-.15,-.43,.42],.063,sleeve);
 segment(left,[-.028,-.16,.095],[-.04,-.21,.15],.064,cuff);
 const fingers=[];
 for(let i=0;i<4;i++){
  const f=new THREE.Group();f.position.set(-.051+i*.034,.062,0);left.add(f);const length=[.078,.103,.111,.087][i];
  ellipsoid(left,skin,-.051+i*.034,.052,.005,.018,.022,.023);
  segment(f,[0,0,0],[0,length*.48,-.002],.014,skin);const joint=new THREE.Group();joint.position.set(0,length*.48,-.002);f.add(joint);
  segment(joint,[0,0,0],[0,length*.49,-.005],.012,skin);ellipsoid(joint,skin,0,.006,-.002,.013,.014,.013);ellipsoid(joint,nails,0,length*.38,.009,.008,.014,.0015);fingers.push({f,joint});
 }
 segment(left,[.058,-.027,.003],[.093,.006,-.018],.022,skin);segment(left,[.093,.006,-.018],[.1,.052,-.026],.016,skin);
 // Sweater sleeve, curled gripping fingers and a metal barrel flashlight.
 segment(right,[.01,-.05,.055],[.065,-.37,.32],.069,sleeve);segment(right,[.01,-.05,.055],[.016,-.1,.1],.065,cuff);
 ellipsoid(right,skin,-.018,-.007,.035,.064,.061,.07);
 for(let i=0;i<4;i++){segment(right,[-.065,.025,.005+i*.033],[.025,.03,.005+i*.033],.016,skin);segment(right,[.025,.03,.005+i*.033],[.043,-.008,.005+i*.033],.015,skin);}
 segment(right,[-.052,.035,.035],[-.022,.07,.004],.021,skin);
 function barrel(top,bottom,length,z,m){const g=new THREE.CylinderGeometry(top,bottom,length,24);geometries.push(g);const mesh=new THREE.Mesh(g,m);mesh.rotation.x=Math.PI/2;mesh.position.set(0,.031,z);right.add(mesh);return mesh;}
 barrel(.045,.046,.26,.04,rubber);barrel(.075,.045,.105,-.14,metal);barrel(.078,.078,.016,-.2,metal);barrel(.066,.066,.005,-.21,lens);
 for(let i=0;i<5;i++)barrel(.047,.047,.008,-.06+i*.043,metal);
 const fill=new THREE.PointLight(0xc6d0bc,.65,.95,2);fill.position.set(.05,.1,-.35);root.add(fill);
 return {root,left,right,update(frame){const {time,reach,torch,light}=frame,fall=ease(38.1,41,time);
  left.visible=(time>19.6&&time<32)||(time>38.05&&time<40.5);// Lift the whole open hand into view first, then extend it into the wall.
  const withdraw=1-ease(22.85,23.22,time),lower=1-ease(29,31,time);
  const lift=ease(20.1,20.8,time)*withdraw+ease(25,25.65,time)*lower;
  const depth=ease(21.3,22.3,time)*withdraw+ease(26,27.2,time)*lower;
  left.position.set(-.22-reach*.015,-.62+lift*.51,-.5-depth*.56);left.rotation.set(-.08+reach*.04,-.12,.14);
  if(time>38){left.position.set(-.3,-.3+fall*.35,-.55-fall*.18);left.rotation.set(-.35-fall*.4,fall*.6,-.4-fall*.6);}
  for(const {f,joint}of fingers){f.rotation.x=-.16+.2*reach;joint.rotation.x=-.12+.12*reach;}
  right.visible=torch>0;right.position.set(Math.min(.31,camera.aspect*.24)+fall*.3,-.28-(1-torch)*.7-fall*.36,-.55-fall*.15);
  right.rotation.set(-.11+fall*1.3,-.12+fall*.35,-.12-fall*1.8);right.scale.setScalar(.95);fill.intensity=.65*light;lens.emissiveIntensity=.5*light;
 },dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());surfaces.dispose();}};
}

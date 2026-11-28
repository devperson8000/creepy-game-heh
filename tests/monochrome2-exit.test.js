import test from 'node:test';
import assert from 'node:assert/strict';
import {EXIT,EXIT_CAMERA_RADIUS,buttonSequence,crawlSequence,BUTTON_SEQUENCE,CRAWL_SEQUENCE,exitSolids,sphereHitsBox,flapEdge,doorFarEdge,yawToward,VENT_STAGE} from '../src/monochrome2-exit-layout.js';
import {PITFALLS} from '../src/backrooms-pitfalls.js';

// Positions from which each interaction can really start: within 2.1 m of its target.
const buttonStarts=[{x:77,z:-16,yaw:-1.2,pitch:0,crouch:false},{x:76.6,z:-16.5,yaw:-1,pitch:.3,crouch:false},{x:78.3,z:-15.4,yaw:2.2,pitch:-.4,crouch:true},{x:78.45,z:-16.55,yaw:0,pitch:0,crouch:false}];
const crawlStarts=[{x:77.4,z:-16,yaw:-Math.PI/2,pitch:0,crouch:false},{x:78,z:-15.4,yaw:-1,pitch:.3,crouch:false},{x:78.5,z:-16.6,yaw:2.2,pitch:-.4,crouch:true},{x:77.1,z:-16.5,yaw:0,pitch:0,crouch:false}];
const starts=buttonStarts;
const frames=(fn,seconds,from)=>{const out=[];for(let t=0;t<=seconds+1e-9;t+=1/120)out.push({t,...fn(t,from)});return out;};

test('the door slab fills its doorway with a small even reveal and sits inside the wall when closed',()=>{
 const d=EXIT.door,o=EXIT.opening;
 assert.ok(Math.abs(o.z1-o.z0-1.8)<1e-9);
 const reveal=[d.hingeZ-o.z0,o.z1-(d.hingeZ+d.width),d.sill,o.top-(d.sill+d.height)];
 for(const r of reveal)assert.ok(r>=.015&&r<=.03,'reveal '+r);
 assert.ok(Math.abs(reveal[2]-reveal[3])<.01);
 // The closed slab is entirely within the wall thickness: nothing sticks out either side.
 const x0=d.hingeX+d.offsetX-d.thick/2,x1=d.hingeX+d.offsetX+d.thick/2;assert.ok(x0>EXIT.wallFaceX&&x1<EXIT.passage.x0);
 // Fully open it lies flat along the passage's south wall without touching it, and clears the whole doorway.
 const far=doorFarEdge(1);assert.ok(far.x>d.hingeX+d.width-.05&&far.x<EXIT.vent.wallX-.2);
 const inner=d.hingeZ-d.offsetX*Math.sin(d.openAngle);assert.ok(inner-d.thick/2>EXIT.passage.z0,'open slab keeps clear of the wall: '+(inner-d.thick/2-EXIT.passage.z0));
 assert.ok(inner+d.thick/2<EXIT.passage.z0+.2,'and lies against it');
});

test('the passage is exactly as wide as the doorway, and the vent opening fits inside it',()=>{
 const p=EXIT.passage,o=EXIT.opening,v=EXIT.vent;
 assert.equal(p.z0,o.z0);assert.equal(p.z1,o.z1);assert.equal(p.top,o.top);
 assert.ok(v.z0>p.z0+.2&&v.z1<p.z1-.2);assert.ok(v.y0>=.4&&v.y1<=p.top-.5);
 assert.ok(PITFALLS.upperVent.x<v.wallX&&PITFALLS.upperVent.x>p.x0);
 assert.ok(Math.abs(EXIT.button.z-p.z0)<.05,'the button sits on the south wall');assert.ok(EXIT.button.x>p.x0+1&&EXIT.button.x<v.wallX-.5);
});

test('button sequence: the camera holds until the press then steps up to the vent, the hand is only visible while it is used, and the states are monotonic',()=>{
 for(const from of starts){
  const f=frames(buttonSequence,BUTTON_SEQUENCE.seconds,from);
  for(const s of f){assert.ok(Number.isFinite(s.camera.yaw)&&Number.isFinite(s.camera.pitch));if(s.t<1.7){assert.equal(s.camera.x,from.x);assert.equal(s.camera.z,from.z);}}
  assert.ok(Math.hypot(f.at(-1).camera.x-VENT_STAGE.x,f.at(-1).camera.z-VENT_STAGE.z)<1e-9,'ends at the staging spot, a step before the vent');assert.ok(Math.abs(f.at(-1).camera.yaw+Math.PI/2)<1e-9);
  for(let i=1;i<f.length;i++){assert.ok(f[i].button>=f[i-1].button-1e-9,'button monotonic');assert.ok(f[i].flap>=f[i-1].flap-1e-9,'flap monotonic');}
  assert.equal(f.at(-1).flap,1);assert.equal(f.at(-1).button,1);assert.ok(f.at(-1).done);assert.equal(f[0].hand.visible,false);assert.equal(f.at(-1).hand.visible,false,'hand withdrawn at the end');
  assert.ok(f.some(s=>s.hand.press>.9),'the button is pressed');
  // The grate only moves after the button has been pressed and released.
  const firstFlap=f.find(s=>s.flap>0.001).t,pressedAt=f.find(s=>s.button>.99).t;assert.ok(firstFlap>pressedAt,'grate opens after the press');
 }
});

test('button sequence: no frame jumps - camera angles and hand targets move smoothly',()=>{
 for(const from of starts){
  const f=frames(buttonSequence,BUTTON_SEQUENCE.seconds,from);
  for(let i=1;i<f.length;i++){
   const a=f[i-1],b=f[i];assert.ok(Math.hypot(b.camera.x-a.camera.x,b.camera.z-a.camera.z)<.03,'camera step');
   const dy=Math.abs(Math.atan2(Math.sin(b.camera.yaw-a.camera.yaw),Math.cos(b.camera.yaw-a.camera.yaw)));
   assert.ok(dy<.05,'yaw step '+dy+' at '+b.t);assert.ok(Math.abs(b.camera.pitch-a.camera.pitch)<.03);
   if(a.hand.visible&&b.hand.visible)assert.ok(Math.hypot(b.hand.target.x-a.hand.target.x,b.hand.target.y-a.hand.target.y,b.hand.target.z-a.hand.target.z)<.04,'hand jump at '+b.t);
  }
 }
});

test('button sequence: the fingertip touches the button at the press and the grate edge when pushing, and never goes through a wall',()=>{
 const solids=exitSolids();
 for(const from of starts){
  const f=frames(buttonSequence,BUTTON_SEQUENCE.seconds,from);
  const press=f.reduce((best,s)=>s.hand.press>(best?.hand.press??-1)?s:best,null);
  assert.ok(Math.hypot(press.hand.target.x-EXIT.button.x,press.hand.target.y-EXIT.button.y,press.hand.target.z-EXIT.button.z)<.08,'fingertip on the button');
  const push=f.filter(s=>s.flap>.15&&s.flap<.35&&s.hand.visible)[0];const edge=flapEdge(push.flap);
  assert.ok(Math.hypot(push.hand.target.x-edge.x,push.hand.target.y-edge.y,push.hand.target.z-edge.z)<.25,'hand rides the grate edge');
  for(const s of f)if(s.hand.visible){const wallBoxes=solids.slice(2,8);for(const b of wallBoxes)assert.equal(sphereHitsBox(s.hand.target,.03,b.map((v,i)=>i===1&&b===solids[4]?v:v)),false,'hand inside a wall at '+s.t.toFixed(2)+' '+JSON.stringify(s.hand.target));}
 }
});

test('crawl sequence: the camera starts where the player stood, ends in the shaft, and never touches a surface',()=>{
 const solids=exitSolids();
 for(const from of crawlStarts){
  const f=frames(crawlSequence,CRAWL_SEQUENCE.seconds,from);
  assert.ok(Math.hypot(f[0].camera.x-from.x,f[0].camera.z-from.z)<1e-6,'begins at the player');
  assert.ok(f.at(-1).camera.x>EXIT.vent.wallX+1.5&&f.at(-1).done);
  for(const s of f)for(const b of solids)assert.equal(sphereHitsBox(s.camera,EXIT_CAMERA_RADIUS,b),false,`camera hit ${b} at t=${s.t.toFixed(2)} ${JSON.stringify(s.camera)}`);
  for(let i=1;i<f.length;i++){const a=f[i-1].camera,b=f[i].camera;assert.ok(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)<.04,'camera jump at '+f[i].t.toFixed(2));assert.ok(Math.abs(Math.atan2(Math.sin(b.yaw-a.yaw),Math.cos(b.yaw-a.yaw)))<.06,'yaw jump');}
  assert.equal(f[0].fade,0);assert.equal(f.at(-1).fade,1);for(let i=1;i<f.length;i++)assert.ok(f[i].fade>=f[i-1].fade);
  assert.ok(f.find(s=>s.fade>0).t>=CRAWL_SEQUENCE.fadeFrom-.01,'fade starts late');
 }
});

test('crawl sequence: the passage and the shaft are both clear of the grate once it is fully open',()=>{
 const v=EXIT.vent,open=flapEdge(1);
 // Fully open, the grate lies along the shaft's ceiling above any crawling eye height.
 assert.ok(open.y>v.y1-.2,'open grate is up at the shaft ceiling: '+open.y);
 const f=frames(crawlSequence,CRAWL_SEQUENCE.seconds,crawlStarts[0]);for(const s of f)if(s.camera.x>v.wallX-.1)assert.ok(s.camera.y<open.y-.3);
 assert.ok(yawToward({x:79,z:-16},{x:80,z:-16})<-1.5&&yawToward({x:79,z:-16},{x:80,z:-16})>-1.6,'facing +x is yaw -pi/2');
});

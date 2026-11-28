import test from 'node:test';
import assert from 'node:assert/strict';
import {PITFALLS as P,canWalkPit,pitFloor} from '../src/backrooms-pitfalls.js';
import {createNavigator} from '../src/navigation.js';

test('the lower house connects the maze, blue kitchen, flashlight room and raised exit hall',()=>{
 const nav=createNavigator((x,z)=>canWalkPit(x,z,P.floorY),{minX:20,maxX:44,minZ:-32,maxZ:-20,spacing:.2});
 for(const destination of [{x:24,z:-25},{x:34,z:-25.1},{x:33.8,z:-30},{x:21.2,z:-30}])assert.ok(nav.findPath({x:43,z:-25},destination).length>0,JSON.stringify(destination));
 assert.equal(pitFloor(21.2,-30,P.floorY),-4.4);
 assert.deepEqual(P.altVent,{id:'alt-vent',x:21.2,z:-30});
 assert.deepEqual(P.flashlight,{id:'flashlight',x:60.75,z:-18.6});
});
test('house walls and furniture block movement but room doorways remain open',()=>{
 for(const [x,z] of [[29,-26.5],[29,-22],[31,-27.5],[24.6,-23],[20.6,-24],[27.8,-20.7]])assert.equal(canWalkPit(x,z,P.floorY),false,`${x},${z} should be solid`);
 for(const [x,z] of [[29,-24.5],[34,-27.5],[32.4,-30],[28.5,-30]])assert.equal(canWalkPit(x,z,P.floorY),true,`${x},${z} should be open`);
});
test('the white-lit upper passage supports walking all the way to its physical vent',()=>{
 assert.deepEqual(P.upperVent,{id:'vent',x:79.8,z:-16});
 for(let x=73.5;x<=79.5;x+=.1)assert.equal(canWalkPit(x,-16,0),true);
 assert.equal(canWalkPit(78,-17,0),false);assert.equal(canWalkPit(80.1,-16,0),false);
});

test('the house has blue light samples and a physical floor beneath the upper exit vent',async()=>{
 const T=await import('three');const {createPitfallView}=await import('../src/backrooms-pitfall-view.js');
 const root=new T.Group(),resources=new Set(),lights=[];
 const mat=(color,extra={})=>new T.MeshStandardMaterial({color,...extra});
 const paper=mat(0xaaaaaa),dark=mat(0x111111),steel=mat(0x888888),wood=mat(0x554433);
 function box(w,h,d,x,y,z,m,parent=root){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 createPitfallView({registerLight:l=>lights.push(l)},{},{root,resources,mat,box,carpet:(w,d,x,z)=>box(w,.1,d,x,-.05,z,paper),paperWall:box,label:()=>{},wall:paper,wood,paper,steel,dark});
 assert.ok(lights.some(l=>l.x>20&&l.x<29&&l.z>-27.5&&l.z<-20&&l.color===0x4b72ff));
 root.updateMatrixWorld(true);const ray=new T.Raycaster(new T.Vector3(79,1,-16),new T.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(root,true).some(hit=>Math.abs(hit.point.y)<.02),'upper vent has a floor');
 const vents=[];root.traverse(o=>{if(o.name==='pitfall-exit-vent')vents.push(o);});
 assert.ok(vents.some(o=>o.position.x===P.upperVent.x));assert.ok(vents.some(o=>o.position.x===21.2));
});

test('a player can walk the optional lower house to its raised hall, where the old vent no longer ends the round',async()=>{
 const {createBackroomsRound,canMoveRound,advanceRoundPhysics,roundTarget,interactRound}=await import('../src/backrooms-round.js');
 const r=createBackroomsRound();r.doorOpen=true;r.altDoorOpen=true;const p={x:43,z:-25,y:P.floorY,crouch:true};
 for(const [x,z]of [[40,-25],[34,-25],[30,-24.5],[27,-24.5],[30,-24.5],[34,-25.1],[34,-28],[34,-30],[32.5,-30],[22.2,-30]]){
  const sx=p.x,sz=p.z,steps=Math.ceil(Math.hypot(x-sx,z-sz)/.05);
  for(let i=1;i<=steps;i++){const nx=sx+(x-sx)*i/steps,nz=sz+(z-sz)*i/steps;assert.ok(canMoveRound(r,nx,nz,()=>false,p),`blocked at ${nx},${nz} y${p.y}`);p.x=nx;p.z=nz;advanceRoundPhysics(r,p,1/60);}
  if(x===34&&z===-25.1)assert.notEqual(roundTarget(r,p,Math.PI)?.id,'flashlight','the flashlight is no longer in the kitchen');
 }
 assert.equal(p.y,-4.4);assert.notEqual(roundTarget(r,p,Math.PI/2)?.id,'alt-vent');assert.equal(interactRound(r,'alt-vent'),false);
});
test('a fallen player can find the flashlight in the dark supply room and climb the stairwell back to the exit landing',async()=>{
 const {createBackroomsRound,canMoveRound,advanceRoundPhysics,roundTarget,interactRound}=await import('../src/backrooms-round.js');
 const {lowerRoute,STAIR_FOOT,fallSites}=await import('../src/backrooms-lower-route.js');
 const walk=(r,p,pts)=>{for(const q of pts){const sx=p.x,sz=p.z,n=Math.ceil(Math.hypot(q.x-sx,q.z-sz)/.04);for(let i=1;i<=n;i++){const nx=sx+(q.x-sx)*i/n,nz=sz+(q.z-sz)*i/n;assert.ok(canMoveRound(r,nx,nz,()=>false,p),`blocked at ${nx.toFixed(2)},${nz.toFixed(2)} y${p.y.toFixed(2)}`);p.x=nx;p.z=nz;advanceRoundPhysics(r,p,1/60);}}};
 for(const site of fallSites().filter((_,i)=>i%5===0)){
  const r=createBackroomsRound();r.doorOpen=true;const p={x:site.x,z:site.z,y:P.floorY,crouch:false};
  walk(r,p,lowerRoute(p,P.flashlight).path);p.yaw=0;
  const near=roundTarget(r,p,Math.atan2(-(P.flashlight.x-p.x),-(P.flashlight.z-p.z)));assert.equal(near?.id,'flashlight');assert.equal(interactRound(r,'flashlight'),true);
  walk(r,p,[...lowerRoute(p,STAIR_FOOT).path,{x:STAIR_FOOT.x,z:-16.2}]);for(let i=0;i<30;i++)advanceRoundPhysics(r,p,1/60);
  assert.ok(p.y>-.05,'reached the east landing from '+JSON.stringify(site)+' y='+p.y);assert.ok(p.x>69&&p.x<71.2);
 }
});

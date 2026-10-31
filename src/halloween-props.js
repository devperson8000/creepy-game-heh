import * as THREE from 'three';
import {createHalloweenSurfaces} from './halloween-surfaces.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** The same locally authored Halloween models dress the house and the basement. */
export function createHalloweenProps({aged=false}={}){
 const surfaces=createHalloweenSurfaces({aged});
 const geometries=new Map(),materials=new Map(),flames=[],paper=[];let disposed=false;
 const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 const material=(key,color,extra={})=>{if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:aged?.94:.78,...extra}));return materials.get(key);};
 const orange=material('orange',aged?0x9d461c:0xbd591d,{vertexColors:true,...surfaces.get('pumpkin')}),black=material('black',0x12120f,{vertexColors:true,...surfaces.get('pumpkin')}),iron=material('iron',0x373b32,{metalness:.62,roughness:.66,...surfaces.get('iron')});
 const stem=material('stem',0x495032),wax=material('wax',aged?0xc2b08c:0xe4d1ac,surfaces.get('wax')),bone=material('bone',0xb5ac92),ink=material('ink',0x171814),letter=material('letter',0xc0aa7e);
 const hole=material('carving',0x180c06),glow=material('amber',0xf3a44d,{emissive:0xff791b,emissiveIntensity:aged?.72:1.15}),card=material('card',0xa45826,{side:THREE.DoubleSide}),blackCard=material('black-card',0x1b211b,{side:THREE.DoubleSide});
 const cube=geometry('cube',()=>new THREE.BoxGeometry(1,1,1)),sphere=geometry('sphere',()=>new THREE.SphereGeometry(1,16,12)),cylinder=geometry('cylinder',()=>new THREE.CylinderGeometry(1,1,1,10));
 function group(kind,scale=1){const g=new THREE.Group();g.name=`Halloween / ${kind}`;g.scale.setScalar(scale);g.userData={halloweenProp:kind,halloweenStyle:aged?'weathered':'house'};return g;}
 function mesh(parent,geo,surface,position=[0,0,0],scale=[1,1,1]){const m=new THREE.Mesh(geo,surface);m.position.fromArray(position);m.scale.fromArray(scale);m.receiveShadow=true;m.userData.halloweenDetail=true;parent.add(m);return m;}
 const box=(g,w,h,d,x,y,z,m=iron)=>mesh(g,cube,m,[x,y,z],[w,h,d]);
 const ball=(g,x,y,z,sx,sy,sz,m)=>mesh(g,sphere,m,[x,y,z],[sx,sy,sz]);
 function rod(g,from,to,r,surface=bone){const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),m=mesh(g,cylinder,surface,a.clone().add(b).multiplyScalar(.5).toArray(),[r,a.distanceTo(b),r]);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return m;}
 function shape(key,points){return geometry(key,()=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new THREE.ShapeGeometry(s);});}
 function batch(g,key,surface,select){
  const parts=g.children.filter(o=>o.isMesh&&o.material===surface&&select(o));if(!parts.length)return;
  const merged=geometry(key,()=>{const copies=parts.map(p=>{p.updateMatrix();return p.geometry.clone().applyMatrix4(p.matrix);});const result=mergeGeometries(copies);copies.forEach(p=>p.dispose());return result;});g.remove(...parts);mesh(g,merged,surface);
 }
 function pumpkinBody(openable){return geometry(openable?'pumpkin-open':'pumpkin',()=>{
  const start=openable?.7:0,g=new THREE.SphereGeometry(1,32,20,0,Math.PI*2,start,Math.PI-start),p=g.attributes.position,colors=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),rib=Math.cos(Math.atan2(x,z)*8),radius=.975+.055*rib;p.setXYZ(i,x*.29*radius,Math.max(.018,.255+y*.235),z*.27*radius);const shade=.86+.14*(rib*.5+.5);colors.push(shade,shade,shade);}
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
 });}
 function carvedFace(g,key,points){
  const center=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);
  for(const [suffix,factor,surface,offset]of [['rim',1,hole,.005],['light',.74,glow,.008]]){
   const geo=geometry(`${key}-${suffix}`,()=>{const face=shape(`${key}-${suffix}-flat`,points).clone(),p=face.attributes.position;
    for(let i=0;i<p.count;i++){const x=center[0]+(p.getX(i)-center[0])*factor,y=center[1]+(p.getY(i)-center[1])*factor,z=.27*Math.sqrt(Math.max(.04,1-(x/.29)**2-((y-.255)/.235)**2));p.setXYZ(i,x,y,z*(.975+.055*Math.cos(Math.atan2(x,z)*8))+offset);}face.computeVertexNormals();return face;});
   mesh(g,geo,surface).userData.carvedSurface=true;
  }
 }
 function pumpkin({scale=1,carved=true,black:darkShell=false,openable=false}={}){
  const g=group('pumpkin',scale),surface=darkShell?black:orange;g.body=mesh(g,pumpkinBody(openable),surface);g.body.castShadow=true;
  const stemGeometry=geometry('pumpkin-stem',()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,.455,0),new THREE.Vector3(.012,.53,-.012),new THREE.Vector3(.04,.575,-.025)]),10,.022,7,false));
  if(openable){
   const lip=.255+.235*Math.cos(.7),lipGeo=geometry('pumpkin-lip',()=>new THREE.TorusGeometry(.189,.012,7,28));const rim=mesh(g,lipGeo,surface,[0,lip,0]);rim.rotation.x=Math.PI/2;rim.scale.y=.93;
   const inside=mesh(g,geometry('pumpkin-inside',()=>new THREE.CircleGeometry(.187,28)),hole,[0,lip-.014,0]);inside.rotation.x=-Math.PI/2;
   const lid=new THREE.Group();lid.name='pumpkin hinged lid';lid.position.set(0,lip,-.171);g.add(lid);g.lid=lid;ball(lid,0,.018,.171,.205,.052,.194,surface);mesh(lid,stemGeometry,stem,[0,-.39,.171]);
  }else mesh(g,stemGeometry,stem);
  if(carved){
   carvedFace(g,'eye-left',[[-.175,.325],[-.065,.35],[-.084,.267]]);carvedFace(g,'eye-right',[[.175,.325],[.084,.267],[.065,.35]]);
   carvedFace(g,'mouth',[[-.176,.214],[-.115,.19],[-.078,.209],[-.044,.176],[0,.19],[.04,.174],[.079,.207],[.124,.189],[.175,.214],[.139,.135],[.088,.116],[.05,.132],[0,.108],[-.05,.134],[-.102,.12],[-.148,.145]]);
   batch(g,'pumpkin-face-rims',hole,m=>m.userData.carvedSurface);batch(g,'pumpkin-face-glow',glow,m=>m.userData.carvedSurface);
  }
  g.lightPoint=new THREE.Vector3(0,.25,.12);return g;
 }
 function flame(g,x,y,z){
  if(!materials.has('flame'))materials.set('flame',new THREE.MeshBasicMaterial({color:0xffac4d,transparent:true,opacity:.76,depthWrite:false}));
  if(!materials.has('flame-core'))materials.set('flame-core',new THREE.MeshBasicMaterial({color:0xffe9b3,depthWrite:false}));
  for(const [sx,sy,sz,dy,surface]of [[.023,.055,.019,.044,materials.get('flame')],[.012,.032,.011,.028,materials.get('flame-core')]]){
   const m=ball(g,x,y+dy,z,sx,sy,sz,surface);m.userData.flame=true;flames.push({mesh:m,baseY:sy,phase:flames.length*1.73});
  }
 }
 function candle(g,x,z,height){
  ball(g,x,.009,z,.065,.009,.06,wax);mesh(g,cylinder,wax,[x,height/2+.012,z],[.042,height,.042]);
  for(let i=0;i<4;i++){const a=i*1.9;rod(g,[x+Math.cos(a)*.039,height+.007,z+Math.sin(a)*.039],[x+Math.cos(a)*.044,height*(.55+i*.075),z+Math.sin(a)*.044],.006,wax);}
  rod(g,[x,height+.008,z],[x+.003,height+.032,z],.004,ink);flame(g,x,height+.024,z);
 }
 function candleCluster({scale=1}={}){const g=group('candles',scale);candle(g,-.085,.035,.29);candle(g,.075,.025,.2);candle(g,.01,-.085,.37);batch(g,'cluster-wax',wax,()=>true);batch(g,'cluster-wicks',ink,()=>true);g.lightPoint=new THREE.Vector3(0,.32,0);return g;}
 function lantern({scale=1}={}){
  const g=group('lantern',scale);box(g,.25,.035,.2,0,.025,0);box(g,.25,.025,.2,0,.36,0);
  for(const x of [-.108,.108])for(const z of [-.081,.081])rod(g,[x,.045,z],[x,.36,z],.012,iron);
  const glass=material('glass',0xc59d61,{transparent:true,opacity:.16,roughness:.25,side:THREE.DoubleSide,depthWrite:false});
  for(const z of [-.083,.083])mesh(g,geometry('lantern-glass',()=>new THREE.PlaneGeometry(.19,.28)),glass,[0,.2,z]);
  for(const x of [-.109,.109]){const pane=mesh(g,geometry('lantern-side',()=>new THREE.PlaneGeometry(.14,.28)),glass,[x,.2,0]);pane.rotation.y=Math.PI/2;}
  mesh(g,geometry('lantern-cap',()=>new THREE.ConeGeometry(.17,.095,4).rotateY(Math.PI/4)),iron,[0,.414,0],[1,1,.82]);
  const ring=mesh(g,geometry('lantern-ring',()=>new THREE.TorusGeometry(.054,.009,6,20)),iron,[0,.503,0]);ring.rotation.y=.1;
  candle(g,0,0,.2);g.lightPoint=new THREE.Vector3(0,.255,0);g.seal=ball(g,0,.12,.111,.035,.035,.01,material('wax-seal',0x863c24));return g;
 }
 function web({size=1,flip=1}={}){
  const g=group('web',size);g.scale.x*=flip;
  const geo=geometry('web',()=>{const p=[];for(let i=0;i<=7;i++){const a=i/7*Math.PI/2;p.push(0,0,0,Math.cos(a),-Math.sin(a),0);}for(let r=1;r<=5;r++)for(let i=0;i<7;i++){const a=i/7*Math.PI/2,b=(i+1)/7*Math.PI/2,mid=(a+b)/2,k=r/5;p.push(Math.cos(a)*k,-Math.sin(a)*k,0,Math.cos(mid)*k*.94,-Math.sin(mid)*k*.94,0,Math.cos(mid)*k*.94,-Math.sin(mid)*k*.94,0,Math.cos(b)*k,-Math.sin(b)*k,0);}return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(p,3));});
  if(!materials.has('silk'))materials.set('silk',new THREE.LineBasicMaterial({color:0xc9c7af,transparent:true,opacity:aged?.31:.4,depthWrite:false}));g.add(new THREE.LineSegments(geo,materials.get('silk')));return g;
 }
 function wire(g,width,count,sag=.09){
  const geo=geometry(`wire-${width}-${count}-${sag}`,()=>new THREE.BufferGeometry().setFromPoints(Array.from({length:count+1},(_,i)=>new THREE.Vector3(-width/2+i/count*width,-Math.sin(i/count*Math.PI)*sag,0))));
  if(!materials.has('wire'))materials.set('wire',new THREE.LineBasicMaterial({color:0x343a2d}));g.add(new THREE.Line(geo,materials.get('wire')));
 }
 function bunting({width=2,count=9}={}){
  const g=group('bunting');wire(g,width,count,.055);const geo=shape('flag',[[-.065,0],[.065,0],[0,-.165]]);
  for(let i=0;i<count;i++){const t=(i+.5)/count,m=mesh(g,geo,i%2?card:blackCard,[-width/2+t*width,-Math.sin(t*Math.PI)*.055,-.001],[width/count*.7/.13,width/count*.95/.165,1]);paper.push({mesh:m,base:0,phase:i*.7});}return g;
 }
 function stringLights({width=2,count=9,sag=.09}={}){
  const g=group('string-lights');wire(g,width,count,sag);
  for(let i=0;i<count;i++){const t=(i+.5)/count,x=-width/2+t*width,y=-Math.sin(t*Math.PI)*sag;box(g,.022,.033,.022,x,y-.013,0,ink);ball(g,x,y-.046,0,.024,.034,.024,i%4===0?material('dead-bulb',0x624326):glow);}
  g.lightPoint=new THREE.Vector3(0,-.08,0);return g;
 }
 function bats({scale=1}={}){
  const g=group('bats',scale),geo=shape('bat',[[-.5,.23],[-.3,.08],[-.13,-.02],[-.065,.15],[0,.09],[.065,.15],[.13,-.02],[.3,.08],[.5,.23],[.37,-.16],[.22,-.09],[.09,-.22],[0,-.29],[-.09,-.22],[-.22,-.09],[-.37,-.16]]);
  for(const [x,y,s]of [[-.19,.01,.32],[.08,.13,.25],[.28,-.07,.19]]){const m=mesh(g,geo,blackCard,[x,y,.003],[s,s,s]);m.rotation.z=x*.5;paper.push({mesh:m,base:0,phase:paper.length*.6});rod(g,[x,y+.02,0],[x,.34,0],.0014,ink);}return g;
 }
 function wreath({scale=1}={}){
  const g=group('wreath',scale);mesh(g,geometry('wreath',()=>new THREE.TorusGeometry(.24,.046,8,32)),material('wreath-orange',0x945322));
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,leaf=ball(g,Math.cos(a)*.24,Math.sin(a)*.24,.018,.035,.069,.02,i%3?stem:blackCard);leaf.rotation.z=a-.5;}return g;
 }
 function skeleton({scale=1}={}){
  const g=group('skeleton',scale);rod(g,[0,.47,-.04],[0,.96,-.04],.023);ball(g,0,.47,-.025,.13,.065,.075,bone);
  for(let i=0;i<5;i++){const r=.144-i*.011,geo=geometry(`rib-${i}`,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({length:9},(_,n)=>new THREE.Vector3(Math.cos(n/8*Math.PI)*r,0,Math.sin(n/8*Math.PI)*.09))),14,.01,6,false));mesh(g,geo,bone,[0,.83-i*.057,-.035]);}
  ball(g,0,1.04,0,.106,.139,.095,bone);ball(g,0,.947,.025,.074,.035,.059,bone);
  for(const x of [-.04,.04])ball(g,x,1.065,.082,.027,.034,.017,ink);mesh(g,shape('nose',[[-.014,0],[.014,0],[0,.031]]),ink,[0,1.006,.093]);
  for(let i=-2;i<=2;i++)box(g,.013,.025,.016,i*.022,.946,.078,bone);
  for(const side of [-1,1]){
   const hip=[side*.075,.47,-.02],knee=[side*.13,.25,.03],ankle=[side*.1,.06,.11];rod(g,hip,knee,.025);rod(g,knee,ankle,.021);ball(g,...knee,.034,.035,.034,bone);ball(g,side*.1,.035,.16,.045,.029,.083,bone);
   const shoulder=[side*.14,.86,0],elbow=[side*.22,side<0?.65:.71,.04],hand=[side<0?-.10:.15,side<0?.56:.75,.18];rod(g,shoulder,elbow,.022);rod(g,elbow,hand,.017);ball(g,...elbow,.028,.028,.028,bone);ball(g,...hand,.028,.025,.019,bone);
  }
  g.letter=box(g,.185,.125,.013,.12,.755,.201,letter);g.letter.rotation.z=-.1;g.seal=ball(g,.145,.753,.215,.023,.023,.008,material('wax-seal',0x863c24));return g;
 }
 function update(time,{reducedMotion=false}={}){
  if(disposed)return;const t=Number.isFinite(time)?time:0;
  for(const {mesh,baseY,phase}of flames)mesh.scale.y=baseY*(reducedMotion?1:1+Math.sin(t*5+phase)*.045+Math.sin(t*9.1+phase)*.025);
  for(const {mesh,base,phase}of paper)mesh.rotation.y=base+(reducedMotion?0:Math.sin(t*.7+phase)*.025);
 }
 return {pumpkin,web,bunting,stringLights,bats,candleCluster,lantern,wreath,skeleton,update,dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());surfaces.dispose();flames.length=paper.length=0;}};
}

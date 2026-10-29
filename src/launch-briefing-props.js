import * as T from 'three';

// Everything here belongs to this film. No gameplay world or cached model is disposed.
export function createBriefingProps(){
 const root=new T.Group(),geometries=new Set(),materials=new Set(),textures=new Set(),lights=[],flames=[];
 let seed=7183;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const geometry=g=>(geometries.add(g),g);
 const material=o=>{const m=new T.MeshStandardMaterial(o);materials.add(m);return m;};
 const texture=(w,h,draw)=>{
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');if(!c)return null;draw(c);
  const result=new T.CanvasTexture(canvas);result.colorSpace=T.SRGBColorSpace;textures.add(result);return result;
 };
 const concrete=texture(256,256,c=>{
  c.fillStyle='#4a4e48';c.fillRect(0,0,256,256);
  for(let i=0;i<11500;i++){const v=30+Math.floor(random()*70);c.fillStyle=`rgba(${v},${v+3},${v},${.08+random()*.2})`;c.fillRect(random()*256,random()*256,1+random()*4,1+random()*2);}
  c.strokeStyle='#242b25';c.lineWidth=1;for(let row=0;row<8;row++){c.beginPath();c.moveTo(0,row*32);c.lineTo(256,row*32);c.stroke();for(let col=0;col<5;col++)c.fillRect(col*64+(row%2)*32,row*32,1,32);}
  for(let i=0;i<20;i++){const x=random()*256;c.fillStyle='rgba(6,12,8,.14)';c.fillRect(x,0,2+random()*8,30+random()*190);}
 });
 if(concrete){concrete.wrapS=concrete.wrapT=T.RepeatWrapping;concrete.repeat.set(3,2);concrete.anisotropy=2;}
 const grain=texture(256,256,c=>{c.fillStyle='#66513a';c.fillRect(0,0,256,256);for(let i=0;i<210;i++){c.strokeStyle=`rgba(24,17,10,${.08+random()*.15})`;c.beginPath();const y=random()*256;c.moveTo(0,y);for(let j=0;j<9;j++)c.lineTo(j*32,y+Math.sin(j*.7+i)*2);c.stroke();}});
 const rind=texture(256,256,c=>{c.fillStyle='#d6b69b';c.fillRect(0,0,256,256);for(let i=0;i<3200;i++){c.fillStyle=`rgba(71,42,10,${random()*.18})`;c.fillRect(random()*256,random()*256,random()*3+1,random()*5+1);}});
 const wall=material({color:0xa3a494,map:concrete,roughness:.98}),floor=material({color:0x4b4b40,map:concrete,roughness:.84}),wood=material({color:0x655440,map:grain,roughness:.96}),metal=material({color:0x373c37,roughness:.75,metalness:.55}),rust=material({color:0x59392b,roughness:1}),black=material({color:0x090c09,roughness:.95}),wax=material({color:0xc5b894,roughness:.72}),orange=material({color:0xaf4310,map:rind,roughness:.86}),stem=material({color:0x45502b,roughness:1}),glow=material({color:0xffb33e,emissive:0xff780e,emissiveIntensity:1.1,roughness:1}),paper=material({color:0xcfc7a1,roughness:1,side:T.DoubleSide});
 const unitBox=geometry(new T.BoxGeometry(1,1,1));
 function mesh(g,m,parent,x=0,y=0,z=0){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function box(parent,x,y,z,w,h,d,m=wall){const o=mesh(unitBox,m,parent,x,y,z);o.scale.set(w,h,d);return o;}
 function tube(parent,points,radius,m=metal){return mesh(geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*6),radius,8,false)),m,parent);}
 function point(parent,x,y,z,color,intensity,distance){const light=new T.PointLight(color,intensity,distance,2);light.position.set(x,y,z);parent.add(light);lights.push(light);light.userData.baseIntensity=intensity;return light;}
 function sign(parent,text,x,y,z,w=.9,h=.32){
  const map=texture(512,192,c=>{c.fillStyle='#918f72';c.fillRect(0,0,512,192);c.strokeStyle='#333d32';c.lineWidth=9;c.strokeRect(12,12,488,168);c.fillStyle='#293329';c.font='bold 92px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,103,460);});
  const m=material({map,color:map?0xffffff:0xa7a18a,roughness:1});return mesh(geometry(new T.PlaneGeometry(w,h)),m,parent,x,y,z);
 }
 function candle(parent,x,y,z,h=.3){
  mesh(geometry(new T.CylinderGeometry(.055,.065,h,12)),wax,parent,x,y+h/2,z);
  for(let i=0;i<4;i++){const a=i*2.3;mesh(geometry(new T.CapsuleGeometry(.012,.04+random()*.06,3,6)),wax,parent,x+Math.sin(a)*.054,y+h-.07,z+Math.cos(a)*.054);}
  mesh(geometry(new T.CylinderGeometry(.006,.006,.035,5)),black,parent,x,y+h+.01,z);
  const flame=mesh(geometry(new T.SphereGeometry(1,8,8)),glow,parent,x,y+h+.075,z);flame.scale.set(.023,.065,.023);flames.push(flame);
 }
 function candles(parent,x,y,z,count=3,lit=true){for(let i=0;i<count;i++)candle(parent,x+(i%2)*.16,y,z+Math.floor(i/2)*.15,.18+(i%3)*.1);if(lit)point(parent,x,y+.42,z,0xffa440,1.1,4);}
 function polygon(parent,points,m,x,y,z){const s=new T.Shape();points.forEach(([a,b],i)=>i?s.lineTo(a,b):s.moveTo(a,b));s.closePath();return mesh(geometry(new T.ShapeGeometry(s)),m,parent,x,y,z);}
 function pumpkin(parent,x,y,z,size=.6,rotation=0){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.y=rotation;g.scale.setScalar(size);parent.add(g);
  const shape=geometry(new T.SphereGeometry(.5,40,24)),p=shape.attributes.position;
  for(let i=0;i<p.count;i++){const a=Math.atan2(p.getZ(i),p.getX(i)),f=1+.085*Math.cos(a*10),py=p.getY(i);p.setXYZ(i,p.getX(i)*f,py*.82+.4,p.getZ(i)*f);}
  shape.computeVertexNormals();mesh(shape,orange,g);
  tube(g,[[0,.76,0],[.01,.91,0],[.07,.98,.015]],.043,stem);
  for(const side of [-1,1]){const eye=polygon(g,[[-.09,-.055],[0,.105],[.09,-.055]],black,side*.18,.51,.51);eye.rotation.y=side*.25;const inset=polygon(g,[[-.062,-.033],[0,.077],[.062,-.033]],glow,side*.18,.51,.514);inset.rotation.y=side*.25;}
  polygon(g,[[-.31,.03],[-.2,-.04],[-.13,0],[-.05,-.07],[.04,-.025],[.14,-.06],[.22,.01],[.31,.07],[.24,-.14],[.08,-.2],[-.1,-.19],[-.24,-.12]],black,0,.3,.516);
  polygon(g,[[-.25,.0],[-.19,-.07],[-.12,-.025],[-.05,-.1],[.04,-.055],[.14,-.09],[.23,-.025],[.18,-.115],[.06,-.165],[-.09,-.15],[-.2,-.105]],glow,0,.3,.52);
  return g;
 }
 function web(parent,x,y,z,size=1,rotation=0){
  const positions=[],segments=9,origin=new T.Vector3(0,0,0);
  const line=(a,b)=>positions.push(...a.toArray(),...b.toArray());
  for(let i=0;i<segments;i++){const a=i/(segments-1)*Math.PI/2;line(origin,new T.Vector3(Math.cos(a)*size,-Math.sin(a)*size,0));}
  for(let ring=1;ring<=6;ring++)for(let i=0;i<segments-1;i++){
   const r=size*ring/6,a=i/(segments-1)*Math.PI/2,b=(i+1)/(segments-1)*Math.PI/2;
   const A=new T.Vector3(Math.cos(a)*r,-Math.sin(a)*r,0),B=new T.Vector3(Math.cos(b)*r,-Math.sin(b)*r,0),mid=A.clone().lerp(B,.5).multiplyScalar(.94);line(A,mid);line(mid,B);
  }
  const geo=geometry(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));const m=new T.LineBasicMaterial({color:0xb7b9a7,transparent:true,opacity:.32});materials.add(m);const lines=new T.LineSegments(geo,m);lines.position.set(x,y,z);lines.rotation.z=rotation;parent.add(lines);
 }
 function bunting(parent,z,width=5,y=2.8){
  const points=[];for(let i=0;i<=18;i++){const x=-width/2+i/18*width;points.push([x,y-.27*Math.sin(i/18*Math.PI),z]);}
  tube(parent,points,.009,black);for(let i=0;i<14;i++){const x=-width/2+(i+.5)/14*width,py=y-.27*Math.sin((i+.5)/14*Math.PI);polygon(parent,[[-.11,0],[.11,0],[0,-.29]],i%2?black:orange,x,py,z);}
 }
 function room(offset,width=9,depth=12,crosshall=false){const group=new T.Group();group.position.x=offset;root.add(group);
  box(group,0,-.12,0,width,.24,depth,floor);box(group,0,3.55,0,width,.2,depth);if(crosshall){for(const side of [-1,1]){box(group,side*width/2,1.75,-14.25,.2,3.5,1.5);box(group,side*width/2,1.75,1.95,.2,3.5,26.1);}}else{box(group,-width/2,1.75,0,.2,3.5,depth);box(group,width/2,1.75,0,.2,3.5,depth);}box(group,0,1.75,-depth/2,width,3.5,.2);
  for(const side of [-1,1]){if(crosshall){box(group,side*(width/2-.15),.18,-14.25,.08,.32,1.5,metal);box(group,side*(width/2-.15),.18,1.95,.08,.32,26.1,metal);}else box(group,side*(width/2-.15),.18,0,.08,.32,depth,metal);tube(group,[[side*(width/2-.22),3.02,depth/2],[side*(width/2-.22),3.02,-depth/2]],.07,rust);}
  return group;
 }
 const basement=room(0,10,14);
 for(const x of [-3.5,3.5]){box(basement,x,1.75,-3.8,.28,3.5,.32);box(basement,x,3.15,0,.36,.3,14,metal);}
 box(basement,-.75,.88,-2.1,3.25,.14,1.15,wood);
 for(const x of [-2.1,.6])for(const z of [-2.55,-1.65])box(basement,x,.43,z,.12,.86,.12,wood);
 pumpkin(basement,-1.45,.96,-1.9,.92,-.08);pumpkin(basement,-2.85,1.08,-3.6,.59,.12);pumpkin(basement,-2.8,0,-1.15,.83,.3);pumpkin(basement,.9,0,-1.9,.55,-.15);candles(basement,.2,.96,-1.9,4);candles(basement,-3.2,0,-2.5,3);
 box(basement,-2.9,.31,-3.6,1.3,.62,1,wood);box(basement,-2.85,.85,-3.6,.95,.45,.8,wood);web(basement,-4.82,3.36,-6.82,2.1);web(basement,4.8,3.36,-6.82,1.6,-Math.PI/2);bunting(basement,-4.8,6.5,3.13);sign(basement,'WELCOME',-.8,2.25,-6.86,2.3,.55);
 point(basement,-1.2,1.4,-1.3,0xff8e30,2.2,6);point(basement,2.5,2.8,-4,0x839e90,12,9);
 const corridor=room(32,6.6,30,true);corridor.position.z=-6;
 for(let i=0;i<6;i++){
  const z=7-i*4.5;
  for(const side of [-1,1]){box(corridor,side*3.04,1.7,z,.24,3.4,.24,metal);if(i!==4){box(corridor,side*3.18,1.17,z-1.3,.07,2.3,1.25,wood);box(corridor,side*3.11,2.45,z-1.3,.13,.11,1.45,metal);}}
  box(corridor,0,3.22,z,6.35,.22,.22,metal);box(corridor,0,3.35,z,.7,.06,.32,black);const fixtureMaterial=glow.clone();materials.add(fixtureMaterial);box(corridor,0,3.31,z,.52,.035,.21,fixtureMaterial);
  const light=point(corridor,0,3.05,z,0xc8cfac,20,7);light.userData.corridorIndex=i;light.userData.fixtureMaterial=fixtureMaterial;
  if(i%2===0){pumpkin(corridor,-2.6,0,z-.8,.7,.5);candles(corridor,2.65,0,z-.8,3,false);web(corridor,-3.08,3.28,z+.1,1.1);bunting(corridor,z,5.8,2.96);}
 }
 for(const side of [-1,1]){box(corridor,side*5.1,-.12,-12.3,3.6,.24,2.4,floor);box(corridor,side*5.1,3.55,-12.3,3.6,.2,2.4);for(const z of [-13.5,-11.1])box(corridor,side*5.1,1.75,z,3.6,3.5,.2);box(corridor,side*7,1.75,-12.3,.2,3.5,2.4,black);}
 sign(corridor,'B1',0,2.25,-14.86,1,.45);point(corridor,-2.35,.85,5.8,0xff8533,6,5);point(corridor,2.3,1.7,-6,0x719d99,6,6);
 const clues=room(64,7,9);
 box(clues,0,.82,-1.6,3.7,.15,1.4,wood);for(const x of [-1.5,1.5])for(const z of [-2.1,-1.1])box(clues,x,.4,z,.1,.8,.1,wood);
 const noteTexture=texture(512,512,c=>{
  c.fillStyle='#c5ba91';c.fillRect(0,0,512,512);c.fillStyle='#302e26';c.font='24px monospace';c.fillText('TO THE OBSERVANT',45,64);c.lineWidth=3;c.strokeStyle='#4a493b';
  for(let i=0;i<8;i++){c.beginPath();c.moveTo(45,104+i*39);for(let j=0;j<12;j++)c.lineTo(45+j*34,104+i*39+(random()-.5)*11);c.stroke();}
  c.beginPath();c.ellipse(350,410,54,49,-.3,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(319,410);c.lineTo(381,410);c.stroke();
 });
 const noteSurface=material({color:noteTexture?0xffffff:0xbdb58f,map:noteTexture,roughness:1,side:T.DoubleSide});
 for(let i=0;i<4;i++){const page=mesh(geometry(new T.PlaneGeometry(.65,.85)),noteSurface,clues,-.8+i*.47,.905+i*.002,-1.5+(i%2)*.1);page.rotation.set(-Math.PI/2,0,(i-.9)*.25);}
 const board=box(clues,-.5,1.96,-4.36,2.4,1.5,.08,wood);
 for(let i=0;i<3;i++){const page=mesh(geometry(new T.PlaneGeometry(.51,.67)),noteSurface,clues,-1.15+i*.65,2.06+(i%2)*.18,-4.305);page.rotation.z=(i-1)*.13;box(clues,-1.15+i*.65,2.34+(i%2)*.18,-4.29,.026,.026,.025,rust);}
 const keyGroup=new T.Group();keyGroup.position.set(.65,.944,-1.15);keyGroup.rotation.set(Math.PI/2,0,-.4);clues.add(keyGroup);
 const brass=material({color:0xa68c4d,metalness:.75,roughness:.38});mesh(geometry(new T.TorusGeometry(.105,.022,8,20)),brass,keyGroup);box(keyGroup,0,-.22,0,.035,.29,.035,brass);box(keyGroup,.045,-.33,0,.1,.032,.035,brass);box(keyGroup,.033,-.25,0,.08,.027,.035,brass);
 pumpkin(clues,1.42,.9,-1.8,.54,-.3);candles(clues,-1.6,.9,-1.4,3);web(clues,-3.32,3.3,-4.34,1.5);point(clues,-.8,2,-1.2,0xffba60,14,6);point(clues,2.5,2.7,-3,0x779691,10,6);
 const sealed=room(96,6.4,9);
 box(sealed,0,1.45,-4.3,2.55,2.9,.16,metal);
 for(const x of [-1.4,1.4])box(sealed,x,1.55,-4.12,.21,3.1,.23,rust);box(sealed,0,3.05,-4.12,3,.2,.23,rust);
 for(let i=0;i<7;i++)box(sealed,0,.3+i*.38,-4.2,2.35,.025,.04,black);
 sign(sealed,'B2',0,2.5,-4.17,.65,.35);sign(sealed,'SEALED',0,1.5,-4.17,1.2,.27);
 for(const angle of [-.35,.35]){const brace=box(sealed,0,1.3,-4.08,2.8,.13,.11,rust);brace.rotation.z=angle;}
 tube(sealed,[[-1.38,2.2,-3.96],[-.7,1.6,-3.95],[0,1.23,-3.96],[.75,1.6,-3.95],[1.38,2.2,-3.96]],.026,metal);
 box(sealed,.12,1.14,-3.9,.19,.23,.09,rust);candles(sealed,-1.9,0,-3.2,2);web(sealed,-3.04,3.36,-4.35,1.7);point(sealed,0,2.6,-2.4,0x95b4a6,15,7);point(sealed,-2,.5,-3,0xff963c,3,3);
 const dustGeo=geometry(new T.BufferGeometry()),dust=[];for(let i=0;i<260;i++)dust.push((random()-.5)*6,random()*3.2,-15+random()*28);dustGeo.setAttribute('position',new T.Float32BufferAttribute(dust,3));const dustMat=new T.PointsMaterial({color:0xb9b69a,size:.014,transparent:true,opacity:.055,depthWrite:false});materials.add(dustMat);const motes=new T.Points(dustGeo,dustMat);corridor.add(motes);
 return {root,basement,corridor,clues,sealed,lights,flames,keyGroup,dispose(){root.removeFromParent();for(const l of lights)l.dispose();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.clear();}};
}

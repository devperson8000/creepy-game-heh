import * as T from 'three';
const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
function concreteTexture(){
 if(typeof document==='undefined')return null;const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');if(!c)return null;
 c.fillStyle='#666b68';c.fillRect(0,0,256,256);let seed=913;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let i=0;i<9500;i++){const v=rand();c.fillStyle=v>.5?'rgba(205,214,194,.045)':'rgba(0,0,0,.055)';c.fillRect(rand()*256,rand()*256,1+rand()*3,1+rand()*4);}
 c.strokeStyle='rgba(10,14,13,.4)';c.lineWidth=1;c.beginPath();c.moveTo(0,120);c.lineTo(256,120);c.moveTo(100,0);c.lineTo(100,120);c.stroke();
 const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;return map;
}
export function createFinaleSet({quality='auto'}={}){
 const root=new T.Group(),basement=new T.Group(),cab=new T.Group(),surface=new T.Group();root.add(basement,cab,surface);
 const textures=[],geometries=new Set(),materials=new Set();const texture=concreteTexture();if(texture)textures.push(texture);
 const mat=options=>{const m=new T.MeshStandardMaterial(options);materials.add(m);return m;};
 const wall=mat({color:0x79817b,map:texture,roughness:1}),floor=mat({color:0x383d38,map:texture,roughness:.95}),metal=mat({color:0x606b69,metalness:.75,roughness:.43}),dark=mat({color:0x171d1d,metalness:.6,roughness:.5}),paint=mat({color:0x9b997a,roughness:.8}),lamp=mat({color:0xd6dfb8,emissive:0xbacda2,emissiveIntensity:2});
 function box(parent,name,size,position,material){const geometry=new T.BoxGeometry(...size);geometries.add(geometry);const o=new T.Mesh(geometry,material);o.name=name;o.position.fromArray(position);o.receiveShadow=true;o.castShadow=true;parent.add(o);return o;}
 function label(parent,text,position,width,height,color='#b9c3a4'){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');if(!c)return;
  c.fillStyle='#111816';c.fillRect(0,0,512,128);c.fillStyle=color;c.font='bold 43px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,66,490);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;textures.push(map);const m=new T.MeshBasicMaterial({map});materials.add(m);const geometry=new T.PlaneGeometry(width,height);geometries.add(geometry);const mesh=new T.Mesh(geometry,m);mesh.position.fromArray(position);parent.add(mesh);return mesh;
 }
 // A long basement with real cross-corridors, ducts and pipes.
 box(basement,'corridor-floor',[7,.25,40],[0,-.15,28],floor);box(basement,'corridor-ceiling',[7,.2,40],[0,4,28],wall);
 for(const side of [-1,1])for(let z=7;z<48;z+=5){box(basement,'wall-pier',[.3,4,3.6],[side*3.5,2,z],wall);box(basement,'side-passage',[4.5,4,.25],[side*5.7,2,z-1.8],wall);box(basement,'side-passage',[4.5,4,.25],[side*5.7,2,z+1.8],wall);}
 for(let z=8;z<47;z+=6){box(basement,'ceiling-fixture',[1.25,.08,.3],[0,3.85,z],lamp);box(basement,'duct',[.8,.4,5.8],[-2.4,3.6,z],metal);}
 for(const x of [-1.5,1.5])box(basement,'pipe',[.08,.08,42],[x,3.8,26],dark);
 // Ascending stair flight and upper landing at 3.6 metres.
 for(let i=0;i<18;i++){const h=(i+1)*.2;box(basement,'stair-tread',[2.8,h,.34],[0,h/2,7.83-i*.333],wall);box(basement,'stair-nosing',[2.8,.025,.04],[0,h+.015,7.67-i*.333],paint);}
 for(const side of [-1,1]){const rail=box(basement,'stair-rail',[.065,.065,6.9],[side*1.55,2.8,5],metal);rail.rotation.x=Math.atan2(3.6,6);for(let z=2.5;z<8;z+=1.5)box(basement,'rail-post',[.06,1,.06],[side*1.55,4.6-(z-2)/6*3.6-.5,z],metal);box(basement,'stair-wall',[.3,7,8],[side*2.4,3.5,3],wall);}
 box(basement,'landing',[4.7,.22,2.2],[0,3.49,1.1],floor);
 label(basement,'B1  /  RETURN',[-1,5.4,2.8],1.7,.35);
 // Cab: all moving hardware is parented here.
 box(cab,'cab-floor',[3.4,.2,3.6],[0,-.1,-1.8],metal);box(cab,'cab-back',[3.4,3.2,.12],[0,1.6,-3.6],metal);
 for(const side of [-1,1]){box(cab,'cab-side',[.12,3.2,3.6],[side*1.7,1.6,-1.8],metal);box(cab,'cab-rail',[.07,.07,2.9],[side*1.59,1,-1.85],dark);for(let z=-.5;z>-3.4;z-=.7)box(cab,'panel-seam',[.01,2.9,.018],[side*1.63,1.6,z],dark);box(cab,'jamb',[.42,3.3,.26],[side*1.44,1.65,0],dark);}
 box(cab,'cab-ceiling',[3.4,.15,3.6],[0,3.2,-1.8],metal);box(cab,'cab-light',[2.1,.04,.35],[0,3.1,-1.8],lamp);
 box(cab,'threshold',[2.7,.025,.35],[0,.015,0],metal);box(cab,'cab-lintel',[3.4,.25,.35],[0,3.05,0],dark);
 const doors=[-1,1].map(side=>box(cab,'elevator-door',[1.27,2.95,.11],[side*1.96,1.5,.02],metal));
 for(const door of doors){box(door,'door-inset',[.95,2.4,.016],[0,.02,-.064],dark);box(door,'door-line',[.014,2.7,.02],[door.position.x<0?.6:-.6,0,-.07],paint);}
 const panel=box(cab,'control-panel',[.09,.95,.38],[1.58,1.35,-.65],dark);const button=box(cab,'close-button',[.04,.12,.16],[1.515,1.3,-.65],lamp);
 label(cab,'◀ ▶',[1.45,1.58,-.65],.28,.15)?.rotateY(-Math.PI/2);
 const floorIndicator=new T.Group();floorIndicator.name='floor-indicator';cab.add(floorIndicator);const floors=['B1','B0','01','02'].map(text=>label(floorIndicator,`↑  ${text}`,[0,2.94,-.2],.65,.18)?.rotateY(Math.PI));
 // Shaft stays fixed as the elevator passes the cutting frame.
 const shaft=new T.Group();basement.add(shaft);
 for(const side of [-1,1])box(shaft,'shaft-wall',[.2,26,4.1],[side*2.1,12,-1.7],wall);
 const shaftFrame=box(shaft,'fixed-shaft-frame',[4.2,.32,.5],[0,12.2,.23],dark);
 const shaftLights=[];for(let y=5;y<26;y+=2.5)for(const side of [-1,1])shaftLights.push(box(shaft,'shaft-marker',[.18,.12,.1],[side*1.85,y,.3],lamp));
 const bloodMaterial=mat({color:0x030206,metalness:.22,roughness:.16});const bloodGeometry=new T.CircleGeometry(1,48);geometries.add(bloodGeometry);const blood=new T.Mesh(bloodGeometry,bloodMaterial);blood.name='black-blood';blood.rotation.x=-Math.PI/2;blood.position.set(.35,.012,-.8);cab.add(blood);
 for(let i=0;i<7;i++){const drop=box(cab,'black-droplet',[.035,.007,.05],[.2+Math.sin(i*9)*.7,.015,-.4-i*.14],bloodMaterial);drop.userData.blood=true;}
 // Daylight outside the upper elevator, with a quiet concrete forecourt.
 const pale=mat({color:0xbfc3ac,roughness:1});box(surface,'surface-floor',[50,.2,50],[0,-.15,12],pale);
 for(const side of [-1,1]){box(surface,'surface-wall',[7,8,.35],[side*5.3,3.8,-.15],wall);box(surface,'surface-pier',[.6,5,2],[side*2.1,2.5,.1],wall);box(surface,'surface-step',[4.5,.15,.4],[0,-.05,3.4],pale);}
 box(surface,'surface-lintel',[11,1.1,1],[0,4.8,0],wall);label(surface,'S U R F A C E',[0,3.8,.53],2.8,.35,'#e0e2cf');
 for(let i=0;i<12;i++)box(surface,'distant-column',[.5,8,.6],[(i-6)*3.4,3.8,18+(i%3)*4],wall);
 const practical=new T.PointLight(0xe4e9cf,12,9,2);practical.position.set(0,2.8,-1.8);cab.add(practical);
 const exit=new T.Object3D();exit.position.set(0,0,6);surface.add(exit);
 function sample(time){
  const epilogue=time>=44;surface.visible=epilogue;basement.visible=!epilogue;cab.position.y=epilogue?0:3.6+Math.max(0,Math.min(time-30,13))*1.3;
  let closed=smooth(22.6,23.7,time);if(epilogue)closed=1-smooth(44.3,46,time);
  doors.forEach((door,i)=>{door.position.x=(i?1:-1)*T.MathUtils.lerp(1.96,.765,closed);});
  blood.visible=time>=35.3&&!epilogue;const spread=smooth(35.3,42,time);blood.scale.set(.04+.67*spread,.04+.48*spread,1);
  cab.children.forEach(o=>{if(o.userData.blood)o.visible=blood.visible&&time>36;});
  const floorIndex=time<30?0:time<33?1:time<36?2:3;floors.forEach((mesh,i)=>{if(mesh)mesh.visible=i===floorIndex;});floorIndicator.userData.floor=['B1','B0','01','02'][floorIndex];
  practical.intensity=epilogue?8:12;
 }
 function dispose(){for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();root.removeFromParent();}
 return {root,cab,doors,button,panel,shaftFrame,shaftLights,floorIndicator,blood,exit,basement,surface,sample,dispose};
}

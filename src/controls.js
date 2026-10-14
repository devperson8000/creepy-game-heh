export function stepPlayer(position,input,yaw,delta,speed=2) {
 const length=Math.max(1,Math.hypot(input.forward,input.right));
 const distance=Math.min(Math.max(delta,0),.05)*speed;
 const dx=(-Math.sin(yaw)*input.forward+Math.cos(yaw)*input.right)/length*distance;
 const dz=(-Math.cos(yaw)*input.forward-Math.sin(yaw)*input.right)/length*distance;
 const next={...position};
 const valid=(x,z)=>x>=-3.15&&x<=3.15&&z>=-2.8&&z<=7.3&&Math.hypot(x,z)>=.65;
 if(valid(next.x+dx,next.z))next.x+=dx;
 if(valid(next.x,next.z+dz))next.z+=dz;
 return next;
}
export function firstPerson(camera,canvas) {
 const keys=new Set();let yaw=0,pitch=-.02,drag=null;
 const hint=document.querySelector('#instructions');
 const updateHint=()=>{hint.textContent=document.pointerLockElement===canvas?'WASD move · Mouse look · R run / idle · Esc release':'Click scene to look around · WASD move · R run / idle';};
 canvas.addEventListener('click',()=>{
  if(matchMedia('(pointer: fine)').matches&&document.pointerLockElement!==canvas) {
   const result=canvas.requestPointerLock?.();result?.catch?.(()=>{hint.textContent='Drag to look around · WASD move · R run / idle';});
  }
 });
 document.addEventListener('pointerlockchange',()=>{keys.clear();updateHint();});
 const look=(dx,dy)=>{yaw-=dx*.0025;pitch=Math.max(-1.4,Math.min(1.4,pitch-dy*.0025));};
 document.addEventListener('mousemove',event=>{if(document.pointerLockElement===canvas)look(event.movementX,event.movementY);});
 canvas.addEventListener('pointerdown',event=>{if(document.pointerLockElement!==canvas){drag={x:event.clientX,y:event.clientY,id:event.pointerId};canvas.setPointerCapture(event.pointerId);}});
 canvas.addEventListener('pointermove',event=>{if(drag&&document.pointerLockElement!==canvas){look(event.clientX-drag.x,event.clientY-drag.y);drag.x=event.clientX;drag.y=event.clientY;}});
 const endDrag=()=>{drag=null;};canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',endDrag);
 document.addEventListener('keydown',event=>{
  if(event.code==='Escape'){document.exitPointerLock?.();keys.clear();return;}
  if(event.target instanceof HTMLElement&&event.target.closest('button,input,textarea'))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(event.code)){event.preventDefault();keys.add(event.code);}
 });
 document.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>keys.clear());
 document.querySelectorAll('[data-move]').forEach(button=>{
  const key=button.dataset.move;
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);button.setPointerCapture(e.pointerId);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>keys.delete(key));
 });
 camera.rotation.order='YXZ';updateHint();
 return delta=>{
  const input={forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))};
  const next=stepPlayer(camera.position,input,yaw,delta,keys.has('ShiftLeft')||keys.has('ShiftRight')?3.2:2);
  camera.position.x=next.x;camera.position.z=next.z;camera.rotation.set(pitch,yaw,0,'YXZ');
 };
}

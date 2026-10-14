export function gameInput(camera,canvas,ui,onPause){
 const keys=new Set();let yaw=Math.PI,pitch=0,drag=null;
 camera.rotation.order='YXZ';
 function capture(){canvas.tabIndex=0;canvas.focus();if(matchMedia('(pointer:fine)').matches){const p=canvas.requestPointerLock?.();p?.catch?.(()=>{});}keys.clear();}
 canvas.addEventListener('click',()=>{if(!ui.overlay&&!document.pointerLockElement)capture();});
 function look(dx,dy){yaw-=dx*.0021;pitch=Math.max(-1.3,Math.min(1.3,pitch-dy*.0021));}
 document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!ui.overlay)look(e.movementX,e.movementY);});
 canvas.addEventListener('pointerdown',e=>{if(!ui.overlay&&!document.pointerLockElement){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
 canvas.addEventListener('pointermove',e=>{if(drag&&!ui.overlay&&!document.pointerLockElement){look(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}});
 for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>{drag=null;});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'){keys.clear();onPause();return;}if(ui.overlay||e.target.closest?.('button,input'))return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
 document.addEventListener('keyup',e=>keys.delete(e.code));
 document.addEventListener('pointerlockchange',()=>{keys.clear();if(!document.pointerLockElement&&!ui.overlay&&matchMedia('(pointer:fine)').matches)onPause();});
 window.addEventListener('blur',()=>{keys.clear();if(!ui.overlay)onPause();});
 ui.root.querySelectorAll('[data-walk]').forEach(button=>{
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(button.dataset.walk);button.setPointerCapture(e.pointerId);});
  for(const t of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(t,()=>keys.delete(button.dataset.walk));
 });
 const interact=ui.el('touch-interact');interact.addEventListener('pointerdown',e=>{e.preventDefault();keys.add('KeyE');interact.setPointerCapture(e.pointerId);});for(const t of ['pointerup','pointercancel','lostpointercapture'])interact.addEventListener(t,()=>keys.delete('KeyE'));
 return {keys,capture,get yaw(){return yaw;},get pitch(){return pitch;},get interact(){return keys.has('KeyE');},get sprint(){return keys.has('ShiftLeft')||keys.has('ShiftRight');},get movement(){return {forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))};},setView(y,p=0){yaw=y;pitch=p;},updateView(){camera.rotation.set(pitch,yaw,0,'YXZ');},clear(){keys.clear();}};
}

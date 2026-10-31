import {gamePreferences} from './preferences.js';
export function gameInput(camera,canvas,ui,onPause,onCapture=()=>{}){
 const keys=new Set();let yaw=Math.PI,pitch=0,drag=null,pointerLockAllowed=true;
 camera.rotation.order='YXZ';
 const touchButtons=[...ui.root.querySelectorAll('[data-walk]')];
 function clearKeys(){keys.clear();drag=null;for(const button of touchButtons)button.setAttribute('aria-pressed','false');}
 function capture(){canvas.tabIndex=0;canvas.focus();if(pointerLockAllowed&&matchMedia('(pointer:fine)').matches){const p=canvas.requestPointerLock?.();p?.catch?.(()=>{});}clearKeys();onCapture();}
 canvas.addEventListener('click',()=>{if(!ui.overlay&&!document.pointerLockElement)capture();});
 function look(dx,dy){yaw-=dx*.0021*gamePreferences().sensitivity;pitch=Math.max(-1.3,Math.min(1.3,pitch-dy*.0021*gamePreferences().sensitivity));}
 document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&!ui.overlay)look(e.movementX,e.movementY);});
 canvas.addEventListener('pointerdown',e=>{if(!ui.overlay&&!document.pointerLockElement){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
 canvas.addEventListener('pointermove',e=>{if(drag&&!ui.overlay&&!document.pointerLockElement){look(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
 document.addEventListener('keydown',e=>{if(e.code==='Escape'){if(e.repeat)return;clearKeys();onPause();return;}if(ui.overlay||e.target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName??''))return;if(['KeyW','KeyA','KeyS','KeyD','KeyE','ShiftLeft','ShiftRight','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}},{capture:true});
 document.addEventListener('keyup',e=>keys.delete(e.code),{capture:true});
 document.addEventListener('pointerlockchange',()=>{clearKeys();drag=null;if(!document.pointerLockElement&&!ui.overlay&&matchMedia('(pointer:fine)').matches)onPause();});
 window.addEventListener('blur',()=>{clearKeys();if(!ui.overlay)onPause();});document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
 touchButtons.forEach(button=>{
  button.addEventListener('pointerdown',e=>{if(ui.overlay)return;e.preventDefault();keys.add(button.dataset.walk);button.setAttribute('aria-pressed','true');button.setPointerCapture(e.pointerId);});
  for(const t of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(t,()=>{keys.delete(button.dataset.walk);button.setAttribute('aria-pressed','false');});
 });
 const interact=ui.el('touch-interact');interact.addEventListener('pointerdown',e=>{if(ui.overlay)return;e.preventDefault();keys.add('KeyE');interact.setPointerCapture(e.pointerId);});for(const t of ['pointerup','pointercancel','lostpointercapture'])interact.addEventListener(t,()=>keys.delete('KeyE'));
 return {keys,capture,set pointerLockAllowed(value){pointerLockAllowed=!!value;},get yaw(){return yaw;},get pitch(){return pitch;},get interact(){return keys.has('KeyE');},get sprint(){return keys.has('ShiftLeft')||keys.has('ShiftRight');},get movement(){return {forward:Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),right:Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))};},setView(y,p=0){yaw=y;pitch=p;},updateView(){camera.rotation.set(pitch,yaw,0,'YXZ');},clear:clearKeys};
}

import * as THREE from 'three';
import {createRun,searchDrawer,takeKey,bankKeys,enterCode,readClue,catchPlayer,retryRun,openExit} from './game-state.js';
import {createWorld} from './world.js';
import {createCreature,applyIdle,applyRunning} from './creature.js';
import {idlePose} from './idle.js';
import {createEnemy,tickEnemy} from './enemy.js';
import {groundHeight,moveInWorld,worldPoint} from './level.js';
import {createGameUI} from './game-ui.js';
import {gameInput} from './game-input.js';
import {footstepNoise,interactionNoise} from './player-noise.js';
import {createMonsterAudio,MONSTER_SOUND_URL} from './monster-audio.js';
import {createTorch} from './torch.js';
import {createJumpscare,JUMPSCARE_MOUTH_URL} from './jumpscare.js';

export function startGame(container,{seed}={}){
 seed??=crypto.getRandomValues(new Uint32Array(1))[0];
 const run=createRun(seed),world=createWorld(run),ui=createGameUI();
 const monsterAudio=createMonsterAudio(MONSTER_SOUND_URL,{onError:()=>ui.toast('Monster sound could not load. You can keep playing.'),onScareError:()=>ui.toast('Jumpscare sound could not load.')});
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 container.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(66,1,.06,85),creature=createCreature();world.scene.add(creature.root);
 creature.root.traverse(m=>{if(m.isMesh){m.userData.actor=true;world.rayMeshes.push(m);}});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 const torch=createTorch(world.scene,camera);
 const mouthTexture=new THREE.TextureLoader().load(JUMPSCARE_MOUTH_URL,undefined,undefined,()=>ui.toast('Jumpscare mouth could not load.'));
 const jumpscare=createJumpscare({mouthTexture});
 const raycaster=new THREE.Raycaster(),center=new THREE.Vector2(0,0);
 let enemy=createEnemy(run.layout),player={x:-2.6,z:-29,height:3.6},hiddenCloset=null,hideWitnessed=false,hold=0,holdId=null,latched=false,threat=0,lastResult={distance:Infinity,visible:false},buffer='';
 function pause(){if(ui.overlay==='keypad'){closeKeypad();return;}if(run.phase!=='playing')return;if(ui.overlay==='pause'){resume();return;}if(ui.overlay)return;showScreen('pause');}
 const input=gameInput(camera,renderer.domElement,ui,pause);
 let pendingNoise=[],noiseUntil=0;const footsteps={distance:0};
 function emitNoise(noise){if(!noise)return;monsterAudio.playNoise(noise.type);player.noise=noise.radius>12?'Loud':noise.radius>4?'Audible':'Quiet';noiseUntil=performance.now()+1000;if(run.boardsOpen)pendingNoise.push(noise);}
 function resume(){ui.hideScreen();input.capture();void monsterAudio.resume();}
 function respawn(){if(hiddenCloset)hiddenCloset.mesh.visible=true;hiddenCloset=null;hideWitnessed=false;player={x:-2.6,z:-29,height:3.6};input.setView(Math.PI);enemy=createEnemy(run.layout);world.lighting.reset();pendingNoise=[];footsteps.distance=0;noiseUntil=0;threat=0;hold=0;latched=false;}
 function showScreen(kind){monsterAudio.pause();ui.screen(kind,run);document.exitPointerLock?.();input.clear();ui.el('screen-primary').addEventListener('click',()=>{if(kind==='won'){location.reload();return;}if(kind==='dead'){retryRun(run);respawn();}resume();});ui.root.querySelector('#new-run')?.addEventListener('click',()=>location.reload());}
 function capturePlayer(){
  if(run.phase!=='playing')return;
  catchPlayer(run);ui.overlay='jumpscare';ui.el('game-screen').hidden=true;ui.el('jumpscare-border').hidden=false;
  document.body.classList.add('jumpscare-active');input.clear();document.exitPointerLock?.();pendingNoise=[];
  jumpscare.resize(camera.aspect);jumpscare.start();monsterAudio.playJumpscare();
 }
 // Pause content uses the same action wiring as the initial and outcome screens.
 const soundButton=ui.el('sound-toggle');soundButton.hidden=!monsterAudio.configured;
 function toggleSound(){monsterAudio.setMuted(!monsterAudio.muted);soundButton.textContent=monsterAudio.muted?'Sound off':'Sound on';soundButton.setAttribute('aria-pressed',String(monsterAudio.muted));soundButton.setAttribute('aria-label',monsterAudio.muted?'Unmute game sound':'Mute game sound');}
 soundButton.addEventListener('click',toggleSound);
 const torchButton=ui.el('torch-toggle');
 function toggleTorch(){if(ui.overlay||run.phase!=='playing')return;torch.toggle();torchButton.textContent=torch.on?'Torch on':'Torch off';torchButton.setAttribute('aria-pressed',String(torch.on));torchButton.setAttribute('aria-label',torch.on?'Turn torch off (F)':'Turn torch on (F)');}
 torchButton.addEventListener('click',toggleTorch);
 document.addEventListener('keydown',event=>{if(event.code==='KeyF'&&!event.repeat&&!ui.overlay){event.preventDefault();toggleTorch();}});
 document.addEventListener('keydown',event=>{if(event.code==='KeyM'&&!event.repeat&&(!ui.overlay||ui.overlay==='jumpscare'))toggleSound();});
 window.addEventListener('pagehide',()=>monsterAudio.dispose(),{once:true});
 ui.el('pause-game').addEventListener('click',()=>{if(!ui.overlay){showScreen('pause');}});
 function closeKeypad(){void monsterAudio.resume();ui.el('keypad-dialog').hidden=true;ui.overlay=null;input.clear();input.capture();}
 function submitCode(){if(enterCode(run,buffer)){ui.el('keypad-feedback').textContent='Code accepted. Complete the four key locks to open the elevator.';ui.toast('Code accepted.');closeKeypad();}else{ui.el('keypad-feedback').textContent='Access denied. Read the four digits from this run.';buffer='';ui.el('code-display').textContent='— — — —';}}
 function digit(value){if(value==='✓'){submitCode();return;}if(value==='←')buffer=buffer.slice(0,-1);else if(buffer.length<4)buffer+=value;ui.el('code-display').textContent=buffer.padEnd(4,'—').split('').join(' ');}
 ui.root.querySelectorAll('[data-digit]').forEach(b=>b.addEventListener('click',()=>digit(b.dataset.digit)));
 ui.el('close-keypad').addEventListener('click',closeKeypad);
 document.addEventListener('keydown',e=>{if(ui.overlay!=='keypad')return;if(/^\d$/.test(e.key)){e.preventDefault();digit(e.key);}else if(e.key==='Backspace'){e.preventDefault();digit('←');}else if(e.key==='Enter'){e.preventDefault();submitCode();}});
 function openKeypad(){monsterAudio.pause();buffer='';ui.overlay='keypad';ui.el('code-display').textContent='— — — —';ui.el('keypad-feedback').textContent='';ui.el('keypad-dialog').hidden=false;input.clear();document.exitPointerLock?.();ui.root.querySelector('[data-digit="1"]').focus();}
 function targetInfo(t){
  if(!t)return null;let label='',duration=.35;
  if(t.type==='boards'){if(run.boardsOpen)return null;label='Pry away the boards';duration=1.8;}
  if(t.type==='drawer'){const d=run.drawers[t.drawerId];label=d.opened?(d.key&&!d.taken?'Take the key':'Close searched drawer'):'Search drawer';duration=d.opened?.15:.45;}
  if(t.type==='closet'){label='Hide in closet';duration=.25;}
  if(t.type==='clue'){label='Read the four-digit clue';duration=.2;}
  if(t.type==='locks'){label=run.carried.size?`Insert ${run.carried.size} ${run.carried.size===1?'key':'keys'}`:`Key panel · ${run.banked.size} / 4 filled`;duration=.6;}
  if(t.type==='keypad'){label=run.codeAccepted?'Keypad · code accepted':'Enter elevator code';duration=.15;}
  if(t.type==='elevator'){label=run.exitOpen?'Step inside the elevator':run.banked.size===4&&run.codeAccepted?'Open elevator':'Elevator locked · four keys + code';duration=.6;}
  return {...t,label,duration};
 }
 function currentTarget(){
  if(run.hidden)return {id:'leave',type:'leave',label:'Leave the closet',duration:.2};
  camera.updateMatrixWorld();raycaster.setFromCamera(center,camera);raycaster.far=2.5;
  const visible=world.rayMeshes.filter(mesh=>{for(let p=mesh;p;p=p.parent)if(!p.visible)return false;return true;});
  const hit=raycaster.intersectObjects(visible,false)[0];return hit?targetInfo(world.targets.get(hit.object.userData.interactId)):null;
 }
 function perform(t){
  const takingKey=t.type==='drawer'&&run.drawers[t.drawerId].opened&&run.drawers[t.drawerId].key&&!run.drawers[t.drawerId].taken;
  if(t.type!=='boards')emitNoise(interactionNoise(t.type,{x:player.x,z:player.z,height:player.height},{takingKey}));
  if(t.type==='boards'){run.boardsOpen=true;emitNoise(interactionNoise('boards',{...worldPoint(run.layout.entrance),height:0}));ui.toast('The way downstairs is open. Remember the return stairs.');}
  if(t.type==='drawer'){const d=run.drawers[t.drawerId];if(d.opened&&d.key&&!d.taken){takeKey(run,d.id);ui.toast('Key found. Bank it at the elevator panel.');}else{searchDrawer(run,d.id);if(d.opened&&!d.key)ui.toast('Empty drawer. Keep searching.');}}
  if(t.type==='clue'){readClue(run);ui.toast(`Four-digit clue recorded: ${run.code}`);}
  if(t.type==='locks'){const count=bankKeys(run);ui.toast(count?`${count} ${count===1?'key':'keys'} banked. ${run.banked.size} / 4 locks complete.`:'No unbanked keys. Search the basement drawers.');}
  if(t.type==='keypad'){if(!run.codeAccepted)openKeypad();else ui.toast('The number lock is already complete.');}
  if(t.type==='elevator'){if(openExit(run))ui.toast('Both locks released. Step inside.');else ui.toast('The elevator needs all four keys and the correct code.');}
  if(t.type==='closet'){
   run.hidden=true;hiddenCloset=t;hideWitnessed=lastResult.visible&&lastResult.distance<7;player.x=t.hide.x;player.z=t.hide.z;t.mesh.visible=false;input.setView(Math.PI);if(hideWitnessed)ui.toast('It saw you enter.');else ui.toast('Stay quiet. E to leave when it passes.');
  }
  if(t.type==='leave'&&hiddenCloset){hiddenCloset.mesh.visible=true;player.x=hiddenCloset.exit.x;player.z=hiddenCloset.exit.z;hiddenCloset=null;run.hidden=false;hideWitnessed=false;}
 }
 let renderDirty=true,lastOverlay;
 function resize(){renderDirty=true;renderer.setSize(container.clientWidth,container.clientHeight);camera.aspect=container.clientWidth/container.clientHeight;camera.updateProjectionMatrix();}resize();window.addEventListener('resize',resize);
 showScreen('menu');let previous=performance.now(),time=0;
 renderer.setAnimationLoop(()=>{
  const now=performance.now(),frameDelta=Math.min((now-previous)/1000,.2);previous=now;
  if(jumpscare.active){
   jumpscare.update(frameDelta);
   if(!jumpscare.active){ui.el('jumpscare-border').hidden=true;document.body.classList.remove('jumpscare-active');showScreen('dead');}
  }
  if(!ui.overlay&&run.phase==='playing'){
   time+=frameDelta;run.elapsed+=frameDelta;
   // Small physics steps preserve wall collision and fair pursuit at lower frame rates.
   for(let remaining=frameDelta;remaining>0;remaining-=.025){
    const step=Math.min(.025,remaining);
    if(!run.hidden){const next=moveInWorld(player,input.movement,input.yaw,step,world.canMove,input.sprint?3.7:2.5);const moved=Math.hypot(next.x-player.x,next.z-player.z);player.x=next.x;player.z=next.z;emitNoise(footstepNoise(footsteps,moved,input.sprint,{x:player.x,z:player.z,height:groundHeight(player)}));}
    player.height=groundHeight(player);
    lastResult=tickEnemy(enemy,run.layout,{...player,hidden:run.hidden&&!hideWitnessed},step,run.boardsOpen,pendingNoise,world.enemyNavigation);pendingNoise=[];
    if(lastResult.caught||(run.hidden&&hideWitnessed&&lastResult.distance<1.8)){capturePlayer();break;}
   }
   input.updateView();camera.position.set(player.x,player.height+1.65,player.z);
   threat=THREE.MathUtils.lerp(threat,player.height<1.5?Math.max(0,1-lastResult.distance/12):0,frameDelta*3);
   const target=run.phase==='playing'?currentTarget():null;
   if(!input.interact){hold=0;holdId=null;latched=false;}
   else if(target&&!latched){if(holdId!==target.id){hold=0;holdId=target.id;}hold=Math.min(1,hold+frameDelta/target.duration);if(hold>=1){perform(target);latched=true;hold=0;}}
   else if(!target){hold=0;holdId=null;}
   if(performance.now()>noiseUntil)player.noise='Quiet';
   ui.update(run,player,target,hold);
   if(run.phase==='playing'&&run.exitOpen&&world.doorProgress>.8&&player.z<-33.6){run.phase='won';showScreen('won');}
  }else{camera.position.set(player.x,player.height+1.65,player.z);input.updateView();ui.update(run,player,null,0);}
  applyIdle(creature,idlePose(time));if(enemy.path.length)applyRunning(creature,time*(enemy.mode==='chase'?1.2:enemy.mode==='investigate'?.8:.65),enemy.mode==='chase'?1:.6);
  creature.root.position.y+=groundHeight(enemy.position);creature.root.position.x=enemy.position.x;creature.root.position.z=enemy.position.z;creature.root.rotation.y=enemy.yaw;
  const soundDistance=run.boardsOpen?Math.hypot(enemy.position.x-player.x,enemy.position.z-player.z,player.height-groundHeight(enemy.position)):Infinity;
  monsterAudio.update(soundDistance,!ui.overlay&&run.phase==='playing',frameDelta);
  const breathingFov=66+Math.sin(time*1.4)*threat*.45;
  if(Math.abs(camera.fov-breathingFov)>.01){camera.fov=breathingFov;camera.updateProjectionMatrix();}
  world.update(!ui.overlay&&run.phase==='playing'?frameDelta:0,time,player,threat,hold,{position:{...enemy.position,height:groundHeight(enemy.position)},hunting:enemy.mode==='chase',active:run.boardsOpen});
  torch.update({ceilingPower:world.lighting.visibility,time,moving:!run.hidden&&!ui.overlay&&(input.movement.forward!==0||input.movement.right!==0)});
  renderer.toneMappingExposure=torch.exposure;
  document.documentElement.style.setProperty('--power',String(world.lighting.visibility));
  document.documentElement.style.setProperty('--danger',String(threat*.38));
  if(jumpscare.active){renderer.toneMappingExposure=1;jumpscare.render(renderer);ui.el('jumpscare-border').style.opacity=String(jumpscare.borderOpacity);}
  else if(!ui.overlay||renderDirty||lastOverlay!==ui.overlay){renderer.render(world.scene,camera);torch.render(renderer);renderDirty=false;}
  lastOverlay=ui.overlay;
 });
 return {run,world,enemy:()=>enemy,get player(){return player;},camera,renderer,ui,input,monsterAudio,torch,jumpscare};
}

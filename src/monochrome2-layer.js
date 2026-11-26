import * as T from 'three';
import {createJumpscare,JUMPSCARE_MOUTH_URL,JUMPSCARE_DURATION} from './jumpscare.js';
import {holdSeconds,TEAM,TELEGRAPH} from './monochrome2-tuning.js';
import {standing} from './monochrome2-team.js';
import './monochrome2-game.css';

export const MONOCHROME2_COPY=Object.freeze({
 eyebrow:'FOUND FOOTAGE / 002',
 title:'Monochrome 2<span>LEVEL 0 — HUNTED</span>',
 intro:'The lights are still on. So is he.<br>Hear the servos before you see him. Crouch, stay quiet, break his line of sight.<br>Four ladder sections, the key, the beams, the exit. Every noise carries.',
 help:'WASD MOVE · SHIFT RUN · CTRL CROUCH (QUIET)<br>F INTERACT · Q / E BALANCE · LMB TORCH',
 caught:'He heard you. Crouch to stay quiet, keep walls between you, and keep off the beams when you can.',
 failed:'Everyone is down. Monochrome keeps the level.',
 won:'You made it through the vent. Monochrome did not follow.'
});
const TEAM_LABEL=(p,elapsedDown)=>p.lost?' · LOST':p.downed?' · DOWNED '+Math.max(0,Math.ceil(TEAM.bleedOutSeconds-elapsedDown))+'s':p.exitReady?' · AT EXIT':'';

/**
 * Monochrome 2's presentation layer over the Level 0 game: jumpscare, downed/spectate camera,
 * sound meter, danger vignette and team status. Gameplay rules live in the sim modules.
 */
export function createMonochrome2Layer({root,reduced=()=>false}){
 const hud=document.createElement('div');hud.className='m2-hud';
 hud.innerHTML='<div class="m2-sound" role="meter" aria-label="Noise you are making" aria-valuemin="0" aria-valuemax="4"><span>NOISE</span><i></i><b data-level>QUIET</b></div><div class="m2-downed" hidden><strong></strong><small></small></div><div class="m2-scare-border" hidden></div>';
 root.append(hud);
 const q=s=>hud.querySelector(s),meter=q('.m2-sound'),levelText=q('[data-level]'),downedBox=q('.m2-downed'),border=q('.m2-scare-border');
 let jumpscare=null,hurtLeft=0,wasDown=false,spectate=0,tab=false,disposed=false,mouth=null;
 function ensureScare(){
  if(jumpscare)return jumpscare;
  mouth=new T.TextureLoader().load(JUMPSCARE_MOUTH_URL,undefined,undefined,()=>{});
  jumpscare=createJumpscare({mouthTexture:mouth,metallic:true});return jumpscare;
 }
 const onKey=e=>{if(e.code==='Tab'&&!e.repeat&&!disposed){e.preventDefault();tab=true;}};
 document.addEventListener('keydown',onKey);
 function copy(){
  root.querySelector('.br-eyebrow').textContent=MONOCHROME2_COPY.eyebrow;
  root.querySelector('#br-title').innerHTML=MONOCHROME2_COPY.title;
  root.querySelector('.br-panel p').innerHTML=MONOCHROME2_COPY.intro;
  root.querySelector('.br-help').innerHTML=MONOCHROME2_COPY.help;
  root.querySelector('.br-rec').nextElementSibling.textContent='UNIDENTIFIED LOCATION / LEVEL 0 / HUNTED';
 }
 function noiseLevel(player,voice=0){
  if(player.downed)return 0;
  const base=player.crouch?(player.speed>.1?1:0):player.sprint?3:(player.speed>.1?2:0);
  return Math.max(base,voice>=3?4:voice>=1?Math.max(base,2):0);
 }
 return {
  hud,copy,
  holdSeconds:(target)=>holdSeconds(target.id,target.duration),
  get scareActive(){return !!jumpscare?.active;},
  get scareSeconds(){return JUMPSCARE_DURATION;},
  rosterLabel(p){return TEAM_LABEL(p,p.downedFor??0);},
  /** A Bacteria hit: a red flash, not Monochrome's metal jumpscare (the Bacteria's own is designed separately). */
  hurt(){hurtLeft=.8;border.hidden=false;document.exitPointerLock?.();},
  scare(){const j=ensureScare();if(j.active)return;j.resize(innerWidth/Math.max(1,innerHeight));j.start();border.hidden=false;document.body.classList.add('m2-scaring');document.exitPointerLock?.();},
  /** Call each frame. Returns true when the jumpscare owns the screen. */
  frame({dt,player,voice=0,distance=Infinity,mode='dormant',paused=false}){
   if(disposed)return false;
   // Edge-triggered: your own hit, wherever it was simulated, plays the scare once.
   if(player.downed&&!wasDown){if(player.downedBy==='Bacteria')this.hurt();else this.scare();}wasDown=!!player.downed;
   const level=noiseLevel(player,voice);meter.setAttribute('aria-valuenow',String(level));meter.dataset.level=String(level);levelText.textContent=['QUIET','SNEAKING','WALKING','RUNNING','LOUD'][level];
   const danger=paused||!Number.isFinite(distance)?0:Math.max(0,Math.min(1,(TELEGRAPH.range*.55-distance)/(TELEGRAPH.range*.55)))*(mode==='chase'||mode==='attack'?1:.55);
   root.style.setProperty('--m2-danger',danger.toFixed(3));
   if(jumpscare?.active){
    if(!paused)jumpscare.update(dt);
    border.style.opacity=String(jumpscare.borderOpacity);border.style.setProperty('--scare-impact',String(jumpscare.impactOpacity));
    if(!jumpscare.active){border.hidden=true;document.body.classList.remove('m2-scaring');}
   }
   if(!jumpscare?.active&&hurtLeft>0){hurtLeft=Math.max(0,hurtLeft-(paused?0:dt));border.style.opacity=String(Math.min(1,hurtLeft/.8)*.9);border.style.setProperty('--scare-impact','0');if(!hurtLeft)border.hidden=true;}
   return !!jumpscare?.active;
  },
  renderScare(renderer){jumpscare?.render(renderer);},
  /** Downed players lie on the floor; lost players watch a teammate. Returns true if it set the camera. */
  adjustCamera(camera,player,players=[]){
   const lost=!!player.lost;downedBox.hidden=!player.downed;
   if(!player.downed)return false;
   const mates=players.filter(p=>p.id!==player.id&&standing(p)&&!p.exitReady);
   if(lost&&mates.length){
    if(tab){spectate=(spectate+1)%mates.length;tab=false;}
    const t=mates[spectate%mates.length];
    camera.position.set(t.x,(t.y??0)+(t.crouch?1.05:1.68),t.z);camera.rotation.set(t.pitch??0,t.yaw??0,0);
    q('.m2-downed strong').textContent='LOST';q('.m2-downed small').textContent='Watching '+t.name+' · Tab for next teammate';
    return true;
   }
   tab=false;
   camera.position.set(player.x,(player.y??0)+.34,player.z);camera.rotation.z=reduced()?0:.9;
   q('.m2-downed strong').textContent=lost?'LOST':'DOWNED';
   q('.m2-downed small').textContent=lost?'Nobody can reach you now.':'Stay down. A teammate can revive you ('+Math.max(0,Math.ceil(TEAM.bleedOutSeconds-(player.downedFor??0)))+'s)';
   return false;
  },
  dispose(){disposed=true;document.removeEventListener('keydown',onKey);jumpscare?.dispose();mouth?.dispose();document.body.classList.remove('m2-scaring');hud.remove();}
 };
}

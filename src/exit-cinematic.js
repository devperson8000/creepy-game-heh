import * as T from 'three';
import {createOpeningHands} from './opening-hands.js';
import {buttonSequence,crawlSequence,BUTTON_SEQUENCE,CRAWL_SEQUENCE} from './monochrome2-exit-layout.js';
import {createNextLevelPeek,PEEK_SECONDS} from './next-level-peek.js';
import {throwPose,ROPE} from './monochrome2-rope.js';

const tmp=new T.Vector3();
/**
 * Put a hand group in camera space so its fingertips land on a world point. The hand model's fingers run
 * along local +y, so it is tipped forward by (elevation - 90 degrees), turned toward the target, and set back by
 * `reach` so the fingertip, not the palm, meets the point.
 */
export function placeHand(hand,camera,point,{reach=.16,roll=0}={}){
 camera.updateMatrixWorld?.(true);
 const local=camera.worldToLocal(tmp.set(point.x,point.y,point.z)),len=local.length()||1,dx=local.x/len,dy=local.y/len,dz=local.z/len;
 hand.rotation.order='YXZ';hand.rotation.set(Math.asin(Math.max(-1,Math.min(1,dy)))-Math.PI/2,Math.atan2(-dx,-dz),roll);
 hand.position.set(local.x-dx*reach,local.y-dy*reach,local.z-dz*reach);hand.visible=true;
}

/**
 * Runs the vent cutscenes: press the release button and push the grate (first person, left hand), crawl through
 * the vent and fade to black, then fade up on the next-level peek. It only produces a camera pose and flags; the game
 * loop applies them, so input stays locked and nothing here moves the player.
 */
export function createExitCinematic({camera,scene,root,hasTorch=()=>false}){
 let stage=null,t=0,from=null,hands=null,peek=null,peekT=0,fadeValue=0,released=false,throwT=null,climbHands=null,coil=null;
 const fade=document.createElement('div');fade.className='br-fade';fade.style.cssText='position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:7;';root.append(fade);
 const ensureHands=()=>{if(!hands){if(!camera.parent)scene.add(camera);hands=createOpeningHands(camera,{hazmat:true});hands.left.visible=false;hands.right.visible=false;}return hands;};
 const hideHands=()=>{if(hands){hands.left.visible=false;hands.right.visible=false;}if(coil)coil.visible=false;};
 // A coil of rope carried in the left hand for the lowering animation.
 const ensureCoil=()=>{if(!coil){coil=new T.Group();const g=new T.TorusGeometry(.075,.014,6,16),m=new T.MeshStandardMaterial({color:0xb5a27a,roughness:.95});for(let i=0;i<4;i++){const ring=new T.Mesh(g,m);ring.position.set(0,.02,i*.026-.04);coil.add(ring);}ensureHands().left.add(coil);coil.position.set(.02,.07,.04);}return coil;};
 const setFade=v=>{fadeValue=Math.max(0,Math.min(1,v));fade.style.opacity=String(fadeValue);};
 const api={
  get active(){return stage!==null;},get stage(){return stage;},
  get scene(){return stage==='peek'?peek?.scene??null:null;},
  /** Begin the button-and-grate cutscene from the player's pose ({x,z,yaw,pitch,crouch}). */
  startButton(pose){if(stage)return false;from={...pose};stage='button';t=0;ensureHands();return true;},
  /** Begin the crawl through the vent from the player's pose. */
  startCrawl(pose){if(stage)return false;from={...pose};stage='crawl';t=0;ensureHands();return true;},
  /**
   * Advance by dt seconds. Returns {camera, exit, event}: a camera pose to apply (or null), the vent state to
   * show ({flap,button}) while the button cutscene plays, and an event name when something finished.
   */
  update(dt){
   if(!stage){
    // Overlays that never lock the player: lowering a rope, or gripping one while being hauled up.
    let shown=false;
    if(throwT!==null){
     throwT+=Math.max(0,dt);const p=throwPose(throwT),h=ensureHands();
     if(p.visible){h.left.visible=true;h.right.visible=false;h.left.rotation.order='YXZ';h.left.rotation.set(-.95,0,0);h.left.position.set(p.pos.x,p.pos.y,p.pos.z);ensureCoil().visible=p.coil;shown=true;}
     else{throwT=null;}
    }else if(climbHands&&hands!==undefined){
     const h=ensureHands();placeHand(h.left,camera,climbHands.left,{reach:.1});placeHand(h.right,camera,climbHands.right,{reach:.1});shown=true;
    }
    if(!shown)hideHands();
    return {camera:null,exit:null,event:null};
   }
   t+=Math.max(0,dt);
   if(stage==='button'){
    const s=buttonSequence(Math.min(t,BUTTON_SEQUENCE.seconds),from),h=ensureHands();
    h.right.visible=false;
    if(s.hand.visible&&s.hand.target){placeHand(h.left,camera,s.hand.target,{reach:s.hand.press>0?.15-.02*s.hand.press:.17});}else h.left.visible=false;
    if(t>=BUTTON_SEQUENCE.seconds){stage=null;hideHands();return {camera:s.camera,exit:{flap:1,button:1},event:'button-done'};}
    return {camera:s.camera,exit:{flap:s.flap,button:s.button},event:null};
   }
   if(stage==='crawl'){
    const s=crawlSequence(Math.min(t,CRAWL_SEQUENCE.seconds),from),h=ensureHands();
    if(s.hands){placeHand(h.left,camera,s.hands.left,{reach:.12});if(hasTorch())placeHand(h.right,camera,s.hands.right,{reach:.12});else h.right.visible=false;}else hideHands();
    setFade(s.fade);
    if(t>=CRAWL_SEQUENCE.seconds){hideHands();stage='black';t=0;return {camera:s.camera,exit:{flap:1,button:1},event:null};}
    return {camera:s.camera,exit:{flap:1,button:1},event:null};
   }
   if(stage==='black'){setFade(1);if(t>=.6){peek??=createNextLevelPeek();peek.start();stage='peek';t=0;}return {camera:null,exit:null,event:null};}
   if(stage==='peek'){
    // Fade up from black, hold on the peek, then fade out and finish.
    const pose=peek.update(t);
    setFade(t<1.4?1-t/1.4:t>PEEK_SECONDS-1.1?(t-(PEEK_SECONDS-1.1))/1.1:0);
    if(t>=PEEK_SECONDS){stage='end';t=0;}
    return {camera:pose,exit:null,event:null};
   }
   if(stage==='end'){setFade(1);if(t>=.4){stage=null;released=true;return {camera:null,exit:null,event:'finished'};}}
   return {camera:null,exit:null,event:null};
  },
  /** Play the rescuer's rope-lowering hand animation (does not lock input). */
  playThrow(){if(throwT===null){throwT=0;ensureHands();}},
  /** Show both hands gripping world points (rope) while climbing; pass null to release. */
  holdHands(points){climbHands=points;},
  /** Fade level 0-1 for tests and the caller. */
  get fade(){return fadeValue;},
  reset(){stage=null;t=0;throwT=null;climbHands=null;setFade(0);hideHands();},
  dispose(){fade.remove();peek?.dispose?.();}
 };
 return api;
}

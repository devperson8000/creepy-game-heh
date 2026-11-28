import {PITFALLS} from './backrooms-pitfalls.js';

/**
 * The exit door, its white passage and the vent, as plain numbers. The view builds meshes from these
 * and the cutscene paths are checked against them, so what you see, what blocks you and what the
 * camera flies through are one geometry.
 */
const wall=.22,wallX=74;
export const EXIT=Object.freeze({
 wallX,wallFaceX:wallX-wall/2,
 /** The doorway through the pit room's east wall. */
 opening:Object.freeze({z0:-16.9,z1:-15.1,top:2.4}),
 /** Door slab: fills the opening with a 2 cm reveal all round, hinged on the south jamb, opening into the passage. */
 door:Object.freeze({hingeX:wallX,hingeZ:-16.88,width:1.76,height:2.36,thick:.07,sill:.02,offsetX:-.05,openAngle:Math.PI/2}),
 /** White passage: interior exactly as wide as the doorway. */
 passage:Object.freeze({x0:wallX+wall/2,x1:80,z0:-16.9,z1:-15.1,top:2.4,wall:.1}),
 /** The vent in the passage's end wall, and the shaft behind it. */
 vent:Object.freeze({wallX:80,wallThick:.2,z0:-16.65,z1:-15.35,y0:.5,y1:1.7,tunnelX1:84.6,flapLength:1.15,flapOpen:1.45}),
 button:Object.freeze({x:PITFALLS.ventButton.x,y:1.25,z:-16.9,plate:Object.freeze({w:.16,h:.22,d:.03}),capTravel:.018}),
 /** The door's glowing surround and the passage's light, fuller than a seam. */
 glow:Object.freeze({intensity:1.35})
});
export const EXIT_CAMERA_RADIUS=.2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export const lerp=(a,b,t)=>a+(b-a)*t;
const turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
const lerpAngle=(a,b,t)=>a+turn(b-a)*t;
/** Yaw that faces the point from `from` (camera looks along (-sin yaw, -cos yaw)). */
export const yawToward=(from,to)=>Math.atan2(-(to.x-from.x),-(to.z-from.z));
export const pitchToward=(from,to)=>Math.atan2(to.y-from.y,Math.hypot(to.x-from.x,to.z-from.z));
const mixPose=(a,b,t)=>({x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),z:lerp(a.z,b.z,t),yaw:lerpAngle(a.yaw,b.yaw,t),pitch:lerp(a.pitch,b.pitch,t),roll:lerp(a.roll??0,b.roll??0,t)});

/** World position of the vent flap's free (bottom) edge for an opening progress 0–1, where a hand pushes it. */
export function flapEdge(progress){
 const v=EXIT.vent,a=v.flapOpen*clamp(progress,0,1);
 return {x:v.wallX-v.wallThick/2+Math.sin(a)*v.flapLength,y:v.y1-Math.cos(a)*v.flapLength,z:(v.z0+v.z1)/2};
}
/** World position of the door slab's far edge at an opening progress (hinge rotation about y, local x offset included). */
export function doorFarEdge(progress){
 const d=EXIT.door,a=d.openAngle*clamp(progress,0,1);
 return {x:d.hingeX+d.offsetX*Math.cos(a)+d.width*Math.sin(a),z:d.hingeZ-d.offsetX*Math.sin(a)+d.width*Math.cos(a)};
}

/** ---- Step 1: press the release button, then push the grate open (3.6 s, input locked) ---- */
export const BUTTON_SEQUENCE=Object.freeze({seconds:4.5,pressAt:1.2});
/** Where the player ends up after the button cutscene: a step in front of the vent, centred on its opening. */
export const VENT_STAGE=Object.freeze({x:79.3,z:-16.05});
const KNEEL_EYE=1.1;
/**
 * Pose for the button-and-grate cutscene at time t, starting from the player's pose `from`
 * ({x,z,yaw,pitch,crouch}). The player does not move: the camera turns to the button, a hand reaches out
 * and presses it, the camera turns to the vent, and the same hand pushes the grate up. Returns the camera pose, the
 * world-space fingertip target of the left hand (or null when it is lowered), and the button/flap states.
 */
export function buttonSequence(t,from){
 const eye0={x:from.x,y:from.crouch?1.05:1.68,z:from.z},S=BUTTON_SEQUENCE,stageEye={x:VENT_STAGE.x,y:KNEEL_EYE,z:VENT_STAGE.z};
 // The player steps up to the vent and kneels to reach the grate's low edge, then stands back up to hand control back.
 const glide=smooth((t-1.7)/1.3),rise=smooth((t-3.9)/.6),kneelY=lerp(eye0.y,Math.min(eye0.y,KNEEL_EYE),glide);
 const eye={x:lerp(eye0.x,stageEye.x,glide),y:lerp(kneelY,eye0.y,rise),z:lerp(eye0.z,stageEye.z,glide)};
 const btn={x:EXIT.button.x,y:EXIT.button.y,z:EXIT.button.z+.05},edge=flapEdge(0);
 const lookButton={yaw:yawToward(eye0,btn),pitch:clamp(pitchToward(eye0,btn),-.7,.2)};
 const lookVent={yaw:-Math.PI/2,pitch:-.28};
 const base={yaw:from.yaw??0,pitch:from.pitch??0};
 let look;
 // A big turn takes longer, so the camera never whips round.
 const turnTime=.55+.25*Math.abs(turn(lookButton.yaw-base.yaw));
 if(t<turnTime)look={yaw:lerpAngle(base.yaw,lookButton.yaw,smooth(t/turnTime)),pitch:lerp(base.pitch,lookButton.pitch,smooth(t/turnTime))};
 else if(t<1.7)look=lookButton;
 else if(t<3.0){const k=smooth((t-1.7)/1.3);look={yaw:lerpAngle(lookButton.yaw,lookVent.yaw,k),pitch:lerp(lookButton.pitch,lookVent.pitch,k)};}
 else look=lookVent;
 // The left hand rises from low-left to the button, presses it, withdraws, then comes up to the grate's edge and pushes it open.
 const rest={x:eye0.x-.3,y:eye0.y-.75,z:eye0.z},hand={visible:false,target:null,press:0};
 let button=0,flap=0;
 const at=(a,b,k)=>({x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k),z:lerp(a.z,b.z,k)});
 if(t>=.3&&t<2.0){
  const arrive=smooth((t-.3)/.85),leave=smooth((t-1.55)/.45);
  const out=at(rest,btn,arrive),away={x:btn.x,y:btn.y-.1,z:btn.z+.45};
  hand.visible=true;hand.target=at(out,away,leave);
  hand.press=smooth((t-S.pressAt)/.12)*(1-smooth((t-S.pressAt-.22)/.2));
  button=smooth((t-S.pressAt)/.1);
 }
 if(t>=2.0)button=1;
 if(t>=2.5&&t<4.3){
  const k=smooth((t-2.9)/.85),edgeNow=flapEdge(Math.min(k,.4)),retreat=smooth((t-3.35)/.6);
  const reachFrom={x:stageEye.x-.15,y:stageEye.y-.5,z:stageEye.z-.4},grip={x:edgeNow.x-.04,y:edgeNow.y+.02,z:edgeNow.z-.12};
  const reached=at(reachFrom,grip,smooth((t-2.5)/.45));
  hand.visible=true;hand.press=0;hand.target=at(reached,reachFrom,retreat);flap=k;
 }
 if(t>=3.75)flap=1;
 return {camera:{...eye,yaw:look.yaw,pitch:look.pitch,roll:0},hand,button,flap,done:t>=S.seconds};
}

/** ---- Step 2: crawl through the vent and fade to black (4.4 s) ---- */
export const CRAWL_SEQUENCE=Object.freeze({seconds:4.4,fadeFrom:2.9,fadeTo:4.0,stageEnd:.95,enterEnd:2.6});
export const CRAWL_STAGE=Object.freeze({x:79.3,z:-16});
const EYE_CRAWL=1.1;
/**
 * Camera pose for the crawl. The camera blends from wherever the player stood in the passage to a staging
 * spot centred in front of the vent, then moves in a straight line along the shaft's centre line at a fixed
 * crawling eye height, so it can never meet a wall: the passage and the shaft are both wider than the camera.
 */
export function crawlSequence(t,from){
 const S=CRAWL_SEQUENCE,eye0={x:from.x,y:from.crouch?1.05:1.68,z:from.z,yaw:from.yaw??-Math.PI/2,pitch:from.pitch??0,roll:0};
 const stage={x:CRAWL_STAGE.x,y:EYE_CRAWL+.05,z:CRAWL_STAGE.z,yaw:-Math.PI/2,pitch:-.1,roll:0};
 const inside={x:EXIT.vent.wallX+1.4,y:EYE_CRAWL,z:CRAWL_STAGE.z,yaw:-Math.PI/2,pitch:0,roll:0};
 const far={x:EXIT.vent.tunnelX1-1.2,y:EYE_CRAWL,z:CRAWL_STAGE.z,yaw:-Math.PI/2,pitch:.02,roll:0};
 let p;
 if(t<S.stageEnd)p=mixPose(eye0,stage,smooth(t/S.stageEnd));
 else if(t<S.enterEnd)p=mixPose(stage,inside,smooth((t-S.stageEnd)/(S.enterEnd-S.stageEnd)));
 else p=mixPose(inside,far,smooth((t-S.enterEnd)/(S.seconds-S.enterEnd)));
 // Hand-over-hand sway while crawling: forward and side to side, never large enough to reach a wall.
 const crawling=clamp((t-S.stageEnd)/.4,0,1)*(1-clamp((t-S.enterEnd-1.2)/.6,0,1));
 const swing=Math.sin(t*5.2);
 p={...p,y:p.y+Math.abs(swing)*.012*crawling-.006*crawling,z:p.z+Math.sin(t*2.6)*.018*crawling,roll:Math.sin(t*2.6)*.012*crawling};
 const fade=clamp((t-S.fadeFrom)/(S.fadeTo-S.fadeFrom),0,1);
 // Both hands on the floor ahead while crawling, taking turns.
 const fwd={x:-Math.sin(p.yaw),z:-Math.cos(p.yaw)},side={x:Math.cos(p.yaw),z:-Math.sin(p.yaw)};
 const hand=(sign,lift)=>({x:p.x+fwd.x*.46+side.x*.17*sign,y:p.y-.58+lift*.08,z:p.z+fwd.z*.46+side.z*.17*sign});
 return {camera:p,fade,hands:crawling>0?{left:hand(-1,Math.max(0,swing)),right:hand(1,Math.max(0,-swing))}:null,done:t>=S.seconds};
}
/** Solid boxes the crawl camera must never enter, as [x0,x1,y0,y1,z0,z1]. */
export function exitSolids(){
 const v=EXIT.vent,pz0=EXIT.passage.z0,pz1=EXIT.passage.z1,w=EXIT.passage.wall;
 return [
  [EXIT.passage.x0,v.wallX+v.wallThick/2,-1,-.0,pz0,pz1],// passage floor
  [EXIT.passage.x0,v.wallX+v.wallThick/2,EXIT.passage.top,EXIT.passage.top+w,pz0,pz1],// passage ceiling
  [EXIT.passage.x0,v.wallX+v.wallThick/2,0,EXIT.passage.top,pz0-w,pz0],// south wall
  [EXIT.passage.x0,v.wallX+v.wallThick/2,0,EXIT.passage.top,pz1,pz1+w],// north wall
  [v.wallX-v.wallThick/2,v.wallX+v.wallThick/2,0,v.y0,pz0,pz1],// end wall below the opening
  [v.wallX-v.wallThick/2,v.wallX+v.wallThick/2,v.y1,EXIT.passage.top,pz0,pz1],// above
  [v.wallX-v.wallThick/2,v.wallX+v.wallThick/2,0,EXIT.passage.top,pz0,v.z0],// beside (south)
  [v.wallX-v.wallThick/2,v.wallX+v.wallThick/2,0,EXIT.passage.top,v.z1,pz1],// beside (north)
  [v.wallX+v.wallThick/2,v.tunnelX1,v.y0-.1,v.y0,v.z0,v.z1],// shaft floor
  [v.wallX+v.wallThick/2,v.tunnelX1,v.y1,v.y1+.1,v.z0,v.z1],// shaft ceiling
  [v.wallX+v.wallThick/2,v.tunnelX1,v.y0,v.y1,v.z0-.1,v.z0],[v.wallX+v.wallThick/2,v.tunnelX1,v.y0,v.y1,v.z1,v.z1+.1]// shaft walls
 ];
}
export const sphereHitsBox=(p,r,b)=>{const cx=clamp(p.x,b[0],b[1]),cy=clamp(p.y,b[2],b[3]),cz=clamp(p.z,b[4],b[5]);return Math.hypot(p.x-cx,p.y-cy,p.z-cz)<r;};

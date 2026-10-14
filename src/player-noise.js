export function footstepNoise(tracker,movedDistance,sprinting,position){
 if(!Number.isFinite(movedDistance)||movedDistance<=0)return null;
 tracker.distance+=movedDistance;
 const stride=sprinting?1.25:1.1;
 if(tracker.distance<stride)return null;
 tracker.distance%=stride;
 return {...position,radius:sprinting?17:7,type:sprinting?'sprint':'walk'};
}
export function interactionNoise(type,position,{takingKey=false}={}){
 const radii={boards:24,drawer:takingKey?3:12,closet:6,leave:6,clue:2,locks:10,keypad:7,elevator:18};
 const radius=radii[type];return radius?{...position,radius,type:takingKey?'key':type}:null;
}

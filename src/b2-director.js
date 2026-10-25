import {TEASER_START,TEASER_END,B2_CONVERSATION_DURATION} from './teaser-timeline.js';
import {b2DialogueLines} from './b2-dialogue.js';
const ease=(a,b,t)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};
function sample(keys,t,index){if(t<=keys[0][0])return [...keys[0][index]];if(t>=keys.at(-1)[0])return [...keys.at(-1)[index]];let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],p=ease(a[0],b[0],t);return a[index].map((v,j)=>v+(b[index][j]-v)*p);}
export function b2Frame(value,{entry={position:[0,1.65,2.4],look:[0,1.65,-1]},aspect=1,fov=66,viewportHeight=720}={}){
 const t=Math.max(0,Math.min(B2_CONVERSATION_DURATION,Number.isFinite(value)?value:0)),usableHeight=1-2*Math.min(52,viewportHeight*.14)/Math.max(1,viewportHeight),distance=Math.max(1.55/Math.max(.2,aspect),1.1/usableHeight)/(2*Math.tan(fov*Math.PI/360))*1.08,monitor=[-.65,1.6,-1.94+distance],screen=[-.65,1.6,-2];
 const keys=[[0,entry.position,entry.look],[1.8,[1.6,1.72,-.45],[.55,1.65,-3]],[5.5,[1.55,1.65,-.9],[.55,1.65,-3]],[9,[1.2,1.65,-1.15],[.2,1.4,-2.4]],[10.2,[1.1,1.4,-1.25],[.35,1.12,-2.13]],[11.2,[1.1,1.4,-1.25],[.35,1.12,-2.13]],[TEASER_START,monitor,screen],[TEASER_END+.3,monitor,screen],[TEASER_END+2.4,[1.45,1.7,-.3],[.55,1.65,-3]],[TEASER_END+6.8,[1.45,1.7,-.3],[.55,1.65,-3]],[B2_CONVERSATION_DURATION,entry.position,entry.look]];
 return {camera:sample(keys,t,1),look:sample(keys,t,2),watching:t>=TEASER_START&&t<TEASER_END,
  reach:ease(7.8,10.4,t)*(1-ease(11.2,12.4,t)),press:ease(10.4,10.65,t)*(1-ease(10.95,11.15,t)),monitorTurn:ease(7.5,9.5,t)*(1-ease(TEASER_END,TEASER_END+2.4,t)),
  strangerVisible:t<TEASER_END+7.6,fade:ease(TEASER_END+7.2,TEASER_END+7.55,t)*(1-ease(TEASER_END+8.3,TEASER_END+9.1,t)),subtitle:b2DialogueLines(TEASER_END).find(line=>t>=line.at&&t<line.end)?.subtitle??''};
}

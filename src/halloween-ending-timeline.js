export const HALLOWEEN_ENDING_DURATION=56;
const clamp=x=>Math.max(0,Math.min(1,x));
export const endingEase=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
const lerp=(a,b,p)=>a+(b-a)*p;
const runnerKeys=[[0,[0,-5.4,-46]],[2.4,[0,-5.4,-43]],[10.5,[0,0,-10.55]],[13,[0,0,-9.7]],[17.5,[0,0,-7.8]],[20,[0,0,-6.7]],[27,[0,0,-1.4]],[30,[0,-.2,-1.4]],[33,[0,-.2,-1.4]],[35,[0,0,-.8]],[39,[0,0,2.4]],[43,[0,0,5.5]],[56,[0,0,7.5]]];
const cameraKeys=[[0,[-.8,-3.75,-49],[0,-3.9,-43.5]],[2.4,[-.5,-3.75,-45.3],[0,-3.8,-41]],[10.5,[0,1.65,-10.9],[0,1.5,-8.9]],[13,[0,1.65,-9.75],[0,1.5,-8.9]],[17.5,[0,1.65,-7.8],[0,1.65,-2]],[20,[1.2,1.7,-6.9],[-3,1.25,-4.6]],[23,[1,1.7,-4.5],[0,1.4,-1]],[27,[1.4,1.6,-2],[0,.8,-1.4]],[30,[1.6,1.4,-3],[0,.85,-1.2]],[33,[1.3,1.5,-2.5],[0,.85,-1.2]],[34.5,[.3,1.5,-.5],[0,1.1,-1.4]],[35.5,[.3,1.65,.9],[0,1.2,-.5]],[39,[1,1.6,5],[0,.8,2.6]],[43,[2,1.75,9],[0,2.7,0]],[47,[1,2.8,10],[0,4.65,0]],[56,[1,2.8,10],[0,4.65,0]]];
function pose(keys,t,index=1){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1],p=endingEase(a[0],b[0],t);return a[index].map((v,j)=>lerp(v,b[index][j],p));}
const beats=[['service-door',0],['passage',2.4],['wall-touch',10.5],['wall-crossing',13],['house',17.5],['flight',20],['fall',27],['rescue',30],['escape',35],['lawn',39],['abandoned',43],['pumpkin',47],['title',50]];
export function halloweenEndingFrame(value,{count=1}={}){
 const t=Math.max(0,Math.min(HALLOWEEN_ENDING_DURATION,Number.isFinite(value)?value:0)),shot=beats.filter(([,at])=>t>=at).at(-1)[0];
 return {time:t,shot,runner:pose(runnerKeys,t),camera:pose(cameraKeys,t,1),look:pose(cameraKeys,t,2),
  reach:endingEase(10.7,12,t)*(1-endingEase(15.5,17,t)),door:endingEase(.7,2.4,t),rescue:count>1?'team':'self',rescueReach:endingEase(30,31.2,t)*(1-endingEase(33,34.8,t)),free:endingEase(33,35,t),
  floorBreak:endingEase(27,28.1,t),housePanic:endingEase(20,22,t),aged:endingEase(43,45,t),pumpkinLight:endingEase(47,49,t),
  fade:Math.max(1-endingEase(0,.75,t),endingEase(43.1,43.75,t)*(1-endingEase(44.15,44.8,t)),endingEase(50.3,51.4,t)),
  title:t>=51.4?'YOU ESCAPED THE HOUSE.':'',subtitle:t<2.4?'HOUSE SERVICE ACCESS':t>=10.5&&t<13?'The same wallpaper. The same wall.':'',complete:t>=HALLOWEEN_ENDING_DURATION};
}

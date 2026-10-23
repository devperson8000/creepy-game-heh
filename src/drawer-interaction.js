export function drawerTargetFromHit(targets,hit){
 if(!hit)return undefined;
 const data=hit.object.userData,direct=targets.get(data.interactId);
 if(direct)return direct;
 if(!Number.isInteger(data.cabinetIndex))return undefined;
 const row=Math.max(0,Math.min(2,Math.round((hit.point.y-(data.cabinetFloor??0)-.25)/.42)));
 return targets.get(`drawer-${data.cabinetIndex*3+row}`);
}
export function retainDrawerTarget(candidate,heldId,targets,holding){
 const held=holding&&targets.get(heldId);
 return held?.type==='drawer'&&candidate?.type==='drawer'&&Math.floor(held.drawerId/3)===Math.floor(candidate.drawerId/3)?held:candidate;
}
export function drawerOperation(code){return typeof code==='string'?/^drawer:(open|close|key):\d+$/.exec(code)?.[1]:undefined;}

// One ordered, acknowledged queue. A refused or lost send retries the same
// intent, so it cannot turn an open request into a close or duplicate a key.
export function createDrawerRequests({send}){
 const queue=[];let sequence=0;
 function preview(run){
  for(const request of queue){
   const drawer=run.drawers[request.drawerId];if(!drawer)continue;
   if(request.operation==='key')drawer.taken=true;
   else drawer.opened=request.operation==='open';
  }
 }
 return {
  request(run,drawerId){
   const drawer=run.drawers[drawerId];if(!drawer)return false;
   const operation=!drawer.opened?'open':drawer.key&&!drawer.taken?'key':'close';
   queue.push({drawerId,operation,targetId:`drawer-${drawerId}`,code:`drawer:${operation}:${++sequence}`,nextSend:-Infinity});
   preview(run);return true;
  },
  tick(now){
   const next=queue[0];if(!next||now<next.nextSend)return;
   next.nextSend=now+.35;
   send({targetId:next.targetId,code:next.code});
  },
  reconcile(run,acknowledged){
   const index=queue.findIndex(request=>request.code===acknowledged);
   if(index>=0)queue.splice(0,index+1);
   preview(run);
  },
  clear(){queue.length=0;},
  get pending(){return queue.length>0;}
 };
}

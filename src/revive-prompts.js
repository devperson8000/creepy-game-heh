import {Vector3} from 'three';
export function createRevivePrompts(container){
 const markers=new Map(),point=new Vector3();
 function markerFor(player){
  if(markers.has(player.id))return markers.get(player.id);
  const root=document.createElement('div');root.className='revive-marker';root.dataset.playerId=player.id;
  const label=document.createElement('strong'),detail=document.createElement('span'),bar=document.createElement('div'),fill=document.createElement('i');
  label.textContent='REVIVE';bar.className='revive-bar';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label',`Revive ${player.name}`);bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');bar.append(fill);root.append(label,detail,bar);container.append(root);
  const marker={root,detail,bar,fill};markers.set(player.id,marker);return marker;
 }
 function update({players,own,camera,elapsed,targetId,progress=0,active,canSee}){
  const downed=new Set();camera.updateMatrixWorld();
  for(const player of players){
   if(player.id===own?.id||player.status!=='downed')continue;downed.add(player.id);
   const distance=Math.hypot(player.x-own.x,player.z-own.z,player.height-own.height),marker=markerFor(player);
   let visible=active&&own.status==='alive'&&!own.hidden&&distance<6;
   if(visible){point.set(player.x,player.height+.95,player.z).project(camera);visible=point.z>-1&&point.z<1&&Math.abs(point.x)<.92&&Math.abs(point.y)<.88&&canSee(own,{id:`revive:${player.id}`,type:'revive',position:player});}
   marker.root.hidden=!visible;if(!visible)continue;
   marker.root.style.left=`${(point.x*.5+.5)*100}%`;marker.root.style.top=`${(-point.y*.5+.5)*100}%`;
   const selected=targetId===`revive:${player.id}`,value=selected?Math.max(0,Math.min(1,progress)):0;
   marker.detail.textContent=`${selected?'HOLD E':distance>=2?'MOVE CLOSER':'LOOK AT TEAMMATE'} · ${Math.max(0,Math.ceil(player.downedUntil-elapsed))}s`;
   marker.root.classList.toggle('revive-selected',selected);marker.bar.setAttribute('aria-valuenow',String(Math.round(value*100)));marker.fill.style.transform=`scaleX(${value})`;
  }
  for(const [id,marker] of markers)if(!downed.has(id)){marker.root.remove();markers.delete(id);}
 }
 function dispose(){for(const marker of markers.values())marker.root.remove();markers.clear();}
 return {update,dispose};
}

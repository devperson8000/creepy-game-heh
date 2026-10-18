import {createLayout,randomSource,shuffled} from './level.js';
export function createRun(seed,{playerCount=1}={}){
 const rng=randomSource(seed^0x72ab56),layout=createLayout(seed,{playerCount});
 const drawers=Array.from({length:layout.rooms.length*6},(_,id)=>({id,opened:false,key:false,taken:false}));
 for(const id of shuffled(drawers.map(d=>d.id),rng).slice(0,4))drawers[id].key=true;
 return {seed,layout,drawers,code:String(Math.floor(rng()*10000)).padStart(4,'0'),clueRoom:Math.floor(rng()*layout.rooms.length),clueRead:false,carried:new Set(),banked:new Set(),codeAccepted:false,boardsOpen:false,exitOpen:false,hidden:false,phase:'playing',elapsed:0,deaths:0};
}
export function searchDrawer(run,id){const d=run.drawers[id];if(!d||run.phase!=='playing')return false;d.opened=!d.opened;return true;}
export function takeKey(run,id){const d=run.drawers[id];if(!d?.key||!d.opened||d.taken||run.phase!=='playing')return false;d.taken=true;run.carried.add(id);return true;}
export function bankKeys(run){if(run.phase!=='playing')return 0;const count=run.carried.size;for(const id of run.carried)run.banked.add(id);run.carried.clear();return count;}
export function enterCode(run,value){if(run.phase!=='playing'||!/^\d{4}$/.test(value)||value!==run.code)return false;run.codeAccepted=true;return true;}
export function readClue(run){run.clueRead=true;}
export function openExit(run){if(run.phase!=='playing'||run.banked.size!==4||!run.codeAccepted)return false;run.exitOpen=true;return true;}
export function catchPlayer(run){if(run.phase!=='playing')return;run.phase='dead';run.hidden=false;run.deaths++;for(const id of run.carried)run.drawers[id].taken=false;run.carried.clear();}
export function retryRun(run){if(run.phase!=='dead')return;run.phase='playing';run.hidden=false;}

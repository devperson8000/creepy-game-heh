import {createCoopState,applyCoopSnapshot,removeCoopPlayer} from './coop-state.js';
export function acceptsAuthority(snapshot,session){const epoch=session.ownerEpoch??0;return snapshot?.authority?snapshot.authority.ownerId===session.ownerId&&snapshot.authority.epoch===epoch:epoch===0;}
/** Caller obtained this checkpoint through authenticated room RPCs, never peer claims. */
export function restoreCoopAuthority(state,checkpoint,{members,ownerId,epoch=0,now=Date.now()/1000,rebase=true}){
 if(checkpoint?.state)applyCoopSnapshot(state,checkpoint.state);
 const present=new Set(members.map(p=>p.id));for(const id of state.players.keys())if(!present.has(id))removeCoopPlayer(state,id);
 state.ownerId=ownerId;state.ownerEpoch=epoch;
 if(rebase){if(state.run.finale)state.run.finale.startedAt=now-(state.run.finale.elapsed??0);const visit=state.run.halloween?.visit;if(visit)visit.startedAt=now-(visit.elapsed??0);}
 return state;
}

/** Session/checkpoint came from the authenticated lobby service. Preserve legacy editions. */
export function createCoopRound(session,{localId}={}){
 const saved=session.checkpoint?.state?.run,seasonal=saved?!!saved.halloween:session.halloween===true;
 const maze=saved?saved.halloween?.maze===true:session.maze!==false,drawerRows=saved?(saved.halloween?.drawerRows===3?3:1):session.drawerRows??3;
 const state=createCoopState(session.seed,session.players,{halloween:seasonal,mapUpdate:saved?!!saved.mapUpdate:session.mapUpdate===true,maze,drawerRows,initialPlayerCount:saved?.initialPlayerCount??session.players.length});
 state.ownerId=session.ownerId;state.ownerEpoch=session.ownerEpoch??0;
 if(session.checkpoint){restoreCoopAuthority(state,session.checkpoint,{members:session.players,ownerId:session.ownerId,epoch:session.ownerEpoch??0,rebase:localId===session.ownerId});if(state.run.halloween)Object.assign(state.run.halloween,{maze,drawerRows});}
 return state;
}

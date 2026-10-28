import {HALLOWEEN_DEADLINE} from './halloween-release-time.js';

export function sampleCountdownPresentation(release={}){
 if(!release.confirmed||!Number.isFinite(release.serverNow))return {confirmed:false,remaining:null,phase:'idle',intensity:0};
 const seconds=release.released?0:Math.max(0,(HALLOWEEN_DEADLINE-release.serverNow)/1000);
 const phase=seconds===0?'complete':seconds<=30?'final':seconds<=60?'urgent':seconds<=300?'approaching':'idle';
 const intensity=phase==='idle'||phase==='complete'?0:phase==='approaching'?.2+.3*(300-seconds)/240:phase==='urgent'?.5+.25*(60-seconds)/30:.75+.25*(30-seconds)/30;
 return {confirmed:true,remaining:Math.ceil(seconds),phase,intensity};
}

export function countdownReadout(seconds){
 if(seconds===null||!Number.isFinite(seconds))return 'Syncing…';
 const total=Math.max(0,Math.ceil(seconds)),days=Math.floor(total/86400),hours=Math.floor(total/3600)%24,minutes=Math.floor(total/60)%60;
 const pad=value=>String(value).padStart(2,'0'),tail=`${pad(minutes)}:${pad(total%60)}`;
 return days?`${days}d ${pad(hours)}:${tail}`:total>=3600?`${pad(hours)}:${tail}`:tail;
}

// Dismissal survives component/menu recreation. Merely looking at a countdown
// days beforehand must not consume its once-only automatic focus at launch.
export function createCountdownFocus({seen=false,onSeen=()=>{}}={}){
 let open=false,source=null,last={phase:'idle',confirmed:false};
 function remember(){if(seen)return;seen=true;onSeen();}
 return {
  update(presentation){
   last=presentation;
   if(presentation.confirmed&&presentation.phase==='final'&&!seen){if(!open){open=true;source='auto';}remember();}
   if(presentation.confirmed&&presentation.phase==='complete')remember();
   if(!presentation.confirmed&&source==='auto'){open=false;source=null;}
   return {open,source};
  },
  open(){open=true;source='manual';},
  close(){open=false;source=null;if(last.confirmed&&last.phase!=='idle')remember();}
 };
}

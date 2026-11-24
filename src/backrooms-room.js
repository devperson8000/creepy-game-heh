export function encodeBackroomsRoom(name,{classic=true,friendsOnly=false,variant=null}={}){return (variant==='monochrome2'?'[M20':'[BR0')+(classic?'C':'A')+(friendsOnly?'F':'P')+'] '+(String(name).trim().slice(0,36)||'Lobby');}
export function parseBackroomsRoom(value){const m=/^\[(BR0|M20)([CA])([FP])\] (.*)$/.exec(value??'');return m?{name:m[4],classic:m[2]==='C',friendsOnly:m[3]==='F',...(m[1]==='M20'?{variant:'monochrome2'}:{})}:null;}
export function backroomsRoomCode(id){return String(id).replaceAll('-','').slice(0,8).toUpperCase();}

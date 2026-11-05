export function encodeBackroomsRoom(name,{classic=true,friendsOnly=false}={}){return '[BR0'+(classic?'C':'A')+(friendsOnly?'F':'P')+'] '+(String(name).trim().slice(0,36)||'Lobby');}
export function parseBackroomsRoom(value){const m=/^\[BR0([CA])([FP])\] (.*)$/.exec(value??'');return m?{name:m[3],classic:m[1]==='C',friendsOnly:m[2]==='F'}:null;}
export function backroomsRoomCode(id){return String(id).replaceAll('-','').slice(0,8).toUpperCase();}

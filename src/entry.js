import {isBackroomsPath} from './backrooms-route.js';
import {isSecretRoomPath} from './secretroom-route.js';
import {isSunnyChenPath} from './sunnychen-route.js';
const isMonochrome2Path=location.pathname==='/monochrome2'||location.pathname==='/monochrome2/';
if(isSunnyChenPath(location.pathname)){
 void import('./sunnychen.js').then(({startSunnyChen})=>{window.sunnyChen=startSunnyChen();}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.style.display='block';message.textContent='The Sunny Chen page could not load.';}});
}else if(isSecretRoomPath(location.pathname)){
 void import('./secretroom.js').then(({startSecretRoom})=>{const autoEnter=new URLSearchParams(location.search).get('entry')==='1';window.secretroom=startSecretRoom(document.querySelector('#scene'),{autostart:autoEnter});}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.style.display='block';message.textContent='The secret room could not start. Please enable WebGL and reload.';}});
}else if(isMonochrome2Path){
 void import('./monochrome2-intro.js').then(({startMonochrome2Intro})=>{window.monochrome2Intro=startMonochrome2Intro();}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.textContent='The MONOCHROME 2 intro could not start. Please enable WebGL and reload.';}});
}else if(!isBackroomsPath(location.pathname)){
 void import('./main.js');
}else{
 import('./backrooms.js').then(({startBackrooms})=>{window.backrooms=startBackrooms(document.querySelector('#scene'));}).catch(error=>{console.error(error);const message=document.querySelector('#error');message.style.display='block';message.hidden=false;message.textContent='Level 0 could not start. Please enable WebGL and reload.';});
}

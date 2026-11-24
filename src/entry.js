import {isBackroomsPath} from './backrooms-route.js';
import {isSecretRoomPath} from './secretroom-route.js';

if(isSecretRoomPath(location.pathname)){
 void import('./secretroom.js').then(({startSecretRoom})=>{const autoEnter=new URLSearchParams(location.search).get('entry')==='1';window.secretroom=startSecretRoom(document.querySelector('#scene'),{autostart:autoEnter});}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.style.display='block';message.textContent='The secret room could not start. Please enable WebGL and reload.';}});
}else if(!isBackroomsPath(location.pathname)){
 void import('./main.js');
}else{
 import('./backrooms.js').then(({startBackrooms})=>{window.backrooms=startBackrooms(document.querySelector('#scene'));}).catch(error=>{console.error(error);const message=document.querySelector('#error');message.style.display='block';message.hidden=false;message.textContent='Level 0 could not start. Please enable WebGL and reload.';});
}

import {isBackroomsPath} from './backrooms-route.js';
import {isSecretRoomPath} from './secretroom-route.js';
import {isMonochrome2PlayPath,isMonochrome2TestPath} from './monochrome2-route.js';

if(isSecretRoomPath(location.pathname)){
 void import('./secretroom.js').then(({startSecretRoom})=>{const autoEnter=new URLSearchParams(location.search).get('entry')==='1';window.secretroom=startSecretRoom(document.querySelector('#scene'),{autostart:autoEnter});}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.style.display='block';message.textContent='The secret room could not start. Please enable WebGL and reload.';}});
}else if(isMonochrome2TestPath(location.pathname)){
 void import('./monochrome2-play.js').then(({startMonochrome2Play})=>startMonochrome2Play({alreadyReleased:true,testMode:true})).then(game=>{window.monochrome2=game;}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.style.display='block';message.textContent='Monochrome 2 test build could not start. Please enable WebGL and reload.';}});
}else if(isMonochrome2PlayPath(location.pathname)){
 void import('./monochrome2-play.js').then(({startMonochrome2Play})=>startMonochrome2Play()).then(game=>{window.monochrome2=game;}).catch(error=>{console.error(error);const message=document.querySelector('#error');if(message){message.hidden=false;message.style.display='block';message.textContent='Monochrome 2 could not start. Please enable WebGL and reload.';}});
}else if(!isBackroomsPath(location.pathname)){
 void import('./main.js');
}else{
 import('./backrooms.js').then(({startBackrooms})=>{window.backrooms=startBackrooms(document.querySelector('#scene'));}).catch(error=>{console.error(error);const message=document.querySelector('#error');message.style.display='block';message.hidden=false;message.textContent='Level 0 could not start. Please enable WebGL and reload.';});
}

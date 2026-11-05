import {isBackroomsPath} from './backrooms-route.js';
if(!isBackroomsPath(location.pathname)){
 void import('./main.js');
}else{
 import('./backrooms.js').then(({startBackrooms})=>{window.backrooms=startBackrooms(document.querySelector('#scene'));}).catch(error=>{console.error(error);const message=document.querySelector('#error');message.style.display='block';message.hidden=false;message.textContent='Level 0 could not start. Please enable WebGL and reload.';});
}

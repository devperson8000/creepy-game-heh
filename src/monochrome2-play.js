import {monochrome2Release} from './monochrome2-release.js';
import {waitForMonochrome2Release} from './monochrome2-gate.js';
import './monochrome2-gate.css';

/** `/testmonochrome2` bypasses the public release lock for private gameplay testing only. */
export async function startMonochrome2Play({alreadyReleased=false,testMode=false}={}){
 if(!alreadyReleased)await waitForMonochrome2Release(monochrome2Release);
 const {startBackrooms}=await import('./backrooms.js');
 return startBackrooms(document.querySelector('#scene'),{variant:'monochrome2',testMode});
}

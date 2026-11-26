import {monochrome2Release} from './monochrome2-release.js';
import {waitForMonochrome2Release} from './monochrome2-gate.js';
import './monochrome2-gate.css';

/** `/monochrome2/play`: wait for the release timer, then run Level 0 with Monochrome hunting. */
export async function startMonochrome2Play({alreadyReleased=false}={}){
 if(!alreadyReleased)await waitForMonochrome2Release(monochrome2Release);
 const {startBackrooms}=await import('./backrooms.js');
 return startBackrooms(document.querySelector('#scene'),{variant:'monochrome2'});
}

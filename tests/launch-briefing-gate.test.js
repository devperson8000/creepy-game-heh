import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldStartBriefing} from '../src/halloween-countdown-state.js';
const watching={previousPhase:'final',phase:'complete',confirmed:true,open:true,visible:true,seen:false};
test('an open, visible countdown crosses zero into the briefing once',()=>{
 assert.equal(shouldStartBriefing(watching),true);
 for(const override of [{seen:true},{open:false},{visible:false},{confirmed:false},{previousPhase:'idle'},{phase:'final'},{releaseAge:11}])assert.equal(shouldStartBriefing({...watching,...override}),false);
});

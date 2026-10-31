import test from 'node:test';import assert from 'node:assert/strict';import {OPENING_LINES,openingLineAt} from '../src/opening-dialogue.js';
import {OPENING_TITLE_AT} from '../src/opening-sequence.js';
test('opening dialogue calls into the empty house and reacts to the wall and passage without talking over the fall/title',()=>{
 assert.match(OPENING_LINES[0].text,/Hello\??,? Is anyone here\?/i);assert.ok(OPENING_LINES[0].at>=12);
 assert.ok(OPENING_LINES.length>=3);for(let i=0;i<OPENING_LINES.length;i++){
  const line=OPENING_LINES[i];assert.ok(line.end>line.at);assert.ok(line.end<38);assert.ok(!i||line.at>=OPENING_LINES[i-1].end);
  assert.equal(openingLineAt(line.at+.1),line);assert.equal(openingLineAt(line.end),null);
 }
 assert.equal(openingLineAt(0),null);assert.equal(openingLineAt(OPENING_TITLE_AT),null);
});

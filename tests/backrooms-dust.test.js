import test from 'node:test';import assert from 'node:assert/strict';
import {createLevelZero,canWalkLevelZero} from '../src/backrooms-layout.js';
import {createDustField,sampleDustField} from '../src/backrooms-dust.js';
test('dust stays in traversable map space throughout its slow drift',()=>{
 const map=createLevelZero(),field=createDustField(map,800),output=new Float32Array(field.length);
 assert.equal(field.length,2400);assert.deepEqual(field,createDustField(map,800));
 for(const time of [0,12,90,300]){sampleDustField(field,time,output);for(let i=0;i<output.length;i+=3){assert.ok(canWalkLevelZero(map,output[i],output[i+2],.22));assert.ok(output[i+1]>.1&&output[i+1]<map.height-.1);assert.ok(Math.hypot(output[i]-field[i],output[i+2]-field[i+2])<.12);}}
});

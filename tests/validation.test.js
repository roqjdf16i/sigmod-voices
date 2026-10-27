import {test} from 'node:test';import assert from 'node:assert/strict';import {validate,REASONS} from '../src/validation.js';
test('all author metadata is optional',()=>assert.deepEqual(validate({kind:'experience',body:'A perspective',consent:true}),{kind:'experience',body:'A perspective',year:'',round:'',topic:'',reasons:[]}));
test('exactly seven policy categories plus Others',()=>assert.equal(REASONS.length,8));
test('comment discards author metadata',()=>assert.equal(validate({kind:'comment',body:'Text',year:'2027',consent:true}).year,''));
test('required body',()=>{for(const p of [{kind:'comment',body:' ',consent:true},{kind:'comment',body:'x'.repeat(5001),consent:true}])assert.throws(()=>validate(p));});
test('rejects malformed metadata',()=>{for(const extra of [{year:'abc'},{round:'5'},{topic:'x'.repeat(101)},{reasons:['unknown']},{reasons:'COI'}])assert.throws(()=>validate({kind:'experience',body:'text',consent:true,...extra}));});
test('deduplicates known categories',()=>assert.deepEqual(validate({kind:'experience',body:'text',consent:true,reasons:['COI','COI']}).reasons,['COI']));

test('no consent checkbox is required',()=>assert.equal(validate({kind:'comment',body:'Text'}).body,'Text'));

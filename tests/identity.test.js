import {test} from 'node:test';import assert from 'node:assert/strict';import {identity} from '../src/identity.js';
test('anonymous ownership key is stable and server derived',async()=>{const a=await identity('a'.repeat(64));assert.deepEqual(a,await identity('a'.repeat(64)));assert.notEqual(a.key,(await identity('b'.repeat(64))).key);assert.notEqual(a.key,'a'.repeat(64));});
test('invalid browser keys rejected',async()=>{for(const value of [null,'','my-name','a'.repeat(63)])await assert.rejects(()=>identity(value));});
import names from '../data/names.json' with {type:'json'};
test('exactly 1000 distinct one- or two-word noun names',()=>{assert.equal(names.length,1000);assert.equal(new Set(names.map(n=>n.toLowerCase())).size,1000);for(const name of names){assert.match(name,/^[A-Za-z]+(?:[- ][A-Za-z]+)?$/);assert.ok(name.split(' ').length<=2);}for(const name of ['Finch','Quiet Otter','Sunny Willow'])assert.ok(!names.includes(name));});
test('browser key does not automatically assign a name',async()=>assert.equal((await identity('c'.repeat(64))).nickname,undefined));

import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8787',key=readFileSync('.dev.vars','utf8').trim().split('=')[1];
async function get(path){const r=await fetch(base+path,{headers:{Authorization:`Bearer ${key}`}});assert.equal(r.status,200);return r.json();}
const pending=await get('/api/review');assert.ok(pending.results.every(p=>p.status==='pending'));
const published=await get('/api/review?status=published');assert.ok(published.results.length);assert.ok(published.results.every(p=>p.status==='published'));
const search=await get('/api/review?status=published&q=adaptive%20join');assert.ok(search.results.some(p=>p.body.includes('adaptive join')));assert.ok(search.results.every(p=>p.status==='published'));
const none=await get('/api/review?status=published&q=no-match-9a53d761');assert.equal(none.results.length,0);
const literal=await get('/api/review?status=published&q=%25');assert.ok(literal.results.every(p=>[p.body,p.nickname,p.topic,p.reasons,p.id].join(' ').includes('%')));
let all=[];for(let page=0;;page++){const d=await get('/api/posts?page='+page);all.push(...d.posts);if(!d.more)break;}
assert.equal(all.filter(p=>p.body.startsWith('[Illustrative demo')&&p.kind==='experience').length,8);assert.equal(all.filter(p=>p.body.startsWith('[Illustrative demo')&&p.kind==='comment').length,2);assert.ok(!all.some(p=>p.body.startsWith('Desk rejection should not turn')));assert.ok(pending.results.some(p=>p.body.startsWith('Desk rejection should not turn')));
console.log('PASS: pending-only default; published search including empty and literal queries; 8/2 demo split; new Safari comment remains private.');

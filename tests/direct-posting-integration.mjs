import assert from 'node:assert/strict';import {randomBytes,createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const base='http://127.0.0.1:8787',identityToken=randomBytes(32).toString('hex'),receipts=[];
const req=async(path,data)=>{const r=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json','X-Anonymous-Key':identityToken},...(data?{body:JSON.stringify(data)}:{})});const d=await r.json();if(!r.ok)throw Error(d.error);return d;};
try{
const names=await req('/api/nicknames');await req('/api/nickname',{identityToken,nickname:names.names.find(n=>!names.taken.includes(n))});const before=await req('/api/stats');
for(let i=0;i<2;i++){const p=await req('/api/posts',{identityToken,kind:'experience',round:'2',reasons:['Out of scope','Others'],body:'LOCAL DIRECT POSTING TEST '+i});receipts.push(p);assert.equal(p.status,'published');}
let feed=await req('/api/posts');assert.equal(feed.posts[0].id,receipts[1].id);assert.equal(feed.posts[1].id,receipts[0].id);
const reply=await req('/api/replies',{identityToken,postId:receipts[1].id,body:'LOCAL DIRECT REPLY TEST'});receipts.push(reply);assert.equal(reply.status,'published');assert.ok((await req('/api/replies?post='+receipts[1].id)).replies.some(r=>r.id===reply.id));
const after=await req('/api/stats');assert.equal(after.total,before.total+2);assert.equal(after.rounds.find(r=>r.label==='Round 2').count,(before.rounds.find(r=>r.label==='Round 2')?.count||0)+2);assert.equal(after.reasons.find(r=>r.label==='Out of scope').count,(before.reasons.find(r=>r.label==='Out of scope')?.count||0)+2);
const mine=await req('/api/mine');assert.ok(mine.results.some(p=>p.id===reply.id));assert.equal((await fetch(base+'/api/review')).status,410);
console.log('PASS: direct posting/replies, newest-first order, scoped multi-reason statistics, own list, disabled review.');
}finally{for(const receipt of receipts.reverse()){try{await req('/api/withdraw',receipt);}catch{}}const key=createHash('sha256').update('sigmod-voices:name:'+identityToken).digest('hex');execFileSync('npx',['wrangler','d1','execute','voices','--local','--command',`DELETE FROM identities WHERE author_key='${key}' AND NOT EXISTS(SELECT 1 FROM posts WHERE author_key='${key}') AND NOT EXISTS(SELECT 1 FROM replies WHERE author_key='${key}');`],{stdio:'ignore'});}

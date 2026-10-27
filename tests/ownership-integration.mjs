import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8787',admin=readFileSync('.dev.vars','utf8').trim().split('=')[1],key='e'.repeat(64),other='f'.repeat(64),receipts=[];
async function req(path,data,owner,auth=false){return fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(owner?{'X-Anonymous-Key':owner}:{}),...(auth?{Authorization:`Bearer ${admin}`}:{})},...(data?{body:JSON.stringify(data)}:{})});}
async function create(path,data){const r=await req(path,{identityToken:key,...data});assert.equal(r.status,201,await r.clone().text());const receipt=await r.json();receipts.push(receipt);return receipt;}
await req('/api/nickname',{identityToken:key,nickname:'Bridge'});
try{
 const root=await create('/api/posts',{kind:'comment',body:'LOCAL OWNERSHIP TEST — no checkbox'});
 const mine=await (await req('/api/mine',null,key)).json();assert.ok(mine.results.some(p=>p.id===root.id&&p.status==='pending'));assert.ok(!JSON.stringify(mine).includes('author_key'));
 assert.ok(!(await (await req('/api/mine',null,other)).json()).results.some(p=>p.id===root.id));
 assert.equal((await req('/api/remove',{id:root.id,type:'post',identityToken:other})).status,404);
 assert.equal((await req('/api/review',{id:root.id,action:'publish'},null,true)).status,200);
 const publicFeed=await (await req('/api/posts')).json();assert.equal(publicFeed.posts.find(p=>p.id===root.id).is_mine,0);
 const ownFeed=await (await req('/api/posts',null,key)).json();assert.equal(ownFeed.posts.find(p=>p.id===root.id).is_mine,1);
 const reply=await create('/api/replies',{postId:root.id,body:'LOCAL OWNERSHIP TEST reply'});
 assert.equal((await req('/api/remove',{id:reply.id,type:'reply',nickname:reply.nickname,identityToken:other})).status,404);
 assert.equal((await req('/api/remove',{id:reply.id,type:'reply',identityToken:key})).status,200);
 assert.equal((await req('/api/remove',{id:root.id,type:'post',identityToken:key})).status,200);
 console.log('PASS: no-checkbox posting, private pending list, ownership flags, spoofed-name rejection, own post and reply deletion.');
}finally{for(const r of receipts)await req('/api/withdraw',r);}

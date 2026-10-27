import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8787',key=randomBytes(32).toString('hex'),replyKey=randomBytes(32).toString('hex'),admin=readFileSync('.dev.vars','utf8').trim().split('=')[1],receipts=[];
async function req(path,data,auth=false){return fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${admin}`}:{})},...(data?{body:JSON.stringify(data)}:{})});}
try{
 const names=await (await req('/api/nicknames')).json();assert.equal(names.names.length,1000);
 const [first,second,third]=names.names.filter(n=>!names.taken.includes(n));
 let info=await (await req('/api/identity',{identityToken:key})).json();assert.equal(info.selected,false);assert.equal(info.nickname,null);
 assert.equal((await req('/api/posts',{identityToken:key,kind:'comment',body:'No name yet'})).status,400);
 assert.equal((await req('/api/nickname',{identityToken:key,nickname:'Made Up'})).status,400);
 assert.equal((await req('/api/nickname',{identityToken:key,nickname:first})).status,200);
 assert.equal((await req('/api/nickname',{identityToken:key,nickname:second})).status,200);
 assert.equal((await req('/api/nickname',{identityToken:replyKey,nickname:second})).status,409);
 assert.equal((await (await req('/api/identity',{identityToken:replyKey})).json()).selected,false);
 const contenders=[randomBytes(32).toString('hex'),randomBytes(32).toString('hex')];
 const raced=await Promise.all(contenders.map(identityToken=>req('/api/nickname',{identityToken,nickname:third})));
 assert.deepEqual(raced.map(r=>r.status).sort(),[200,409]);
 info=await (await req('/api/identity',{identityToken:key})).json();assert.equal(info.nickname,second);assert.equal(info.locked,false);
 let r=await req('/api/posts',{identityToken:key,kind:'comment',body:'LOCAL NICKNAME TEST'});assert.equal(r.status,201);const root=await r.json();receipts.push(root);assert.equal(root.nickname,second);
 assert.equal((await req('/api/nickname',{identityToken:key,nickname:first})).status,409);
 info=await (await req('/api/identity',{identityToken:key})).json();assert.equal(info.locked,true);
 await req('/api/review',{id:root.id,action:'publish'},true);
 assert.equal((await req('/api/replies',{identityToken:replyKey,postId:root.id,body:'Need a nickname'})).status,400);
 await req('/api/nickname',{identityToken:replyKey,nickname:first});
 r=await req('/api/replies',{identityToken:replyKey,postId:root.id,body:'LOCAL NICKNAME TEST reply'});assert.equal(r.status,201);receipts.push(await r.json());
 assert.equal((await req('/api/nickname',{identityToken:replyKey,nickname:third})).status,409);
 await req('/api/withdraw',root);
 assert.equal((await req('/api/nickname',{identityToken:key,nickname:first})).status,409);
 console.log('PASS: global unique names, simultaneous claim protection, 1000 browseable names, explicit choice required for posts/replies, pre-submission changes, post-submission lock and ownership preserved.');
}finally{for(const r of receipts)await req('/api/withdraw',r);}

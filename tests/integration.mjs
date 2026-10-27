import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8787';const admin=readFileSync('.dev.vars','utf8').trim().split('=')[1];
const request=async(path,data,token)=>fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify({...data,identityToken:'a'.repeat(64)})}:{})});
await request('/api/nickname',{nickname:'Apple'});
let receipt;
try{
 assert.equal((await request('/api/review')).status,401);
 assert.equal((await request('/api/posts',{kind:'experience',body:'',consent:true})).status,400);
 assert.equal((await fetch(base+'/api/posts',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:'{}'})).status,403);
 const r=await request('/api/posts',{kind:'experience',body:'LOCAL TEST — <script>alert(1)</script>',consent:true});assert.equal(r.status,201);receipt=await r.json();
 let feed=await (await request('/api/posts')).json();assert.ok(!feed.posts.some(p=>p.id===receipt.id));
 const queue=await (await request('/api/review',null,admin)).json();assert.ok(queue.results.some(p=>p.id===receipt.id));assert.ok(!JSON.stringify(queue).includes(receipt.token));
 assert.equal((await request('/api/review',{id:receipt.id,action:'publish'},admin)).status,200);
 feed=await (await request('/api/posts')).json();assert.ok(feed.posts.some(p=>p.id===receipt.id));assert.ok(!JSON.stringify(feed).includes('delete_hash'));
 assert.equal((await request('/api/withdraw',{id:receipt.id,token:'wrong'})).status,404);
 assert.equal((await request('/api/withdraw',receipt)).status,200);receipt=null;
 const comment=await request('/api/posts',{kind:'comment',body:'LOCAL TEST — community comment',consent:true});assert.equal(comment.status,201);receipt=await comment.json();assert.equal((await request('/api/withdraw',receipt)).status,200);receipt=null;
 console.log('PASS: author/comment submission, validation, origin checks, moderation auth, pending visibility, publishing, deletion key and withdrawal.');
} finally {if(receipt)await request('/api/withdraw',receipt);}

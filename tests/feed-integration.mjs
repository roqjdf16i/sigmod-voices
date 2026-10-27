import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='http://127.0.0.1:8787',admin=readFileSync('.dev.vars','utf8').trim().split('=')[1],receipts=[];
const req=(path,data,auth=false)=>fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${admin}`}:{})},...(data?{body:JSON.stringify(data)}:{})});
try{
 for(let i=0;i<8;i++){const r=await req('/api/posts',{identityToken:'a'.repeat(64),kind:i%2?'comment':'experience',body:'LOCAL PAGINATION TEST '+i+' '+('Preview text. '.repeat(40))});assert.equal(r.status,201);const receipt=await r.json();receipts.push(receipt);assert.equal((await req('/api/review',{id:receipt.id,action:'publish'},true)).status,200);}
 const first=await (await req('/api/posts?page=0')).json(),second=await (await req('/api/posts?page=1')).json();
 assert.equal(first.posts.length,6);assert.equal(first.more,true);assert.equal(second.posts.length,2);assert.equal(second.more,false);assert.equal(new Set([...first.posts,...second.posts].map(p=>p.id)).size,8);
 for(const kind of ['comment','experience']){const data=await (await req('/api/posts?kind='+kind)).json();assert.equal(data.posts.length,4);assert.ok(data.posts.every(p=>p.kind===kind));assert.equal(data.more,false);}
 console.log('PASS: six posts per page, no duplicates across pages, server-side category filtering.');
}finally{for(const receipt of receipts)await req('/api/withdraw',receipt);}

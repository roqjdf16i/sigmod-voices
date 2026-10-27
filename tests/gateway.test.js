import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gateway} from '../netlify/functions/api.mjs';
const origin='https://sigmod-voices.netlify.app';
const request=(path,method='GET',extra={})=>new Request(origin+path,{
 method,...(method!=='GET'?{body:'{}',headers:{Origin:origin,'Content-Type':'application/json'}}:{}),...extra
});
test('gateway forwards reads, query and browser key, but not cookies or IP headers',async()=>{
 const key='a'.repeat(64);
 const r=await gateway(request('/api/posts?page=2','GET',{headers:{'X-Anonymous-Key':key,Cookie:'secret','X-Forwarded-For':'192.0.2.1'}}),async(url,opt)=>{
  assert.equal(url,'https://www.sigmod-voices.workers.dev/api/posts?page=2');
  assert.equal(opt.headers.get('X-Anonymous-Key'),key);
  assert.equal(opt.headers.get('Cookie'),null);assert.equal(opt.headers.get('X-Forwarded-For'),null);
  return Response.json({posts:[]});
 });
 assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
});
test('gateway requires same-origin JSON and bounds the body',async()=>{
 const noFetch=()=>{throw Error('Must not reach upstream');};
 assert.equal((await gateway(request('/api/posts','POST',{headers:{Origin:'https://evil.example','Content-Type':'application/json'}}),noFetch)).status,403);
 assert.equal((await gateway(request('/api/posts','POST',{headers:{Origin:origin,'Content-Type':'text/plain'}}),noFetch)).status,415);
 assert.equal((await gateway(request('/api/posts','POST',{body:'x'.repeat(24001)}),noFetch)).status,413);
});
test('gateway preserves write body and status',async()=>{
 const r=await gateway(request('/api/posts','POST'),async(url,opt)=>{
  assert.equal(opt.headers.get('Origin'),'https://www.sigmod-voices.workers.dev');
  assert.equal(new TextDecoder().decode(opt.body),'{}');
  return Response.json({ok:true},{status:201});
 });
 assert.equal(r.status,201);
});
test('gateway rejects unknown routes, methods, invalid keys and non-JSON upstreams',async()=>{
 assert.equal((await gateway(request('/api/arbitrary'))).status,404);
 assert.equal((await gateway(request('/api/posts','DELETE'))).status,405);
 assert.equal((await gateway(request('/api/posts','GET',{headers:{'X-Anonymous-Key':'bad'}}))).status,400);
 assert.equal((await gateway(request('/api/posts'),async()=>new Response('login'))).status,502);
});

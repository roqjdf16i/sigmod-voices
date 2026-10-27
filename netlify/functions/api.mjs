// Fixed-destination gateway. Never forwards cookies, IP headers, or arbitrary URLs.
const upstream = 'https://www.sigmod-voices.workers.dev';
const routes = new Map([
 ['/api/posts', ['GET','POST']], ['/api/replies', ['GET','POST']],
 ['/api/nicknames', ['GET']], ['/api/nickname', ['POST']],
 ['/api/identity', ['POST']], ['/api/mine', ['GET']],
 ['/api/remove', ['POST']], ['/api/withdraw', ['POST']],
 ['/api/stats', ['GET']], ['/api/review', ['GET','POST']]
]);
const responseHeaders = {
 'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store',
 'X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer'
};
const json=(data,status)=>new Response(JSON.stringify(data),{status,headers:responseHeaders});
export const config = {path:'/api/*'};
export async function gateway(req, fetchUpstream=fetch) {
 const url=new URL(req.url);
 const methods=routes.get(url.pathname);
 if(!methods)return json({error:'Not found.'},404);
 if(!methods.includes(req.method))return json({error:'Method not allowed.'},405);
 if(req.method!=='GET' && req.headers.get('Origin')!==url.origin)
  return json({error:'Same-origin requests only.'},403);
 if(req.method!=='GET' && !req.headers.get('Content-Type')?.startsWith('application/json'))
  return json({error:'JSON required.'},415);
 const headers=new Headers({Accept:'application/json'});
 const key=req.headers.get('X-Anonymous-Key');
 if(key) {
  if(!/^[a-f0-9]{64}$/.test(key))return json({error:'Invalid browser key.'},400);
  headers.set('X-Anonymous-Key',key);
 }
 let bytes;
 if(req.method!=='GET') {
  const reader=req.body?.getReader();
  if(!reader)return json({error:'Missing request body.'},400);
  const chunks=[];let size=0;
  while(true) {
   const {done,value}=await reader.read();if(done)break;
   size+=value.length;
   if(size>24000){await reader.cancel();return json({error:'Message too large.'},413);}
   chunks.push(value);
  }
  bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  // Browser origin was validated above. The fixed upstream validates this hop.
  headers.set('Origin',upstream);headers.set('Content-Type','application/json');
 }
 try {
  const res=await fetchUpstream(upstream+url.pathname+url.search,{
   method:req.method,headers,body:bytes,redirect:'error',signal:AbortSignal.timeout(15000)
  });
  if(!res.headers.get('Content-Type')?.includes('application/json'))
   return json({error:'Service temporarily unavailable. Please retry later.'},502);
  return new Response(res.body,{status:res.status,headers:responseHeaders});
 }catch{
  return json({error:'Connection interrupted. Check My contributions before posting again.'},502);
 }
}
export default function handler(req) { return gateway(req); }

import {validate} from './validation.js';
import {hash,identity,chosenIdentity,names} from './identity.js';
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
async function body(req) {
 const reader=req.body?.getReader(); if(!reader) throw Error('Missing request body.');
 const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>24000){await reader.cancel();throw Error('Message too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('Invalid message format.');}
}
export default {async fetch(req,env) {
 const url=new URL(req.url),path=url.pathname;
 if(!path.startsWith('/api/')) return env.ASSETS.fetch(req);
 try {
  if(req.method!=='GET' && req.headers.get('Origin')!==url.origin) return json({error:'Same-origin requests only.'},403);
  if(req.method!=='GET' && !req.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'JSON required.'},415);
  const keyHeader=req.headers.get('X-Anonymous-Key');
  const viewer=keyHeader?(await identity(keyHeader)).key:'';
  if(path==='/api/review')return json({error:'Review is currently disabled.'},410);
  if(path==='/api/mine' && req.method==='GET'){
   if(!viewer)return json({results:[]});
   const page=Math.max(0,parseInt(url.searchParams.get('page')||'0',10)||0);
   const {results}=await env.DB.prepare("SELECT id,kind,body,day,status,nickname,NULL AS post_id,created_at,rowid AS sequence FROM posts WHERE author_key=? UNION ALL SELECT id,'reply',body,day,status,nickname,post_id,created_at,rowid AS sequence FROM replies WHERE author_key=? ORDER BY created_at DESC,sequence DESC LIMIT 51 OFFSET ?").bind(viewer,viewer,page*50).all();
   return json({results:results.slice(0,50),more:results.length>50});
  }
  if(path==='/api/remove' && req.method==='POST'){
   const p=await body(req),owner=await identity(p.identityToken);
   if(typeof p.id!=='string'||!['post','reply'].includes(p.type))return json({error:'Invalid contribution.'},400);
   const table=p.type==='reply'?'replies':'posts';
   const result=await env.DB.prepare(`DELETE FROM ${table} WHERE id=? AND author_key=?`).bind(p.id,owner.key).run();
   return result.meta.changes?json({ok:true}):json({error:'Contribution not found or not owned by this browser.'},404);
  }
  if(path==='/api/nicknames' && req.method==='GET'){const {results}=await env.DB.prepare('SELECT nickname FROM identities WHERE author_key!=?').bind(viewer).all();return json({names,taken:results.map(r=>r.nickname)});}
  if(path==='/api/nickname' && req.method==='POST'){
   const input=await body(req),author=await identity(input.identityToken);
   if(!names.includes(input.nickname))return json({error:'Choose a nickname from the list.'},400);
   let res;
   try{res=await env.DB.prepare('INSERT INTO identities(author_key,nickname) VALUES (?,?) ON CONFLICT(author_key) DO UPDATE SET nickname=excluded.nickname WHERE identities.locked=0').bind(author.key,input.nickname).run();}catch(e){if(/UNIQUE constraint failed: identities.nickname/i.test(e.message))return json({error:'This nickname is already chosen. Please select another.'},409);throw e;}
   if(!res.meta.changes)return json({error:'Your nickname is fixed after your first contribution.'},409);
   return json({nickname:input.nickname,selected:true,locked:false});
  }
  if(path==='/api/identity' && req.method==='POST'){const input=await body(req);const author=await chosenIdentity(env.DB,input.identityToken);return json({nickname:author.nickname,selected:author.selected,locked:author.locked});}
  if(path==='/api/stats' && req.method==='GET'){
   const results=await env.DB.batch([
    env.DB.prepare("SELECT COUNT(*) AS total FROM posts WHERE kind='experience' AND status='published'"),
    env.DB.prepare("SELECT CASE WHEN round='' THEN 'Not specified' ELSE 'Round '||round END AS label,COUNT(*) AS count FROM posts WHERE kind='experience' AND status='published' GROUP BY round ORDER BY round"),
    env.DB.prepare("SELECT j.value AS label,COUNT(*) AS count FROM posts p,json_each(p.reasons) j WHERE p.kind='experience' AND p.status='published' GROUP BY j.value ORDER BY count DESC,j.value"),
    env.DB.prepare("SELECT COUNT(*) AS count FROM posts WHERE kind='experience' AND status='published' AND json_array_length(reasons)=0")
   ]);
   return json({total:results[0].results[0].total,rounds:results[1].results,reasons:results[2].results,unspecifiedReasons:results[3].results[0].count});
  }
  if(path==='/api/posts' && req.method==='GET'){
   const page=Math.max(0,Math.min(100000,parseInt(url.searchParams.get('page')||'0',10)||0));
   const kind=['experience','comment'].includes(url.searchParams.get('kind'))?url.searchParams.get('kind'):'all';
   const {results}=await env.DB.prepare("SELECT id,kind,year,round,topic,reasons,body,day,nickname,(author_key=? AND author_key!='') AS is_mine,(SELECT COUNT(*) FROM replies r WHERE r.post_id=posts.id AND r.status='published') AS reply_count FROM posts WHERE status='published' AND (?='all' OR kind=?) ORDER BY created_at DESC,rowid DESC LIMIT 7 OFFSET ?").bind(viewer,kind,kind,page*6).all();
   return json({posts:results.slice(0,6),more:results.length>6});
  }
  if(path==='/api/posts' && req.method==='POST'){
   const input=await body(req),p=validate({...input,year:''}),author=await chosenIdentity(env.DB,input.identityToken,true);
   const id=crypto.randomUUID(), token=crypto.randomUUID()+crypto.randomUUID(), digest=await hash(token);
   const res=await env.DB.prepare("INSERT INTO posts (id,kind,year,round,topic,reasons,body,day,delete_hash,nickname,author_key,status,created_at) SELECT ?,?,?,?,?,?,?,?,?,(SELECT nickname FROM identities WHERE author_key=?),?,'published',?").bind(id,p.kind,p.year,p.round,p.topic,JSON.stringify(p.reasons),p.body,new Date().toISOString().slice(0,10),digest,author.key,author.key,new Date().toISOString()).run();
   const stored=await env.DB.prepare('SELECT nickname FROM posts WHERE id=?').bind(id).first();
   return json({id,token,status:'published',nickname:stored.nickname},201);
  }
  if(path==='/api/replies' && req.method==='GET'){
   const postId=url.searchParams.get('post');
   const root=await env.DB.prepare("SELECT id FROM posts WHERE id=? AND status='published'").bind(postId||'').first();
   if(!root)return json({error:'This post is no longer available.'},404);
   const page=Math.max(0,Math.min(100000,parseInt(url.searchParams.get('page')||'0',10)||0));
   const {results}=await env.DB.prepare("SELECT r.id,r.post_id,r.reply_to,r.reply_to_name,r.nickname,r.body,r.day,(r.author_key=? AND r.author_key!='') AS is_mine,CASE WHEN r.author_key=p.author_key AND r.author_key!='' THEN 1 ELSE 0 END AS is_op FROM replies r JOIN posts p ON p.id=r.post_id WHERE r.post_id=? AND r.status='published' ORDER BY r.rowid ASC LIMIT 31 OFFSET ?").bind(viewer,postId,page*30).all();
   return json({replies:results.slice(0,30),more:results.length>30});
  }
  if(path==='/api/replies' && req.method==='POST'){
   const input=await body(req);
   const p=validate({kind:'comment',body:input.body,consent:input.consent});
   const author=await chosenIdentity(env.DB,input.identityToken,true);
   if(typeof input.postId!=='string'||(input.replyTo!=null&&typeof input.replyTo!=='string'))return json({error:'Choose a post or reply.'},400);
   const target=input.replyTo||null;
   const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),digest=await hash(token);
   const res=await env.DB.prepare("INSERT INTO replies (id,post_id,reply_to,reply_to_name,nickname,author_key,body,day,delete_hash,status,created_at) SELECT ?,?,?,COALESCE((SELECT nickname FROM replies WHERE id=?),''),(SELECT nickname FROM identities WHERE author_key=?),?,?,?,?,'published',? WHERE EXISTS(SELECT 1 FROM posts WHERE id=? AND status='published') AND (? IS NULL OR EXISTS(SELECT 1 FROM replies WHERE id=? AND post_id=? AND status='published'))").bind(id,input.postId,target,target,author.key,author.key,p.body,new Date().toISOString().slice(0,10),digest,new Date().toISOString(),input.postId,target,target,input.postId).run();
   if(!res.meta.changes)return json({error:'This conversation is unavailable. Refresh and try again.'},409);
   const stored=await env.DB.prepare('SELECT nickname FROM replies WHERE id=?').bind(id).first();
   return json({id,token,status:'published',nickname:stored.nickname},201);
  }
  if(path==='/api/withdraw' && req.method==='POST'){
   const p=await body(req); if(typeof p.id!=='string'||typeof p.token!=='string')return json({error:'Enter the receipt ID and deletion key.'},400);
   const digest=await hash(p.token);
   const results=await env.DB.batch(['posts','replies'].map(table=>env.DB.prepare(`DELETE FROM ${table} WHERE id=? AND delete_hash=?`).bind(p.id,digest)));
   return results.some(r=>r.meta.changes)?json({ok:true}):json({error:'Receipt not found or key incorrect.'},404);
  }
  return json({error:'Not found.'},404);
 }catch(e){
  if(e instanceof Error && !/D1|SQLITE|database/i.test(e.message) && !e.message.includes('binding')) {
   const allowed=['Choose','Write','Please','Enter','Keep','Message','Missing','Invalid'];
   if(allowed.some(s=>e.message.startsWith(s)))return json({error:e.message},400);
  }
  return json({error:'Service temporarily unavailable. Please retry later; keep a copy of your text.'},503);
 }
}};

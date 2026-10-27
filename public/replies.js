import {getIdentity,requireNickname,refreshIdentity,identityNotice,downloadReceipt,ownershipHeaders,addDeleteButton} from './identity.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
async function api(url,options={}){const r=await fetch(url,{credentials:'omit',...options,headers:{...ownershipHeaders(),...options.headers}});let data;try{data=await r.json();}catch{throw Error('Replies are temporarily unavailable. Please try again.');}if(!r.ok)throw Error(data.error||'Unable to load replies.');return data;}
export function addReplies(article,post){
 article.id=`post-${post.id}`;
 const toggle=el('button',`${post.reply_count||0} replies · Join the conversation`,'text-button reply-toggle');toggle.type='button';toggle.setAttribute('aria-expanded','false');
 const area=el('section',null,'reply-area');area.hidden=true;area.id=`replies-${post.id}`;area.setAttribute('aria-label','Replies');toggle.setAttribute('aria-controls',area.id);
 article.append(toggle,area);
 let initialized=false;
 toggle.onclick=()=>{area.hidden=!area.hidden;toggle.setAttribute('aria-expanded',String(!area.hidden));if(!initialized){initialized=true;build();}};
 function build(){
  let page=-1,target=null;
  const top=el('div',null,'reply-toolbar'),heading=el('h3','Replies'),refresh=el('button','Refresh replies ↻','text-button');refresh.type='button';top.append(heading,refresh);
  const list=el('div',null,'reply-list'),loadStatus=el('p',null,'reply-status');loadStatus.setAttribute('role','status');
  const more=el('button','Load more replies ↓','text-button');more.type='button';more.hidden=true;
  const form=el('form',null,'reply-form');const identity=el('div');identityNotice(identity);
  const targetBar=el('div',null,'reply-target'),targetText=el('span','Replying to the post'),cancel=el('button','Cancel','text-button');cancel.type='button';cancel.hidden=true;targetBar.append(targetText,cancel);
  const label=el('label','Your reply'),text=el('textarea');text.required=true;text.maxLength=5000;text.rows=3;text.placeholder='Add a text reply to this conversation.';label.append(text);
  const submit=el('button','Post reply','button');submit.type='submit';
  const status=el('p',null,'reply-status');status.setAttribute('role','status');
  const receiptBox=el('section',null,'reply-receipt');receiptBox.hidden=true;receiptBox.tabIndex=-1;
  form.append(identity,targetBar,label,submit,status);area.append(top,list,loadStatus,more,form,receiptBox);
  function choose(reply){target=reply;targetText.textContent=reply?`Replying to ${reply.nickname}`:'Replying to the post';cancel.hidden=!reply;text.focus();}
  cancel.onclick=()=>choose(null);
  function draw(reply){
   const item=el('article',null,'reply-item');item.id=`reply-${reply.id}`;
   const meta=el('div',null,'post-meta');meta.append(el('strong',reply.nickname));if(reply.is_op)meta.append(el('span','Original poster','op-badge'));meta.append(el('span',reply.day));
   if(reply.reply_to_name){const mention=el('span',reply.reply_to?`↳ replying to ${reply.reply_to_name}`:'↳ replying to a removed reply','reply-mention');meta.append(mention);}
   const body=el('p',reply.body),button=el('button','Reply','text-button');button.type='button';button.setAttribute('aria-label',`Reply to ${reply.nickname}`);button.onclick=()=>choose(reply);
   item.append(meta,body,button);addDeleteButton(item,reply,'reply',async()=>{if(target?.id===reply.id)choose(null);await load(true);});list.append(item);
  }
  async function load(reset=false){
   more.disabled=true;refresh.disabled=true;loadStatus.textContent='Loading replies…';
   try{const next=reset?0:page+1,data=await api(`/api/replies?post=${encodeURIComponent(post.id)}&page=${next}`);if(reset)list.replaceChildren();page=next;data.replies.forEach(draw);more.hidden=!data.more;loadStatus.textContent=list.children.length?'':'No published replies yet. Start the conversation.';}
   catch(e){loadStatus.textContent=e.message;}finally{more.disabled=false;refresh.disabled=false;}
  }
  refresh.onclick=()=>load(true);more.onclick=()=>load();
  form.onsubmit=async e=>{e.preventDefault();submit.disabled=true;status.textContent='Sending…';try{
   const author=await requireNickname();const receipt=await api('/api/replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId:post.id,replyTo:target?.id||null,body:text.value,identityToken:author.token})});
   refreshIdentity();await load(true);form.hidden=true;receiptBox.replaceChildren(el('h3','Your reply is now live.'),el('p','Save this receipt to withdraw your reply later.'));
   for(const [title,value] of [['Receipt ID',receipt.id],['Deletion key',receipt.token]]){const label=el('label',title),input=el('input');input.readOnly=true;input.value=value;label.append(input);receiptBox.append(label);}
   const download=el('button','Download receipt','button');download.type='button';download.onclick=()=>downloadReceipt(receipt);
   const another=el('button','Write another reply','text-button');another.type='button';another.onclick=()=>{receiptBox.replaceChildren();receiptBox.hidden=true;form.reset();form.hidden=false;status.textContent='';choose(null);};receiptBox.append(download,another);receiptBox.hidden=false;receiptBox.focus();
  }catch(e){status.textContent=e.message;}finally{submit.disabled=false;}};
  load(true);
 }
}

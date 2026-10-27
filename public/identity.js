const STORAGE_KEY='sigmod-voices:anonymous-key:v1';
let sessionToken,identityPromise;
function getToken(){
 if(sessionToken)return {token:sessionToken,persistent:false};
 try{
  let token=localStorage.getItem(STORAGE_KEY);
  if(!/^[a-f0-9]{64}$/.test(token||'')){token=makeToken();localStorage.setItem(STORAGE_KEY,token);}
  return {token,persistent:true};
 }catch{sessionToken=makeToken();return {token:sessionToken,persistent:false};}
}
function makeToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function getIdentity(refresh=false){
 if(refresh)identityPromise=null;
 if(!identityPromise)identityPromise=(async()=>{const {token,persistent}=getToken();const res=await fetch('/api/identity',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityToken:token})});if(!res.ok)throw Error('Your anonymous name could not be loaded. Please try again.');const data=await res.json();return {token,persistent,...data};})().catch(e=>{identityPromise=null;throw e;});
 return identityPromise;
}
const notices=new Set();
function el(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
export async function requireNickname(){const author=await getIdentity(true);if(!author.selected)throw Error('Choose and save a nickname above before posting.');return author;}
export function refreshIdentity(){identityPromise=null;for(const refresh of notices)refresh();}
export function identityNotice(container){
 container.className='identity-notice';
 const name=el('strong','Loading your nickname…'),note=el('span','Choose a unique name before your first post or reply. It becomes fixed when you send your first post or reply.'),edit=el('button','Choose nickname','text-button');edit.type='button';edit.hidden=true;
 const picker=el('div',null,'nickname-picker');picker.hidden=true;
 const label=el('label','Search nicknames'),search=el('input');search.type='search';search.placeholder='Try Apple, Piano, or Ice Cream';search.autocomplete='off';label.append(search);
 const grid=el('div',null,'nickname-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Nickname choices');
 const pages=el('div',null,'nickname-pages'),prev=el('button','← Previous','text-button'),next=el('button','Next →','text-button'),count=el('span');prev.type=next.type='button';pages.append(prev,count,next);
 const save=el('button','Use this nickname','button');save.type='button';save.disabled=true;
 const availability=el('p',null,'nickname-availability');availability.setAttribute('role','status');
 const status=el('p',null,'nickname-status');status.setAttribute('role','status');picker.append(availability,label,grid,pages,save,status);container.append(name,note,edit,picker);
 let names=[],taken=new Set(),page=0,choice=null,locked=false;
 function draw(){
  const query=search.value.trim().toLowerCase();const matching=names.filter(n=>n.toLowerCase().includes(query));const total=Math.max(1,Math.ceil(matching.length/24));page=Math.min(page,total-1);grid.replaceChildren();
  for(const n of matching.slice(page*24,(page+1)*24)){const button=el('button',n,'nickname-option');button.type='button';button.setAttribute('aria-pressed',String(choice===n));button.disabled=taken.has(n);if(button.disabled){button.title='Already chosen';button.setAttribute('aria-label',`${n}, already chosen`);}button.onclick=()=>{choice=choice===n?null:n;save.disabled=!choice;save.textContent=choice?`Use ${choice}`:'Use this nickname';status.textContent='';draw();};grid.append(button);}
  count.textContent=matching.length?`${matching.length} ${matching.length===1?'name':'names'} · ${page+1} / ${total}`:'No names found. Try another word.';prev.disabled=page===0;next.disabled=page>=total-1;
 }
 async function open(){picker.hidden=false;status.textContent='Loading names…';try{const author=await getIdentity();const r=await fetch('/api/nicknames',{headers:{'X-Anonymous-Key':author.token}});if(!r.ok)throw Error('Could not load nicknames. Try again.');const data=await r.json();names=[...data.names].sort((a,b)=>a.localeCompare(b));taken=new Set(data.taken);availability.textContent=`${names.length-taken.size} of ${names.length} nicknames available`;if(taken.has(choice))choice=null;save.disabled=!choice;save.textContent=choice?`Use ${choice}`:'Use this nickname';draw();status.textContent=taken.size===names.length?'All nicknames are currently taken. Please try again later.':'';}catch(e){status.textContent=e.message;}}

 edit.onclick=()=>{if(picker.hidden)open();else picker.hidden=true;};search.oninput=()=>{page=0;draw();};prev.onclick=()=>{page--;draw();};next.onclick=()=>{page++;draw();};
 save.onclick=async()=>{if(!choice||locked)return;save.disabled=true;status.textContent='Saving…';try{const author=await getIdentity();const r=await fetch('/api/nickname',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({identityToken:author.token,nickname:choice})});const data=await r.json();if(!r.ok){if(r.status===409)await open();throw Error(data.error||'Unable to save nickname.');}picker.hidden=true;status.textContent='';refreshIdentity();}catch(e){status.textContent=e.message;save.disabled=!choice;}};
 async function refresh(){
  try{const author=await getIdentity();locked=author.locked;choice=author.nickname;name.textContent=author.selected?`Posting as ${author.nickname}`:'Choose your nickname';edit.hidden=locked||!author.selected;edit.textContent='Change nickname';
   note.textContent=locked?'This nickname is fixed for this browser. Keep your site data to manage your contributions.':'Choose a unique name before your first post or reply. It becomes fixed when you send your first post or reply.';
   if(!author.persistent)note.textContent+=' Browser storage is unavailable, so this identity lasts only for this page session.';
   if(locked)picker.hidden=true;else if(!author.selected)await open();
  }catch(e){name.textContent=e.message;edit.hidden=false;}
 }
 notices.add(refresh);refresh();
}
export function downloadReceipt(receipt){
 const url=URL.createObjectURL(new Blob([`SIGMOD Voices — private deletion receipt\nReceipt ID: ${receipt.id}\nDeletion key: ${receipt.token}\n\nKeep this file private. Use it under Privacy → Withdraw a contribution.\n`],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='sigmod-voices-receipt.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function ownershipHeaders(){
 try{const token=sessionToken||localStorage.getItem(STORAGE_KEY);return /^[a-f0-9]{64}$/.test(token||'')?{'X-Anonymous-Key':token}:{};}catch{return sessionToken?{'X-Anonymous-Key':sessionToken}:{};}
}
export function addDeleteButton(container,entry,type,onDeleted){
 if(!entry.is_mine)return;
 const b=document.createElement('button');b.type='button';b.className='text-button delete-own';b.textContent=type==='reply'?'Delete my reply':'Delete my post';
 const status=document.createElement('span');status.className='delete-status';status.setAttribute('role','status');
 b.onclick=async()=>{
  if(!confirm(type==='reply'?'Delete your reply? This cannot be undone.':'Delete your post and ALL replies beneath it? This cannot be undone.'))return;
  b.disabled=true;status.textContent='Deleting…';
  try{const author=await getIdentity();const r=await fetch('/api/remove',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:entry.id,type,identityToken:author.token})});if(!r.ok){const d=await r.json();throw Error(d.error||'Unable to delete.');}await onDeleted();}catch(e){status.textContent=e.message;b.disabled=false;}
 };
 container.append(b,status);
}

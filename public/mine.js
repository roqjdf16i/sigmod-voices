import {ownershipHeaders,addDeleteButton} from './identity.js';
let page=0;const list=document.querySelector('#mine-list'),status=document.querySelector('#mine-status'),more=document.querySelector('#mine-more');
async function load(reset=false){more.disabled=true;status.textContent='Loading…';try{
 const next=reset?0:page+1,r=await fetch(`/api/mine?page=${next}`,{credentials:'omit',headers:ownershipHeaders()});if(!r.ok)throw Error('Unable to load your contributions. Reload to retry.');const data=await r.json();page=next;if(reset)list.replaceChildren();
 for(const p of data.results){const article=document.createElement('article');article.className='post';const heading=document.createElement('h3');heading.textContent=`${p.kind==='experience'?'Author experience':p.kind==='reply'?'Reply':'Community comment'} · ${p.status==='pending'?'Awaiting a quick check':'Live'}`;const meta=document.createElement('div');meta.className='post-meta';meta.textContent=`${p.nickname} · ${p.day}`;const text=document.createElement('p');text.textContent=p.body;article.append(heading,meta,text);addDeleteButton(article,{...p,is_mine:true},p.kind==='reply'?'reply':'post',()=>load(true));list.append(article);}
 more.hidden=!data.more;status.textContent=list.children.length?'':'No contributions found for this browser. Posts made before browser identities were introduced require their original deletion receipt.';
}catch(e){status.textContent=e.message;}finally{more.disabled=false;}}
more.onclick=()=>load();load(true);

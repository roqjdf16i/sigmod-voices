import names from '../data/names.json' with {type:'json'};
export const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
export async function identity(token){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw Error('Please reload the page to create your anonymous name.');
 const key=await hash('sigmod-voices:name:'+token);
 return {key};
}
export async function chosenIdentity(db,token,required=false){
 const {key}=await identity(token);
 const row=await db.prepare('SELECT nickname,locked FROM identities WHERE author_key=?').bind(key).first();
 if(required&&!row)throw Error('Choose a nickname before posting.');
 return {key,nickname:row?.nickname||null,selected:!!row,locked:!!row?.locked};
}
export {names};

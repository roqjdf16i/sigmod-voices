export const REASONS = ['Format / anonymity','CMT / ORCID','COI','Out of scope','Incremental work','Submission cap','Ethics','Others'];
export function validate(p) {
 if (!p || !['experience','comment'].includes(p.kind)) throw Error('Choose an experience or a comment.');
 if (typeof p.body !== 'string' || !p.body.trim() || p.body.trim().length > 5000) throw Error('Write between 1 and 5,000 characters.');
 const result = {kind:p.kind, body:p.body.trim(), year:'',round:'',topic:'',reasons:[]};
 if (p.kind === 'experience') {
  const {year='',round='',topic='',reasons=[]}=p;
  if(typeof year !== 'string' || (year && !/^(19|20)\d{2}$/.test(year))) throw Error('Enter a four-digit conference year.');
  if(typeof round !== 'string' || !['','1','2','3','4'].includes(round)) throw Error('Choose round 1–4 or leave it blank.');
  if(typeof topic !== 'string' || topic.length>100) throw Error('Keep the topic within 100 characters.');
  if(!Array.isArray(reasons) || reasons.length>8 || reasons.some(r=>!REASONS.includes(r))) throw Error('Choose a listed reason.');
  Object.assign(result,{year,round,topic:topic.trim(),reasons:[...new Set(reasons)]});
 }
 return result;
}

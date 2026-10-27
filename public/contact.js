// Lightweight email obfuscation, not protection against interactive crawlers.
const button=document.querySelector('.contact-toggle');
const details=document.querySelector('#contact-details');
if(button&&details)button.addEventListener('click',()=>{
 if(!details.firstChild){
  const address=atob('c2lnbW9kdm9pY2VzQGdtYWlsLmNvbQ==');
  const link=document.createElement('a');
  link.href=`mailto:${address}`;
  link.textContent=address;
  details.append(link);
 }
 const expanded=button.getAttribute('aria-expanded')!=='true';
 button.setAttribute('aria-expanded',String(expanded));
 details.hidden=!expanded;
});

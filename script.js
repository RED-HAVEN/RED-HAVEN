const menuToggle=document.querySelector('.menu-toggle');
const nav=document.querySelector('.nav');
menuToggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'إغلاق القائمة':'فتح القائمة')});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{nav.classList.remove('open');menuToggle.setAttribute('aria-expanded','false')}));
const sections=[...document.querySelectorAll('main section[id]')];
const navLinks=[...nav.querySelectorAll('a')];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)navLinks.forEach(link=>link.classList.toggle('active',link.hash===`#${entry.target.id}`))}),{rootMargin:'-35% 0px -55% 0px'});
sections.forEach(section=>observer.observe(section));

const inviteCode='aGHnszRcfu';
const formatCount=value=>new Intl.NumberFormat('ar').format(value);
async function refreshDiscordStats(){
  const status=document.querySelector('#stats-status');
  try{
    const response=await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`Discord API ${response.status}`);
    const invite=await response.json();
    const members=invite.approximate_member_count;
    const online=invite.approximate_presence_count;
    if(Number.isFinite(members))document.querySelector('#member-count').textContent=formatCount(members);
    if(Number.isFinite(online))document.querySelector('#online-count').textContent=formatCount(online);
    document.querySelector('#invite-joins').textContent=Number.isFinite(invite.uses)?formatCount(invite.uses):'غير متاح';
    status.textContent='الأعضاء والمتصلون أعداد تقريبية من Discord وتُحدّث كل 30 ثانية.';
  }catch(error){
    document.querySelector('#member-count').textContent='—';
    document.querySelector('#online-count').textContent='—';
    document.querySelector('#invite-joins').textContent='غير متاح';
    status.textContent='تعذّر تحميل الإحصائيات الآن؛ رابط الانضمام يعمل بشكل طبيعي.';
  }
}
refreshDiscordStats();
window.setInterval(refreshDiscordStats,30000);

async function loadOwners(){
  const list=document.querySelector('#owners-list');
  try{
    const response=await fetch(`./owners.json?v=${Date.now()}`,{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok)throw new Error(`Owners endpoint ${response.status}`);
    const data=await response.json();
    const owners=Array.isArray(data.owners)?data.owners:[];
    list.replaceChildren();
    if(!owners.length){list.innerHTML='<div class="owners-placeholder">لم يتم العثور على أعضاء بهذه الرتبة.</div>';return}
    for(const owner of owners){
      const card=document.createElement('article');card.className='owner-card';
      const avatar=document.createElement('img');avatar.src=owner.avatar;avatar.alt='';avatar.loading='lazy';
      const details=document.createElement('div');const name=document.createElement('strong');name.textContent=owner.name;
      const badge=document.createElement('small');badge.textContent='SERVER OWNER';details.append(name,badge);card.append(avatar,details);list.append(card);
    }
  }catch(error){document.querySelector('#owners-status')?.remove();list.replaceChildren();const message=document.createElement('div');message.className='owners-placeholder';message.textContent='تعذّر تحميل قائمة المالكين. تحقق من إعداد خدمة Discord.';list.append(message)}
}
loadOwners();

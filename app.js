/* Ayla hisob-kitob — poyabzal ishlab chiqarish hisobi.
   Bitta kod uch joyda ishlaydi:
   - Claude sahifasi ichida: ma'lumot Claude bazasida (window.claude);
   - o'z saytida: ma'lumot Firebase'da (firebase-config.js to'ldirilgan bo'lsa);
   - boshqa holda: faqat shu qurilmada (localStorage).
   Yangi bo'lim qo'shish: VIEWS ga nom, render() dagi xaritaga funksiya, kerak bo'lsa COLS ga yangi to'plam. */
{
'use strict';
/* ================= constants ================= */
const COLS=['mat','mv','mdl','cat','prd','wkr','job','pay','cst','sale','cpay','exp'];
const STAFF_COLS=['mat','cat','prd','wkr','members','job'];
const LS='ayla-hisob-v1';
const FB_VER='10.14.1';
const LOGIN_DOMAIN='@ayla-hisob.uz';
const MON=['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const MS=['yan','fev','mar','apr','may','iyn','iyl','avg','sen','okt','noy','dek'];
const UNITS=['m²','dm²','kg','g','metr','dona','juft','litr',"g'altak",'list'];
const ECATS=['Ijara','Elektr energiya','Gaz','Suv','Transport','Soliq','Ta’mirlash','Reklama','Boshqa'];
const CTYPES=['Optom','Chakana',"Do'kon",'Marketpleys','Boshqa'];
const REGIONS=['Toshkent sh.','Toshkent vil.','Andijon','Buxoro',"Farg'ona",'Jizzax','Xorazm','Namangan','Navoiy','Qashqadaryo',"Qoraqalpog'iston",'Samarqand','Sirdaryo','Surxondaryo','Boshqa davlat'];
const CF=[['all','Hammasi'],['debt','Qarzdorlar'],['Optom','Optom'],['Chakana','Chakana'],["Do'kon","Do'kon"]];
const SORTS=[['debt','Qarzi ko‘p'],['name','Nomi'],['last','Oxirgi xarid'],['buy','Ko‘p xarid']];
const VIEWS=['asosiy','ombor','modellar','ishchilar','mijozlar'];
const OPS0=['Bichish','Tikish','Zakatovka','Taglik yopish','Pardoz va qadoqlash'];
const I={plus:'<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',minus:'<svg class="i" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',x:'<svg class="i" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>'};

/* ================= state & helpers ================= */
const D={members:[],requests:[]};COLS.forEach(c=>D[c]=[]);
const S={view:'asosiy',per:'m0',mode:'loading',loaded:false,ro:false,stale:false,admin:true,detail:null,txBack:null,cseg:'base',q:'',cf:'all',csort:'debt',auth:null,authMode:'in',online:navigator.onLine!==false};
let cdb=null,usr=null,me=null,C=null,F=null,rq=0,tt=0,FBX=null;
const names={};
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v??'').replace(/[\s ]/g,'').replace(',','.'));return isFinite(n)?n:0};
const grp=n=>String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const fm=n=>(Math.round(n)<0?'−':'')+grp(n);
const sm=n=>fm(n)+" so'm";
const fq=n=>{const r=Math.round(n*100)/100;return (r<0?'−':'')+String(Math.abs(r)).replace('.',',')};
const pct=x=>Math.round(x*100)+'%';
const short=n=>{const a=Math.abs(n),s=n<0?'−':'';if(a>=1e6)return s+String(Math.round(a/1e5)/10).replace('.',',')+' mln';if(a>=1e3)return s+Math.round(a/1e3)+' ming';return s+Math.round(a)};
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const td=(o=0)=>{const d=new Date();d.setDate(d.getDate()-o);return ymd(d)};
const fd=s=>{if(!s)return '';const p=String(s).split('-');return +p[2]+' '+MS[+p[1]-1]+(p[0]!==td().slice(0,4)?' '+p[0]:'')};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const get=(c,id)=>D[c].find(x=>x.id===id);
const getM=id=>get('mdl',id)||get('cat',id);
const nm=(c,id)=>(c==='mdl'?getM(id):get(c,id))?.name||"(o'chirilgan)";
const MD=()=>S.admin?D.mdl:D.cat;
const opNames=m=>(m?.ops||[]).map(o=>typeof o==='string'?o:o?.name).filter(Boolean);
const IMGRE=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const imgOf=id=>{const c=D.cat.find(x=>x.id===id);return c&&typeof c.img==='string'&&IMGRE.test(c.img)?c.img:''};
const SHOE='<svg class="i" viewBox="0 0 24 24"><path d="M3 9.5V6h5l2.8 4.6 6.1 1.5c2 .5 3.6 2.1 3.6 4.2V17H3z"/><path d="M3 17v2.5h18.5V17M7.5 11.5 9 10"/></svg>';
const noImg='<span class="noimg">'+SHOE+"<small>Rasm yo'q</small></span>";
const imgTag=(id,alt)=>{const d=imgOf(id);return d?`<img src="${esc(d)}" alt="${esc(alt||'')}" loading="lazy">`:noImg};
const catDoc=(m,img)=>({name:m.name||'',code:m.code||'',bom:(m.bom||[]).map(b=>({mat:b.mat,qty:num(b.qty)})),ops:opNames(m),img:img||'',ts:Date.now()});
const who=id=>{if(!id)return '';if(S.mode==='firebase')return D.members.find(m=>m.id===id)?.name||'';return names[id]||''};
const sortD=a=>a.slice().sort((x,y)=>String(y.date||'').localeCompare(String(x.date||''))||(y.ts||0)-(x.ts||0));
const byName=a=>a.slice().sort((x,y)=>String(x.name).localeCompare(String(y.name)));
const inP=(d,pre)=>String(d||'').startsWith(pre);
const sched=()=>{if(!rq)rq=requestAnimationFrame(()=>{rq=0;render()})};
const canDel=r=>!S.ro&&(S.admin||(r&&r.by&&r.by===me));
const normLogin=l=>{l=String(l||'').trim().toLowerCase();return l.includes('@')?l:l.replace(/[^a-z0-9._-]/g,'')};
const toEmail=l=>{const n=normLogin(l);return n.includes('@')?n:n+LOGIN_DOMAIN};
const telHref=p=>'tel:'+String(p||'').replace(/[^\d+]/g,'');
const digits=p=>String(p||'').replace(/\D/g,'');
const fmtPhone=p=>{let d=digits(p);if(d.length===9)d='998'+d;if(d.length===12&&d.startsWith('998'))return '+998 '+d.slice(3,5)+' '+d.slice(5,8)+' '+d.slice(8,10)+' '+d.slice(10);return String(p||'').trim()};
const phoneKey=p=>digits(p).slice(-9);
const vEsc=s=>String(s||'').replace(/[\\;,]/g,m=>'\\'+m).replace(/\r?\n/g,'\\n');
function vcard(c){const L=['BEGIN:VCARD','VERSION:3.0','FN:'+vEsc(c.name),'N:'+vEsc(c.name)+';;;;','ORG:'+vEsc('Ayla mijozi'+(c.type?' · '+c.type:''))];
  if(c.phone)L.push('TEL;TYPE=CELL:'+digits(fmtPhone(c.phone)).replace(/^/,'+'));if(c.phone2)L.push('TEL;TYPE=WORK:'+digits(fmtPhone(c.phone2)).replace(/^/,'+'));
  if(c.addr||c.region)L.push('ADR;TYPE=WORK:;;'+vEsc(c.addr)+';'+vEsc(c.region)+';;;');const tg=tgName(c.tg);if(tg)L.push('URL:https://t.me/'+tg);if(c.note)L.push('NOTE:'+vEsc(c.note));L.push('END:VCARD');return L.join('\r\n')}
const tgName=t=>String(t||'').trim().replace(/^@/,'').replace(/^https?:\/\/t\.me\//,'').replace(/[^A-Za-z0-9_]/g,'');

/* ================= backends ================= */
async function W(fn){try{return await fn()}catch(e){if(e&&e.code==='unavailable'){await sleep(400+Math.random()*700);return await fn()}throw e}}
function settle(p,ms=1500){return new Promise((res,rej)=>{let done=false;const t=setTimeout(()=>{done=true;res()},ms);p.then(()=>{if(!done){clearTimeout(t);done=true;res()}},e=>{if(!done){clearTimeout(t);done=true;rej(e)}else toast(errText(e))})})}
function saveLocal(){try{localStorage.setItem(LS,JSON.stringify(Object.fromEntries(COLS.map(c=>[c,D[c]]))))}catch(e){S.noLS=true}}
function loadLocal(){try{const o=JSON.parse(localStorage.getItem(LS)||'{}');COLS.forEach(c=>{if(Array.isArray(o[c]))D[c]=o[c]})}catch(e){S.noLS=true}}
function clean(obj){const b=Object.assign({},obj);delete b.id;for(const k in b)if(b[k]===undefined)delete b[k];return b}
function localPut(c,b,id){const r=Object.assign({},b,{id}),i=D[c].findIndex(x=>x.id===id);if(i>=0)D[c][i]=r;else D[c].push(r)}
async function put(c,obj,id){
  id=id||uid();const b=clean(obj);
  if(S.mode==='cloud')await W(()=>cdb.collection(c).doc(id).set(b));
  else if(S.mode==='firebase'){const {F:Fs,fs}=FBX;await settle(Fs.setDoc(Fs.doc(fs,c,id),b))}
  else{localPut(c,b,id);saveLocal();sched()}
  return id;
}
async function del(c,id){
  if(S.mode==='cloud')await W(()=>cdb.collection(c).doc(id).delete());
  else if(S.mode==='firebase'){const {F:Fs,fs}=FBX;await settle(Fs.deleteDoc(Fs.doc(fs,c,id)))}
  else{D[c]=D[c].filter(x=>x.id!==id);saveLocal();sched()}
}
/* list: [[collection, data|null, id]] — data null means delete */
async function many(list){
  if(S.mode==='firebase'){const {F:Fs,fs}=FBX;for(let i=0;i<list.length;i+=400){const b=Fs.writeBatch(fs);list.slice(i,i+400).forEach(([c,d,id])=>d?b.set(Fs.doc(fs,c,id),clean(d)):b.delete(Fs.doc(fs,c,id)));await settle(b.commit(),4000)}return}
  if(S.mode==='local'){list.forEach(([c,d,id])=>{if(d)localPut(c,clean(d),id);else D[c]=D[c].filter(x=>x.id!==id)});saveLocal();sched();return}
  for(const [c,d,id] of list){if(d)await put(c,d,id);else await del(c,id)}
}
async function delRec(c,id){
  const r=get(c,id);if(!r)return;const recs=[[c,r]];
  if(c==='sale')D.cpay.filter(p=>p.sale===id).forEach(p=>recs.push(['cpay',p]));
  await many(recs.map(([cc,rr])=>[cc,null,rr.id]));
  toast("O'chirildi",{label:'Qaytarish',fn:async()=>{try{await many(recs.map(([cc,rr])=>[cc,rr,rr.id]));toast('Qaytarildi')}catch(e){toast(errText(e))}}});
}
const stamp=o=>Object.assign(o,{ts:Date.now(),by:me||null});
function errText(e){
  const c=e&&e.code;
  if(c==='invalid_argument'&&S.mode==='cloud'){S.ro=true;sched();return "Saqlanmadi: sizda kiritish huquqi yo'q. Egasidan Editor huquqini so'rang."}
  if(c==='permission-denied')return S.admin?"Ruxsat yo'q. Akkauntingiz tasdiqlanganini tekshiring.":"Buni faqat admin qila oladi.";
  if(c==='quota_exceeded'||c==='resource-exhausted')return "Baza limiti tugadi. Ertaga qayta urinib ko'ring yoki admin bilan gaplashing.";
  if(c==='revoked')return "Kirish huquqi o'zgardi. Sahifani qayta oching.";
  const a={'auth/invalid-credential':"Login yoki parol noto'g'ri",'auth/wrong-password':"Login yoki parol noto'g'ri",'auth/user-not-found':"Bunday login topilmadi",'auth/invalid-login-credentials':"Login yoki parol noto'g'ri",'auth/email-already-in-use':'Bu login band, boshqasini tanlang','auth/weak-password':'Parol kamida 6 belgidan iborat bo‘lsin','auth/invalid-email':"Login faqat lotin harflari, raqam va . _ - belgilaridan iborat bo'lsin",'auth/network-request-failed':"Internet yo'q, ulanishni tekshiring",'auth/too-many-requests':"Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring"};
  if(a[c])return a[c];
  return "Saqlanmadi. Internetni tekshirib, qayta urinib ko'ring.";
}

/* ---- Claude backend ---- */
function claudeSubscribe(){
  const got=new Set(),fresh=new Set();
  const tm=setTimeout(()=>{if(fresh.size<COLS.length){S.stale=true;S.loaded=true;sched()}},10000);
  COLS.forEach(c=>{try{cdb.collection(c).onSnapshot(s=>{
      D[c]=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));got.add(c);if(!s.metadata.fromCache)fresh.add(c);
      if(fresh.size===COLS.length){clearTimeout(tm);S.stale=false}
      if(got.size===COLS.length)S.loaded=true;sched();
    },err=>{got.add(c);fresh.add(c);if(got.size===COLS.length)S.loaded=true;if(err&&err.code==='revoked')S.ro=true;S.stale=true;sched()})}catch(err){got.add(c);fresh.add(c)}});
}
async function claudeUser(){
  try{usr=await window.claude.use('user');if(!usr)return;try{me=await usr.id()}catch(e){me=null}
    try{const w=await usr.can('data.write');if(w===false){S.ro=true;S.admin=false;sched()}}catch(e){}refreshNames()}catch(e){usr=null}
}
let nmBusy=0;
async function refreshNames(){
  if(!usr||nmBusy)return;const ids=new Set();COLS.forEach(c=>D[c].forEach(x=>{if(x.by&&!(x.by in names))ids.add(x.by)}));if(!ids.size)return;
  nmBusy=1;try{const ps=await usr.profiles([...ids]);ids.forEach(id=>names[id]=(ps&&ps[id]&&ps[id].name)||'')}catch(e){ids.forEach(id=>names[id]='')}nmBusy=0;sched();
}

/* ---- Firebase backend ---- */
let dataUnsubs=[],meUnsub=null,reqUnsub=null;
async function fbBoot(cfg){
  const base='https://www.gstatic.com/firebasejs/'+FB_VER+'/';
  const [AP,A,Fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
  const app=AP.initializeApp(cfg);
  let fs;try{fs=Fs.initializeFirestore(app,{localCache:Fs.persistentLocalCache({tabManager:Fs.persistentMultipleTabManager()})})}catch(e){fs=Fs.getFirestore(app)}
  FBX={A,F:Fs,fs,auth:A.getAuth(app)};
  A.onAuthStateChanged(FBX.auth,fbAuthChanged);
}
function fbStopData(){dataUnsubs.forEach(u=>{try{u()}catch(e){}});dataUnsubs=[];if(reqUnsub){reqUnsub();reqUnsub=null}COLS.forEach(c=>D[c]=[]);D.members=[];D.requests=[];S.loaded=false}
function fbAuthChanged(u){
  fbStopData();if(meUnsub){meUnsub();meUnsub=null}
  me=u?u.uid:null;S.user=u;S.role=null;S.admin=false;S.reqExists=undefined;S.fbRetry=0;
  if(!u){S.auth='out';closeSheet();render();return}
  S.auth='check';S.authMode='in';render();
  const {F:Fs,fs}=FBX;
  Fs.getDoc(Fs.doc(fs,'config','owner')).then(s=>{S.ownerUid=s.exists()?s.data().uid:null}).catch(()=>{});
  meUnsub=Fs.onSnapshot(Fs.doc(fs,'members',u.uid),{includeMetadataChanges:true},s=>{
    if(s.metadata&&s.metadata.hasPendingWrites)return;
    if(s.exists()){const d=s.data(),was=S.auth;S.role=d.role||'xodim';S.admin=S.role==='admin';S.myName=d.name||u.displayName||'';S.auth='in';if(was!=='in'||S.subAdmin!==S.admin){fbStopData();fbSubscribe()}fbReqSub();sched()}
    else{if(S.auth==='in')fbStopData();S.role=null;S.admin=false;S.auth='pending';fbCheckRequest();sched()}
  },e=>{S.auth='pending';S.authErr=errText(e);sched()});
}
function fbSubscribe(){
  const {F:Fs,fs}=FBX,adm=S.admin,cols=adm?COLS.concat(['members']):STAFF_COLS,got=new Set();S.subAdmin=adm;
  const tm=setTimeout(()=>{if(!S.loaded){S.loaded=true;S.stale=true;sched()}},10000);
  cols.forEach(c=>dataUnsubs.push(Fs.onSnapshot(!adm&&c==='job'?Fs.query(Fs.collection(fs,'job'),Fs.where('by','==',me)):Fs.collection(fs,c),s=>{
    D[c]=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));got.add(c);
    if(got.size===cols.length&&!S.loaded){S.loaded=true;S.stale=false;clearTimeout(tm)}sched();
  },e=>{got.add(c);if(got.size===cols.length)S.loaded=true;
    if(e&&e.code==='permission-denied'&&!S.fbRetry){S.fbRetry=1;setTimeout(()=>{if(S.auth==='in'){fbStopData();fbSubscribe();fbReqSub()}},1500);return}
    S.stale=true;sched()})));
}
function fbReqSub(){
  const {F:Fs,fs}=FBX;
  if(S.admin&&!reqUnsub)reqUnsub=Fs.onSnapshot(Fs.collection(fs,'requests'),s=>{D.requests=s.docs.map(d=>Object.assign({},d.data(),{id:d.id}));sched()},()=>{});
  if(!S.admin&&reqUnsub){reqUnsub();reqUnsub=null;D.requests=[]}
}
async function fbCheckRequest(){try{const {F:Fs,fs}=FBX;const s=await Fs.getDoc(Fs.doc(fs,'requests',me));S.reqExists=s.exists()}catch(e){S.reqExists=false}sched()}
async function fbRegister(name,login,pass){
  const {A,F:Fs,fs,auth}=FBX,lg=normLogin(login);
  const cred=await A.createUserWithEmailAndPassword(auth,toEmail(lg),pass);
  try{await A.updateProfile(cred.user,{displayName:name})}catch(e){}
  const id=cred.user.uid,o=await Fs.getDoc(Fs.doc(fs,'config','owner'));
  if(!o.exists()){const b=Fs.writeBatch(fs);b.set(Fs.doc(fs,'config','owner'),{uid:id,ts:Date.now()});b.set(Fs.doc(fs,'members',id),{name,login:lg,role:'admin',ts:Date.now()});await b.commit();S.ownerUid=id}
  else await Fs.setDoc(Fs.doc(fs,'requests',id),{name,login:lg,ts:Date.now()});
  fbCheckRequest();
}
async function fbSendRequest(){const {F:Fs,fs}=FBX;await Fs.setDoc(Fs.doc(fs,'requests',me),{name:S.user.displayName||normLogin(S.user.email).split('@')[0],login:normLogin(S.user.email).replace(LOGIN_DOMAIN,''),ts:Date.now()});fbCheckRequest()}
async function fbApprove(id,role){const r=D.requests.find(x=>x.id===id);if(!r)return;const {F:Fs,fs}=FBX;const b=Fs.writeBatch(fs);b.set(Fs.doc(fs,'members',id),{name:r.name||'Xodim',login:r.login||'',role,ts:Date.now()});b.delete(Fs.doc(fs,'requests',id));await settle(b.commit(),3000)}
async function fbMember(id,data){const {F:Fs,fs}=FBX;if(data)await settle(Fs.setDoc(Fs.doc(fs,'members',id),data));else await settle(Fs.deleteDoc(Fs.doc(fs,'members',id)))}

/* ================= calculations ================= */
function calc(){
  const ms={};D.mat.forEach(m=>ms[m.id]={in:0,inSum:0,out:0,used:0});
  D.mv.forEach(v=>{const s=ms[v.mat];if(!s)return;if(v.kind==='in'){s.in+=num(v.qty);s.inSum+=num(v.qty)*num(v.price)}else s.out+=num(v.qty)});
  D.prd.forEach(p=>(p.use||[]).forEach(u=>{const s=ms[u.mat];if(s)s.used+=num(u.qty)}));
  for(const id in ms){const s=ms[id];s.qty=s.in-s.out-s.used;s.avg=s.in?s.inSum/s.in:0;s.val=Math.max(0,s.qty)*s.avg}
  const cost=m=>{let mat=0,lab=0;(m?.bom||[]).forEach(b=>mat+=num(b.qty)*(ms[b.mat]?.avg||0));(m?.ops||[]).forEach(o=>lab+=num(o.rate));const ex=num(m?.extra),tot=mat+lab+ex,pr=num(m?.price)-tot;return {mat,lab,ex,tot,pr,mg:num(m?.price)?pr/num(m.price):0}};
  const gd={};D.mdl.forEach(m=>gd[m.id]={made:0,sold:0});
  D.prd.forEach(p=>{if(gd[p.mdl])gd[p.mdl].made+=num(p.pairs)});
  D.sale.forEach(s=>(s.items||[]).forEach(i=>{if(gd[i.mdl])gd[i.mdl].sold+=num(i.pairs)}));
  for(const id in gd)gd[id].left=gd[id].made-gd[id].sold;
  const m0=td().slice(0,7),ws={},cs={};
  D.wkr.forEach(w=>ws[w.id]={earn:0,paid:0,mon:0});
  D.job.forEach(j=>{const s=ws[j.wkr];if(!s)return;s.earn+=num(j.sum);if(inP(j.date,m0))s.mon+=num(j.sum)});
  D.pay.forEach(p=>{const s=ws[p.wkr];if(s)s.paid+=num(p.amount)});
  for(const id in ws)ws[id].owe=ws[id].earn-ws[id].paid;
  D.cst.forEach(c=>cs[c.id]={buy:0,paid:0,last:'',pairs:0,n:0,by:{}});
  D.sale.forEach(s=>{const c=cs[s.cst];if(!c)return;c.buy+=num(s.sum);c.n++;if((s.date||'')>c.last)c.last=s.date;(s.items||[]).forEach(i=>{c.pairs+=num(i.pairs);c.by[i.mdl]=(c.by[i.mdl]||0)+num(i.pairs)})});
  D.cpay.forEach(p=>{const c=cs[p.cst];if(c)c.paid+=num(p.amount)});
  for(const id in cs){const c=cs[id];c.debt=c.buy-c.paid;c.top=Object.entries(c.by).sort((a,b)=>b[1]-a[1])[0]?.[0]||null}
  return {ms,cost,gd,ws,cs};
}
function pnl(pre){
  let sales=0,cogs=0,pairs=0,ex=0,made=0;
  D.sale.forEach(s=>{if(!inP(s.date,pre))return;sales+=num(s.sum);(s.items||[]).forEach(i=>{cogs+=num(i.pairs)*num(i.cost);pairs+=num(i.pairs)})});
  D.exp.forEach(e=>{if(inP(e.date,pre))ex+=num(e.amount)});
  D.prd.forEach(p=>{if(inP(p.date,pre))made+=num(p.pairs)});
  return {sales,cogs,ex,pr:sales-cogs-ex,pairs,made};
}
function perRange(p){
  const t=new Date(),y=String(t.getFullYear());
  if(p==='m0')return [td().slice(0,7),MON[t.getMonth()]+' '+y];
  if(p==='m1'){const d=new Date(t.getFullYear(),t.getMonth()-1,1);return [ymd(d).slice(0,7),MON[d.getMonth()]+' '+d.getFullYear()]}
  if(p==='y')return [y,y+' yil'];
  return ['','Butun davr'];
}
const sumOf=(o,k,pos)=>Object.values(o).reduce((a,s)=>a+(pos?Math.max(0,s[k]):s[k]),0);
const refs={
  mat:id=>D.mv.some(v=>v.mat===id)||D.mdl.some(m=>(m.bom||[]).some(b=>b.mat===id))||D.prd.some(p=>(p.use||[]).some(u=>u.mat===id)),
  mdl:id=>D.prd.some(p=>p.mdl===id)||D.job.some(j=>j.mdl===id)||D.sale.some(s=>(s.items||[]).some(i=>i.mdl===id)),
  wkr:id=>D.job.some(j=>j.wkr===id)||D.pay.some(p=>p.wkr===id),
  cst:id=>D.sale.some(s=>s.cst===id)||D.cpay.some(p=>p.cst===id)
};
const matO=()=>byName(D.mat).map(m=>[m.id,m.name+' ('+m.unit+')']);
const mdlO=()=>byName(MD()).map(m=>[m.id,m.name+(m.code?' · '+m.code:'')]);
const wkrO=()=>byName(D.wkr).map(w=>[w.id,w.name]);
const cstO=()=>byName(D.cst).map(c=>[c.id,c.name+(c.region?' · '+c.region:'')]);

/* ================= html helpers ================= */
const row=(c,id,t,meta,amt,amt2,cls)=>`<button class="item" data-act="${c}" data-id="${esc(id)}"><span class="it"><b>${esc(t)}</b><small>${esc(meta.filter(Boolean).join(' · '))}</small></span><span class="iv"><b class="${cls||''}">${esc(amt)}</b>${amt2?`<small>${esc(amt2)}</small>`:''}</span></button>`;
const txRow=(c,r,t,meta,amt,amt2,cls)=>`<button class="item" data-act="tx" data-c="${c}" data-id="${esc(r.id)}"><span class="it"><b>${esc(t)}</b><small>${esc([fd(r.date),...meta,who(r.by)].filter(Boolean).join(' · '))}</small></span><span class="iv"><b class="${cls||''}">${esc(amt)}</b>${amt2?`<small>${esc(amt2)}</small>`:''}</span></button>`;
const kvH=rows=>`<dl class="kv">${rows.map(([l,v,c])=>`<dt class="${c==='tot'?'tot':''}">${esc(l)}</dt><dd class="${c||''}">${esc(v)}</dd>`).join('')}</dl>`;
const stats=a=>`<div class="stats">${a.map(([l,v,c])=>`<div><span>${esc(l)}</span><b class="${c||''}">${esc(v)}</b></div>`).join('')}</div>`;
const btn=(act,label,o={})=>`<button class="btn ${o.pri?'pri':''} ${o.sm?'sm':''} w" data-act="${act}"${o.id?` data-id="${esc(o.id)}"`:''}>${o.icon?I[o.icon]:''}${esc(label)}</button>`;
const empty=t=>`<p class="empty">${esc(t)}</p>`;
const opt=(list,v,ph='Tanlang…')=>(ph?`<option value="">${esc(ph)}</option>`:'')+list.map(([k,l])=>`<option value="${esc(k)}"${String(k)===String(v??'')?' selected':''}>${esc(l)}</option>`).join('');

/* ================= views ================= */
function vHome(){
  const [pre,lab]=perRange(S.per),P=pnl(pre);
  const smp=COLS.some(c=>D[c].some(x=>x.smp)),none=!COLS.some(c=>D[c].length);
  const debt=sumOf(C.cs,'debt',1),owe=sumOf(C.ws,'owe',1),stv=sumOf(C.ms,'val'),left=sumOf(C.gd,'left',1);
  const base=Math.max(P.sales,P.cogs+P.ex)||1,w=x=>(Math.max(0,x)/base*100).toFixed(2)+'%';
  const per=[['m0','Bu oy'],['m1',"O'tgan oy"],['y','Bu yil'],['all','Hammasi']];
  const months=[];for(let i=5;i>=0;i--){const t=new Date(),d=new Date(t.getFullYear(),t.getMonth()-i,1);months.push({l:MS[d.getMonth()],p:pnl(ymd(d).slice(0,7))})}
  const mx=Math.max(1,...months.map(m=>m.p.sales));
  const low=byName(D.mat).filter(m=>num(m.min)>0&&C.ms[m.id].qty<num(m.min));
  const ex=sortD(D.exp.filter(e=>inP(e.date,pre)));
  return `<section class="hero"><div class="wrap">
  ${smp?`<div class="smp"><span>Hozir namuna ma'lumotlar ko'rsatilmoqda.</span>${S.admin?btn('smpdel',"Namunani o'chirish",{sm:1}):''}</div>`:''}
  <div class="chips">${per.map(([k,l])=>`<button data-act="per" data-p="${k}" aria-pressed="${S.per===k}">${l}</button>`).join('')}</div>
  <div class="label">
    <div class="lt"><span>Sof foyda</span><span>${esc(lab)}</span></div>
    <div class="big ${P.pr<0?'red':''}">${fm(P.pr)}<small>so'm</small></div>
    <div class="strip" role="img" aria-label="Sotuv tarkibi"><i class="c1" style="width:${w(P.cogs)}"></i><i class="c2" style="width:${w(P.ex)}"></i><i class="c3" style="width:${w(P.pr)}"></i></div>
    <div class="legend">
      <div><span>Sotuv · ${fq(P.pairs)} juft</span><b>${fm(P.sales)}</b></div>
      <div><span><i class="c1"></i>Tannarx</span><b>${fm(P.cogs)}</b></div>
      <div><span><i class="c2"></i>Xarajatlar</span><b>${fm(P.ex)}</b></div>
      <div><span><i class="c3"></i>Foyda</span><b class="${P.pr<0?'red':''}">${fm(P.pr)}</b></div>
    </div>
    <div class="lf">Foyda = sotuv − sotilgan juftlar tannarxi (xom ashyo + ish haqi) − xarajatlar</div>
  </div></div></section>
  <div class="wrap">
  ${none?`<div class="start"><h2>Boshlash uchun</h2><ol><li><b>Ombor</b>: xom ashyolarni qo'shing va kirimini yozing (teri, taglik, kley…).</li><li><b>Modellar</b>: har model uchun 1 juftga ketadigan xom ashyo va ish haqini yozing, tannarx o'zi hisoblanadi.</li><li><b>Ishchilar</b>: ishchilarni qo'shing, har kuni bajarilgan ishni kiriting.</li><li><b>Mijozlar</b>: mijozlar bazasi, sotuv va to'lovlar, qarz o'zi hisoblanadi.</li></ol>${S.admin?btn('smpload',"Namuna ma'lumot bilan ko'rish"):''}</div>`:''}
  <div class="figs">
    <button class="fig" data-act="go" data-v="mijozlar"><span>Mijozlar qarzi</span><b class="${debt>0?'red':''}">${fm(debt)}</b><small>so'm</small></button>
    <button class="fig" data-act="go" data-v="ishchilar"><span>Ishchilarga qarzimiz</span><b>${fm(owe)}</b><small>so'm</small></button>
    <button class="fig" data-act="go" data-v="ombor"><span>Ombor qiymati</span><b>${fm(stv)}</b><small>so'm</small>${low.length?`<small class="red">${low.length} xil kam qoldi</small>`:''}</button>
    <button class="fig" data-act="go" data-v="modellar"><span>Tayyor mahsulot</span><b>${fq(left)} juft</b><small>${fq(P.made)} juft tayyorlandi</small></button>
  </div>
  <div class="sh"><h2>So'nggi 6 oy</h2></div>
  <div class="mrow hd"><span>Oy</span><span>Sotuv va foyda</span><span class="mv">Sotuv</span><span class="mv">Foyda</span></div>
  ${months.map(m=>`<div class="mrow"><span>${m.l}</span><div class="mtrack"><i class="ms" style="width:${(m.p.sales/mx*100).toFixed(1)}%"></i><i class="mp" style="width:${(Math.max(0,m.p.pr)/mx*100).toFixed(1)}%"></i></div><span class="mv">${short(m.p.sales)}</span><span class="mv ${m.p.pr<0?'red':''}">${short(m.p.pr)}</span></div>`).join('')}
  ${low.length?`<div class="sh"><h2>Kam qolgan xom ashyo</h2></div><div class="list">${low.map(m=>row('mat',m.id,m.name,['chegara: '+fq(m.min)+' '+m.unit],fq(C.ms[m.id].qty)+' '+m.unit,'','red')).join('')}</div>`:''}
  <div class="sh"><h2>Xarajatlar · ${esc(lab)}</h2>${btn('exp-new','Xarajat',{icon:'plus',sm:1})}</div>
  <div class="list">${ex.map(e=>txRow('exp',e,e.cat,[e.note],fm(e.amount))).join('')||empty("Bu davrda xarajat yozilmagan")}</div>
  </div>`;
}
function vStore(){
  const mats=byName(D.mat),val=sumOf(C.ms,'val'),mv=sortD(D.mv).slice(0,30);
  return `<div class="wrap"><h1>Ombor</h1><p class="sub">${mats.length} xil xom ashyo · qiymati ${sm(val)}</p>
  <div class="acts">${btn('kirim','Kirim',{pri:1,icon:'plus'})}${btn('chiqim','Chiqim',{icon:'minus'})}${btn('mat-new','Xom ashyo',{icon:'plus'})}</div>
  <div class="list">${mats.map(m=>{const s=C.ms[m.id],low=num(m.min)>0&&s.qty<num(m.min);return row('mat',m.id,m.name,["o'rtacha "+sm(s.avg)+' / '+m.unit,low?'kam qoldi':''],fq(s.qty)+' '+m.unit,sm(s.val),low||s.qty<0?'red':'')}).join('')||empty("Hali xom ashyo qo'shilmagan")}</div>
  <div class="sh"><h2>So'nggi harakatlar</h2></div>
  <div class="list">${mv.map(v=>{const m=get('mat',v.mat);return txRow('mv',v,(v.kind==='in'?'Kirim · ':'Chiqim · ')+(m?.name||'?'),[v.note],(v.kind==='in'?'+':'−')+fq(v.qty)+' '+(m?.unit||''),v.kind==='in'?sm(v.sum):'',v.kind==='in'?'':'red')}).join('')||empty("Hali kirim yoki chiqim yo'q")}</div></div>`;
}
function vProd(){
  const m0=td().slice(0,7),made=D.prd.filter(p=>inP(p.date,m0)).reduce((a,p)=>a+num(p.pairs),0),prd=sortD(D.prd).slice(0,30);
  return `<div class="wrap"><h1>Modellar va ishlab chiqarish</h1><p class="sub">Bu oy ${fq(made)} juft ishlab chiqarildi</p>
  <div class="acts">${btn('prd-new','Ishlab chiqarildi',{pri:1,icon:'plus'})}${btn('mdl-new','Model',{icon:'plus'})}</div>
  <div class="mgrid">${byName(D.mdl).map(m=>{const c=C.cost(m),g=C.gd[m.id];return `<button class="mcard" data-act="mdl" data-id="${esc(m.id)}"><div class="mimg">${imgTag(m.id,m.name)}</div><div class="mh"><b>${esc(m.name)}</b><span>${esc(m.code||'')}</span></div>${kvH([['Xom ashyo',fm(c.mat)],['Ish haqi',fm(c.lab)],['Boshqa xarajat',fm(c.ex)],['Tannarx, 1 juft',sm(c.tot),'tot'],['Sotuv narxi',sm(m.price)],['Foyda, 1 juft',sm(c.pr)+' · '+pct(c.mg),c.pr<0?'red':'grn']])}<div class="mf"><span>Tayyor qoldiq</span><span class="${g.left<0?'red':''}">${fq(g.left)} juft</span></div></button>`}).join('')||empty("Hali model qo'shilmagan. Model qo'shing: tannarx o'zi hisoblanadi.")}</div>
  <div class="sh"><h2>Ishlab chiqarish tarixi</h2></div>
  <div class="list">${prd.map(p=>txRow('prd',p,nm('mdl',p.mdl),[p.note],fq(p.pairs)+' juft')).join('')||empty("Hali yozuv yo'q")}</div></div>`;
}
function vWork(){
  const owe=sumOf(C.ws,'owe',1),jobs=sortD(D.job).slice(0,30),pend=sortD(D.job.filter(j=>j.rate==null));
  return `<div class="wrap"><h1>Ishchilar</h1><p class="sub">Ishchilarga jami qarzimiz: ${sm(owe)}</p>
  <div class="acts">${btn('job-new','Bajarilgan ish',{pri:1,icon:'plus'})}${btn('pay-new',"To'lov",{icon:'plus'})}${btn('wkr-new','Ishchi',{icon:'plus'})}</div>
  ${pend.length?`<div class="note">Narxi qo'yilmagan ${pend.length} ta ish bor. Ish turini modelga narxi bilan qo'shing yoki shu yerda narx yozing.</div><div class="list" style="margin-bottom:16px">${pend.map(j=>`<button class="item" data-act="jobrate" data-id="${esc(j.id)}"><span class="it"><b>${esc(nm('wkr',j.wkr))} · ${esc(j.op)}</b><small>${esc([fd(j.date),nm('mdl',j.mdl),who(j.by)].filter(Boolean).join(' · '))}</small></span><span class="iv"><b>${fq(j.pairs)} juft</b><small class="red">narx qo'yish</small></span></button>`).join('')}</div>`:''}
  <div class="list">${byName(D.wkr).map(w=>{const s=C.ws[w.id];return row('wkr',w.id,w.name,[w.role,'bu oy: '+sm(s.mon)],s.owe>0?sm(s.owe):s.owe<0?'Ortiqcha: '+sm(-s.owe):"Qarz yo'q",s.owe>0?'qarzimiz':'',s.owe<0?'red':'')}).join('')||empty("Hali ishchi qo'shilmagan")}</div>
  <div class="sh"><h2>So'nggi bajarilgan ishlar</h2></div>
  <div class="list">${jobs.map(j=>txRow('job',j,nm('wkr',j.wkr),[j.op,nm('mdl',j.mdl)+' · '+fq(j.pairs)+' juft'],j.rate==null?'narx yo‘q':sm(j.sum),'',j.rate==null?'red':'')).join('')||empty("Hali yozuv yo'q")}</div></div>`;
}
function clientRows(){
  const q=S.q.trim().toLowerCase();
  let a=D.cst.filter(c=>{const s=C.cs[c.id];if(S.cf==='debt'&&!(s.debt>0))return false;if(S.cf!=='all'&&S.cf!=='debt'&&c.type!==S.cf)return false;
    if(!q)return true;return [c.name,c.phone,c.phone2,c.tg,c.region,c.addr,c.note,c.type].some(x=>String(x||'').toLowerCase().includes(q))});
  const k=S.csort;a.sort((x,y)=>{const X=C.cs[x.id],Y=C.cs[y.id];if(k==='debt')return Y.debt-X.debt||String(x.name).localeCompare(String(y.name));if(k==='last')return String(Y.last).localeCompare(String(X.last));if(k==='buy')return Y.buy-X.buy;return String(x.name).localeCompare(String(y.name))});
  return a.map(c=>{const s=C.cs[c.id];return row('cst',c.id,c.name,[c.type,c.region,c.phone],s.debt>0?sm(s.debt):s.debt<0?'Avans: '+sm(-s.debt):"Qarz yo'q",(s.debt>0?'qarzi · ':'')+'jami '+short(s.buy),s.debt>0?'red':'')}).join('')||empty(D.cst.length?'Hech narsa topilmadi':"Hali mijoz qo'shilmagan");
}
function vClients(){
  const debt=sumOf(C.cs,'debt',1),m0=td().slice(0,7),ms=D.sale.filter(s=>inP(s.date,m0)).reduce((a,s)=>a+num(s.sum),0);
  const body=S.cseg==='base'?`<div class="tools"><input id="cq" type="search" placeholder="Ism, telefon yoki manzil" value="${esc(S.q)}" autocomplete="off" aria-label="Qidirish"><select id="csort" aria-label="Saralash">${opt(SORTS,S.csort,'')}</select></div>
  <div class="chips">${CF.map(([k,l])=>`<button data-act="cf" data-f="${esc(k)}" aria-pressed="${S.cf===k}">${esc(l)}</button>`).join('')}</div>
  <div class="list" id="clist">${clientRows()}</div>`
  :`<p class="sub">Bu oy sotuv: ${sm(ms)}</p><div class="list">${sortD(D.sale).slice(0,60).map(s=>txRow('sale',s,nm('cst',s.cst),[(s.items||[]).map(i=>nm('mdl',i.mdl)+' ×'+fq(i.pairs)).join(', ')],sm(s.sum))).join('')||empty("Hali sotuv yo'q")}</div>`;
  return `<div class="wrap"><h1>Mijozlar</h1><p class="sub">${D.cst.length} ta mijoz · qarzi jami ${sm(debt)}</p>
  <div class="acts">${btn('sale-new','Sotuv',{pri:1,icon:'plus'})}${btn('cpay-new',"To'lov qabul",{icon:'plus'})}${btn('cst-new','Mijoz',{icon:'plus'})}</div>
  <div class="seg"><button data-act="cseg" data-s="base" aria-pressed="${S.cseg==='base'}">Mijozlar bazasi</button><button data-act="cseg" data-s="sales" aria-pressed="${S.cseg==='sales'}">Sotuvlar</button></div>
  ${body}</div>`;
}
function vAuth(){
  if(S.auth==='check'||S.auth===null)return `<div class="auth"><img class="lg-l" src="logo.png" alt="Ayla"><img class="lg-d" src="logo-dark.png" alt="Ayla"><p class="sub">Yuklanmoqda…</p></div>`;
  if(S.auth==='pending')return `<div class="auth"><img class="lg-l" src="logo.png" alt="Ayla"><img class="lg-d" src="logo-dark.png" alt="Ayla"><h1>Tasdiq kutilmoqda</h1>
    ${S.reqExists===false?`<p class="sub">So'rov topilmadi. Admin rad etgan bo'lishi mumkin.</p><button class="btn pri" data-act="req-send">So'rov yuborish</button>`:`<p class="sub">${esc(S.user?.displayName||'')} — so'rovingiz yuborildi. Admin tasdiqlashi bilan ilova o'zi ochiladi.</p>`}
    <button class="linkb" data-act="logout">Boshqa akkaunt bilan kirish</button></div>`;
  const reg=S.authMode==='reg';
  return `<div class="auth"><img class="lg-l" src="logo.png" alt="Ayla"><img class="lg-d" src="logo-dark.png" alt="Ayla"><h1>${reg?"Ro'yxatdan o'tish":'Kirish'}</h1><p class="sub">${reg?"Admin tasdiqlagach ilovadan foydalana olasiz":'Ayla ishlab chiqarish hisobi'}</p>
  <form id="authf" novalidate>
   ${reg?`<label class="fl" for="a_name"><span>Ism familiya</span><input id="a_name" autocomplete="name"></label>`:''}
   <label class="fl" for="a_login"><span>Login</span><input id="a_login" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="masalan: dilnoza"></label>
   <label class="fl" for="a_pass"><span>Parol</span><input id="a_pass" type="password" autocomplete="${reg?'new-password':'current-password'}" placeholder="kamida 6 belgi"></label>
   <div class="err" id="aerr" role="alert"></div>
   <button class="btn pri" type="submit">${reg?"Ro'yxatdan o'tish":'Kirish'}</button>
  </form>
  <button class="linkb" data-act="authmode">${reg?'Akkauntim bor, kirish':"Yangi xodimman, ro'yxatdan o'tish"}</button></div>`;
}
function vStaff(){
  const mine=sortD([...D.prd.filter(p=>p.by===me).map(p=>Object.assign({_c:'prd'},p)),...D.job.filter(j=>j.by===me).map(j=>Object.assign({_c:'job'},j))]).slice(0,40);
  return `<div class="wrap"><h1>Salom, ${esc(S.myName||'')}</h1><p class="sub">${esc(fd(td()))} · ishlab chiqarish</p>
  <div class="acts">${btn('job-new','Bajarilgan ish',{pri:1,icon:'plus'})}${btn('prd-new','Ishlab chiqarildi',{icon:'plus'})}</div>
  <div class="sh"><h2>Modellar</h2></div>
  <div class="mgrid cgrid">${byName(D.cat).map(m=>`<button class="mcard" data-act="cat" data-id="${esc(m.id)}"><div class="mimg">${imgTag(m.id,m.name)}</div><div class="mh"><b>${esc(m.name)}</b><span>${esc(m.code||'')}</span></div></button>`).join('')||empty("Hali model qo'shilmagan")}</div>
  <div class="sh"><h2>Mening kiritganlarim</h2></div>
  <div class="list">${mine.map(x=>x._c==='prd'?txRow('prd',x,'Ishlab chiqarildi · '+nm('mdl',x.mdl),[x.note],fq(x.pairs)+' juft'):txRow('job',x,nm('wkr',x.wkr)+' · '+x.op,[nm('mdl',x.mdl)],fq(x.pairs)+' juft')).join('')||empty('Hali hech narsa kiritmadingiz')}</div></div>`;
}
function catSheet(id){
  const m=getM(id);if(!m)return closeSheet();
  const bom=(m.bom||[]).map(b=>{const mt=get('mat',b.mat);return `<tr><td>${esc(mt?.name||'?')}</td><td class="n">${fq(b.qty)} ${esc(mt?.unit||'')}</td></tr>`}).join('');
  openSheet(m.name+(m.code?' · '+m.code:''),`<div class="mimg big">${imgTag(id,m.name)}</div>
  <div class="acts"><button class="btn pri w" data-act="prd-new" data-id="${esc(id)}">${I.plus}Ishlab chiqarildi</button><button class="btn w" data-act="job-new" data-m="${esc(id)}">${I.plus}Bajarilgan ish</button></div>
  <h3 class="h3">1 juftga ketadigan xom ashyo</h3><div class="scroll"><table class="tb"><tbody>${bom||'<tr><td class="mut">Kiritilmagan</td></tr>'}</tbody></table></div>
  <h3 class="h3">Ish turlari</h3><p>${esc(opNames(m).join(', ')||'—')}</p>`,{detail:()=>catSheet(id)});
}
/* admin client keeps the shared catalog (cat) in step with models and prices staff work entries */
let mtT=0;const mtDone=new Set();
function maint(){clearTimeout(mtT);mtT=setTimeout(async()=>{
  if(!S.admin||S.ro||!(S.mode==='local'||S.loaded))return;const list=[];
  D.mdl.forEach(m=>{const c=get('cat',m.id),w=catDoc(m,c?.img||''),k='c'+m.id+JSON.stringify([w.name,w.code,w.bom,w.ops]);
    if(c&&c.name===w.name&&(c.code||'')===w.code&&JSON.stringify(c.bom||[])===JSON.stringify(w.bom)&&JSON.stringify(c.ops||[])===JSON.stringify(w.ops))return;
    if(mtDone.has(k))return;mtDone.add(k);list.push(['cat',Object.assign(w,{ts:c?.ts||w.ts}),m.id])});
  D.cat.forEach(c=>{if(!get('mdl',c.id)&&!mtDone.has('x'+c.id)){mtDone.add('x'+c.id);list.push(['cat',null,c.id])}});
  D.job.forEach(j=>{if(!(j.pend||j.rate==null)||mtDone.has('j'+j.id))return;const m=get('mdl',j.mdl),o=(m?.ops||[]).find(x=>x&&x.name===j.op&&num(x.rate)>0);if(!o)return;mtDone.add('j'+j.id);const r=Object.assign({},j,{rate:num(o.rate),sum:Math.round(num(j.pairs)*num(o.rate))});delete r.pend;list.push(['job',r,j.id])});
  if(list.length)try{await many(list)}catch(e){console.error(e)}
},900)}
async function shrink(file,max=900,q=.74){
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
    const k=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k);
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
    let d=c.toDataURL('image/jpeg',q);if(d.length>240000)d=c.toDataURL('image/jpeg',.55);if(!IMGRE.test(d))throw new Error('img');return d}finally{URL.revokeObjectURL(url)}
}
function render(){
  const ae=document.activeElement,fid=ae&&ae.id&&$('#view').contains(ae)?ae.id:null,sel=fid&&typeof ae.selectionStart==='number'?[ae.selectionStart,ae.selectionEnd]:null;
  const fbOut=S.mode==='firebase'&&S.auth!=='in';
  const staff=S.mode==='firebase'&&S.auth==='in'&&!S.admin;
  document.body.classList.toggle('ro',S.ro);document.body.classList.toggle('noapp',fbOut);document.body.classList.toggle('staff',staff);
  const mc=$('#mode');mc.textContent=!S.online?'Oflayn':S.mode==='cloud'?'Umumiy baza':S.mode==='firebase'?(S.myName||'Onlayn'):S.mode==='local'?'Shu qurilmada':'Yuklanmoqda';mc.classList.toggle('off',!S.online);
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-current',b.dataset.v===S.view?'page':'false'));
  const v=$('#view');
  if(fbOut){v.innerHTML=vAuth();return}
  if(S.mode==='loading'||((S.mode==='cloud'||S.mode==='firebase')&&!S.loaded)){v.innerHTML=`<div class="wrap"><p class="mut">Ma'lumotlar yuklanmoqda…</p></div>`;return}
  C=calc();
  const pend=S.mode==='firebase'&&S.admin&&D.requests.length;
  const note=(S.stale?`<div class="wrap" style="padding-bottom:0"><div class="note">Baza hali to'liq javob bermadi, ko'rsatilgan raqamlar eskirgan bo'lishi mumkin.</div></div>`:'')+(S.ro?`<div class="wrap" style="padding-bottom:0"><div class="note">Sizda faqat ko'rish huquqi bor.</div></div>`:'')+(pend?`<div class="wrap" style="padding-bottom:0"><div class="smp"><span>${D.requests.length} ta yangi xodim tasdiq kutmoqda</span><button class="btn sm" data-act="set">Ko'rish</button></div></div>`:'');
  v.innerHTML=note+(staff?vStaff():({asosiy:vHome,ombor:vStore,modellar:vProd,ishchilar:vWork,mijozlar:vClients}[S.view]||vHome)());
  if(fid){const n=document.getElementById(fid);if(n){n.focus();if(sel)try{n.setSelectionRange(sel[0],sel[1])}catch(e){}}}
  if(S.detail&&!$('#sheet').hidden)S.detail();
  if(S.mode==='cloud')refreshNames();
  if(S.admin&&!S.ro)maint();
}

/* ================= sheets & forms ================= */
function openSheet(title,html,o={}){$('#shT').textContent=title;$('#shB').innerHTML=html;$('#sheet').hidden=false;S.detail=o.detail||null;if(!o.detail)F=o.form||null}
function closeSheet(){$('#sheet').hidden=true;S.detail=null;F=null;S.txBack=null}
function toast(msg,act){const t=$('#toast');t.innerHTML='';const s=document.createElement('span');s.textContent=msg;t.appendChild(s);if(act){const b=document.createElement('button');b.textContent=act.label;b.onclick=()=>{t.hidden=true;act.fn()};t.appendChild(b)}t.hidden=false;clearTimeout(tt);tt=setTimeout(()=>t.hidden=true,act?6000:2800)}
function fh(f){
  const id='f_'+f.id,v=f.value??'';
  if(f.type==='html')return f.html;
  if(f.type==='img')return `<div class="fl"><span>${esc(f.label)}</span><div class="imgbox"><div class="mimg" id="f_imgp">${v&&IMGRE.test(v)?`<img src="${esc(v)}" alt="">`:noImg}</div><div class="acts"><label class="btn sm">Rasm tanlash<input type="file" accept="image/*" id="f_imgf" hidden></label><button type="button" class="btn sm" data-act="imgdel">Olib tashlash</button></div></div><input type="hidden" name="${f.id}" id="${id}" value="${esc(v)}"><small class="hint">Telefon kamerasi yoki galereyadan. Rasm avtomatik kichraytiriladi.</small></div>`;
  if(f.type==='rows')return `<div class="fl"><span>${esc(f.label)}</span><div class="rows" data-rows="${f.id}">${(f.value||[]).map(r=>rowIn(f,r)).join('')}</div><div class="acts" style="margin:0"><button type="button" class="btn sm" data-act="addrow" data-r="${f.id}">${I.plus}${esc(f.add)}</button>${f.newMat?`<button type="button" class="btn sm" data-act="newmat">${I.plus}Yangi xom ashyo</button>`:''}</div>${f.newMat?`<div class="newmat" id="nmbox" hidden><input id="nm_name" placeholder="Nomi, masalan: Natural teri" autocomplete="off" aria-label="Yangi xom ashyo nomi"><select id="nm_unit" aria-label="O'lchov birligi">${opt(UNITS.map(u=>[u,u]),'m²','')}</select><button type="button" class="btn sm pri" data-act="newmat-save">Qo'shish</button></div>`:''}${f.hint?`<small class="hint">${esc(f.hint)}</small>`:''}</div>`;
  let inp;
  if(f.type==='sel')inp=`<select id="${id}" name="${f.id}">${opt(f.opts,v,f.noPh?'':'Tanlang…')}</select>`;
  else if(f.type==='area')inp=`<textarea id="${id}" name="${f.id}" placeholder="${esc(f.ph||'')}">${esc(v)}</textarea>`;
  else{const t=f.type==='date'?'date':f.type==='tel'?'tel':'text',im=f.type==='num'?' inputmode="decimal"':f.type==='money'?' inputmode="numeric"':'';
    const val=f.type==='money'?(num(v)?grp(v):''):f.type==='num'?(v===''?'':String(v).replace('.',',')):v;
    inp=`<input id="${id}" name="${f.id}" type="${t}"${im} class="${f.type}" value="${esc(val)}" placeholder="${esc(f.ph||'')}" autocomplete="off">`}
  return `<label class="fl" for="${id}"><span>${esc(f.label)}${f.req?' <i class="req">*</i>':''}</span>${inp}${f.hint?`<small class="hint">${esc(f.hint)}</small>`:''}</label>`;
}
function rowIn(f,r={}){
  return `<div class="rw ${f.cls||''}">${f.cols.map(c=>{const v=r[c.k]??'';if(c.t==='sel')return `<select data-k="${c.k}" aria-label="${esc(c.ph)}">${opt(c.opts(),v,c.ph)}</select>`;
    const im=c.t==='num'?'decimal':c.t==='money'?'numeric':'text',val=c.t==='money'?(num(v)?grp(v):''):c.t==='num'?(v===''?'':String(v).replace('.',',')):v;
    return `<input data-k="${c.k}" class="${c.t}" type="text" inputmode="${im}" value="${esc(val)}" placeholder="${esc(c.ph)}" aria-label="${esc(c.ph)}" autocomplete="off">`}).join('')}<button type="button" class="x" data-act="delrow" aria-label="Olib tashlash">${I.x}</button></div>`;
}
function form(title,fields,save,o={}){
  openSheet(title,`<form id="frm" novalidate>${fields.map(fh).join('')}<div class="live" id="live"></div><div class="err" id="ferr" role="alert"></div><div class="fbtn"><button type="submit" class="btn pri">${esc(o.btn||'Saqlash')}</button>${o.del?`<button type="button" class="btn del" data-act="fdel">O'chirish</button>`:''}</div>${o.foot||''}</form>`,{form:{fields,save,live:o.live,del:o.del,back:o.back||null,msg:o.msg}});
  F.st={};liveRun();
}
function vals(){
  const frm=$('#frm'),o={};
  F.fields.forEach(f=>{
    if(f.type==='html')return;
    if(f.type==='rows'){o[f.id]=[...frm.querySelectorAll(`[data-rows="${f.id}"] .rw`)].map(rw=>{const r={};f.cols.forEach(c=>{const el=rw.querySelector(`[data-k="${c.k}"]`);r[c.k]=c.t==='sel'||c.t==='text'?el.value.trim():num(el.value)});return r}).filter(f.keep);return}
    const el=frm.elements[f.id];o[f.id]=f.type==='num'||f.type==='money'?num(el.value):el.value.trim();
  });
  return o;
}
function liveRun(){if(!F||!F.live||!$('#frm'))return;try{F.live(vals(),$('#live'),$('#frm'),F.st)}catch(e){console.error(e)}}
const delOpt=(c,id,rec,used,what)=>({del:id&&!used&&canDel(rec)?()=>delRec(c,id):null,foot:used?`<p class="hint">Bu ${what} yozuvlarda ishlatilgan, shuning uchun o'chirib bo'lmaydi.</p>`:''});

function matForm(id,back){
  const m=id?get('mat',id):null,used=id&&refs.mat(id);
  form(m?'Xom ashyoni tahrirlash':'Yangi xom ashyo',[
    {id:'name',label:'Nomi',type:'text',value:m?.name,req:1,ph:'Masalan: Natural teri (qora)'},
    {id:'unit',label:"O'lchov birligi",type:'sel',opts:UNITS.map(u=>[u,u]),value:m?.unit||'m²',noPh:1},
    {id:'min',label:'Kam qolganda ogohlantirish',type:'num',value:m?.min??'',ph:'Masalan: 20',hint:'Qoldiq shu miqdordan kam bo‘lsa, qizil bilan belgilanadi'}
  ],async v=>{await put('mat',Object.assign({},m||stamp({}),{name:v.name,unit:v.unit,min:v.min}),id)},Object.assign({back},delOpt('mat',id,m,used,'xom ashyo')));
}
function mvForm(kind,matId,back){
  if(!D.mat.length){toast("Avval xom ashyo qo'shing");return matForm()}
  const s0=matId?C.ms[matId]:null,isIn=kind==='in';
  const f=[{id:'mat',label:'Xom ashyo',type:'sel',opts:matO(),value:matId,req:1},{id:'qty',label:'Miqdor',type:'num',req:1,ph:'0'}];
  if(isIn)f.push({id:'price',label:"Narxi (1 birlik uchun, so'm)",type:'money',value:s0?Math.round(s0.avg):'',req:1});
  f.push({id:'date',label:'Sana',type:'date',value:td()},{id:'note',label:isIn?'Kimdan olindi':'Sabab',type:'text',ph:isIn?'Yetkazib beruvchi':'Brak, qaytarish, boshqa sexga…'});
  form(isIn?'Xom ashyo kirimi':'Xom ashyo chiqimi',f,async v=>{await put('mv',stamp({kind,mat:v.mat,qty:v.qty,price:isIn?v.price:0,sum:isIn?Math.round(v.qty*v.price):0,date:v.date||td(),note:v.note}))},{back,live:(v,box,frm,st)=>{
    const s=C.ms[v.mat],m=get('mat',v.mat);if(!m){box.innerHTML='';return}
    let pr=0;if(isIn){const el=frm.elements.price;if(v.mat!==st.m){if(st.m!==undefined&&!el.dataset.d&&s.avg)el.value=grp(s.avg);st.m=v.mat}pr=num(el.value)}else st.m=v.mat;
    const after=s.qty+(isIn?v.qty:-v.qty);
    box.innerHTML=(isIn?`<div class="lr"><span>Jami summa</span><b>${sm(v.qty*pr)}</b></div>`:'')+`<div class="lr"><span>Qoldiq</span><b class="${after<0?'red':''}">${fq(s.qty)} → ${fq(after)} ${esc(m.unit)}</b></div>`;
  }});
}
function mdlForm(id,back){
  const m=id?get('mdl',id):null,used=id&&refs.mdl(id);
  form(m?'Modelni tahrirlash':'Yangi model',[
    {id:'img',label:'Rasm',type:'img',value:id?imgOf(id):''},
    {id:'name',label:'Model nomi',type:'text',value:m?.name,req:1,ph:'Masalan: Klassik tufli (erkak)'},
    {id:'code',label:'Artikul',type:'text',value:m?.code,ph:'K-101'},
    {id:'price',label:"Sotuv narxi, 1 juft (so'm)",type:'money',value:m?.price,req:1},
    {id:'bom',label:'1 juftga ketadigan xom ashyo',type:'rows',add:'Qator',newMat:1,value:m?.bom||(D.mat.length?[{}]:[]),cols:[{k:'mat',t:'sel',opts:matO,ph:'Xom ashyo'},{k:'qty',t:'num',ph:'Miqdor'}],keep:r=>r.mat&&r.qty>0,hint:D.mat.length?'Narx ombordagi o‘rtacha kirim narxidan olinadi':'Xom ashyoni shu yerning o‘zida qo‘shing yoki keyin to‘ldiring. Narxi omborga kirim kiritilgach hisoblanadi'},
    {id:'ops',label:'Ish haqi, 1 juft uchun (donabay)',type:'rows',add:'Operatsiya',value:m?.ops||OPS0.map(n=>({name:n})),cols:[{k:'name',t:'text',ph:'Operatsiya'},{k:'rate',t:'money',ph:"so'm"}],keep:r=>r.name},
    {id:'extra',label:"Boshqa xarajat, 1 juftga (so'm)",type:'money',value:m?.extra,hint:'Ijara, svet ulushi va h.k. Faqat narx hisobida; oylik foydada haqiqiy xarajatlar olinadi'}
  ],async v=>{const mid=id||uid(),md=Object.assign({},m||stamp({}),{name:v.name,code:v.code,price:v.price,bom:v.bom,ops:v.ops,extra:v.extra});await many([['mdl',md,mid],['cat',catDoc(md,v.img),mid]])},Object.assign({back,live:(v,box)=>{
    const c=C.cost(v);box.innerHTML=kvH([['Xom ashyo',sm(c.mat)],['Ish haqi',sm(c.lab)],['Boshqa',sm(c.ex)],['Tannarx, 1 juft',sm(c.tot),'tot'],['Foyda, 1 juft',sm(c.pr)+' · '+pct(c.mg),c.pr<0?'red':'grn']]);
  }},delOpt('mdl',id,m,used,'model')));
}
function prdForm(mdlId,back){
  if(!MD().length){toast(S.admin?"Avval model qo'shing":"Hali model yo'q");return S.admin?mdlForm():null}
  form('Ishlab chiqarildi',[
    {id:'mdl',label:'Model',type:'sel',opts:mdlO(),value:mdlId,req:1},
    {id:'pairs',label:'Soni (juft)',type:'num',req:1,ph:'0'},
    {id:'date',label:'Sana',type:'date',value:td()},
    {id:'note',label:'Izoh',type:'text',ph:'Partiya, rang, razmerlar…'}
  ],async v=>{const m=getM(v.mdl);await put('prd',stamp({mdl:v.mdl,pairs:v.pairs,date:v.date||td(),note:v.note,use:(m.bom||[]).map(b=>({mat:b.mat,qty:Math.round(num(b.qty)*v.pairs*1000)/1000}))}))},{back,msg:"Saqlandi, xom ashyo ombordan ayirildi",live:(v,box)=>{
    const m=getM(v.mdl);if(!m||!v.pairs){box.innerHTML=m?`<p class="mut" style="margin:0">Soni kiritilsa, kerakli xom ashyo ko'rsatiladi.</p>`:'';return}
    let short=0;const rows=(m.bom||[]).map(b=>{const need=num(b.qty)*v.pairs,have=C.ms[b.mat]?.qty||0,mt=get('mat',b.mat);if(S.admin&&need>have)short=1;return `<tr class="${S.admin&&need>have?'red':''}"><td>${esc(mt?.name||'?')}</td><td class="n">${fq(need)} ${esc(mt?.unit||'')}</td>${S.admin?`<td class="n">${fq(have)}</td>`:''}</tr>`}).join('');
    box.innerHTML=`<div class="scroll"><table class="tb"><thead><tr><th>Xom ashyo</th><th class="n">Kerak</th>${S.admin?'<th class="n">Omborda</th>':''}</tr></thead><tbody>${rows}</tbody></table></div>${short?`<p class="warn">Ba'zi xom ashyo yetmaydi. Baribir saqlash mumkin, qoldiq minusga tushadi.</p>`:''}${S.admin?`<div class="lr"><span>Taxminiy tannarx</span><b>${sm(C.cost(m).tot*v.pairs)}</b></div>`:''}`;
  }});
}
function wkrForm(id,back){
  const w=id?get('wkr',id):null,used=id&&refs.wkr(id);
  form(w?'Ishchini tahrirlash':'Yangi ishchi',[
    {id:'name',label:'Ism familiya',type:'text',value:w?.name,req:1},
    {id:'role',label:'Vazifasi',type:'text',value:w?.role,ph:'Bichuvchi, tikuvchi, zakatovkachi…'},
    {id:'phone',label:'Telefon',type:'tel',value:w?.phone,ph:'+998'}
  ],async v=>{await put('wkr',Object.assign({},w||stamp({}),{name:v.name,role:v.role,phone:fmtPhone(v.phone)}),id)},Object.assign({back},delOpt('wkr',id,w,used,'ishchi')));
}
function jobForm(wkrId,back,mdlId){
  if(!D.wkr.length){toast(S.admin?"Avval ishchi qo'shing":"Ishchilar ro'yxati bo'sh, admin qo'shishi kerak");return S.admin?wkrForm():null}
  if(!MD().length){toast(S.admin?"Avval model qo'shing":"Hali model yo'q");return S.admin?mdlForm():null}
  const last=sortD(D.job.filter(j=>!wkrId||j.wkr===wkrId))[0],m0=mdlId?getM(mdlId):(last?getM(last.mdl):null);
  const opsOf=m=>opNames(m).map(n=>[n,n]).concat([['Boshqa ish','Boshqa ish']]);
  const f=[
    {id:'wkr',label:'Ishchi',type:'sel',opts:wkrO(),value:wkrId,req:1},
    {id:'mdl',label:'Model',type:'sel',opts:mdlO(),value:m0?.id,req:1},
    {id:'op',label:'Ish turi',type:'sel',opts:opsOf(m0),value:(last&&last.mdl===m0?.id&&last.op)||opNames(m0)[0],req:1},
    {id:'pairs',label:'Soni (juft)',type:'num',req:1,ph:'0'}];
  if(S.admin)f.push({id:'rate',label:"Narxi, 1 juft (so'm)",type:'money',req:1,hint:"Modeldagi narx o'zi qo'yiladi, o'zgartirish mumkin"});
  f.push({id:'date',label:'Sana',type:'date',value:td()},{id:'note',label:'Izoh',type:'text'});
  form('Bajarilgan ish',f,async v=>{
    if(S.admin)await put('job',stamp({wkr:v.wkr,mdl:v.mdl,op:v.op,pairs:v.pairs,rate:v.rate,sum:Math.round(v.pairs*v.rate),date:v.date||td(),note:v.note}));
    else await put('job',stamp({wkr:v.wkr,mdl:v.mdl,op:v.op,pairs:v.pairs,pend:true,date:v.date||td(),note:v.note}));
  },{back,live:(v,box,frm,st)=>{
    const m=getM(v.mdl),os=frm.elements.op,rt=frm.elements.rate;
    if(st.m===undefined)st.m=v.mdl;
    if(v.mdl!==st.m){st.m=v.mdl;const cur=os.value,list=opsOf(m);os.innerHTML=opt(list,list.some(x=>x[0]===cur)?cur:(list[0]||[''])[0]);st.o=null}
    if(!rt){box.innerHTML='';return}
    if(os.value!==st.o){st.o=os.value;const o=(m?.ops||[]).find(x=>x&&x.name===os.value);if(o&&!rt.dataset.d)rt.value=num(o.rate)?grp(o.rate):''}
    box.innerHTML=`<div class="lr"><span>Hisoblandi</span><b>${sm(num(frm.elements.pairs.value)*num(rt.value))}</b></div>`;
  }});
}
function jobRateForm(id,back){
  const j=get('job',id);if(!j)return;
  form('Ishga narx qo‘yish',[
    {id:'info',type:'html',html:`<p class="mut">${esc(nm('wkr',j.wkr))} · ${esc(j.op)} · ${esc(nm('mdl',j.mdl))} · ${fq(j.pairs)} juft · ${esc(fd(j.date))}</p>`},
    {id:'rate',label:"Narxi, 1 juft (so'm)",type:'money',req:1}
  ],async v=>{const r=Object.assign({},j,{rate:v.rate,sum:Math.round(num(j.pairs)*v.rate)});delete r.pend;await put('job',r,id)},{back,live:(v,box)=>{box.innerHTML=`<div class="lr"><span>Hisoblandi</span><b>${sm(num(j.pairs)*v.rate)}</b></div>`}});
}
function payForm(wkrId,back){
  if(!D.wkr.length){toast("Avval ishchi qo'shing");return wkrForm()}
  form("Ishchiga to'lov",[
    {id:'wkr',label:'Ishchi',type:'sel',opts:wkrO(),value:wkrId,req:1},
    {id:'amount',label:"Summa (so'm)",type:'money',req:1},
    {id:'date',label:'Sana',type:'date',value:td()},
    {id:'note',label:'Izoh',type:'text',ph:'Avans, oylik…'}
  ],async v=>{await put('pay',stamp({wkr:v.wkr,amount:v.amount,date:v.date||td(),note:v.note}))},{back,live:(v,box)=>{const s=C.ws[v.wkr];if(!s){box.innerHTML='';return}box.innerHTML=`<div class="lr"><span>Qarzimiz</span><b>${sm(s.owe)} → ${sm(s.owe-v.amount)}</b></div>`}});
}
function cstForm(id,back){
  const c=id?get('cst',id):null,used=id&&refs.cst(id);
  form(c?'Mijozni tahrirlash':'Yangi mijoz',[
    {id:'name',label:"Mijoz yoki do'kon nomi",type:'text',value:c?.name,req:1},
    {id:'phone',label:'Telefon raqami',type:'tel',value:c?.phone,ph:'+998 90 123 45 67',hint:"9 xonali raqamni yozsangiz ham bo'ladi, +998 o'zi qo'shiladi"},
    {id:'phone2',label:'Qo‘shimcha telefon',type:'tel',value:c?.phone2,ph:'+998'},
    {id:'type',label:'Turi',type:'sel',opts:CTYPES.map(t=>[t,t]),value:c?.type||'Optom',noPh:1},
    {id:'tg',label:'Telegram',type:'text',value:c?.tg,ph:'@username'},
    {id:'region',label:'Viloyat',type:'sel',opts:REGIONS.map(r=>[r,r]),value:c?.region},
    {id:'addr',label:'Manzil',type:'text',value:c?.addr,ph:'Bozor, qator, do‘kon raqami'},
    {id:'note',label:'Izoh',type:'area',value:c?.note,ph:'Qaysi modellarni oladi, to‘lov odati…'}
  ],async v=>{await put('cst',Object.assign({},c||stamp({}),{name:v.name,type:v.type,phone:fmtPhone(v.phone),phone2:fmtPhone(v.phone2),tg:tgName(v.tg),region:v.region,addr:v.addr,note:v.note}),id)},Object.assign({back,live:(v,box)=>{
    const ks=[v.phone,v.phone2].map(phoneKey).filter(k=>k.length===9),dup=D.cst.find(x=>x.id!==id&&[x.phone,x.phone2].some(p=>ks.includes(phoneKey(p))));
    const bad=[v.phone,v.phone2].some(p=>p&&digits(p).length<9);
    box.innerHTML=(dup?`<p class="warn" style="margin:0">Bu raqam “${esc(dup.name)}” mijozida ham bor.</p>`:'')+(bad?`<p class="warn" style="margin:0">Telefon raqami to'liq emasga o'xshaydi.</p>`:'');
  }},delOpt('cst',id,c,used,'mijoz')));
}
function saleForm(cstId,back){
  if(!D.cst.length){toast("Avval mijoz qo'shing");return cstForm()}
  if(!D.mdl.length){toast("Avval model qo'shing");return mdlForm()}
  form('Yangi sotuv',[
    {id:'cst',label:'Mijoz',type:'sel',opts:cstO(),value:cstId,req:1},
    {id:'items',label:'Mahsulotlar',type:'rows',cls:'r3',add:'Yana model',value:[{}],req:1,cols:[{k:'mdl',t:'sel',opts:mdlO,ph:'Model'},{k:'pairs',t:'num',ph:'Juft'},{k:'price',t:'money',ph:'Narx'}],keep:r=>r.mdl&&r.pairs>0},
    {id:'paid',label:"Hozir to'landi (so'm)",type:'money',hint:'Qolgani mijoz qarziga yoziladi'},
    {id:'date',label:'Sana',type:'date',value:td()},
    {id:'note',label:'Izoh',type:'text'}
  ],async v=>{
    const id=uid(),items=v.items.map(i=>{const c=C.cost(get('mdl',i.mdl));return {mdl:i.mdl,pairs:i.pairs,price:i.price,cost:Math.round(c.mat+c.lab)}}),sum=Math.round(items.reduce((a,i)=>a+i.pairs*i.price,0));
    const list=[['sale',stamp({cst:v.cst,items,sum,date:v.date||td(),note:v.note}),id]];
    if(v.paid>0)list.push(['cpay',stamp({cst:v.cst,amount:v.paid,date:v.date||td(),note:"Sotuv vaqtida to'landi",sale:id}),uid()]);
    await many(list);
  },{back,live:(v,box,frm)=>{
    let tot=0;const warn=[];
    frm.querySelectorAll('[data-rows=items] .rw').forEach(rw=>{const s=rw.querySelector('[data-k=mdl]'),p=rw.querySelector('[data-k=price]'),q=rw.querySelector('[data-k=pairs]'),m=get('mdl',s.value);
      if(m&&!p.dataset.d&&p.dataset.m!==s.value){p.value=grp(m.price);p.dataset.m=s.value}
      const n=num(q.value);tot+=n*num(p.value);if(m&&n>(C.gd[m.id]?.left||0))warn.push(m.name+': tayyori '+fq(C.gd[m.id]?.left||0)+' juft')});
    const due=tot-v.paid,cd=C.cs[v.cst]?.debt||0;
    box.innerHTML=`<div class="lr"><span>Jami</span><b>${sm(tot)}</b></div><div class="lr"><span>Qarzga qoladi</span><b class="${due>0?'red':''}">${sm(Math.max(0,due))}</b></div>${v.cst?`<div class="lr"><span>Mijozning umumiy qarzi</span><b>${sm(cd)} → ${sm(cd+due)}</b></div>`:''}${warn.length?`<p class="warn">Omborda yetmaydi: ${esc(warn.join('; '))}</p>`:''}`;
  }});
}
function cpayForm(cstId,back){
  if(!D.cst.length){toast("Avval mijoz qo'shing");return cstForm()}
  form("Mijozdan to'lov",[
    {id:'cst',label:'Mijoz',type:'sel',opts:cstO(),value:cstId,req:1},
    {id:'amount',label:"Summa (so'm)",type:'money',req:1},
    {id:'date',label:'Sana',type:'date',value:td()},
    {id:'note',label:'Izoh',type:'text',ph:'Naqd, karta, o‘tkazma…'}
  ],async v=>{await put('cpay',stamp({cst:v.cst,amount:v.amount,date:v.date||td(),note:v.note}))},{back,live:(v,box)=>{const s=C.cs[v.cst];if(!s){box.innerHTML='';return}box.innerHTML=`<div class="lr"><span>Qarzi</span><b>${sm(s.debt)} → ${sm(s.debt-v.amount)}</b></div>`}});
}
function expForm(){
  form('Xarajat',[
    {id:'cat',label:'Turkum',type:'sel',opts:ECATS.map(c=>[c,c]),value:'Ijara',noPh:1},
    {id:'amount',label:"Summa (so'm)",type:'money',req:1},
    {id:'date',label:'Sana',type:'date',value:td()},
    {id:'note',label:'Izoh',type:'text'}
  ],async v=>{await put('exp',stamp({cat:v.cat,amount:v.amount,date:v.date||td(),note:v.note}))});
}

async function newMatInline(){
  const nmI=$('#nm_name'),n=nmI.value.trim(),unit=$('#nm_unit').value;if(!n){toast('Xom ashyo nomini yozing');nmI.focus();return}
  const mid=uid();await put('mat',stamp({name:n,unit,min:0}),mid);
  const label=n+' ('+unit+')',box=$('[data-rows="bom"]');
  box.querySelectorAll('select[data-k=mat]').forEach(sl=>{if(!sl.querySelector(`option[value="${CSS.escape(mid)}"]`))sl.insertAdjacentHTML('beforeend',`<option value="${esc(mid)}">${esc(label)}</option>`)});
  let rw=[...box.querySelectorAll('.rw')].find(x=>!x.querySelector('[data-k=mat]').value);
  if(!rw){box.insertAdjacentHTML('beforeend',rowIn(F.fields.find(x=>x.id==='bom')));rw=box.lastElementChild;const sl=rw.querySelector('[data-k=mat]');if(!sl.querySelector(`option[value="${CSS.escape(mid)}"]`))sl.insertAdjacentHTML('beforeend',`<option value="${esc(mid)}">${esc(label)}</option>`)}
  rw.querySelector('[data-k=mat]').value=mid;nmI.value='';$('#nmbox').hidden=true;rw.querySelector('[data-k=qty]').focus();liveRun();toast(n+' qo‘shildi');
}

/* ================= detail sheets ================= */
function matSheet(id){
  const m=get('mat',id);if(!m)return closeSheet();const s=C.ms[id],low=num(m.min)>0&&s.qty<num(m.min);
  const h=sortD([...D.mv.filter(v=>v.mat===id).map(v=>Object.assign({_c:'mv'},v)),...D.prd.filter(p=>(p.use||[]).some(u=>u.mat===id)).map(p=>Object.assign({_c:'prd'},p))]).slice(0,80);
  openSheet(m.name,`${stats([['Qoldiq',fq(s.qty)+' '+m.unit,low||s.qty<0?'red':''],["O'rtacha narx",sm(s.avg)],['Qiymati',sm(s.val)],['Ogohlantirish',num(m.min)?fq(m.min)+' '+m.unit:'—']])}
  <div class="acts">${btn('kirim','Kirim',{pri:1,icon:'plus',id})}${btn('chiqim','Chiqim',{icon:'minus',id})}${btn('mat-edit','Tahrirlash',{id})}</div>
  <h3 class="h3">Harakatlar</h3><div class="list">${h.map(x=>x._c==='mv'?txRow('mv',x,x.kind==='in'?'Kirim':'Chiqim',[x.note],(x.kind==='in'?'+':'−')+fq(x.qty)+' '+m.unit,x.kind==='in'?sm(x.sum):'',x.kind==='in'?'':'red'):txRow('prd',x,'Ishlab chiqarishga',[nm('mdl',x.mdl)+' · '+fq(x.pairs)+' juft'],'−'+fq((x.use.find(u=>u.mat===id)||{}).qty||0)+' '+m.unit,'','red')).join('')||empty("Hali harakat yo'q")}</div>`,{detail:()=>matSheet(id)});
}
function mdlSheet(id){
  const m=get('mdl',id);if(!m)return closeSheet();const c=C.cost(m),g=C.gd[id],h=sortD(D.prd.filter(p=>p.mdl===id)).slice(0,60);
  const bom=(m.bom||[]).map(b=>{const mt=get('mat',b.mat),a=C.ms[b.mat]?.avg||0;return `<tr><td>${esc(mt?.name||'?')}</td><td class="n">${fq(b.qty)} ${esc(mt?.unit||'')}</td><td class="n">${fm(a)}</td><td class="n">${fm(num(b.qty)*a)}</td></tr>`}).join('');
  const ops=(m.ops||[]).map(o=>`<tr><td>${esc(o.name)}</td><td class="n">${fm(o.rate)}</td></tr>`).join('');
  openSheet(m.name+(m.code?' · '+m.code:''),`<div class="mimg big">${imgTag(id,m.name)}</div>${stats([['Tannarx, 1 juft',sm(c.tot)],['Sotuv narxi',sm(m.price)],['Foyda, 1 juft',sm(c.pr)+' · '+pct(c.mg),c.pr<0?'red':'grn'],['Tayyor qoldiq',fq(g.left)+' juft',g.left<0?'red':'']])}
  <div class="acts">${btn('prd-new','Ishlab chiqarildi',{pri:1,icon:'plus',id})}${btn('mdl-edit','Tahrirlash',{id})}</div>
  <h3 class="h3">Xom ashyo, 1 juft: ${sm(c.mat)}</h3><div class="scroll"><table class="tb"><thead><tr><th>Nomi</th><th class="n">Miqdor</th><th class="n">Narx</th><th class="n">Summa</th></tr></thead><tbody>${bom||'<tr><td colspan="4" class="mut">Kiritilmagan</td></tr>'}</tbody></table></div>
  <h3 class="h3">Ish haqi, 1 juft: ${sm(c.lab)}</h3><div class="scroll"><table class="tb"><tbody>${ops||'<tr><td class="mut">Kiritilmagan</td></tr>'}</tbody></table></div>
  <p class="mut">Boshqa xarajat, 1 juft: ${sm(c.ex)}. Jami ishlab chiqarildi ${fq(g.made)}, sotildi ${fq(g.sold)} juft.</p>
  <h3 class="h3">Ishlab chiqarish tarixi</h3><div class="list">${h.map(p=>txRow('prd',p,fq(p.pairs)+' juft',[p.note],'')).join('')||empty("Hali yozuv yo'q")}</div>`,{detail:()=>mdlSheet(id)});
}
function wkrSheet(id){
  const w=get('wkr',id);if(!w)return closeSheet();const s=C.ws[id];
  const h=sortD([...D.job.filter(j=>j.wkr===id).map(j=>Object.assign({_c:'job'},j)),...D.pay.filter(p=>p.wkr===id).map(p=>Object.assign({_c:'pay'},p))]).slice(0,100);
  openSheet(w.name,`${w.role?`<p class="mut" style="margin:0 0 10px">${esc(w.role)}</p>`:''}${w.phone?`<div class="contact"><a href="${esc(telHref(w.phone))}">${esc(w.phone)}</a></div>`:''}${stats([['Qarzimiz',sm(s.owe),s.owe<0?'red':''],['Bu oy ishladi',sm(s.mon)],['Jami ishladi',sm(s.earn)],["Jami to'landi",sm(s.paid)]])}
  <div class="acts">${btn('job-new','Bajarilgan ish',{pri:1,icon:'plus',id})}${btn('pay-new',"To'lov",{icon:'plus',id})}${btn('wkr-edit','Tahrirlash',{id})}</div>
  <h3 class="h3">Tarix</h3><div class="list">${h.map(x=>x._c==='job'?txRow('job',x,x.op,[nm('mdl',x.mdl)+' · '+fq(x.pairs)+' juft × '+fm(x.rate)],'+'+sm(x.sum)):txRow('pay',x,"To'lov",[x.note],'−'+sm(x.amount),'','red')).join('')||empty("Hali yozuv yo'q")}</div>`,{detail:()=>wkrSheet(id)});
}
function cstSheet(id){
  const c=get('cst',id);if(!c)return closeSheet();const s=C.cs[id],tg=tgName(c.tg);
  const h=sortD([...D.sale.filter(x=>x.cst===id).map(x=>Object.assign({_c:'sale'},x)),...D.cpay.filter(p=>p.cst===id).map(p=>Object.assign({_c:'cpay'},p))]).slice(0,100);
  const links=[c.phone&&`<a href="${esc(telHref(c.phone))}">${esc(c.phone)}</a>`,c.phone2&&`<a href="${esc(telHref(c.phone2))}">${esc(c.phone2)}</a>`,tg&&`<a href="https://t.me/${esc(tg)}" target="_blank" rel="noopener">Telegram: @${esc(tg)}</a>`].filter(Boolean).join('');
  openSheet(c.name,`<p class="mut" style="margin:0 0 10px">${esc([c.type,c.region,c.addr].filter(Boolean).join(' · '))}</p>${links?`<div class="contact">${links}</div>`:''}
  ${stats([['Qarzi',sm(s.debt),s.debt>0?'red':''],['Jami xarid',sm(s.buy)],['Jami juft',fq(s.pairs)+' juft'],['Oxirgi xarid',s.last?fd(s.last):'—']])}
  ${s.top?`<p class="mut">Eng ko'p olgan modeli: ${esc(nm('mdl',s.top))}. Xaridlar soni: ${s.n}.</p>`:''}${c.note?`<p>${esc(c.note)}</p>`:''}
  <div class="acts">${btn('sale-new','Sotuv',{pri:1,icon:'plus',id})}${btn('cpay-new',"To'lov qabul",{icon:'plus',id})}${btn('cst-edit','Tahrirlash',{id})}${(c.phone||c.phone2)&&S.mode!=='cloud'?`<button class="btn" data-act="vcf" data-id="${esc(id)}">Kontaktlarga saqlash</button>`:''}</div>
  <h3 class="h3">Tarix</h3><div class="list">${h.map(x=>x._c==='sale'?txRow('sale',x,'Sotuv',[(x.items||[]).map(i=>nm('mdl',i.mdl)+' ×'+fq(i.pairs)).join(', ')],'+'+sm(x.sum)):txRow('cpay',x,"To'lov",[x.note],'−'+sm(x.amount),'','grn')).join('')||empty("Hali yozuv yo'q")}</div>`,{detail:()=>cstSheet(id)});
}
function txSheet(c,id,back){
  const r=get(c,id);if(!r){if(back)back();else closeSheet();return}
  let t='',kv=[];
  if(c==='mv'){const m=get('mat',r.mat);t=r.kind==='in'?'Xom ashyo kirimi':'Xom ashyo chiqimi';kv=[['Xom ashyo',m?.name||'—'],['Miqdor',fq(r.qty)+' '+(m?.unit||'')]];if(r.kind==='in')kv.push(['Narx, 1 birlik',sm(r.price)],['Summa',sm(r.sum)])}
  if(c==='prd'){t='Ishlab chiqarish';kv=[['Model',nm('mdl',r.mdl)],['Soni',fq(r.pairs)+' juft']];(r.use||[]).forEach(u=>{const m=get('mat',u.mat);kv.push(['Sarflandi: '+(m?.name||'?'),fq(u.qty)+' '+(m?.unit||'')])})}
  if(c==='job'){t='Bajarilgan ish';kv=[['Ishchi',nm('wkr',r.wkr)],['Model',nm('mdl',r.mdl)],['Ish turi',r.op],['Soni',fq(r.pairs)+' juft']];if(S.admin)kv.push(r.rate==null?['Narx','qo‘yilmagan','red']:['Narx, 1 juft',sm(r.rate)],r.rate==null?['Hisoblandi','—']:['Hisoblandi',sm(r.sum)])}
  if(c==='pay'){t="Ishchiga to'lov";kv=[['Ishchi',nm('wkr',r.wkr)],['Summa',sm(r.amount)]]}
  if(c==='sale'){t='Sotuv';kv=[['Mijoz',nm('cst',r.cst)]];(r.items||[]).forEach(i=>kv.push([nm('mdl',i.mdl),fq(i.pairs)+' × '+fm(i.price)+' = '+sm(i.pairs*i.price)]));kv.push(['Jami',sm(r.sum),'tot'])}
  if(c==='cpay'){t="Mijoz to'lovi";kv=[['Mijoz',nm('cst',r.cst)],['Summa',sm(r.amount)]]}
  if(c==='exp'){t='Xarajat';kv=[['Turkum',r.cat],['Summa',sm(r.amount)]]}
  kv.push(['Sana',fd(r.date)]);if(r.note)kv.push(['Izoh',r.note]);if(who(r.by))kv.push(['Kiritdi',who(r.by)]);
  const linked=c==='sale'&&D.cpay.some(p=>p.sale===id),ok=canDel(r);S.txBack=back;
  openSheet(t,`${kvH(kv)}${linked&&ok?`<p class="mut">Shu sotuv bilan kiritilgan to'lov ham birga o'chadi.</p>`:''}<div class="fbtn">${ok?`<button class="btn del" data-act="txdel" data-c="${c}" data-id="${esc(id)}">O'chirish</button>`:''}${back?`<button class="btn" data-act="back">Orqaga</button>`:''}</div><p class="hint">${ok?"Xato kiritilgan bo'lsa, o'chirib qayta kiriting.":"Bu yozuvni faqat admin yoki uni kiritgan xodim o'chira oladi."}</p>`,{detail:()=>txSheet(c,id,back)});
}

/* ================= settings ================= */
function setSheet(){
  const smp=COLS.some(c=>D[c].some(x=>x.smp)),cnt=COLS.reduce((a,c)=>a+D[c].length,0);
  let where='';
  if(S.mode==='cloud')where=`<p>Claude'dagi umumiy bazada. Huquqi bor har bir xodim bir xil ma'lumotni ko'radi.</p><h3>Xodimlarni qo'shish</h3><p>Claude'da sahifaning <b>Share</b> tugmasi orqali xodimni email bilan taklif qiling va <b>Editor</b> huquqini bering.</p>`;
  else if(S.mode==='firebase')where=`<p>Firebase bazasida. ${S.admin?"Pul hisoblari (foyda, tannarx, narxlar, qarzlar, maoshlar) faqat adminlarga ko'rinadi; xodimlar modellar, ishlab chiqarish va bajarilgan ishni kiritadi.":"Siz modellar, ishlab chiqarish va bajarilgan ishni kiritasiz."} Internet bo'lmasa ham kiritish mumkin, ulanganda o'zi yuboriladi.</p><p>Siz: <b>${esc(S.myName||'')}</b> · ${S.admin?'admin':'xodim'}</p><div class="acts"><button class="btn" data-act="logout">Chiqish</button></div>`;
  else where=`<p>Faqat shu qurilma brauzerida${S.noLS?" (bu brauzer saqlashga ruxsat bermadi)":''}. Muntazam zaxira nusxa oling.</p>`;
  let users='';
  if(S.mode==='firebase'&&S.admin){
    const req=D.requests.map(r=>`<div class="urow"><span><b>${esc(r.name||'—')}</b><br><small class="mut">login: ${esc(r.login||'')}</small></span><span class="acts"><button class="btn pri sm" data-act="ap" data-id="${esc(r.id)}" data-r="xodim">Qabul</button><button class="btn sm" data-act="ap" data-id="${esc(r.id)}" data-r="admin">Admin qilib</button><button class="btn sm del" data-act="rj" data-id="${esc(r.id)}">Rad</button></span></div>`).join('');
    const mem=byName(D.members).map(m=>{const own=m.id===S.ownerUid,self=m.id===me;return `<div class="urow"><span><b>${esc(m.name||'—')}</b><br><small class="mut">${esc(m.login||'')} · ${own?'egasi':m.role==='admin'?'admin':'xodim'}</small></span>${own||self?'':`<span class="acts"><button class="btn sm" data-act="role" data-id="${esc(m.id)}">${m.role==='admin'?'Xodim qilish':'Admin qilish'}</button><button class="btn sm del" data-act="unmem" data-id="${esc(m.id)}">Chiqarish</button></span>`}</div>`}).join('');
    users=`<h3>Yangi xodimlar so'rovi</h3>${req||'<p class="mut">Yangi so‘rov yo‘q. Xodim ilovada “Ro‘yxatdan o‘tish”ni bosib login va parol tanlaydi, keyin bu yerda paydo bo‘ladi.</p>'}<h3>Foydalanuvchilar</h3>${mem}<p class="hint">Admin (direktor) hamma hisob-kitobni ko'radi va xodimlarni tasdiqlaydi. Xodim faqat modellarni ko'radi, ishlab chiqarish va bajarilgan ishni kiritadi, pul raqamlarini ko'rmaydi.</p>`;
  }
  openSheet('Sozlamalar',`<div class="txt"><h3>Ma'lumotlar qayerda</h3>${where}${users}
  ${S.admin?`<p class="mut">Jami yozuvlar: ${cnt}</p>`:''}
  ${S.admin?`<h3>Yuklab olish</h3>
  <div class="acts"><button class="btn" data-act="csv">Excel uchun (CSV)</button><button class="btn" data-act="json">Zaxira nusxa (JSON)</button><button class="btn w" data-act="imp">Zaxiradan tiklash</button>${S.mode!=='cloud'?'<button class="btn" data-act="vcfall">Mijozlar raqamlari (kontaktlar)</button>':''}</div>`:''}
  ${smp&&S.admin?`<h3>Namuna ma'lumotlar</h3><p>Namuna yozuvlarni o'chirib, o'z ma'lumotlaringizni kiritishni boshlang.</p><div class="acts">${btn('smpdel',"Namunani o'chirish")}</div>`:''}
  </div>`);
}

/* ================= export / import / samples ================= */
async function download(name,text,type){
  if(S.mode==='cloud'){try{const dl=await window.claude.use('downloads');if(dl){await dl.save({filename:name,data:text});return}}catch(e){if(e&&e.code==='declined')return;toast('Yuklab bo‘lmadi. Kompyuterda yoki brauzerda ochib ko‘ring.');return}}
  try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type||'application/octet-stream'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}catch(e){toast('Yuklab bo‘lmadi')}
}
function csv(){
  const L=[],n=x=>String(Math.round(num(x)*100)/100).replace('.',',');
  D.mv.forEach(v=>{const m=get('mat',v.mat);L.push([v.date,v.kind==='in'?'Xom ashyo kirimi':'Xom ashyo chiqimi',m?.name||'',v.kind==='in'?'narx '+n(v.price):'',n(v.qty)+' '+(m?.unit||''),v.kind==='in'?n(v.sum):'',v.note])});
  D.prd.forEach(p=>L.push([p.date,'Ishlab chiqarish',nm('mdl',p.mdl),'',n(p.pairs)+' juft','',p.note]));
  D.job.forEach(j=>L.push([j.date,'Bajarilgan ish',nm('wkr',j.wkr),nm('mdl',j.mdl)+', '+j.op,n(j.pairs)+' juft',n(j.sum),j.note]));
  D.pay.forEach(p=>L.push([p.date,"Ishchiga to'lov",nm('wkr',p.wkr),'','',n(p.amount),p.note]));
  D.sale.forEach(s=>L.push([s.date,'Sotuv',nm('cst',s.cst),(s.items||[]).map(i=>nm('mdl',i.mdl)+' '+n(i.pairs)+'×'+n(i.price)).join('; '),n((s.items||[]).reduce((a,i)=>a+num(i.pairs),0))+' juft',n(s.sum),s.note]));
  D.cpay.forEach(p=>L.push([p.date,"Mijoz to'lovi",nm('cst',p.cst),'','',n(p.amount),p.note]));
  D.exp.forEach(e=>L.push([e.date,'Xarajat',e.cat,'','',n(e.amount),e.note]));
  L.sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
  L.unshift(['Sana',"Bo'lim",'Kim / nima','Tafsilot','Miqdor',"Summa (so'm)",'Izoh']);
  L.push([],['Mijozlar bazasi']);L.push(['Nomi','Turi','Telefon','Telegram','Viloyat','Manzil','Qarzi']);
  const cs=calc().cs;byName(D.cst).forEach(c=>L.push([c.name,c.type,c.phone,c.tg?'@'+c.tg:'',c.region,c.addr,n(cs[c.id].debt)]));
  return '﻿'+L.map(r=>r.map(x=>{const s=String(x??'');return /[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(';')).join('\r\n');
}
async function importJSON(file){
  try{const o=JSON.parse(await file.text());if(!o||!/hisob$/.test(String(o.app))||!o.data)throw 0;const list=[];
    for(const c of COLS)for(const r of (Array.isArray(o.data[c])?o.data[c]:[])){if(r&&typeof r==='object'&&/^[A-Za-z0-9_.~:@+-]{1,120}$/.test(String(r.id||'')))list.push([c,r,String(r.id)])}
    toast('Tiklanmoqda…');await many(list);toast(list.length+' ta yozuv tiklandi')}catch(e){toast(e&&e.code?errText(e):"Fayl noto'g'ri yoki buzilgan")}
}
async function clearSamples(){
  const list=[];COLS.forEach(c=>D[c].filter(x=>x.smp).forEach(x=>list.push([c,null,x.id])));toast("O'chirilmoqda…");
  try{await many(list);toast("Namuna o'chirildi. Endi o'z ma'lumotlaringizni kiriting");closeSheet()}catch(e){toast(errText(e))}
}
function seedData(){
  const r={};COLS.forEach(c=>r[c]=[]);const T=td,ts=Date.now();
  const add=(c,id,o)=>r[c].push(Object.assign({id:'smp-'+id,smp:true,ts},o));
  [['m1','Natural teri (qora)','m²',20],['m2','Astar (podkladka)','m²',25],['m3','Taglik (TEP)','juft',50],['m4','Stelka','juft',50],['m5','Kley (nairit)','kg',5],['m6','Ip',"g'altak",8],['m7','Quti (karobka)','dona',50],['m8','Zamok (molniya)','dona',30]].forEach(([i,name,unit,min])=>add('mat',i,{name,unit,min}));
  [['v1','m1','in',60,145000,46,'Teri bozori'],['v2','m2','in',70,28000,46,''],['v3','m5','in',20,55000,46,''],['v4','m6','in',30,12000,46,''],['v5','m3','in',300,32000,44,'Taglik sexi'],['v6','m4','in',300,6000,44,''],['v7','m7','in',300,4500,44,''],['v9','m8','in',100,3500,20,''],['v8','m1','in',40,150000,15,'Teri bozori'],['v10','m1','out',2,0,10,'Brak, yaroqsiz']].forEach(([i,m,kind,qty,price,o,note])=>add('mv',i,{mat:'smp-'+m,kind,qty,price,sum:qty*price,date:T(o),note}));
  const avg={};r.mv.filter(v=>v.kind==='in').forEach(v=>{const a=avg[v.mat]||(avg[v.mat]={q:0,s:0});a.q+=v.qty;a.s+=v.sum});
  const B=a=>a.map(([m,qty])=>({mat:'smp-'+m,qty})),O=a=>OPS0.map((name,i)=>({name,rate:a[i]}));
  add('mdl','d1',{name:'Klassik tufli (erkak)',code:'K-101',price:290000,extra:15000,bom:B([['m1',.28],['m2',.25],['m3',1],['m4',1],['m5',.06],['m6',.1],['m7',1]]),ops:O([8000,18000,12000,10000,5000])});
  add('mdl','d2',{name:'Ayollar botinkasi',code:'A-205',price:340000,extra:15000,bom:B([['m1',.42],['m2',.38],['m3',1],['m4',1],['m5',.08],['m6',.15],['m7',1],['m8',2]]),ops:O([10000,24000,15000,12000,6000])});
  const md=k=>r.mdl.find(m=>m.id==='smp-'+k),uc=k=>{const m=md(k);let s=m.ops.reduce((a,o)=>a+o.rate,0);m.bom.forEach(b=>s+=b.qty*(avg[b.mat].s/avg[b.mat].q));return Math.round(s)};
  [['p0','d1',30,41],['p1','d1',60,17],['p2','d2',40,11],['p3','d1',50,4]].forEach(([i,k,pairs,o])=>add('prd',i,{mdl:'smp-'+k,pairs,date:T(o),note:'',use:md(k).bom.map(b=>({mat:b.mat,qty:Math.round(b.qty*pairs*1000)/1000}))}));
  [['w1','Akmal','Bichuvchi'],['w2','Dilnoza','Tikuvchi'],['w3','Rustam','Zakatovkachi'],['w4','Sherzod','Taglik yopuvchi']].forEach(([i,name,role])=>add('wkr',i,{name,role}));
  [['j0','w2','d1','Tikish',30,18000,40],['j1','w1','d1','Bichish',60,8000,18],['j2','w1','d2','Bichish',40,10000,13],['j3','w1','d1','Bichish',50,8000,6],['j4','w2','d1','Tikish',60,18000,17],['j5','w2','d2','Tikish',40,24000,11],['j6','w3','d1','Zakatovka',60,12000,17],['j7','w3','d2','Zakatovka',40,15000,11],['j8','w4','d1','Taglik yopish',60,10000,16],['j9','w4','d1','Taglik yopish',50,10000,4]].forEach(([i,w,m,op,pairs,rate,o])=>add('job',i,{wkr:'smp-'+w,mdl:'smp-'+m,op,pairs,rate,sum:pairs*rate,date:T(o),note:''}));
  [['q0','w2',540000,25,'Oylik'],['q1','w1',800000,10,'Avans'],['q2','w2',1000000,10,'Avans'],['q3','w4',300000,10,'Avans'],['q4','w3',1320000,5,'Hisob-kitob']].forEach(([i,w,amount,o,note])=>add('pay',i,{wkr:'smp-'+w,amount,date:T(o),note}));
  [['c1','Bahodir aka','Optom','Toshkent sh.','Abu Saxiy, 4-qator','Har oy klassik tufli oladi'],['c2',"Malika do'koni","Do'kon",'Samarqand','Siyob bozori',"Ayollar modellarini so'raydi"],['c3','Ippodrom, B-blok','Optom','Toshkent sh.','Ippodrom, B-blok',''],['c4','Instagram buyurtma','Chakana',"Farg'ona",'','']].forEach(([i,name,type,region,addr,note])=>add('cst',i,{name,type,region,addr,note}));
  const it=(k,pairs,price)=>({mdl:'smp-'+k,pairs,price,cost:uc(k)});
  [['s0','c1',[it('d1',30,290000)],36],['s1','c1',[it('d1',40,290000)],13],['s2','c2',[it('d2',25,340000),it('d1',10,290000)],7],['s3','c3',[it('d1',30,285000)],3],['s4','c2',[it('d1',25,290000)],28],['s5','c4',[it('d2',2,380000)],5]].forEach(([i,c,items,o])=>add('sale',i,{cst:'smp-'+c,items,sum:items.reduce((a,x)=>a+x.pairs*x.price,0),date:T(o),note:''}));
  [['k0','c1',8700000,31,'Naqd'],['k1','c1',8000000,13,'Naqd'],['k2','c1',3600000,5,"O'tkazma"],['k3','c2',6000000,7,'Naqd'],['k4','c3',4000000,2,'Karta'],['k5','c2',7250000,26,"O'tkazma"],['k6','c4',760000,5,'Karta']].forEach(([i,c,amount,o,note])=>add('cpay',i,{cst:'smp-'+c,amount,date:T(o),note}));
  [['e0','Ijara',6000000,55,'Sex ijarasi'],['e1','Elektr energiya',1100000,46,''],['e2','Ijara',6000000,24,'Sex ijarasi'],['e3','Elektr energiya',1250000,15,''],['e4','Transport',450000,7,'Samarqandga yetkazish']].forEach(([i,cat,amount,o,note])=>add('exp',i,{cat,amount,date:T(o),note}));
  return r;
}
window.__seed=seedData;
async function loadSamples(){const r=seedData(),list=[];COLS.forEach(c=>r[c].forEach(x=>list.push([c,x,x.id])));try{await many(list);toast('Namuna yuklandi')}catch(e){toast(errText(e))}}

/* ================= events ================= */
function go(v){if(!VIEWS.includes(v))v='asosiy';S.view=v;try{if(location.hash.slice(1)!==v)history.replaceState(null,'','#'+v)}catch(e){}$('#view').scrollTop=0;render()}
async function confirm2(b){if(b.dataset.ok)return true;b.dataset.ok='1';b.dataset.t=b.textContent;b.textContent='Tasdiqlash uchun yana bosing';setTimeout(()=>{if(b.isConnected&&b.dataset.ok){delete b.dataset.ok;b.textContent=b.dataset.t}},5000);return false}
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act,id=b.dataset.id||null,back=S.detail;
  try{switch(a){
    case 'go':closeSheet();go(b.dataset.v);break;
    case 'per':S.per=b.dataset.p;render();break;
    case 'cseg':S.cseg=b.dataset.s;render();break;
    case 'cf':S.cf=b.dataset.f;render();break;
    case 'set':setSheet();break;
    case 'close':closeSheet();break;
    case 'back':S.txBack?S.txBack():closeSheet();break;
    case 'mat':matSheet(id);break;
    case 'mdl':mdlSheet(id);break;
    case 'cat':catSheet(id);break;
    case 'jobrate':jobRateForm(id,back);break;
    case 'imgdel':{$('#f_img').value='';$('#f_imgp').innerHTML=noImg;break}
    case 'wkr':wkrSheet(id);break;
    case 'cst':cstSheet(id);break;
    case 'tx':txSheet(b.dataset.c,id,back);break;
    case 'mat-new':matForm();break;
    case 'mat-edit':matForm(id,back);break;
    case 'kirim':mvForm('in',id,back);break;
    case 'chiqim':mvForm('out',id,back);break;
    case 'mdl-new':mdlForm();break;
    case 'mdl-edit':mdlForm(id,back);break;
    case 'prd-new':prdForm(id,back);break;
    case 'wkr-new':wkrForm();break;
    case 'wkr-edit':wkrForm(id,back);break;
    case 'job-new':jobForm(id,back,b.dataset.m);break;
    case 'pay-new':payForm(id,back);break;
    case 'cst-new':cstForm();break;
    case 'cst-edit':cstForm(id,back);break;
    case 'sale-new':saleForm(id,back);break;
    case 'cpay-new':cpayForm(id,back);break;
    case 'exp-new':expForm();break;
    case 'newmat':{const bx=$('#nmbox');bx.hidden=!bx.hidden;if(!bx.hidden)$('#nm_name').focus();break}
    case 'newmat-save':await newMatInline();break;
    case 'addrow':{const f=F&&F.fields.find(x=>x.id===b.dataset.r);if(f){$(`[data-rows="${f.id}"]`).insertAdjacentHTML('beforeend',rowIn(f));liveRun()}break}
    case 'delrow':b.closest('.rw').remove();liveRun();break;
    case 'txdel':case 'fdel':{
      if(!await confirm2(b))return;b.disabled=true;
      if(a==='txdel'){const bk=S.txBack;await delRec(b.dataset.c,id);bk?bk():closeSheet()}else{const fd0=F.del,bk=F.back;await fd0();closeSheet();if(bk)bk()}
      break}
    case 'smpdel':if(!await confirm2(b))return;b.disabled=true;await clearSamples();break;
    case 'smpload':b.disabled=true;await loadSamples();break;
    case 'csv':download('ayla-hisob-'+td()+'.csv',csv());break;
    case 'json':download('ayla-zaxira-'+td()+'.json',JSON.stringify({app:'ayla-hisob',v:1,at:new Date().toISOString(),data:Object.fromEntries(COLS.map(c=>[c,D[c]]))}));break;
    case 'imp':$('#imp').click();break;
    case 'vcf':{const c=get('cst',id);if(c)download((c.name||'mijoz').replace(/[\\/:*?"<>|]/g,'').slice(0,60)+'.vcf',vcard(c),'text/vcard');break}
    case 'vcfall':download('ayla-mijozlar-'+td()+'.vcf',byName(D.cst).filter(c=>c.phone||c.phone2).map(vcard).join('\r\n'),'text/vcard');break;
    case 'authmode':S.authMode=S.authMode==='reg'?'in':'reg';render();break;
    case 'logout':closeSheet();await FBX.A.signOut(FBX.auth);break;
    case 'req-send':b.disabled=true;await fbSendRequest();break;
    case 'ap':b.disabled=true;await fbApprove(id,b.dataset.r);toast('Tasdiqlandi');setSheet();break;
    case 'rj':if(!await confirm2(b))return;b.disabled=true;{const {F:Fs,fs}=FBX;await settle(Fs.deleteDoc(Fs.doc(fs,'requests',id)))}toast('Rad etildi');setSheet();break;
    case 'role':{const m=D.members.find(x=>x.id===id);if(m){await fbMember(id,{name:m.name||'',login:m.login||'',role:m.role==='admin'?'xodim':'admin',ts:m.ts||Date.now()});toast("O'zgartirildi")}setSheet();break}
    case 'unmem':if(!await confirm2(b))return;b.disabled=true;await fbMember(id,null);toast('Chiqarildi');setSheet();break;
  }}catch(err){console.error(err);toast(errText(err));b.disabled=false}
});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='cq'){S.q=t.value;const l=$('#clist');if(l)l.innerHTML=clientRows();return}if(t.closest&&t.closest('#frm')){t.dataset.d='1';liveRun()}});
document.addEventListener('change',async e=>{const t=e.target;
  if(t.id==='f_imgf'){const f=t.files&&t.files[0];t.value='';if(!f)return;try{const d=await shrink(f);$('#f_img').value=d;$('#f_imgp').innerHTML=`<img src="${esc(d)}" alt="">`}catch(err){toast("Rasmni o'qib bo'lmadi. Boshqa rasm tanlang.")}return}if(t.id==='csort'){S.csort=t.value;const l=$('#clist');if(l)l.innerHTML=clientRows();return}if(t.closest&&t.closest('#frm'))liveRun()});
document.addEventListener('focusout',e=>{const t=e.target;if(t.type==='tel'&&t.value.trim()){t.value=fmtPhone(t.value);liveRun();return}if(t.classList&&t.classList.contains('money')&&t.value.trim()){const n=num(t.value);t.value=n?grp(n):''}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#sheet').hidden)closeSheet();if(e.key==='Enter'&&e.target.id==='nm_name'){e.preventDefault();newMatInline()}});
$('#imp').addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];if(f)importJSON(f);e.target.value=''});
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(VIEWS.includes(h)&&h!==S.view)go(h)});
window.addEventListener('online',()=>{S.online=true;render()});
window.addEventListener('offline',()=>{S.online=false;render()});
document.addEventListener('submit',async e=>{
  e.preventDefault();
  if(e.target.id==='authf'){
    const er=$('#aerr'),sb=e.target.querySelector('[type=submit]'),reg=S.authMode==='reg';
    const name=reg?$('#a_name').value.trim():'',login=$('#a_login').value,pass=$('#a_pass').value;
    if(reg&&!name){er.textContent='Ismingizni yozing';return}
    if(!normLogin(login)||(!login.includes('@')&&normLogin(login).length<3)){er.textContent="Login kamida 3 ta lotin harf yoki raqam bo'lsin";return}
    if(pass.length<6){er.textContent='Parol kamida 6 belgidan iborat bo‘lsin';return}
    sb.disabled=true;er.textContent='';
    try{if(reg)await fbRegister(name,login,pass);else await FBX.A.signInWithEmailAndPassword(FBX.auth,toEmail(login),pass)}catch(err){er.textContent=errText(err);sb.disabled=false}
    return;
  }
  if(e.target.id!=='frm'||!F)return;
  const v=vals(),er=$('#ferr');
  for(const f of F.fields){if(!f.req)continue;const x=v[f.id];const bad=f.type==='rows'?!x.length:(f.type==='num'||f.type==='money')?!(x>0):!x;if(bad){er.textContent=`“${f.label}” to'ldirilmagan`;return}}
  const sb=e.target.querySelector('[type=submit]');sb.disabled=true;er.textContent='';
  const f0=F;
  try{await f0.save(v)}catch(err){er.textContent=errText(err);sb.disabled=false;return}
  if(f0.back)f0.back();else closeSheet();
  toast(f0.msg||'Saqlandi');
});

/* ================= boot ================= */
async function boot(){
  const h=location.hash.slice(1);if(VIEWS.includes(h))S.view=h;
  render();
  if(window.claude&&typeof window.claude.use==='function'){
    let d=null;try{d=await Promise.race([window.claude.use('db'),sleep(10000).then(()=>null)])}catch(e){d=null}
    if(d){cdb=d;S.mode='cloud';S.admin=true;claudeSubscribe();claudeUser();render();return}
  }
  const cfg=window.FIREBASE_CONFIG||(typeof firebaseConfig!=='undefined'?firebaseConfig:null);
  if(cfg&&cfg.apiKey&&!window.claude){
    S.mode='firebase';S.auth='check';render();
    try{await fbBoot(cfg)}catch(e){console.error(e);S.mode='local';S.admin=true;loadLocal();toast("Firebase'ga ulanib bo'lmadi, ma'lumot shu qurilmada saqlanadi")}
    if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
    render();return;
  }
  S.mode='local';S.admin=true;loadLocal();render();
}
boot();
}

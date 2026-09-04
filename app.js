const KEY="ittime_v03";
const DEFAULTS={events:[],sessions:[],current:null,tab:"today",settings:{
 bmSalary:20000,salaryByMonth:{},freelanceRate:0,showEarnings:true,calculateEffectiveRate:true,
 theme:"system",accent:"#2563eb",showSeconds:true,compact:false,animations:true,
 timerStyle:"digital",cardStyle:"default",buttonStyle:"filled",firstDay:"monday",
 categories:{event:["Photography","Videography","Live Streaming","Directing"],screen:["Graphic Design","Video Editing","Image Editing","Motion Graphics","Web Design","Content Sharing","Administration"]},
 notifications:{enabled:false,workReminder:true,reminderHours:3,dailyLimit:true,dailyLimitHours:8,restReminder:true}
},reflections:{weekly:{},monthly:{}}};
let state=Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(KEY)||"{}"));
state.settings=Object.assign({},DEFAULTS.settings,state.settings||{});
state.settings.salaryByMonth=state.settings.salaryByMonth||{};
state.reflections=Object.assign({},DEFAULTS.reflections,state.reflections||{});
state.reflections.weekly=state.reflections.weekly||{};
state.reflections.monthly=state.reflections.monthly||{};
state.settings=Object.assign({},DEFAULTS.settings,state.settings||{});
state.settings.salaryByMonth=state.settings.salaryByMonth||{};
state.settings.categories=Object.assign({},DEFAULTS.settings.categories,state.settings.categories||{});
state.settings.categories.event=Array.isArray(state.settings.categories.event)?state.settings.categories.event:DEFAULTS.settings.categories.event.slice();
state.settings.categories.screen=Array.isArray(state.settings.categories.screen)?state.settings.categories.screen:DEFAULTS.settings.categories.screen.slice();
state.settings.notifications=Object.assign({},DEFAULTS.settings.notifications,state.settings.notifications||{});

state.events=Array.isArray(state.events)?state.events:[];
function ensureEventModel(){
  const byName=new Map();
  state.events.forEach(e=>{if(e.id)byName.set(e.id,e)});
  state.sessions.forEach(s=>{
    if(s.kind!=="event" || !s.eventName) return;
    if(s.eventId && byName.has(s.eventId)) return;
    const key=`${s.source}|${s.client||""}|${s.eventName}`.toLowerCase();
    let e=[...state.events].find(x=>x._legacyKey===key);
    if(!e){
      e={id:(crypto.randomUUID?crypto.randomUUID():`e_${Date.now()}_${Math.random()}`),name:s.eventName,source:s.source,client:s.client||"",startDate:s.date,endDate:s.date,payment:0,notes:"",_legacyKey:key};
      state.events.push(e);
    }
    s.eventId=e.id;
  });
  state.events.forEach(e=>{delete e._legacyKey});
  save();
}
ensureEventModel();

const eventTypes=["Photography","Videography","Live Streaming","Directing"];
const screenTypes=["Graphic Design","Video Editing","Image Editing","Motion Graphics","Web Design","Content Sharing","Administration"];
const gains=["Money","Skills","Experience","Connections","Opportunities","Other"];
const sacrifices=["Rest","Sleep","Family","Friends","Personal projects","Learning","Nothing"];

function applyAppearance(){
 const s=state.settings||DEFAULTS.settings;
 document.documentElement.style.setProperty("--blue",s.accent||"#2563eb");
 const map={"#2563eb":"#eaf1ff","#16a34a":"#eaf8ef","#7c3aed":"#f1eafe","#db2777":"#fce7f3","#ea580c":"#fff0e5","#0891b2":"#e6f8fb"};
 document.documentElement.style.setProperty("--blue-soft",map[s.accent]||"#eaf1ff");
 document.body.classList.toggle("theme-dark",s.theme==="dark"||(s.theme==="system"&&window.matchMedia?.("(prefers-color-scheme: dark)").matches));
 document.body.classList.toggle("compact-mode",!!s.compact);
 document.body.classList.toggle("no-animations",s.animations===false);
 document.body.dataset.cardStyle=s.cardStyle||"default";
 document.body.dataset.buttonStyle=s.buttonStyle||"filled";
}
function settingsValue(key,fallback){return state.settings?.[key]??fallback}

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function fmt(ms){
 let s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;
 return settingsValue("showSeconds",true)?`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}
function dateKey(d=new Date()){let y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function monthKey(d=new Date()){return dateKey(d).slice(0,7)}
function weekKey(d=new Date()){let x=new Date(d);x.setHours(0,0,0,0);let day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return dateKey(x)}
function fmtDate(x){return new Date(x+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
function money(n){return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(n))+" MRU"}
function workMs(s){
  if(!s || !Number.isFinite(Number(s.start))) return 0;
  // Historical sessions are immutable. Only state.current is allowed to use
  // Date.now(). A missing end on a historical record must NEVER become a live timer.
  if(!s.end) return Math.max(0,Number(s.durationMs)||0);
  const start=Number(s.start), end=Number(s.end);
  if(!Number.isFinite(end) || end<start) return Math.max(0,Number(s.durationMs)||0);
  const breaks=(s.breaks||[]).reduce((a,b)=>{
    if(!b || !Number.isFinite(Number(b.start)) || !b.end) return a;
    const bs=Number(b.start), be=Number(b.end);
    return a+(Number.isFinite(be)&&be>=bs?be-bs:0);
  },0);
  return Math.max(0,end-start-breaks);
}
function breakMs(s){
  if(!s) return 0;
  return (s.breaks||[]).reduce((a,b)=>{
    if(!b || !Number.isFinite(Number(b.start)) || !b.end) return a;
    const bs=Number(b.start), be=Number(b.end);
    return a+(Number.isFinite(be)&&be>=bs?be-bs:0);
  },0);
}
function totalFor(filter){return state.sessions.filter(filter).reduce((a,s)=>a+workMs(s),0)}
function activeWorkMs(){return state.current?workElapsed(state.current):0}
function activeBreakMs(){return state.current?breakMs(state.current):0}
function totalToday(){let k=dateKey();return totalFor(s=>s.date===k)+(state.current?.date===k?activeWorkMs():0)}
function breakToday(){let k=dateKey();return state.sessions.filter(s=>s.date===k).reduce((a,s)=>a+breakMs(s),0)+(state.current?.date===k?activeBreakMs():0)}
function weekStart(){let n=new Date(),d=(n.getDay()+6)%7,m=new Date(n);m.setDate(n.getDate()-d);m.setHours(0,0,0,0);return m}
function weekTotal(){let m=weekStart();return totalFor(s=>new Date(s.date+"T12:00:00")>=m)+(state.current&&new Date(state.current.date+"T12:00:00")>=m?activeWorkMs():0)}
function monthTotal(){let k=monthKey();return totalFor(s=>s.date.startsWith(k))+(state.current?.date.startsWith(k)?activeWorkMs():0)}
function bmSalary(month=monthKey()){return Number(state.settings.salaryByMonth[month]??state.settings.bmSalary??20000)}
function bmHours(month){return totalFor(s=>s.source==="BM"&&s.date.startsWith(month))+(state.current?.source==="BM"&&state.current?.date.startsWith(month)?activeWorkMs():0)}
function bmRate(month){let h=bmHours(month);return h?bmSalary(month)/(h/3600000):0}
function allocValue(s){if(s.source!=="BM")return 0;let rate=bmRate(s.date.slice(0,7));return rate*(workMs(s)/3600000)}
function freelanceIncome(filter=s=>true){
  const eventIds=new Set(state.events.map(e=>e.id));
  let total=state.events.filter(e=>e.source==="Freelance"&&filter({date:e.startDate,eventId:e.id})).reduce((a,e)=>a+Number(e.payment||0),0);
  total+=state.sessions.filter(s=>s.source==="Freelance"&&!s.eventId&&filter(s)).reduce((a,s)=>a+Number(s.payment||0),0);
  return total;
}
function bmMonthValue(){let m=monthKey();let rate=bmRate(m);let v=state.sessions.filter(s=>s.source==="BM"&&s.date.startsWith(m)).reduce((a,s)=>a+rate*(workMs(s)/3600000),0);if(state.current?.source==="BM"&&state.current?.date.startsWith(m))v+=rate*(activeWorkMs()/3600000);return v}
function esc(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}


function eventById(id){return state.events.find(e=>e.id===id)}
function eventSessions(id){return state.sessions.filter(s=>s.eventId===id)}
function eventWorkMs(id){
  // History is frozen: only sessions with a recorded end timestamp count.
  return eventSessions(id)
    .filter(s=>s && s.end)
    .reduce((a,s)=>a+workMs(s),0);
}
function eventHasCurrentSession(id){
  // History must count completed sessions only.
  return false;
}
function eventStartDate(id){let e=eventById(id);return e?.startDate||dateKey()}
function eventEndDate(id){let e=eventById(id);return e?.endDate||eventStartDate(id)}
function eventRate(id){
  const e=eventById(id); if(!e)return 0;
  return e.source==="Freelance" && eventWorkMs(id)?Number(e.payment||0)/(eventWorkMs(id)/3600000):0;
}
function repairHistoricalSessions(){
  let changed=false;
  state.sessions=(state.sessions||[]).map(s=>{
    if(!s) return s;
    if(!s.end){
      const frozen=Math.max(0,Number(s.durationMs)||0);
      if(s.durationMs!==frozen){s.durationMs=frozen;changed=true;}
      // Keep the record historical; it is never allowed to acquire Date.now().
    }
    return s;
  });
  if(changed) save();
}

function reflectionDate(){return dateKey()}
function todayReflection(){return state.reflections?.daily?.[reflectionDate()]||null}
function reflectionStats(date=reflectionDate()){
  const ss=(state.sessions||[]).filter(s=>s.date===date);
  const work=ss.reduce((a,s)=>a+workMs(s),0);
  const br=ss.reduce((a,s)=>a+breakMs(s),0);
  const bm=ss.filter(s=>s.source==="BM").reduce((a,s)=>a+workMs(s),0);
  const fr=ss.filter(s=>s.source==="Freelance").reduce((a,s)=>a+workMs(s),0);
  return {work,br,bm,fr,sessions:ss.length};
}
function saveDailyReflection(){
  state.reflections=state.reflections||{};
  state.reflections.daily=state.reflections.daily||{};
  const d=reflectionDate();
  state.reflections.daily[d]={
    date:d,
    accomplished:(document.getElementById("rAccomplished")?.value||"").trim(),
    difficult:(document.getElementById("rDifficult")?.value||"").trim(),
    learned:(document.getElementById("rLearned")?.value||"").trim(),
    selfCare:(document.getElementById("rSelfCare")?.value||"").trim(),
    tomorrow:(document.getElementById("rTomorrow")?.value||"").trim(),
    grateful:(document.getElementById("rGrateful")?.value||"").trim(),
    balance:document.getElementById("rBalance")?.value||"",
    updatedAt:Date.now()
  };
  save(); render();
}
function reflectionScore(st,r){
  let score=0;
  if(st.work>=10*3600000) score-=2;
  else if(st.work>=8*3600000) score-=1;
  if(st.work>=6*3600000 && st.br<30*60000) score-=2;
  else if(st.work>=6*3600000 && st.br<60*60000) score-=1;
  if(r?.balance==="no") score+=2;
  if(r?.balance==="little") score+=1;
  return score;
}
function reflectionAssessment(st,r){
  if(!st.work && !r?.accomplished) return "No work was recorded today. Add a reflection if you still want to capture the day.";
  if(r?.balance==="yes" || reflectionScore(st,r)<=-2)
    return `You worked ${fmt(st.work)} today with ${fmt(st.br)} of recorded breaks. You pushed hard; protect recovery tomorrow.`;
  if(st.work>=8*3600000 && st.br<60*60000)
    return `You worked ${fmt(st.work)} today with ${fmt(st.br)} of breaks. Productivity was high, but your recovery was limited.`;
  if(st.work>=6*3600000)
    return `You worked ${fmt(st.work)} today and recorded ${fmt(st.br)} of breaks. Keep protecting your breaks as workload increases.`;
  return `You recorded ${fmt(st.work)} of work today and ${fmt(st.br)} of breaks. Keep building a sustainable rhythm.`;
}

function sessionById(id){return (state.sessions||[]).find(s=>String(s.id)===String(id))}
function sessionDurationFromTimes(start,end,breaks=[]){
  const a=Number(start),b=Number(end);
  if(!Number.isFinite(a)||!Number.isFinite(b)||b<a)return 0;
  const br=(breaks||[]).reduce((sum,x)=>{
    const x1=Number(x?.start),x2=Number(x?.end);
    return sum+(Number.isFinite(x1)&&Number.isFinite(x2)&&x2>=x1?x2-x1:0);
  },0);
  return Math.max(0,b-a-br);
}
function openEditSession(id){
  const s=sessionById(id);if(!s)return;
  const st=new Date(Number(s.start)),en=s.end?new Date(Number(s.end)):null;
  showModal(`<div class="modal-title">Edit Session</div>
  <label>Date</label><input id="esDate" type="date" value="${esc(s.date||dateKey())}">
  <label>Start</label><input id="esStart" type="time" value="${st.toTimeString().slice(0,5)}">
  <label>End</label><input id="esEnd" type="time" value="${en?en.toTimeString().slice(0,5):""}">
  <label>Source</label><select id="esSource"><option ${s.source==="BM"?"selected":""}>BM</option><option ${s.source==="Freelance"?"selected":""}>Freelance</option></select>
  <label>Work type(s)</label><input id="esTypes" value="${esc((s.types||[]).join(", "))}">
  <label>Notes</label><textarea id="esNotes" rows="3">${esc(s.notes||"")}</textarea>
  <div class="actions"><button class="btn secondary" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveEditedSession" data-id="${esc(String(id))}">Save Changes</button></div>`);
}
function saveEditedSession(id){
  const s=sessionById(id);if(!s)return;
  const d=document.getElementById("esDate")?.value,st=document.getElementById("esStart")?.value,et=document.getElementById("esEnd")?.value;
  if(!d||!st){toast("Date and start time are required");return}
  const a=new Date(`${d}T${st}`).getTime(),b=et?new Date(`${d}T${et}`).getTime():null;
  if(b!==null&&(!Number.isFinite(b)||b<a)){toast("End time must be after start time");return}
  s.date=d;s.start=a;s.end=b;
  s.source=document.getElementById("esSource")?.value||s.source;
  s.types=(document.getElementById("esTypes")?.value||"").split(",").map(x=>x.trim()).filter(Boolean);
  s.notes=(document.getElementById("esNotes")?.value||"").trim();
  if(b!==null)s.durationMs=sessionDurationFromTimes(a,b,s.breaks);
  save();closeModal();render();toast("Session updated");
}
function deleteSession(id){
  if(!sessionById(id))return;
  if(!confirm("Delete this session? This cannot be undone."))return;
  state.sessions=(state.sessions||[]).filter(s=>String(s.id)!==String(id));
  save();closeModal();render();toast("Session deleted");
}

function eventFormData(id){
  const e=id?eventById(id):null;
  return {
    name:e?.name||"",
    client:e?.client||"",
    source:e?.source||"BM",
    startDate:e?.startDate||dateKey(),
    endDate:e?.endDate||e?.startDate||dateKey(),
    location:e?.location||"",
    description:e?.description||"",
    price:e?.price??"",
    paid:e?.paid??""
  };
}
function openEventEditor(id){
  const v=eventFormData(id);
  showModal(`<div class="modal-title">${id?"Edit Event":"New Event"}</div>
  <label>Event name</label><input id="evName" value="${esc(v.name)}" placeholder="e.g. Festival / Conference">
  <label>Client / Company</label><input id="evClient" value="${esc(v.client)}" placeholder="BM or client name">
  <label>Source</label><select id="evSource"><option ${v.source==="BM"?"selected":""}>BM</option><option ${v.source==="Freelance"?"selected":""}>Freelance</option></select>
  <div class="form-grid"><div><label>Start date</label><input id="evStart" type="date" value="${esc(v.startDate)}"></div><div><label>End date</label><input id="evEnd" type="date" value="${esc(v.endDate)}"></div></div>
  <label>Location</label><input id="evLocation" value="${esc(v.location)}" placeholder="Optional">
  <label>Description</label><textarea id="evDescription" rows="3">${esc(v.description)}</textarea>
  <div id="freelanceFields" style="${v.source==="Freelance"?"":"display:none"}">
    <label>Agreed price (MRU)</label><input id="evPrice" type="number" min="0" value="${esc(String(v.price))}">
    <label>Paid (MRU)</label><input id="evPaid" type="number" min="0" value="${esc(String(v.paid))}">
  </div>
  <div class="actions"><button class="btn secondary" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveEvent" data-id="${esc(String(id||""))}">Save Event</button></div>`);
}
function saveEvent(id){
  const name=(document.getElementById("evName")?.value||"").trim();
  const source=document.getElementById("evSource")?.value||"BM";
  const startDate=document.getElementById("evStart")?.value||dateKey();
  const endDate=document.getElementById("evEnd")?.value||startDate;
  if(!name){toast("Event name is required");return}
  if(endDate<startDate){toast("End date must be on or after start date");return}
  state.events=state.events||[];
  let e=id?eventById(id):null;
  if(!e){
    e={id:"e_"+Date.now()+"_"+Math.random().toString(36).slice(2,7),createdAt:Date.now()};
    state.events.push(e);
  }
  e.name=name;e.client=(document.getElementById("evClient")?.value||"").trim();
  e.source=source;e.startDate=startDate;e.endDate=endDate;
  e.location=(document.getElementById("evLocation")?.value||"").trim();
  e.description=(document.getElementById("evDescription")?.value||"").trim();
  e.price=source==="Freelance"?Math.max(0,Number(document.getElementById("evPrice")?.value)||0):0;
  e.paid=source==="Freelance"?Math.min(e.price,Math.max(0,Number(document.getElementById("evPaid")?.value)||0)):0;
  save();closeModal();render();toast(id?"Event updated":"Event created");
}
function deleteEvent(id){
  const e=eventById(id);if(!e)return;
  const count=eventSessions(id).length;
  if(!confirm(`Delete "${e.name}"? ${count} recorded session${count===1?"":"s"} will be kept but become unassigned.`))return;
  state.events=(state.events||[]).filter(x=>String(x.id)!==String(id));
  (state.sessions||[]).forEach(s=>{if(String(s.eventId)===String(id))s.eventId=null});
  save();closeModal();render();toast("Event deleted");
}
function eventSummary(id){
  const e=eventById(id), ss=eventSessions(id);
  const work=ss.reduce((a,s)=>a+workMs(s),0), br=ss.reduce((a,s)=>a+breakMs(s),0);
  const by={};ss.forEach(s=>(s.types||[]).forEach(t=>by[t]=(by[t]||0)+workMs(s)));
  return {e,ss,work,br,by,remaining:e?.source==="Freelance"?Math.max(0,(Number(e.price)||0)-(Number(e.paid)||0)):0};
}

function monthKey(d=new Date()){return d.toISOString().slice(0,7)}
function weekStartKey(d=new Date()){
  const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-(day===0?6:day-1)); x.setHours(0,0,0,0); return x.toISOString().slice(0,10);
}
function periodSessions(start,end){
  const a=Number(new Date(start)),b=Number(new Date(end));
  return (state.sessions||[]).filter(s=>Number(s.start)>=a&&Number(s.start)<b&&s.end);
}
function intelligencePeriod(start,end){
  const ss=periodSessions(start,end);
  const work=ss.reduce((a,s)=>a+workMs(s),0), br=ss.reduce((a,s)=>a+breakMs(s),0);
  const bm=ss.filter(s=>s.source==="BM").reduce((a,s)=>a+workMs(s),0);
  const fr=ss.filter(s=>s.source==="Freelance").reduce((a,s)=>a+workMs(s),0);
  const byType={};
  ss.forEach(s=>(s.types||[]).forEach(t=>byType[t]=(byType[t]||0)+workMs(s)));
  const days=[...new Set(ss.map(s=>s.date))];
  const daily=days.map(d=>ss.filter(s=>s.date===d).reduce((a,s)=>a+workMs(s),0));
  const longest=daily.length?Math.max(...daily):0;
  const avg=daily.length?work/daily.length:0;
  return {ss,work,br,bm,fr,byType,days:days.length,longest,avg};
}
function intelligenceSummary(){
  const now=new Date();
  const ws=new Date(now); ws.setHours(0,0,0,0); const day=ws.getDay(); ws.setDate(ws.getDate()-(day===0?6:day-1));
  const we=new Date(ws); we.setDate(we.getDate()+7);
  const ms=new Date(now.getFullYear(),now.getMonth(),1), me=new Date(now.getFullYear(),now.getMonth()+1,1);
  const w=intelligencePeriod(ws,we),m=intelligencePeriod(ms,me);
  const bmHourly= m.bm>0 ? 20000/(m.bm/3600000) : 0;
  const freelanceMoney=(state.events||[]).filter(e=>e.source==="Freelance").reduce((a,e)=>a+(Number(e.paid)||0),0);
  const freelanceHours=m.fr/3600000;
  const freelanceHourly=freelanceHours?freelanceMoney/freelanceHours:0;
  const reflections=state.reflections?.daily||{};
  const monthRefs=Object.values(reflections).filter(r=>String(r.date||"").startsWith(monthKey()));
  const balanced=monthRefs.filter(r=>r.balance==="no").length;
  return {w,m,bmHourly,freelanceHourly,monthRefs:monthRefs.length,balanced};
}
function renderIntelligence(){
  const x=intelligenceSummary(),w=x.w,m=x.m;
  const typeRows=Object.entries(m.byType).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`<div class="intel-row"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join("")||`<div class="muted">No category data this month.</div>`;
  const eventRows=(state.events||[]).map(e=>({e,w:eventSessions(e.id).reduce((a,s)=>a+workMs(s),0)})).filter(x=>x.w>0).sort((a,b)=>b.w-a.w).slice(0,8).map(x=>`<div class="intel-row"><span>${esc(x.e.name)}</span><b>${fmt(x.w)}</b></div>`).join("")||`<div class="muted">No event data yet.</div>`;
  const breakRatio=m.work?Math.round(m.br/m.work*100):0;
  return `<div class="section-title">Work Intelligence</div>
  <div class="intel-grid">
    <div class="card"><div class="muted">This week</div><div class="big-number">${fmt(w.work)}</div><div>${w.days} workday${w.days===1?"":"s"} · ${w.ss.length} sessions</div></div>
    <div class="card"><div class="muted">This month</div><div class="big-number">${fmt(m.work)}</div><div>${m.days} workday${m.days===1?"":"s"} · ${m.ss.length} sessions</div></div>
    <div class="card"><div class="muted">Longest workday</div><div class="big-number">${fmt(m.longest)}</div><div>Average ${fmt(m.avg)} per workday</div></div>
    <div class="card"><div class="muted">Break / work</div><div class="big-number">${breakRatio}%</div><div>${fmt(m.br)} recorded breaks</div></div>
  </div>
  <div class="card"><h3>BM vs Freelance</h3><div class="intel-row"><span>BM</span><b>${fmt(m.bm)}</b></div><div class="intel-row"><span>Freelance</span><b>${fmt(m.fr)}</b></div><div class="intel-row"><span>BM estimated hourly value</span><b>${x.bmHourly?Math.round(x.bmHourly).toLocaleString()+" MRU/h":"—"}</b></div><div class="intel-row"><span>Freelance paid / recorded hour</span><b>${x.freelanceHourly?Math.round(x.freelanceHourly).toLocaleString()+" MRU/h":"—"}</b></div></div>
  <div class="card"><h3>Work by category</h3>${typeRows}</div>
  <div class="card"><h3>Top events</h3>${eventRows}</div>
  <div class="card"><h3>Reflection trend</h3><div>${x.monthRefs} reflection${x.monthRefs===1?"":"s"} recorded this month.</div><div class="muted">${x.balanced} day${x.balanced===1?"":"s"} marked as balanced.</div></div>`;
}

function reviewPeriod(start,end){
  const x=intelligencePeriod(start,end);
  const byDay={};
  x.ss.forEach(s=>byDay[s.date]=(byDay[s.date]||0)+workMs(s));
  const days=Object.entries(byDay).sort((a,b)=>b[1]-a[1]);
  const reflections=Object.values(state.reflections?.daily||{}).filter(r=>r.date>=start.toISOString().slice(0,10)&&r.date<end.toISOString().slice(0,10));
  const pushed=reflections.filter(r=>r.balance==="yes").length;
  const balanced=reflections.filter(r=>r.balance==="no").length;
  return {...x,daysList:days,reflections,pushed,balanced};
}
function previousWeekRange(){
  const now=new Date(); const end=new Date(now); end.setHours(0,0,0,0);
  const day=end.getDay(); end.setDate(end.getDate()-(day===0?6:day-1));
  const start=new Date(end); start.setDate(start.getDate()-7);
  const prevStart=new Date(start); prevStart.setDate(prevStart.getDate()-7);
  return {start,end,prevStart,prevEnd:start};
}
function previousMonthRange(){
  const now=new Date(), start=new Date(now.getFullYear(),now.getMonth(),1), prevStart=new Date(now.getFullYear(),now.getMonth()-1,1);
  return {start,end:new Date(now.getFullYear(),now.getMonth()+1,1),prevStart,prevEnd:start};
}
function deltaText(a,b){
  if(!b)return "No previous-period data";
  const d=a-b, pct=b?Math.round(d/b*100):null;
  return `${d>=0?"+":""}${fmt(d)}${pct===null?"":` (${pct>=0?"+":""}${pct}%)`}`;
}
function reviewNarrative(cur,prev,label){
  const lines=[];
  if(cur.work===0) lines.push(`No recorded work in ${label.toLowerCase()}.`);
  else if(prev.work===0) lines.push(`You recorded ${fmt(cur.work)} of work in ${label.toLowerCase()}.`);
  else lines.push(`You worked ${fmt(cur.work)}, ${deltaText(cur.work,prev.work)} versus the previous period.`);
  if(cur.longest>=10*3600000) lines.push(`Your longest workday reached ${fmt(cur.longest)}. That is a heavy day.`);
  if(cur.work>=6*3600000 && cur.br<30*60000) lines.push(`Breaks were very low relative to workload. Recovery needs attention.`);
  if(cur.pushed) lines.push(`${cur.pushed} reflection${cur.pushed===1?"":"s"} marked that you pushed yourself too hard.`);
  if(cur.balanced) lines.push(`${cur.balanced} reflection${cur.balanced===1?"":"s"} marked the day as balanced.`);
  return lines;
}
function renderReview(){
  const wr=previousWeekRange(),mr=previousMonthRange();
  const cw=reviewPeriod(wr.start,wr.end),pw=reviewPeriod(wr.prevStart,wr.prevEnd);
  const cm=reviewPeriod(mr.start,mr.end),pm=reviewPeriod(mr.prevStart,mr.prevEnd);
  const best=cw.daysList[0], worst=cw.daysList[cw.daysList.length-1];
  const types=Object.entries(cw.byType).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`<div class="intel-row"><span>${esc(k)}</span><b>${fmt(v)}</b></div>`).join("")||`<div class="muted">No category data.</div>`;
  const wn=reviewNarrative(cw,pw,"this week"),mn=reviewNarrative(cm,pm,"this month");
  return `<div class="section-title">Weekly & Monthly Review</div>
  <div class="card"><h3>This week vs last week</h3>
    <div class="intel-row"><span>Work</span><b>${fmt(cw.work)} <small>${deltaText(cw.work,pw.work)}</small></b></div>
    <div class="intel-row"><span>Breaks</span><b>${fmt(cw.br)} <small>${deltaText(cw.br,pw.br)}</small></b></div>
    <div class="intel-row"><span>Workdays</span><b>${cw.days} <small>${cw.days-pw.days>=0?"+":""}${cw.days-pw.days}</small></b></div>
    <div class="intel-row"><span>Freelance</span><b>${fmt(cw.fr)}</b></div>
    <div class="intel-row"><span>BM</span><b>${fmt(cw.bm)}</b></div>
  </div>
  <div class="card"><h3>Weekly conclusion</h3>${wn.map(x=>`<div class="review-line">• ${esc(x)}</div>`).join("")||`<div class="muted">Keep tracking to generate a conclusion.</div>`}
  ${best?`<div class="review-highlight">Best workday: <b>${esc(best[0])}</b> · ${fmt(best[1])}</div>`:""}
  ${worst&&worst!==best?`<div class="review-highlight">Lowest workday: <b>${esc(worst[0])}</b> · ${fmt(worst[1])}</div>`:""}</div>
  <div class="card"><h3>This month vs last month</h3>
    <div class="intel-row"><span>Work</span><b>${fmt(cm.work)} <small>${deltaText(cm.work,pm.work)}</small></b></div>
    <div class="intel-row"><span>Breaks</span><b>${fmt(cm.br)} <small>${deltaText(cm.br,pm.br)}</small></b></div>
    <div class="intel-row"><span>Workdays</span><b>${cm.days} <small>${cm.days-pm.days>=0?"+":""}${cm.days-pm.days}</small></b></div>
    <div class="intel-row"><span>Longest day</span><b>${fmt(cm.longest)}</b></div>
  </div>
  <div class="card"><h3>Monthly conclusion</h3>${mn.map(x=>`<div class="review-line">• ${esc(x)}</div>`).join("")||`<div class="muted">Keep tracking to generate a conclusion.</div>`}</div>
  <div class="card"><h3>Top work categories this week</h3>${types}</div>`;
}

function smartNotifyPrefs(){
  state.settings=state.settings||{};
  state.settings.notifications=state.settings.notifications||{};
  const n=state.settings.notifications;
  return {
    breakReminder:n.breakReminder!==false,
    longWork:n.longWork!==false,
    reflection:n.reflection!==false,
    dailySummary:n.dailySummary===true,
    continuousMinutes:Number(n.continuousMinutes)||120,
    breakMinutes:Number(n.breakMinutes)||15,
    dailyTargetHours:Number(n.dailyTargetHours)||8,
    weeklyTargetHours:Number(n.weeklyTargetHours)||40,
    reflectionTime:n.reflectionTime||"20:00",
    quietStart:n.quietStart||"23:00",
    quietEnd:n.quietEnd||"07:00"
  };
}
function saveSmartNotifyPrefs(){
  const n=smartNotifyPrefs();
  const get=id=>document.getElementById(id);
  n.breakReminder=get("nBreak")?.checked??n.breakReminder;
  n.longWork=get("nLong")?.checked??n.longWork;
  n.reflection=get("nReflection")?.checked??n.reflection;
  n.dailySummary=get("nSummary")?.checked??n.dailySummary;
  n.continuousMinutes=Math.max(30,Number(get("nContinuous")?.value)||n.continuousMinutes);
  n.breakMinutes=Math.max(1,Number(get("nBreakMinutes")?.value)||n.breakMinutes);
  n.dailyTargetHours=Math.max(1,Number(get("nDailyTarget")?.value)||n.dailyTargetHours);
  n.weeklyTargetHours=Math.max(1,Number(get("nWeeklyTarget")?.value)||n.weeklyTargetHours);
  n.reflectionTime=get("nReflectionTime")?.value||n.reflectionTime;
  n.quietStart=get("nQuietStart")?.value||n.quietStart;
  n.quietEnd=get("nQuietEnd")?.value||n.quietEnd;
  state.settings.notifications=n;save();closeModal();render();if(pushPrefs().enabled){scheduleDailyPushes();if(state.current?.status==="working")scheduleCurrentWorkPushes();}toast("Notification settings saved");
}
function openSmartNotifications(){
  const n=smartNotifyPrefs();
  showModal(`<div class="modal-title">Smart Notifications</div>
  <div class="setting-row"><span>Break reminders</span><input id="nBreak" type="checkbox" ${n.breakReminder?"checked":""}></div>
  <div class="setting-row"><span>Long-work warnings</span><input id="nLong" type="checkbox" ${n.longWork?"checked":""}></div>
  <div class="setting-row"><span>Reflection reminder</span><input id="nReflection" type="checkbox" ${n.reflection?"checked":""}></div>
  <div class="setting-row"><span>Daily summary</span><input id="nSummary" type="checkbox" ${n.dailySummary?"checked":""}></div>
  <label>Continuous work threshold (minutes)</label><input id="nContinuous" type="number" min="30" value="${n.continuousMinutes}">
  <label>Recommended break (minutes)</label><input id="nBreakMinutes" type="number" min="1" value="${n.breakMinutes}">
  <label>Daily target (hours)</label><input id="nDailyTarget" type="number" min="1" step=".5" value="${n.dailyTargetHours}">
  <label>Weekly target (hours)</label><input id="nWeeklyTarget" type="number" min="1" step=".5" value="${n.weeklyTargetHours}">
  <label>Reflection reminder time</label><input id="nReflectionTime" type="time" value="${n.reflectionTime}">
  <div class="form-grid"><div><label>Quiet hours start</label><input id="nQuietStart" type="time" value="${n.quietStart}"></div><div><label>Quiet hours end</label><input id="nQuietEnd" type="time" value="${n.quietEnd}"></div></div>
  <div class="notice">iPhone note: web apps cannot guarantee background JavaScript execution. These settings control notifications while ItTime is active; reliable background push requires a push-capable server/native notification layer.</div>
  <div class="actions"><button class="btn secondary" data-action="closeModal">Cancel</button><button class="btn primary" data-action="saveSmartNotifyPrefs">Save</button></div>`);
}
function notificationAllowed(){
  const n=smartNotifyPrefs(),now=new Date(),hhmm=now.toTimeString().slice(0,5);
  if(n.quietStart<n.quietEnd)return !(hhmm>=n.quietStart&&hhmm<n.quietEnd);
  return !(hhmm>=n.quietStart||hhmm<n.quietEnd);
}
function sendItTimeNotification(title,body,key){
  if(!("Notification" in window)||Notification.permission!=="granted"||!notificationAllowed())return false;
  const today=dateKey();
  state.settings=state.settings||{};state.settings.notificationLog=state.settings.notificationLog||{};
  if(state.settings.notificationLog[key]===today)return false;
  state.settings.notificationLog[key]=today;save();
  try{new Notification(title,{body,icon:"icon-192.png",tag:"ittime-"+key});return true}catch(e){return false}
}
function evaluateSmartNotifications(){
  const n=smartNotifyPrefs(),c=state.current;
  if(!c||c.status!=="working")return;
  const elapsed=workElapsed(c), mins=Math.floor(elapsed/60000);
  if(n.breakReminder&&mins>=n.continuousMinutes)sendItTimeNotification("ItTime — Take a break",`You've been working for ${Math.floor(mins/60)}h ${mins%60}m. Consider a ${n.breakMinutes}-minute break.`,"break");
  if(n.longWork&&mins>=Math.max(n.continuousMinutes*2,240))sendItTimeNotification("ItTime — Long work session",`This session is ${Math.floor(mins/60)}h ${mins%60}m. Your recovery matters.`,"long");
}

function pushPrefs(){
 state.settings=state.settings||{};state.settings.push=state.settings.push||{};
 return Object.assign({enabled:false,serverUrl:"https://ittime-push.trabi2717.workers.dev",apiToken:"",subscribed:false,publicKey:""},state.settings.push);
}
function pushDeviceId(){
 let id=localStorage.getItem("ittime_push_device_id");
 if(!id){id=crypto.randomUUID?crypto.randomUUID():"d_"+Date.now()+"_"+Math.random().toString(36).slice(2);localStorage.setItem("ittime_push_device_id",id)}
 return id;
}
async function pushRequest(path,payload={}){
 const p=pushPrefs();if(!p.serverUrl||!p.apiToken)throw new Error("Push server is not configured.");
 const r=await fetch(p.serverUrl.replace(/\/$/,"")+path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+p.apiToken},body:JSON.stringify(Object.assign({deviceId:pushDeviceId()},payload))});
 if(!r.ok)throw new Error((await r.text()).slice(0,200)||"Push server error");return r.json();
}
function base64UrlToUint8Array(base64){
 const pad="=".repeat((4-base64.length%4)%4),b64=(base64+pad).replace(/-/g,"+").replace(/_/g,"/");
 const raw=atob(b64),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;
}
async function enableReliablePush(){
 const p=pushPrefs();
 if(!p.serverUrl||!p.apiToken){toast("Enter the Push Server URL and API token first");return}
 if(!("serviceWorker"in navigator)||!("PushManager"in window)||!("Notification"in window)){toast("This device/browser does not support Web Push");return}
 if(!(window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone)){toast("Add ItTime to your iPhone Home Screen first");return}
 try{
  const permission=Notification.permission==="granted"?"granted":await Notification.requestPermission();
  if(permission!=="granted"){toast("Notification permission was not granted");return}
  const base=p.serverUrl.replace(/\/$/,""),kr=await fetch(base+"/vapid-public-key");
  if(!kr.ok)throw new Error("Could not reach the push server.");
  p.publicKey=(await kr.json()).publicKey||"";if(!p.publicKey)throw new Error("No VAPID public key returned.");
  const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlToUint8Array(p.publicKey)});
  await pushRequest("/subscribe",{subscription:sub.toJSON()});
  p.enabled=true;p.subscribed=true;state.settings.push=p;save();render();await scheduleDailyPushes();
  if(state.current?.status==="working")await scheduleCurrentBreakPush();toast("Reliable Push enabled");
 }catch(e){console.error(e);toast("Reliable Push failed: "+e.message)}
}
async function schedulePush(id,fireAt,title,body,tag="ittime",repeatMs=0){
 const p=pushPrefs();if(!p.enabled||!p.subscribed)return;
 try{await pushRequest("/schedule",{reminderId:id,fireAt,title,body,tag,url:location.origin+location.pathname,repeatMs})}catch(e){console.warn("Push schedule failed",e)}
}
async function cancelPush(id){try{await pushRequest("/cancel",{reminderId:id})}catch(e){console.warn("Push cancel failed",e)}}
function nextLocalTime(hhmm){
 const a=String(hhmm||"20:00").split(":").map(Number),d=new Date();d.setHours(a[0]||0,a[1]||0,0,0);if(d.getTime()<=Date.now())d.setDate(d.getDate()+1);return d.getTime();
}
async function pushFireTime(target){
 const n=smartNotifyPrefs(),d=new Date(target),[sh,sm]=n.quietStart.split(":").map(Number),[eh,em]=n.quietEnd.split(":").map(Number);
 const quietStart=sh*60+sm,quietEnd=eh*60+em,mins=d.getHours()*60+d.getMinutes();
 const inQuiet=quietStart<quietEnd?mins>=quietStart&&mins<quietEnd:mins>=quietStart||mins<quietEnd;
 if(!inQuiet)return target;
 const end=new Date(d);end.setHours(eh,em,0,0);
 if(quietStart<quietEnd && mins>=quietStart)end.setDate(end.getDate()+1);
 if(quietStart>=quietEnd && mins<quietEnd){}
 if(end.getTime()<=target)end.setDate(end.getDate()+1);
 return end.getTime();
}
async function scheduleDailyPushes(){
 const n=smartNotifyPrefs();if(!pushPrefs().enabled)return;
 if(n.reflection){
   const fireAt=await pushFireTime(nextLocalTime(n.reflectionTime));
   await schedulePush("daily-reflection",fireAt,"ItTime — Daily reflection","Take a few minutes to review your work, learning and balance.","reflection",86400000);
 }else await cancelPush("daily-reflection");
}
async function scheduleCurrentWorkPushes(){
 const p=pushPrefs(),c=state.current;if(!p.enabled||!p.subscribed||!c||c.status!=="working")return;
 const n=smartNotifyPrefs(),id=pushDeviceId(),now=Date.now();
 await cancelPush("work-break-"+id);await cancelPush("work-long-"+id);
 if(n.breakReminder){
   const mins=n.continuousMinutes;
   const fireAt=await pushFireTime(now+mins*60000);
   await schedulePush("work-break-"+id,fireAt,"ItTime — Take a break",`You've been working for ${Math.floor(mins/60)}h ${mins%60}m. Consider a ${n.breakMinutes}-minute break.` ,"break",0);
 }
 if(n.longWork){
   const mins=Math.max(n.continuousMinutes*2,240);
   const fireAt=await pushFireTime(now+mins*60000);
   await schedulePush("work-long-"+id,fireAt,"ItTime — Long work session",`This session is ${Math.floor(mins/60)}h ${mins%60}m. Your recovery matters.` ,"long",0);
 }
}
async function cancelCurrentWorkPushes(){
 const id=pushDeviceId();await cancelPush("work-break-"+id);await cancelPush("work-long-"+id);
}
async function scheduleCurrentBreakPush(){return scheduleCurrentWorkPushes()}
async function cancelCurrentBreakPush(){return cancelCurrentWorkPushes()}
function notificationPrefs(){
  state.settings.notifications=Object.assign({
    enabled:false,workReminder:true,reminderHours:3,
    dailyLimit:true,dailyLimitHours:8,restReminder:true
  },state.settings.notifications||{});
  return state.settings.notifications;
}
function notify(title,body,tag="ittime"){
  if(!("Notification" in window) || Notification.permission!=="granted") return false;
  if(navigator.serviceWorker){
    navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,tag,icon:"./icon-192.png",badge:"./icon-192.png"})).catch(()=>new Notification(title,{body}));
  } else new Notification(title,{body});
  return true;
}
function workloadAdvice(){
  const hours=totalToday()/3600000, rest=breakToday()/3600000;
  if(hours>=10) return {level:"high",title:"You have worked a long day.",body:"Consider stopping rather than adding more work. Protect sleep and recovery."};
  if(hours>=8 && rest<1) return {level:"warn",title:"Your workload is high.",body:"You have worked 8+ hours today with less than 1 hour of recorded break time."};
  if(hours>=6 && rest<0.5) return {level:"warn",title:"Take a real break.",body:"You have logged 6+ hours today and less than 30 minutes of break time."};
  return null;
}
function notificationStatus(){
  notificationPrefs();
  return {supported:"Notification" in window,permission:("Notification" in window?Notification.permission:"unsupported")};
}
repairHistoricalSessions();
function render(){
 document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.tab));
 let dot=document.getElementById("statusDot");dot.className="status-dot"+(state.current?.status==="working"?" working":state.current?.status==="break"?" break":"");
 let main=document.getElementById("app");
 if(state.tab==="today")main.innerHTML=todayHTML();
 if(state.tab==="history")main.innerHTML=historyHTML();
 if(state.tab==="insights")main.innerHTML=insightsHTML();
 if(state.tab==="settings")main.innerHTML=settingsHTML();
 bind();
 maybePromptReflection();
}

function todayHTML(){
 let cur=state.current;
 let eventLabel=cur?.eventId?eventById(cur.eventId)?.name:cur?.eventName;
 let current=cur?`<div class="card current-card">
 <div class="row"><div><b>${esc(cur.source)}</b><div class="muted">${esc(eventLabel||"Work session")}</div></div><span class="badge ${cur.kind==="event"?"badge-event":"badge-screen"}">${cur.kind==="event"?"Event Work":"Screen Work"}</span></div>
 <div class="section-title">${cur.status==="break"?"ON BREAK":"WORKING"}</div>
 <div class="big timer">${fmt(cur.status==="break"?Date.now()-cur.breakStart:workElapsed(cur))}</div>
 <div class="muted">${(cur.types||[]).map(esc).join(" · ")}</div>
 <div class="actions">${cur.status==="working"?`<button class="btn warning" data-action="break">☕ Break</button><button class="btn primary" data-action="done">✓ Work Done</button>`:`<button class="btn success" data-action="resume">▶ Continue Work</button><button class="btn primary" data-action="done">✓ End Work</button>`}</div></div>`:
 `<div class="card hero-card"><div class="eyebrow">READY</div><div class="hero-title">What are you working on?</div><div class="muted">Track event production and screen work separately. Breaks are excluded from your work time.</div><div class="actions two"><button class="btn primary" data-action="startEvent">＋ Event Work</button><button class="btn secondary" data-action="startScreen">＋ Screen Work</button></div></div>`;
 return `<section><div class="section-title">Today</div>${current}
 <div class="section-title">Today at a glance</div><div class="stats" data-live-stats>
 <div class="stat stat-work"><div class="value today-live-work">${fmt(totalToday())}</div><div class="label">Work</div></div>
 <div class="stat stat-break"><div class="value">${fmt(breakToday())}</div><div class="label">Break</div></div>
 <div class="stat stat-sessions"><div class="value">${state.sessions.filter(s=>s.date===dateKey()).length+(state.current?.date===dateKey()?1:0)}</div><div class="label">Sessions</div></div></div>
 ${workloadAdvice()?`<div class="notice workload-${workloadAdvice().level}"><b>${esc(workloadAdvice().title)}</b><br>${esc(workloadAdvice().body)}</div>`:""}
 <div class="section-title">Daily Reflection</div>
 <div class="card">
  <div class="muted" style="margin-bottom:10px">A short review of your work, learning, and balance.</div>
  <div class="reflection-summary"><b>Today:</b> ${fmt(reflectionStats().work)} work · ${fmt(reflectionStats().br)} breaks · ${reflectionStats().sessions} sessions</div>
  <div class="notice">${esc(reflectionAssessment(reflectionStats(),todayReflection()))}</div>
  ${(()=>{
    const r=todayReflection()||{};
    return `<label>What did you accomplish today?</label><textarea id="rAccomplished" rows="3">${esc(r.accomplished||"")}</textarea>
    <label>What was difficult or frustrating?</label><textarea id="rDifficult" rows="3">${esc(r.difficult||"")}</textarea>
    <label>What did you learn today?</label><textarea id="rLearned" rows="3">${esc(r.learned||"")}</textarea>
    <label>Did you take care of yourself today?</label><textarea id="rSelfCare" rows="3">${esc(r.selfCare||"")}</textarea>
    <label>What should you do differently tomorrow?</label><textarea id="rTomorrow" rows="3">${esc(r.tomorrow||"")}</textarea>
    <label>What are you grateful for today? <span class="muted">(optional)</span></label><textarea id="rGrateful" rows="2">${esc(r.grateful||"")}</textarea>
    <label>Did you forget yourself while working today?</label>
    <select id="rBalance"><option value="">Choose one</option><option value="no" ${r.balance==="no"?"selected":""}>No, I balanced it well</option><option value="little" ${r.balance==="little"?"selected":""}>A little</option><option value="yes" ${r.balance==="yes"?"selected":""}>Yes, I pushed myself too hard</option></select>
    <div class="actions"><button class="btn primary" data-action="saveDailyReflection">${r.updatedAt?"Update Reflection":"Save Reflection"}</button></div>`;
  })()}
 </div>
 <div class="section-title">This week</div><div class="card"><div class="row"><b>${fmt(weekTotal())}</b><span class="muted">Monday–today</span></div>
 <div class="notice"><b>BM value this month:</b> ${money(bmMonthValue())}</div></div></section>`;
}
function workElapsed(c){
  const now=Date.now();
  const totalElapsed=Math.max(0,now-c.start);
  const breaks=breakMs(c);
  return Math.max(0,totalElapsed-breaks);
}
function historyHTML(){
 let ss=[...state.sessions].sort((a,b)=>b.start-a.start);
 let refl=`<div class="section-title">Reflections</div><div class="card compact-card"><div class="actions two"><button class="btn secondary" data-action="weeklyList">Weekly reflections</button><button class="btn secondary" data-action="monthlyList">Monthly reflections</button></div></div>`;
 let events=[...state.events].sort((a,b)=>(b.startDate||"").localeCompare(a.startDate||""));
 let eventBlock=`<div class="section-title">Events</div><div class="actions"><button class="btn primary" data-action="newEvent">+ New Event</button></div><div class="card">${events.length?events.map(eventListItem).join(""):`<div class="empty">No events yet.</div>`}</div>`;
 if(!ss.length)return `<div class="section-title">History</div><button class="btn primary full" data-action="manual">＋ Add Past Work</button>${eventBlock}${refl}<div class="card empty">No completed sessions yet.</div>`;
 let groups={};ss.forEach(s=>(groups[s.date]??=[]).push(s));
 return `<div class="section-title">History</div><button class="btn primary full" data-action="manual">＋ Add Past Work</button>${eventBlock}${refl}${Object.entries(groups).map(([d,list])=>`<div class="card event-card"><b>${fmtDate(d)}</b>${list.map(s=>sessionHTML(s)).join("")}</div>`).join("")}`;
}
function eventListItem(e){
 const h=eventWorkMs(e.id), income=e.source==="Freelance"?Number(e.payment||0):0, rate=e.source==="Freelance"?eventRate(e.id):bmRate(e.startDate?.slice(0,7)||monthKey());
 return `<button class="event-list-item" data-event="${e.id}"><div><b>${esc(e.name)}</b><div class="muted">${esc(e.source)}${e.client?" · "+esc(e.client):""}</div></div><div class="event-list-right"><b>${fmt(h)}</b><span>${e.source==="Freelance"?money(income):"BM"}</span></div></button>`;
}
function sessionHTML(s){
 let e=s.eventId?eventById(s.eventId):null;
 let val=s.source==="BM"?` · Value ${money(allocValue(s))}`:s.source==="Freelance"&&!s.eventId?` · Legacy ${money(s.payment||0)}`:"";
 return `<div class="session"><div class="row"><div><div class="session-title">${esc(e?.name||s.eventName||"Work session")}</div><div class="muted">${esc(s.source)} · ${s.kind==="event"?"Event Work":"Screen Work"}${e?.client?" · "+esc(e.client):""}</div></div><b>${fmt(workMs(s))}</b><div class="actions"><button class="btn secondary small" data-action="editSession" data-id="${esc(String(s.id))}">Edit</button><button class="btn danger small" data-action="deleteSession" data-id="${esc(String(s.id))}">Delete</button></div></div>
 <div>${(s.types||[]).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}</div>
 <div class="muted" style="margin-top:6px;font-size:12px">${new Date(s.start).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} – ${new Date(s.end).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} · Break ${fmt(breakMs(s))}${val}</div>
 <div style="margin-top:9px"><button class="btn small secondary" data-edit="${s.id}">Edit</button> <button class="btn small danger" data-delete="${s.id}">Delete</button></div></div>`;
}
function insightsHTML(){
 let m=monthKey(),bm=bmHours(m),fr=totalFor(s=>s.source==="Freelance"&&s.date.startsWith(m))+(state.current?.source==="Freelance"&&state.current?.date.startsWith(m)?activeWorkMs():0),income=freelanceIncome(s=>s.date.startsWith(m));
 let wkCount=Object.keys(state.reflections.weekly).length,moCount=Object.keys(state.reflections.monthly).length;
 let bmVal=bmRate(m), eventsThisMonth=state.events.filter(e=>(e.startDate||"").startsWith(m));
 return `<div class="section-title">Insights</div><div class="card insight-card">
 <div class="section-title">Today</div><div class="big">${fmt(totalToday())}</div>
 <div class="section-title">This week</div><div class="big">${fmt(weekTotal())}</div>
 <div class="section-title">This month</div><div class="big">${fmt(monthTotal())}</div>
 <div class="section-title">Current month</div><div class="stats"><div class="stat stat-bm"><div class="value">${fmt(bm)}</div><div class="label">BM time</div></div><div class="stat stat-freelance"><div class="value">${fmt(fr)}</div><div class="label">Freelance time</div></div><div class="stat stat-money"><div class="value">${money(income)}</div><div class="label">Freelance income</div></div></div>
 <div class="notice"><b>BM salary:</b> ${money(bmSalary(m))}<br><b>BM calculated hourly value:</b> ${bmVal?money(bmVal)+"/hour":"Not enough BM hours yet"}</div>
 <div class="section-title">Events this month</div><div class="row"><span>Events</span><b>${eventsThisMonth.length}</b></div>
 <div class="section-title">Reflection history</div><div class="row"><span>Weekly</span><b>${wkCount}</b></div><div class="row"><span>Monthly</span><b>${moCount}</b></div>
 <div class="actions"><button class="btn secondary" data-action="weeklyList">View weekly reflections</button><button class="btn secondary" data-action="monthlyList">View monthly reflections</button></div>
 </div>`;
}
function settingsHTML(){
 let m=monthKey(),n=notificationStatus(),p=notificationPrefs(),s=state.settings;
 const accentOptions=[["#2563eb","Blue"],["#16a34a","Green"],["#7c3aed","Purple"],["#db2777","Pink"],["#ea580c","Orange"],["#0891b2","Cyan"]];
 const eventCats=s.categories.event,screenCats=s.categories.screen;
 return `<div class="section-title">Settings</div><div class="card"><div class="row"><div><b>Smart Notifications</b><div class="muted">Breaks, long-work warnings, reflection reminders and quiet hours.</div></div><button class="btn secondary" data-action="smartNotifications">Configure</button></div></div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>Preferences</b><div class="muted">Make ItTime behave the way you work.</div></div></div>
  <div class="settings-grid">
   <label>Theme<select id="setTheme"><option value="system" ${s.theme==="system"?"selected":""}>System</option><option value="light" ${s.theme==="light"?"selected":""}>Light</option><option value="dark" ${s.theme==="dark"?"selected":""}>Dark</option></select></label>
   <label>Time format<select id="setTime"><option value="12" ${s.timeFormat==="12"?"selected":""}>12-hour</option><option value="24" ${s.timeFormat==="24"?"selected":""}>24-hour</option></select></label>
  </div>
  <div class="setting-block"><div class="setting-label">Accent color</div><div class="color-row">${accentOptions.map(([v,name])=>`<button class="color-dot ${s.accent===v?"selected":""}" title="${name}" data-accent="${v}" style="--dot:${v}"></button>`).join("")}</div></div>
  <div class="setting-toggle"><span><b>Show seconds</b><small>Show HH:MM:SS instead of HH:MM.</small></span><input id="setSeconds" type="checkbox" ${s.showSeconds?"checked":""}></div>
  <div class="setting-toggle"><span><b>Compact mode</b><small>Fit more information on screen.</small></span><input id="setCompact" type="checkbox" ${s.compact?"checked":""}></div>
  <div class="setting-toggle"><span><b>Animations</b><small>Use transitions and motion.</small></span><input id="setAnimations" type="checkbox" ${s.animations?"checked":""}></div>
  <div class="settings-grid">
   <label>Timer style<select id="setTimerStyle"><option value="digital" ${s.timerStyle==="digital"?"selected":""}>Digital</option><option value="simple" ${s.timerStyle==="simple"?"selected":""}>Simple</option></select></label>
   <label>Card style<select id="setCardStyle"><option value="default" ${s.cardStyle==="default"?"selected":""}>Default</option><option value="minimal" ${s.cardStyle==="minimal"?"selected":""}>Minimal</option><option value="glass" ${s.cardStyle==="glass"?"selected":""}>Glass</option></select></label>
  </div>
  <div class="setting-toggle"><span><b>Filled buttons</b><small>Turn off for lighter outline-style controls.</small></span><input id="setButtonStyle" type="checkbox" ${s.buttonStyle==="filled"?"checked":""}></div>
  <label>First day of week<select id="setFirstDay"><option value="monday" ${s.firstDay==="monday"?"selected":""}>Monday</option><option value="sunday" ${s.firstDay==="sunday"?"selected":""}>Sunday</option></select></label>
  <div class="actions"><button class="btn primary" data-action="saveAppearance">Save Preferences</button></div>
 </div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>Earnings & Finance</b><div class="muted">Keep BM and freelance economics separate.</div></div></div>
  <label>BM monthly salary (${m})<input id="salary" type="number" min="0" step="100" value="${bmSalary(m)}"></label>
  <label>Freelance default rate (MRU/hour)<input id="freelanceRate" type="number" min="0" step="50" value="${Number(s.freelanceRate||0)}"></label>
  <div class="setting-toggle"><span><b>Show earnings in Insights</b><small>Display BM value and freelance income.</small></span><input id="showEarnings" type="checkbox" ${s.showEarnings!==false?"checked":""}></div>
  <div class="setting-toggle"><span><b>Calculate effective freelance rate</b><small>Payment divided by tracked work time.</small></span><input id="effectiveRate" type="checkbox" ${s.calculateEffectiveRate!==false?"checked":""}></div>
  <div class="actions"><button class="btn primary" data-action="saveFinance">Save Finance Settings</button></div>
 </div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>Categories & Labels</b><div class="muted">Choose exactly which roles appear when starting work.</div></div></div>
  <div class="category-title">Event Work</div>
  <div id="eventCatList" class="category-list">${eventCats.map((x,i)=>`<div class="category-row"><span>${esc(x)}</span><button class="btn small danger" data-cat-delete="event" data-cat-index="${i}">Delete</button></div>`).join("")}</div>
  <div class="inline-add"><input id="newEventCat" placeholder="Add event category"><button class="btn secondary" data-action="addEventCategory">Add</button></div>
  <div class="category-title">Screen Work</div>
  <div id="screenCatList" class="category-list">${screenCats.map((x,i)=>`<div class="category-row"><span>${esc(x)}</span><button class="btn small danger" data-cat-delete="screen" data-cat-index="${i}">Delete</button></div>`).join("")}</div>
  <div class="inline-add"><input id="newScreenCat" placeholder="Add screen category"><button class="btn secondary" data-action="addScreenCategory">Add</button></div>
 </div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>Reliable Push</b><div class="muted">Server-backed notifications that can arrive while ItTime is closed.</div></div></div>
  <label>Push Server URL<input id="pushUrl" type="url" placeholder="https://your-worker.workers.dev" value="${esc(pushPrefs().serverUrl)}"></label>
  <label>API Token<input id="pushToken" type="password" placeholder="Keep this private" value="${esc(pushPrefs().apiToken)}"></label>
  <div class="notice">Never put the API token or VAPID private key in GitHub.</div>
  <div class="actions"><button class="btn secondary" data-action="savePushConfig">Save Push Config</button><button class="btn primary" data-action="enableReliablePush">Enable Reliable Push</button>${pushPrefs().enabled?`<button class="btn danger" data-action="disableReliablePush">Disable Push</button>`:""}</div>
  <div class="muted">Status: ${pushPrefs().enabled&&pushPrefs().subscribed?"Enabled":"Not connected"}</div>
 </div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>Notifications</b><div class="muted">${n.permission==="granted"?"Phone permission is enabled.":"Phone permission is not enabled."}</div></div></div>
  <div class="actions"><button class="btn primary" data-action="enableNotifications">${n.permission==="granted"?"Notifications Enabled":"Enable Notifications"}</button>${n.permission==="granted"?`<button class="btn secondary" data-action="testNotification">Send Test Notification</button>`:""}</div>
  <label><input id="nWork" type="checkbox" ${p.workReminder?"checked":""}> Long-work reminder</label>
  <input id="nHours" type="number" min="1" max="12" step="0.5" value="${p.reminderHours}">
  <label><input id="nLimit" type="checkbox" ${p.dailyLimit?"checked":""}> Daily work limit warning</label>
  <input id="nLimitHours" type="number" min="1" max="24" step="0.5" value="${p.dailyLimitHours}">
  <label><input id="nRest" type="checkbox" ${p.restReminder?"checked":""}> Workload/rest warnings</label>
  <div class="actions"><button class="btn secondary" data-action="saveNotifications">Save Notification Settings</button></div>
 </div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>Backup & Restore</b><div class="muted">Your data stays on this device unless you export it.</div></div></div>
  <div class="actions two"><button class="btn secondary" data-action="export">Export Backup (JSON)</button><button class="btn secondary" data-action="importBackup">Import Backup (JSON)</button></div>
  <input id="backupFile" type="file" accept=".json,application/json" hidden>
 </div>

 <div class="settings-section danger-section">
  <div class="settings-section-head"><div><b>Erase All Data</b><div class="muted">Permanently remove work sessions, events, reflections, salary settings, categories, and preferences.</div></div></div>
  <div class="notice danger-notice"><b>This cannot be undone.</b><br>Export a backup first if you may need your records later.</div>
  <div class="actions"><button class="btn danger" data-action="reset">Erase All Data</button></div>
 </div>

 <div class="settings-section">
  <div class="settings-section-head"><div><b>About ItTime</b><div class="muted">Version 1.1</div></div></div>
  <div class="notice">ItTime is designed for personal work tracking. Work records are stored locally in your browser.</div>
 </div>`;
}
function reflectionPendingHTML(){
 let wk=weekKey(),now=new Date(),dow=now.getDay();
 // Week reflection becomes due on Sunday after the week has ended, but can be opened manually anytime.
 let due=!state.reflections.weekly[wk] && dow===0 && weekTotal()>0;
 let mo=monthKey(), first=new Date(now.getFullYear(),now.getMonth()+1,1), monthEnded=now>=first;
 let mdue=monthEnded&&!state.reflections.monthly[mo]&&monthTotal()>0;
 if(!due&&!mdue)return "";
 return `<div class="card" style="margin-top:12px"><b>Reflection ready</b><div class="muted" style="margin-top:5px">${due?"Your weekly reflection is ready.":""}${mdue?" Your monthly reflection is ready.":""}</div><div class="actions">${due?`<button class="btn primary" data-action="weekly">Weekly Reflection</button>`:""}${mdue?`<button class="btn secondary" data-action="monthly">Monthly Reflection</button>`:""}</div></div>`;
}
function maybePromptReflection(){/* non-intrusive: pending card handles it */}

/* Reflection UI */
function reflectionModal(type,key){
 let isW=type==="weekly", exists=state.reflections[type][key], start=isW?new Date(key+"T00:00:00"):new Date(key+"-01T00:00:00");
 let end=isW?new Date(start.getTime()+6*86400000):new Date(start.getFullYear(),start.getMonth()+1,0);
 let sessions=state.sessions.filter(s=>isW?s.date>=key&&s.date<=end.toISOString().slice(0,10):s.date.startsWith(key));
 let hours=sessions.reduce((a,s)=>a+workMs(s),0),bm=sessions.filter(s=>s.source==="BM").reduce((a,s)=>a+workMs(s),0),fr=sessions.filter(s=>s.source==="Freelance").reduce((a,s)=>a+workMs(s),0),income=sessions.filter(s=>s.source==="Freelance").reduce((a,s)=>a+Number(s.payment||0),0);
 let root=document.getElementById("modalRoot");
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${isW?"Weekly":"Monthly"} Reflection</h2>
 <div class="card"><div class="row"><span>Work</span><b>${fmt(hours)}</b></div><div class="row"><span>BM</span><b>${fmt(bm)}</b></div><div class="row"><span>Freelance</span><b>${fmt(fr)}</b></div>${!isW?`<div class="row"><span>Freelance income</span><b>${money(income)}</b></div>`:""}</div>
 <label>Was this work worth your time?</label><div class="choice-grid">${["Yes","Partly","No"].map(x=>`<button class="choice worth ${(exists?.worth===x?"selected":"")}">${x}</button>`).join("")}</div>
 <label>What did you gain?</label><div class="choice-grid">${gains.map(x=>`<button class="choice gain ${(exists?.gains||[]).includes(x)?"selected":""}">${x}</button>`).join("")}</div>
 <label>What did you sacrifice?</label><div class="choice-grid">${sacrifices.map(x=>`<button class="choice sacrifice ${(exists?.sacrifices||[]).includes(x)?"selected":""}">${x}</button>`).join("")}</div>
 <label>Did you forget yourself?</label><div class="choice-grid">${["Yes","Somewhat","No"].map(x=>`<button class="choice forget ${(exists?.forget===x?"selected":"")}">${x}</button>`).join("")}</div>
 <label>Are you moving toward the life you want?</label><div class="choice-grid">${["Yes","Not sure","No"].map(x=>`<button class="choice direction ${(exists?.direction===x?"selected":"")}">${x}</button>`).join("")}</div>
 <label>Write anything you want</label><textarea id="reflectionText" placeholder="What did this period of work actually give you?">${esc(exists?.text||"")}</textarea>
 <div class="modal-actions"><button class="btn secondary" id="cancel">Cancel</button><button class="btn primary" id="saveReflection">Save Reflection</button></div></div></div>`;
 let selected={worth:exists?.worth||"",gains:[...(exists?.gains||[])],sacrifices:[...(exists?.sacrifices||[])],forget:exists?.forget||"",direction:exists?.direction||""};
 document.querySelectorAll(".worth").forEach(b=>b.onclick=()=>{selected.worth=b.textContent;document.querySelectorAll(".worth").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
 document.querySelectorAll(".forget").forEach(b=>b.onclick=()=>{selected.forget=b.textContent;document.querySelectorAll(".forget").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
 document.querySelectorAll(".direction").forEach(b=>b.onclick=()=>{selected.direction=b.textContent;document.querySelectorAll(".direction").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
 document.querySelectorAll(".gain").forEach(b=>b.onclick=()=>{let x=b.textContent;selected.gains=selected.gains.includes(x)?selected.gains.filter(y=>y!==x):[...selected.gains,x];b.classList.toggle("selected",selected.gains.includes(x))});
 document.querySelectorAll(".sacrifice").forEach(b=>b.onclick=()=>{let x=b.textContent;selected.sacrifices=selected.sacrifices.includes(x)?selected.sacrifices.filter(y=>y!==x):[...selected.sacrifices,x];b.classList.toggle("selected",selected.sacrifices.includes(x))});
 document.getElementById("cancel").onclick=()=>root.innerHTML="";
 document.getElementById("saveReflection").onclick=()=>{
  if(!selected.worth||!selected.forget||!selected.direction)return alert("Please answer the main questions.");
  state.reflections[type][key]={...selected,text:document.getElementById("reflectionText").value.trim(),savedAt:Date.now(),workMs:hours,bmMs:bm,freelanceMs:fr,income};
  save();root.innerHTML="";render();
 };
}
function listReflections(type){
 let entries=Object.entries(state.reflections[type]).sort((a,b)=>b[0].localeCompare(a[0]));
 let root=document.getElementById("modalRoot");
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${type==="weekly"?"Weekly":"Monthly"} Reflections</h2>
 ${entries.length?entries.map(([k,r])=>`<div class="card event-card"><div class="row"><b>${type==="weekly"?"Week of ":""}${esc(k)}</b><span>${fmt(r.workMs||0)}</span></div><div class="muted">Worth it: ${esc(r.worth)} · Forgot yourself: ${esc(r.forget)}</div><div>${(r.gains||[]).map(x=>`<span class="badge">${esc(x)}</span>`).join("")}</div><div class="muted" style="margin-top:7px">${esc(r.text||"")}</div><div style="margin-top:9px"><button class="btn small secondary" data-open-ref="${type}|${k}">Open</button></div></div>`).join(""):`<div class="empty">No reflections saved yet.</div>`}
 <div class="modal-actions"><button class="btn secondary" id="close">Close</button></div></div></div>`;
 document.getElementById("close").onclick=()=>root.innerHTML="";
 document.querySelectorAll("[data-open-ref]").forEach(b=>b.onclick=()=>{let [t,k]=b.dataset.openRef.split("|");root.innerHTML="";reflectionModal(t,k)});
}

/* Session creation/editing */
function openStart(kind,existing=null){
 const types=kind==="event"?eventTypes:screenTypes,root=document.getElementById("modalRoot");
 let eventOptions=state.events.filter(e=>e.source===undefined||true).map(e=>`<option value="${e.id}" ${existing?.eventId===e.id?"selected":""}>${esc(e.name)}${e.client?" — "+esc(e.client):""}</option>`).join("");
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${existing?"EDIT SESSION":kind==="event"?"EVENT WORK":"SCREEN WORK"}</div><h2>${existing?"Edit Session":kind==="event"?"Start Event Work":"Start Screen Work"}</h2></div><button class="close-btn" id="cancel">×</button></div>
 ${kind==="event"&&!existing?`<div class="segmented"><button class="seg selected" id="newEventMode">New Event</button><button class="seg" id="existingEventMode">Existing Event</button></div>`:""}
 <label>Work source</label><div class="choice-grid"><button class="choice ${(!existing||existing.source==="BM")?"selected":""}" data-src="BM">🏢 BM</button><button class="choice ${existing?.source==="Freelance"?"selected":""}" data-src="Freelance">💼 Freelance</button></div>
 ${kind==="event"&&!existing?`<div id="eventChoiceNew"><label>Event name</label><input id="name" placeholder="e.g. Festival L'Aak"><div id="clientWrap"><label>Client <span class="muted">(required for Freelance)</span></label><input id="client" placeholder="Freelance client"></div><div id="eventPaymentWrap"><label>Event payment (MRU)</label><input id="eventPayment" type="number" min="0" step="100" value="0"></div></div>
 <div id="eventChoiceExisting" style="display:none"><label>Existing event</label><select id="existingEvent">${eventOptions||"<option value=''>No events yet</option>"}</select></div>`:
 kind==="event"?`<label>Event</label><select id="existingEvent">${eventOptions}</select>`:
 `<label>Related event <span class="muted">(optional)</span></label><select id="existingEvent"><option value="">No event</option>${eventOptions}</select><label>Project / work name <span class="muted">(optional)</span></label><input id="name" value="${esc(existing?.eventName||"")}" placeholder="e.g. Edit campaign video">`}
 <label>${kind==="event"?"Work roles":"Work type"}</label><div class="choice-grid" id="types">${types.map(t=>`<button class="choice ${(existing?.types||[]).includes(t)?"selected":""}" data-type="${t}">${t}</button>`).join("")}</div>
 <label>Notes (optional)</label><textarea id="notes">${esc(existing?.notes||"")}</textarea>
 <div class="modal-actions"><button class="btn secondary" id="cancel2">Cancel</button><button class="btn primary" id="start">${existing?"Save Changes":"Start Work"}</button></div></div></div>`;
 let src=existing?.source||"BM",selected=[...(existing?.types||[])],mode="new";
 const clientWrap=document.getElementById("clientWrap"),paymentWrap=document.getElementById("eventPaymentWrap");
 const updateSource=()=>{document.querySelectorAll("[data-src]").forEach(x=>x.classList.toggle("selected",x.dataset.src===src));if(clientWrap)clientWrap.style.display=src==="Freelance"?"block":"none";if(paymentWrap)paymentWrap.style.display=src==="Freelance"?"block":"none"};
 document.querySelectorAll("[data-src]").forEach(b=>b.onclick=()=>{src=b.dataset.src;updateSource()});
 document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{let t=b.dataset.type;selected=selected.includes(t)?selected.filter(x=>x!==t):[...selected,t];b.classList.toggle("selected",selected.includes(t))});
 const close=()=>root.innerHTML=""; document.getElementById("cancel").onclick=close;document.getElementById("cancel2").onclick=close;
 const newBtn=document.getElementById("newEventMode"),oldBtn=document.getElementById("existingEventMode"),newBox=document.getElementById("eventChoiceNew"),oldBox=document.getElementById("eventChoiceExisting");
 if(newBtn){newBtn.onclick=()=>{mode="new";newBtn.classList.add("selected");oldBtn.classList.remove("selected");newBox.style.display="block";oldBox.style.display="none"};oldBtn.onclick=()=>{mode="existing";oldBtn.classList.add("selected");newBtn.classList.remove("selected");newBox.style.display="none";oldBox.style.display="block"}}
 document.getElementById("start").onclick=()=>{
  if(!selected.length)return alert("Select at least one work type.");
  let now=Date.now(),name=document.getElementById("name")?.value.trim()||"",client=document.getElementById("client")?.value.trim()||"",notes=document.getElementById("notes").value.trim(),eventId=document.getElementById("existingEvent")?.value||"";
  if(existing){
    Object.assign(existing,{source:src,types:selected,notes});
    if(kind==="event"){existing.eventId=eventId;let e=eventById(eventId);existing.eventName=e?.name||existing.eventName;existing.client=e?.client||existing.client}
    else {existing.eventId=eventId||"";existing.eventName=name}
    save();close();render();return;
  }
  if(kind==="event" && mode==="new"){
    if(!name)return alert("Enter an event name.");
    if(src==="Freelance"&&!client)return alert("Enter the freelance client.");
    const eid=crypto.randomUUID?crypto.randomUUID():`e_${now}`;
    const payment=Number(document.getElementById("eventPayment")?.value||0);
    const e={id:eid,name,source:src,client,startDate:dateKey(),endDate:dateKey(),payment:src==="Freelance"?payment:0,notes:""};
    state.events.push(e);eventId=eid;
  } else if(kind==="event"){
    const e=eventById(eventId); if(!e)return alert("Select an existing event.");
    if(e.source!==src)return alert("The event source does not match. Use the event's source.");
    name=e.name;client=e.client;
  }
  if(kind==="screen"&&eventId){let e=eventById(eventId);if(e){src=e.source;name=name||"";}}
  state.current={id:crypto.randomUUID?crypto.randomUUID():String(now),start:now,date:dateKey(),source:src,kind,eventId:eventId||"",eventName:name,client,types:selected,notes,status:"working",breaks:[]};
  close();save();render();
  scheduleCurrentBreakPush();
 };
 updateSource();
}
function openManual(){
 let root=document.getElementById("modalRoot"),eventOptions=state.events.map(e=>`<option value="${e.id}">${esc(e.name)}${e.client?" — "+esc(e.client):""}</option>`).join("");
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">HISTORY</div><h2>Add Past Work</h2></div><button class="close-btn" id="cancel">×</button></div>
 <label>Date</label><input id="md" type="date" value="${dateKey()}"><label>Start</label><input id="ms" type="time" value="09:00"><label>End</label><input id="me" type="time" value="17:00">
 <label>Work type</label><select id="mk"><option value="event">Event Work</option><option value="screen">Screen Work</option></select><label>Work source</label><select id="mso"><option>BM</option><option>Freelance</option></select>
 <label>Related event <span class="muted">(optional)</span></label><select id="mei"><option value="">No event</option>${eventOptions}</select>
 <label>Name / project <span class="muted">(optional)</span></label><input id="mn" placeholder="Optional"><label>Work types (comma separated)</label><input id="mt" placeholder="Videography, Live Streaming"><label>Break minutes</label><input id="mb" type="number" min="0" value="0"><label>Legacy freelance payment (MRU)</label><input id="mp" type="number" min="0" value="0">
 <div class="modal-actions"><button class="btn secondary" id="cancel2">Cancel</button><button class="btn primary" id="saveManual">Add Work</button></div></div></div>`;
 const close=()=>root.innerHTML="";document.getElementById("cancel").onclick=close;document.getElementById("cancel2").onclick=close;
 document.getElementById("saveManual").onclick=()=>{let d=document.getElementById("md").value,st=document.getElementById("ms").value,en=document.getElementById("me").value,start=new Date(`${d}T${st}`).getTime(),end=new Date(`${d}T${en}`).getTime();if(!d||end<=start)return alert("Enter a valid date and time range.");let eid=document.getElementById("mei").value,e=eventById(eid),src=document.getElementById("mso").value;if(e&&e.source!==src)return alert("The selected event belongs to "+e.source+".");let bm=Number(document.getElementById("mb").value||0)*60000;state.sessions.push({id:String(Date.now()),start,end,date:d,source:src,kind:document.getElementById("mk").value,eventId:eid,eventName:e?.name||document.getElementById("mn").value.trim(),client:e?.client||"",types:document.getElementById("mt").value.split(",").map(x=>x.trim()).filter(Boolean),breaks:bm?[{start:start,end:start+bm}]:[],payment:Number(document.getElementById("mp").value||0),notes:"",status:"done"});save();close();render()};
}

function openEvent(id){
 const e=eventById(id); if(!e)return;
 const root=document.getElementById("modalRoot"),ss=eventSessions(id).sort((a,b)=>a.start-b.start),h=eventWorkMs(id),rate=e.source==="Freelance"?eventRate(id):bmRate((e.startDate||monthKey()).slice(0,7));
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">${esc(e.source)}</div><h2>${esc(e.name)}</h2></div><button class="close-btn" id="close">×</button></div>
 <div class="event-meta"><span>${esc(e.client||"No client")}</span><span>${esc(e.startDate||"")} → ${esc(e.endDate||e.startDate||"")}</span></div>
 <div class="stats"><div class="stat stat-work"><div class="value">${fmt(h)}</div><div class="label">Total work</div></div><div class="stat"><div class="value">${ss.length+(eventHasCurrentSession(id)?1:0)}</div><div class="label">Sessions</div></div><div class="stat stat-money"><div class="value">${e.source==="Freelance"?money(e.payment||0):money(h?rate*(h/3600000):0)}</div><div class="label">${e.source==="Freelance"?"Payment":"BM value"}</div></div></div>
 ${e.source==="Freelance"?`<div class="notice"><b>Effective rate:</b> ${rate?money(rate)+"/hour":"Not enough hours yet"}</div>`:`<div class="notice"><b>BM allocated value:</b> ${money(h?rate*(h/3600000):0)}</div>`}
 <div class="section-title">Sessions</div>${ss.length?ss.map(s=>`<div class="session"><div class="row"><span>${fmtDate(s.date)}</span><b>${fmt(workMs(s))}</b></div><div class="muted">${(s.types||[]).map(esc).join(" · ")} · ${new Date(s.start).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div></div>`).join(""):`<div class="empty">No completed sessions yet.</div>`}
 <div class="modal-actions"><button class="btn secondary" id="editEvent">Edit Event</button><button class="btn primary" id="close2">Close</button></div></div></div>`;
 const close=()=>root.innerHTML="";document.getElementById("close").onclick=close;document.getElementById("close2").onclick=close;
 document.getElementById("editEvent").onclick=()=>openEventEdit(id);
}
function openEventEdit(id){
 const e=eventById(id);if(!e)return;const root=document.getElementById("modalRoot");
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><div><div class="eyebrow">EVENT</div><h2>Edit Event</h2></div><button class="close-btn" id="cancel">×</button></div>
 <label>Event name</label><input id="en" value="${esc(e.name)}"><label>Source</label><select id="es"><option ${e.source==="BM"?"selected":""}>BM</option><option ${e.source==="Freelance"?"selected":""}>Freelance</option></select><label>Client</label><input id="ec" value="${esc(e.client||"")}"><label>Start date</label><input id="ed1" type="date" value="${e.startDate||dateKey()}"><label>End date</label><input id="ed2" type="date" value="${e.endDate||e.startDate||dateKey()}"><label>Event payment (MRU)</label><input id="ep" type="number" min="0" step="100" value="${Number(e.payment||0)}"><label>Notes</label><textarea id="enotes">${esc(e.notes||"")}</textarea>
 <div class="modal-actions"><button class="btn secondary" id="cancel2">Cancel</button><button class="btn primary" id="saveEvent">Save Event</button></div></div></div>`;
 const close=()=>root.innerHTML="";document.getElementById("cancel").onclick=close;document.getElementById("cancel2").onclick=close;
 document.getElementById("saveEvent").onclick=()=>{let name=document.getElementById("en").value.trim(),src=document.getElementById("es").value,client=document.getElementById("ec").value.trim(),sd=document.getElementById("ed1").value,ed=document.getElementById("ed2").value;if(!name||!sd||!ed||ed<sd)return alert("Check the event name and dates.");if(src==="Freelance"&&!client)return alert("Enter the freelance client.");Object.assign(e,{name,source:src,client,startDate:sd,endDate:ed,payment:src==="Freelance"?Number(document.getElementById("ep").value||0):0,notes:document.getElementById("enotes").value.trim()});state.sessions.filter(s=>s.eventId===id).forEach(s=>{s.source=src;s.eventName=name;s.client=client});if(state.current?.eventId===id){state.current.source=src;state.current.eventName=name;state.current.client=client}save();close();render()};
}
function editSession(id){let s=state.sessions.find(x=>x.id===id);if(s)openStart(s.kind,s)}
function deleteSession(id){if(confirm("Delete this session?")){state.sessions=state.sessions.filter(s=>s.id!==id);save();render()}}
function doBreak(){
  const c=state.current;
  if(!c || c.status!=="working") return;
  const now=Date.now();
  c.status="break";
  c.breakStart=now;
  save();
  render();
  cancelCurrentBreakPush();
  updateLiveTimer();
}
function doResume(){
  const c=state.current;
  if(!c || c.status!=="break") return;
  const now=Date.now();
  if(now>c.breakStart) c.breaks.push({start:c.breakStart,end:now});
  delete c.breakStart;
  c.status="working";
  save();
  render();
  scheduleCurrentBreakPush();
  updateLiveTimer();
}
function doDone(){
  const c=state.current;
  if(!c) return;
  const now=Date.now();
  if(c.status==="break"){
    if(now>c.breakStart) c.breaks.push({start:c.breakStart,end:now});
    delete c.breakStart;
  }
  c.end=now;
  const completed={...c,status:"done"};
  state.sessions.push(completed);
  if(c.eventId){
    const e=eventById(c.eventId);
    if(e){
      if(!e.startDate || c.date<e.startDate) e.startDate=c.date;
      if(!e.endDate || c.date>e.endDate) e.endDate=c.date;
    }
  }
  state.current=null;
  save();
  render();
  cancelCurrentBreakPush();
}

function deleteCategory(group,index){
 const list=state.settings.categories[group];
 if(!Array.isArray(list)||index<0||index>=list.length)return;
 if(list.length<=1)return alert("Keep at least one category.");
 if(confirm(`Remove "${list[index]}" from future work sessions? Existing records will not be changed.`)){
   list.splice(index,1);save();render();
 }
}
function action(a){
 if(a==="startEvent")openStart("event");if(a==="startScreen")openStart("screen");if(a==="break")doBreak();if(a==="resume")doResume();if(a==="done")doDone();if(a==="manual")openManual();
 if(a==="weekly"){reflectionModal("weekly",weekKey())}
 if(a==="monthly"){reflectionModal("monthly",monthKey())}
 if(a==="weeklyList")listReflections("weekly");if(a==="monthlyList")listReflections("monthly");
 if(a==="saveDailyReflection"){saveDailyReflection(); return;}
 if(a==="editSession"){openEditSession(d.id); return;}
 if(a==="savePushConfig"){const p=pushPrefs();p.serverUrl=(document.getElementById("pushUrl")?.value||"").trim();p.apiToken=(document.getElementById("pushToken")?.value||"").trim();state.settings.push=p;save();render();toast("Push configuration saved");return;}
 if(a==="enableReliablePush"){const p=pushPrefs();p.serverUrl=(document.getElementById("pushUrl")?.value||p.serverUrl).trim();p.apiToken=(document.getElementById("pushToken")?.value||p.apiToken).trim();state.settings.push=p;save();enableReliablePush();return;}
 if(a==="disableReliablePush"){
  const p=pushPrefs();p.enabled=false;p.subscribed=false;state.settings.push=p;save();cancelCurrentWorkPushes();cancelPush("daily-reflection");render();toast("Reliable Push disabled");return;
 }
 if(a==="smartNotifications"){openSmartNotifications(); return;}
 if(a==="saveSmartNotifyPrefs"){saveSmartNotifyPrefs(); return;}
 if(a==="newEvent"){openEventEditor(); return;}
 if(a==="editEvent"){openEventEditor(d.id); return;}
 if(a==="saveEvent"){saveEvent(d.id||""); return;}
 if(a==="deleteEvent"){deleteEvent(d.id); return;}
 if(a==="saveEditedSession"){saveEditedSession(d.id); return;}
 if(a==="deleteSession"){deleteSession(d.id); return;}
 if(a==="enableNotifications"){
  if(!("Notification" in window)) return alert("This browser does not support notifications.");
  Notification.requestPermission().then(p=>{
    if(p==="granted"){state.settings.notifications=Object.assign(notificationPrefs(),{enabled:true});save();notify("ItTime notifications enabled","Your phone can now receive ItTime notifications when the app is active.","permission");}
    render();
  });
 }
 if(a==="testNotification"){notify("ItTime test notification","Notifications are working on this device.","test")}
 if(a==="saveNotifications"){
  let p=notificationPrefs();
  p.workReminder=!!document.getElementById("nWork")?.checked;
  p.reminderHours=Math.max(1,Number(document.getElementById("nHours")?.value||3));
  p.dailyLimit=!!document.getElementById("nLimit")?.checked;
  p.dailyLimitHours=Math.max(1,Number(document.getElementById("nLimitHours")?.value||8));
  p.restReminder=!!document.getElementById("nRest")?.checked;
  save();render();
 }
 if(a==="saveAppearance"){
   const s=state.settings;
   s.theme=document.getElementById("setTheme")?.value||"system";
   s.timeFormat=document.getElementById("setTime")?.value||"24";
   s.showSeconds=!!document.getElementById("setSeconds")?.checked;
   s.compact=!!document.getElementById("setCompact")?.checked;
   s.animations=!!document.getElementById("setAnimations")?.checked;
   s.timerStyle=document.getElementById("setTimerStyle")?.value||"digital";
   s.cardStyle=document.getElementById("setCardStyle")?.value||"default";
   s.buttonStyle=document.getElementById("setButtonStyle")?.checked?"filled":"outline";
   s.firstDay=document.getElementById("setFirstDay")?.value||"monday";
   save();applyAppearance();render();
 }
 if(a==="saveFinance"){
   state.settings.freelanceRate=Math.max(0,Number(document.getElementById("freelanceRate")?.value||0));
   state.settings.showEarnings=!!document.getElementById("showEarnings")?.checked;
   state.settings.calculateEffectiveRate=!!document.getElementById("effectiveRate")?.checked;
   let v=Math.max(0,Number(document.getElementById("salary")?.value||0));
   state.settings.salaryByMonth[monthKey()]=v;
   save();render();
 }
 if(a==="addEventCategory"){
   const v=document.getElementById("newEventCat")?.value.trim();
   if(v&&!state.settings.categories.event.includes(v)){state.settings.categories.event.push(v);save();render()}
 }
 if(a==="addScreenCategory"){
   const v=document.getElementById("newScreenCat")?.value.trim();
   if(v&&!state.settings.categories.screen.includes(v)){state.settings.categories.screen.push(v);save();render()}
 }
 if(a==="importBackup"){document.getElementById("backupFile")?.click()}
 if(a==="saveSalary"){let v=Number(document.getElementById("salary").value||0);state.settings.salaryByMonth[monthKey()]=v;save();render()}
 if(a==="export"){let backup=JSON.parse(JSON.stringify(state));backup._appVersion="1.1";backup._exportedAt=new Date().toISOString();let blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`ittime-backup-${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
 if(a==="reset"){
   if(!confirm("Erase ALL ItTime data? This permanently deletes sessions, events, reflections, salary settings, categories, and preferences.")) return;
   if(!confirm("Final confirmation: erase everything? Export a backup first if you need your records.")) return;
   try{
     Object.keys(localStorage).filter(k=>k.toLowerCase().startsWith("ittime")).forEach(k=>localStorage.removeItem(k));
     sessionStorage.clear();
   }catch(e){}
   state=JSON.parse(JSON.stringify(DEFAULTS));
   state.settings=Object.assign({},DEFAULTS.settings,{salaryByMonth:{}});
   state.settings.categories={event:DEFAULTS.settings.categories.event.slice(),screen:DEFAULTS.settings.categories.screen.slice()};
   state.settings.notifications=Object.assign({},DEFAULTS.settings.notifications);
   state.settings.push={enabled:false,serverUrl:"https://ittime-push.trabi2717.workers.dev",apiToken:"",subscribed:false,publicKey:""};
   try{localStorage.removeItem("ittime_push_device_id")}catch(e){}
   save();applyAppearance();document.getElementById("modalRoot").innerHTML="";render();
 }
}
function bind(){
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;save();render()});
 document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action));
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editSession(b.dataset.edit));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteSession(b.dataset.delete));
 document.querySelectorAll("[data-event]").forEach(b=>b.onclick=()=>openEvent(b.dataset.event));
 document.querySelectorAll("[data-cat-delete]").forEach(b=>b.onclick=()=>deleteCategory(b.dataset.catDelete,Number(b.dataset.catIndex)));
 document.querySelectorAll("[data-accent]").forEach(b=>b.onclick=()=>{state.settings.accent=b.dataset.accent;save();applyAppearance();render()});
}
window.addEventListener("beforeunload",save);
applyAppearance();
render();
document.addEventListener("change",e=>{
  if(e.target.id!=="backupFile"||!e.target.files?.[0])return;
  const file=e.target.files[0],reader=new FileReader();
  reader.onload=()=>{
    try{
      const incoming=JSON.parse(reader.result);
      if(!incoming||!Array.isArray(incoming.sessions)||!Array.isArray(incoming.events))throw new Error("Invalid backup");
      if(!confirm("Replace current ItTime data with this backup?"))return;
      state=Object.assign({},DEFAULTS,incoming);
      state.settings=Object.assign({},DEFAULTS.settings,incoming.settings||{});
      state.settings.salaryByMonth=state.settings.salaryByMonth||{};
      state.settings.categories=Object.assign({},DEFAULTS.settings.categories,incoming.settings?.categories||{});
      state.settings.notifications=Object.assign({},DEFAULTS.settings.notifications,incoming.settings?.notifications||{});
      state.reflections=Object.assign({},DEFAULTS.reflections,incoming.reflections||{});
      save();applyAppearance();render();alert("Backup restored.");
    }catch(err){alert("That backup file is not a valid ItTime backup.")}
  };
  reader.readAsText(file);e.target.value="";
});
function updateLiveTimer(){
  const c=state.current;
  if(!c) return;
  const now=Date.now();

  // Only update the actual live timer on the Today page.
  const timer=document.querySelector(".timer");
  if(timer) timer.textContent=fmt(c.status==="break" ? Math.max(0,now-c.breakStart) : workElapsed(c));

  const work=document.querySelector(".today-live-work");
  if(work) work.textContent=fmt(totalToday());

  // History/Event Details also use .stats. Never update those elements here.
  const todayStats=document.querySelector("[data-live-stats]");
  if(todayStats){
    const stats=todayStats.querySelectorAll(".stat .value");
    if(stats.length>=2){
      stats[0].textContent=fmt(totalToday());
      stats[1].textContent=fmt(breakToday());
    }
  }
}
let lastReminderKey="";
function checkNotifications(){
  const p=notificationPrefs();
  if(!p.enabled || !("Notification" in window) || Notification.permission!=="granted") return;
  const hours=totalToday()/3600000;
  if(p.dailyLimit && hours>=p.dailyLimitHours){
    const key=`limit-${dateKey()}-${p.dailyLimitHours}`;
    if(lastReminderKey!==key){notify("ItTime: daily limit","You've reached your daily work limit. Consider stopping and recovering.","daily-limit");lastReminderKey=key}
  }else if(p.workReminder && state.current?.status==="working" && hours>=p.reminderHours){
    const key=`work-${dateKey()}-${p.reminderHours}`;
    if(lastReminderKey!==key){notify("ItTime: take a break","You've been working for a long stretch. Take a proper break.","work-break");lastReminderKey=key}
  }
}
setInterval(()=>{updateLiveTimer();checkNotifications()},1000);

if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
window.addEventListener("load",()=>{
  const box=document.getElementById("installHelp"),dismiss=document.getElementById("dismissInstall");
  const isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone;
  if(box && !isStandalone && !localStorage.getItem("ittime_install_help_dismissed")) box.hidden=false;
  if(dismiss)dismiss.onclick=()=>{box.hidden=true;localStorage.setItem("ittime_install_help_dismissed","1")};
});

setInterval(evaluateSmartNotifications,60000);

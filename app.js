const KEY="ittime_v03";
const DEFAULTS={events:[],sessions:[],current:null,tab:"today",settings:{bmSalary:20000,salaryByMonth:{}},reflections:{weekly:{},monthly:{}}};
let state=Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(KEY)||"{}"));
state.settings=Object.assign({},DEFAULTS.settings,state.settings||{});
state.settings.salaryByMonth=state.settings.salaryByMonth||{};
state.reflections=Object.assign({},DEFAULTS.reflections,state.reflections||{});
state.reflections.weekly=state.reflections.weekly||{};
state.reflections.monthly=state.reflections.monthly||{};

const eventTypes=["Photography","Videography","Live Streaming","Direction"];
const screenTypes=["Graphic Design","Video Editing","Motion Graphics","Web Design","Administration","Other"];
const gains=["Money","Skills","Experience","Connections","Opportunities","Other"];
const sacrifices=["Rest","Sleep","Family","Friends","Personal projects","Learning","Nothing"];

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function fmt(ms){let s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`}
function dateKey(d=new Date()){return d.toISOString().slice(0,10)}
function monthKey(d=new Date()){return d.toISOString().slice(0,7)}
function weekKey(d=new Date()){let x=new Date(d);x.setHours(0,0,0,0);let day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return x.toISOString().slice(0,10)}
function fmtDate(x){return new Date(x+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
function money(n){return new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Math.round(n))+" MRU"}
function workMs(s){return Math.max(0,(s.end||Date.now())-s.start-(s.breaks||[]).reduce((a,b)=>a+Math.max(0,(b.end||Date.now())-b.start),0))}
function breakMs(s){return (s.breaks||[]).reduce((a,b)=>a+Math.max(0,(b.end||Date.now())-b.start),0)}
function totalFor(filter){return state.sessions.filter(filter).reduce((a,s)=>a+workMs(s),0)}
function totalToday(){let k=dateKey();return totalFor(s=>s.date===k)}
function breakToday(){let k=dateKey();return state.sessions.filter(s=>s.date===k).reduce((a,s)=>a+breakMs(s),0)}
function weekStart(){let n=new Date(),d=(n.getDay()+6)%7,m=new Date(n);m.setDate(n.getDate()-d);m.setHours(0,0,0,0);return m}
function weekTotal(){let m=weekStart();return totalFor(s=>new Date(s.date+"T12:00:00")>=m)}
function monthTotal(){let k=monthKey();return totalFor(s=>s.date.startsWith(k))}
function bmSalary(month=monthKey()){return Number(state.settings.salaryByMonth[month]??state.settings.bmSalary??20000)}
function bmHours(month){return totalFor(s=>s.source==="BM"&&s.date.startsWith(month))}
function bmRate(month){let h=bmHours(month);return h?bmSalary(month)/(h/3600000):0}
function allocValue(s){if(s.source!=="BM")return 0;let rate=bmRate(s.date.slice(0,7));return rate*(workMs(s)/3600000)}
function freelanceIncome(filter=s=>true){return state.sessions.filter(s=>s.source==="Freelance"&&filter(s)).reduce((a,s)=>a+Number(s.payment||0),0)}
function esc(x){return String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

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
 let current=cur?`<div class="card">
 <div class="row"><div><b>${esc(cur.source)}</b><div class="muted">${esc(cur.eventName||"Work session")}</div></div><span class="badge">${cur.kind==="event"?"Event Work":"Screen Work"}</span></div>
 <div class="section-title">${cur.status==="break"?"ON BREAK":"WORKING"}</div><div class="big timer">${fmt(cur.status==="break"?Date.now()-cur.breakStart:workElapsed(cur))}</div>
 <div class="muted">${(cur.types||[]).map(esc).join(" · ")}</div>
 <div class="actions">${cur.status==="working"?`<button class="btn warning" data-action="break">☕ Break</button><button class="btn primary" data-action="done">✓ Work Done</button>`:`<button class="btn success" data-action="resume">▶ Continue Work</button><button class="btn primary" data-action="done">✓ End Work</button>`}</div></div>`:
 `<div class="card"><div class="section-title">Ready?</div><div class="big">Start your work.</div><div class="muted">Track events and screen work, with breaks separated from actual work time.</div><div class="actions"><button class="btn primary" data-action="startEvent">＋ Event Work</button><button class="btn secondary" data-action="startScreen">＋ Screen Work</button></div></div>`;
 let pending=reflectionPendingHTML();
 return `<section><div class="section-title">Today</div>${current}
 ${pending}<div class="section-title">Today at a glance</div><div class="stats">
 <div class="stat"><div class="value">${fmt(totalToday())}</div><div class="label">Work</div></div>
 <div class="stat"><div class="value">${fmt(breakToday())}</div><div class="label">Break</div></div>
 <div class="stat"><div class="value">${state.sessions.filter(s=>s.date===dateKey()).length}</div><div class="label">Sessions</div></div></div>
 <div class="section-title">This week</div><div class="card"><div class="row"><b>${fmt(weekTotal())}</b><span class="muted">Monday–today</span></div>
 <div class="notice">BM value this month: <b>${money(state.sessions.filter(s=>s.source==="BM"&&s.date.startsWith(monthKey())).reduce((a,s)=>a+allocValue(s),0))}</b></div></div></section>`;
}
function workElapsed(c){return Math.max(0,Date.now()-c.start-breakMs(c))}
function historyHTML(){
 let ss=[...state.sessions].sort((a,b)=>b.start-a.start);
 let refl=`<div class="section-title">Reflections</div><div class="card"><button class="btn secondary" data-action="weeklyList">Weekly reflections</button> <button class="btn secondary" data-action="monthlyList">Monthly reflections</button></div>`;
 if(!ss.length)return `<div class="section-title">History</div>${refl}<div class="card empty">No completed sessions yet.</div>`;
 let groups={};ss.forEach(s=>(groups[s.date]??=[]).push(s));
 return `<div class="section-title">History</div><button class="btn primary" data-action="manual">＋ Add Past Work</button>${refl}${Object.entries(groups).map(([d,list])=>`<div class="card event-card"><b>${fmtDate(d)}</b>${list.map(s=>sessionHTML(s)).join("")}</div>`).join("")}`;
}
function sessionHTML(s){
 let val=s.source==="BM"?` · Value ${money(allocValue(s))}`:s.source==="Freelance"?` · ${money(s.payment||0)}`:"";
 return `<div class="session"><div class="row"><div><div class="session-title">${esc(s.eventName||"Work session")}</div><div class="muted">${esc(s.source)} · ${s.kind==="event"?"Event Work":"Screen Work"}</div></div><b>${fmt(workMs(s))}</b></div>
 <div>${(s.types||[]).map(t=>`<span class="badge">${esc(t)}</span>`).join("")}</div>
 <div class="muted" style="margin-top:6px;font-size:12px">${new Date(s.start).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} – ${new Date(s.end).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} · Break ${fmt(breakMs(s))}${val}</div>
 <div style="margin-top:9px"><button class="btn small secondary" data-edit="${s.id}">Edit</button> <button class="btn small danger" data-delete="${s.id}">Delete</button></div></div>`;
}
function insightsHTML(){
 let m=monthKey(),bm=bmHours(m),fr=totalFor(s=>s.source==="Freelance"&&s.date.startsWith(m)),income=freelanceIncome(s=>s.date.startsWith(m));
 let wkCount=Object.keys(state.reflections.weekly).length,moCount=Object.keys(state.reflections.monthly).length;
 return `<div class="section-title">Insights</div><div class="card">
 <div class="section-title">Today</div><div class="big">${fmt(totalToday())}</div>
 <div class="section-title">This week</div><div class="big">${fmt(weekTotal())}</div>
 <div class="section-title">This month</div><div class="big">${fmt(monthTotal())}</div>
 <div class="section-title">Current month</div><div class="stats"><div class="stat"><div class="value">${fmt(bm)}</div><div class="label">BM time</div></div><div class="stat"><div class="value">${fmt(fr)}</div><div class="label">Freelance time</div></div><div class="stat"><div class="value">${money(income)}</div><div class="label">Freelance income</div></div></div>
 <div class="notice"><b>BM salary:</b> ${money(bmSalary(m))}<br><b>BM calculated hourly value:</b> ${bmRate(m)?money(bmRate(m))+"/hour":"Not enough BM hours yet"}</div>
 <div class="section-title">Reflection history</div><div class="row"><span>Weekly</span><b>${wkCount}</b></div><div class="row"><span>Monthly</span><b>${moCount}</b></div>
 <div class="actions"><button class="btn secondary" data-action="weeklyList">View weekly reflections</button><button class="btn secondary" data-action="monthlyList">View monthly reflections</button></div>
 </div>`;
}
function settingsHTML(){
 let m=monthKey();
 return `<div class="section-title">Settings</div><div class="card"><label>BM monthly salary</label><input id="salary" type="number" min="0" step="100" value="${bmSalary(m)}">
 <div class="muted" style="margin-top:7px;font-size:12px">Default is 20,000 MRU. Saved for the current month.</div>
 <div class="actions"><button class="btn primary" data-action="saveSalary">Save Salary</button><button class="btn secondary" data-action="export">Export Data</button><button class="btn danger" data-action="reset">Reset All Data</button></div></div>`;
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
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>${existing?"Edit Session":kind==="event"?"New Event Work":"New Screen Work"}</h2>
 <label>Work source</label><div class="choice-grid"><button class="choice ${(!existing||existing.source==="BM")?"selected":""}" data-src="BM">🏢 BM</button><button class="choice ${existing?.source==="Freelance"?"selected":""}" data-src="Freelance">💼 Freelance</button></div>
 <label>${kind==="event"?"Event name":"Project / work name"} ${kind==="screen"?"(optional)":""}</label><input id="name" value="${esc(existing?.eventName||"")}" placeholder="${kind==="event"?"e.g. Festival L'Aak":"e.g. Edit campaign video"}">
 <div id="clientWrap" style="display:${existing?.source==="Freelance"?"block":"none"}"><label>Client</label><input id="client" value="${esc(existing?.client||"")}" placeholder="Freelance client"></div>
 <label>${kind==="event"?"Work roles":"Work type"}</label><div class="choice-grid" id="types">${types.map(t=>`<button class="choice ${(existing?.types||[]).includes(t)?"selected":""}" data-type="${t}">${t}</button>`).join("")}</div>
 <div id="paymentWrap" style="display:${existing?.source==="Freelance"?"block":"none"}"><label>Freelance payment (MRU)</label><input id="payment" type="number" min="0" value="${Number(existing?.payment||0)}"></div>
 <label>Notes (optional)</label><textarea id="notes">${esc(existing?.notes||"")}</textarea>
 <div class="modal-actions"><button class="btn secondary" id="cancel">Cancel</button><button class="btn primary" id="start">${existing?"Save Changes":"Start Work"}</button></div></div></div>`;
 let src=existing?.source||"BM",selected=[...(existing?.types||[])];
 document.querySelectorAll("[data-src]").forEach(b=>b.onclick=()=>{src=b.dataset.src;document.querySelectorAll("[data-src]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");document.getElementById("clientWrap").style.display=src==="Freelance"?"block":"none";document.getElementById("paymentWrap").style.display=src==="Freelance"?"block":"none"});
 document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>{let t=b.dataset.type;selected=selected.includes(t)?selected.filter(x=>x!==t):[...selected,t];b.classList.toggle("selected",selected.includes(t))});
 document.getElementById("cancel").onclick=()=>root.innerHTML="";
 document.getElementById("start").onclick=()=>{
  if(!selected.length)return alert("Select at least one work type.");
  let name=document.getElementById("name").value.trim(),client=document.getElementById("client")?.value.trim()||"",payment=Number(document.getElementById("payment")?.value||0);
  if(existing){Object.assign(existing,{source:src,eventName:name,client,types:selected,payment,notes:document.getElementById("notes").value.trim()});save();root.innerHTML="";render();return}
  let now=Date.now(),id=crypto.randomUUID?crypto.randomUUID():String(now);
  state.current={id,start:now,date:dateKey(),source:src,kind,eventName:name,client,types:selected,payment,notes:document.getElementById("notes").value.trim(),status:"working",breaks:[]};
  root.innerHTML="";save();render();
 };
}
function openManual(){
 let root=document.getElementById("modalRoot");
 root.innerHTML=`<div class="modal-backdrop"><div class="modal"><h2>Add Past Work</h2><label>Date</label><input id="md" type="date" value="${dateKey()}"><label>Start</label><input id="ms" type="time" value="09:00"><label>End</label><input id="me" type="time" value="17:00">
 <label>Work type</label><select id="mk"><option value="event">Event Work</option><option value="screen">Screen Work</option></select><label>Work source</label><select id="mso"><option>BM</option><option>Freelance</option></select><label>Name / event</label><input id="mn" placeholder="Optional"><label>Work types (comma separated)</label><input id="mt" placeholder="Videography, Live Streaming"><label>Break minutes</label><input id="mb" type="number" min="0" value="0"><label>Freelance payment (MRU)</label><input id="mp" type="number" min="0" value="0">
 <div class="modal-actions"><button class="btn secondary" id="cancel">Cancel</button><button class="btn primary" id="saveManual">Add Work</button></div></div></div>`;
 document.getElementById("cancel").onclick=()=>root.innerHTML="";
 document.getElementById("saveManual").onclick=()=>{let d=document.getElementById("md").value,st=document.getElementById("ms").value,en=document.getElementById("me").value,start=new Date(`${d}T${st}`).getTime(),end=new Date(`${d}T${en}`).getTime();if(!d||end<=start)return alert("Enter a valid date and time range.");let bm=Number(document.getElementById("mb").value||0)*60000;state.sessions.push({id:String(Date.now()),start,end,date:d,source:document.getElementById("mso").value,kind:document.getElementById("mk").value,eventName:document.getElementById("mn").value.trim(),types:document.getElementById("mt").value.split(",").map(x=>x.trim()).filter(Boolean),breaks:bm?[{start:start,end:start+bm}]:[],payment:Number(document.getElementById("mp").value||0),notes:"",status:"done"});save();root.innerHTML="";render()};
}
function editSession(id){let s=state.sessions.find(x=>x.id===id);if(s)openStart(s.kind,s)}
function deleteSession(id){if(confirm("Delete this session?")){state.sessions=state.sessions.filter(s=>s.id!==id);save();render()}}
function doBreak(){if(!state.current)return;state.current.status="break";state.current.breakStart=Date.now();save();render()}
function doResume(){let c=state.current;if(!c||c.status!=="break")return;c.breaks.push({start:c.breakStart,end:Date.now()});delete c.breakStart;c.status="working";save();render()}
function doDone(){let c=state.current;if(!c)return;if(c.status==="break")c.breaks.push({start:c.breakStart,end:Date.now()});c.end=Date.now();state.sessions.push({...c,status:"done"});state.current=null;save();render()}

function action(a){
 if(a==="startEvent")openStart("event");if(a==="startScreen")openStart("screen");if(a==="break")doBreak();if(a==="resume")doResume();if(a==="done")doDone();if(a==="manual")openManual();
 if(a==="weekly"){reflectionModal("weekly",weekKey())}
 if(a==="monthly"){reflectionModal("monthly",monthKey())}
 if(a==="weeklyList")listReflections("weekly");if(a==="monthlyList")listReflections("monthly");
 if(a==="saveSalary"){let v=Number(document.getElementById("salary").value||0);state.settings.salaryByMonth[monthKey()]=v;save();render()}
 if(a==="export"){let blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download="ittime-backup.json";a.click();URL.revokeObjectURL(u)}
 if(a==="reset"&&confirm("Delete all ItTime data from this browser?")){state=JSON.parse(JSON.stringify(DEFAULTS));save();render()}
}
function bind(){
 document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;save();render()});
 document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action));
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editSession(b.dataset.edit));
 document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteSession(b.dataset.delete));
}
window.addEventListener("beforeunload",save);render();setInterval(()=>{if(state.current)render()},1000);

if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
window.addEventListener("load",()=>{
  const box=document.getElementById("installHelp"),dismiss=document.getElementById("dismissInstall");
  const isStandalone=window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone;
  if(box && !isStandalone && !localStorage.getItem("ittime_install_help_dismissed")) box.hidden=false;
  if(dismiss)dismiss.onclick=()=>{box.hidden=true;localStorage.setItem("ittime_install_help_dismissed","1")};
});

/* ItTime reliable Web Push bridge. Keeps secrets in localStorage only on this device; never in source. */
(()=>{
 const KEY="ittime_v03", SERVER="https://ittime-push.trabi2717.workers.dev";
 const defaults={serverUrl:SERVER,apiToken:"",enabled:false,subscribed:false,publicKey:""};
 const read=()=>{let s={};try{s=JSON.parse(localStorage.getItem(KEY)||"{}")}catch{};s.settings=s.settings||{};s.settings.push=Object.assign({},defaults,s.settings.push||{});return s};
 const write=s=>localStorage.setItem(KEY,JSON.stringify(s));
 const p=()=>read().settings.push;
 const toast=m=>{if(typeof window.toast==="function")window.toast(m);else console.log("ItTime:",m)};
 const device=()=>{let id=localStorage.getItem("ittime_push_device_id");if(!id){id=(crypto.randomUUID?crypto.randomUUID():"d_"+Date.now()+"_"+Math.random().toString(36).slice(2));localStorage.setItem("ittime_push_device_id",id)}return id};
 async function req(path,body){let x=p();if(!x.apiToken)throw Error("Enter your API token first.");let r=await fetch((x.serverUrl||SERVER).replace(/\/$/,"")+path,{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+x.apiToken},body:JSON.stringify(Object.assign({deviceId:device()},body||{}))});if(!r.ok)throw Error((await r.text()).slice(0,180)||("HTTP "+r.status));return r.json()}
 function b64(s){let pad="=".repeat((4-s.length%4)%4),r=atob((s+pad).replace(/-/g,"+").replace(/_/g,"/")),a=new Uint8Array(r.length);for(let i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a}
 async function enable(){
  let s=read(),x=s.settings.push; x.serverUrl=(document.getElementById("ittimePushUrl")?.value||x.serverUrl||SERVER).trim();x.apiToken=(document.getElementById("ittimePushToken")?.value||x.apiToken||"").trim();write(s);
  if(!x.apiToken)return toast("Enter your API token first");
  if(!window.matchMedia("(display-mode: standalone)").matches && !window.navigator.standalone)return toast("First add ItTime to the iPhone Home Screen, then open it there.");
  if(!("serviceWorker"in navigator)||!("PushManager"in window)||!("Notification"in window))return toast("This device does not support Web Push.");
  try{
   let perm=Notification.permission==="granted"?"granted":await Notification.requestPermission();if(perm!=="granted")return toast("Notification permission was not granted.");
   let kr=await fetch(x.serverUrl.replace(/\/$/,"")+"/vapid-public-key");if(!kr.ok)throw Error("Push server is unreachable.");let j=await kr.json();x.publicKey=j.publicKey;if(!x.publicKey)throw Error("Push server returned no public key.");
   let reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(x.publicKey)});
   await req("/subscribe",{subscription:sub.toJSON()});x.enabled=true;x.subscribed=true;write(s);toast("Reliable Push connected");renderCard();
  }catch(e){console.error(e);toast("Push connection failed: "+e.message)}
 }
 async function schedule(id,fireAt,title,body,tag,repeatMs=0){let x=p();if(!x.enabled||!x.subscribed)return;try{await req("/schedule",{reminderId:id,fireAt,title,body,tag,url:location.origin+location.pathname,repeatMs})}catch(e){console.warn(e)}}
 async function cancel(id){try{await req("/cancel",{reminderId:id})}catch(e){console.warn(e)}}
 let last="";
 function sync(){
  let s=read(),c=s.current;if(!c||!c.status){if(last){cancel("work-break-"+device());cancel("work-long-"+device());last=""}return}
  let id=(c.id||c.start||"")+":"+c.status+":"+(c.breaks?.length||0),x=p();if(!x.enabled||!x.subscribed||id===last)return;
  last=id;cancel("work-break-"+device());cancel("work-long-"+device());
  if(c.status!=="working")return;
  let n=s.settings.notifications||{},mins=Number(n.reminderHours||3)*60000;
  schedule("work-break-"+device(),Date.now()+mins,"ItTime — Take a break","You have been working continuously. Consider taking a proper break.","break");
  schedule("work-long-"+device(),Date.now()+Math.max(mins*2,240*60000),"ItTime — Long work session","This is a long work session. Your recovery matters.","long");
 }
 function card(){let x=p(),status=x.enabled&&x.subscribed?"Connected":x.apiToken?"Ready to connect":"Not configured";return `<div id="ittimePushCard" class="settings-section"><div class="settings-section-head"><div><b>Reliable Push</b><div class="muted">Notifications can arrive while ItTime is closed.</div></div></div><label>Push Server URL<input id="ittimePushUrl" type="url" value="${x.serverUrl.replace(/"/g,"&quot;")}"></label><label>API Token<input id="ittimePushToken" type="password" placeholder="Your Cloudflare API token" value="${x.apiToken.replace(/"/g,"&quot;")}"></label><div class="notice">Status: <b>${status}</b><br>Keep this token private. It is stored only on this device.</div><div class="actions"><button class="btn primary" id="ittimePushEnable">${status==="Connected"?"Reconnect Push":"Enable Reliable Push"}</button></div></div>`}
 function renderCard(){let main=document.getElementById("app");if(!main||!location.href)return;let old=document.getElementById("ittimePushCard");if(old)old.remove();if(document.body.innerText.includes("Settings")){let labels=[...main.querySelectorAll(".settings-section")];if(labels.length)labels[0].insertAdjacentHTML("beforebegin",card());}}
 document.addEventListener("click",e=>{if(e.target?.id==="ittimePushEnable")enable()});
 const mo=new MutationObserver(()=>{if(!document.getElementById("ittimePushCard")&&document.querySelector(".settings-section"))renderCard()});
 window.addEventListener("load",()=>{setTimeout(()=>{renderCard();setInterval(sync,1500)},500)});
 mo.observe(document.documentElement,{childList:true,subtree:true});
})();

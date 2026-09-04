const CACHE="ittime-v191";
const ASSETS=["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("push",e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={body:e.data?.text()||""}};e.waitUntil(self.registration.showNotification(d.title||"ItTime",{body:d.body||"",icon:"./icon-192.png",badge:"./icon-192.png",tag:d.tag||"ittime",renotify:false,data:{url:d.url||"/"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();const u=e.notification.data?.url||"/";e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(a=>{for(const c of a){if("focus"in c)return c.focus()}return self.clients.openWindow(u)}))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(k=>k.put(e.request,x));return r}).catch(()=>c)))});

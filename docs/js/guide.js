/* NamastayTO Guest Guides — shared interactions. No analytics, no cookies, no external requests. */
(function(){
"use strict";

/* ---------- theme ---------- */
var root = document.documentElement;
try{
  var saved = localStorage.getItem("nsto-theme");
  if(saved) root.setAttribute("data-theme", saved);
}catch(e){}
function themeNow(){
  var t = root.getAttribute("data-theme");
  if(t) return t;
  return (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
function paintThemeBtn(){
  var b = document.getElementById("themeBtn");
  if(b){ b.textContent = themeNow()==="dark" ? "☀️" : "🌙"; b.setAttribute("aria-label", themeNow()==="dark"?"Switch to light mode":"Switch to dark mode"); }
  var meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute("content", themeNow()==="dark" ? "#191713" : "#FBF6EC");
}
document.addEventListener("click", function(e){
  if(e.target.closest && e.target.closest("#themeBtn")){
    var next = themeNow()==="dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try{ localStorage.setItem("nsto-theme", next); }catch(err){}
    paintThemeBtn();
  }
});
paintThemeBtn();

/* ---------- toast ---------- */
var toastEl, toastTimer;
function toast(msg){
  if(!toastEl){ toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, 2400);
}

/* ---------- copy ---------- */
document.addEventListener("click", function(e){
  var c = e.target.closest && e.target.closest("[data-copy]");
  if(!c) return;
  var txt = c.getAttribute("data-copy");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ toast("Copied: " + txt); }, function(){ toast(txt); });
  } else { toast(txt); }
});

/* ---------- reveal (secrets are base64-encoded, decoded only on tap) ---------- */
document.addEventListener("click", function(e){
  var r = e.target.closest && e.target.closest(".reveal");
  if(!r) return;
  if(r.classList.contains("shown")){
    var v = r.getAttribute("data-v");
    if(v && navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(v).then(function(){ toast("Copied to clipboard"); }); }
    return;
  }
  try{
    var val = atob(r.getAttribute("data-secret"));
    r.textContent = val;
    r.setAttribute("data-v", val);
    r.classList.add("shown");
    r.setAttribute("title","Tap again to copy");
  }catch(err){}
});

/* ---------- arrival picker ---------- */
document.querySelectorAll(".arrive-pick").forEach(function(pick){
  pick.addEventListener("click", function(e){
    var btn = e.target.closest("button[data-panel]");
    if(!btn) return;
    pick.querySelectorAll("button").forEach(function(b){ b.classList.toggle("on", b===btn); });
    document.querySelectorAll(".arrive-panel").forEach(function(p){
      p.classList.toggle("on", p.id === btn.getAttribute("data-panel"));
    });
  });
});

/* ---------- journey nav scrollspy ---------- */
var jlinks = Array.prototype.slice.call(document.querySelectorAll(".jnav a[href^='#']"));
if(jlinks.length){
  var sections = jlinks.map(function(a){ return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
  var spy = function(){
    var y = window.scrollY + 130, cur = sections[0];
    sections.forEach(function(s){ if(s.offsetTop <= y) cur = s; });
    jlinks.forEach(function(a){
      var on = a.getAttribute("href") === "#" + cur.id;
      a.classList.toggle("on", on);
      if(on && a.scrollIntoView){ /* keep active pill visible */
        var nav = a.closest(".jnav-inner");
        if(nav){ var r = a.getBoundingClientRect(), nr = nav.getBoundingClientRect();
          if(r.left < nr.left || r.right > nr.right) nav.scrollTo({left: a.offsetLeft - 24, behavior:"smooth"});
        }
      }
    });
  };
  window.addEventListener("scroll", spy, {passive:true});
  spy();
}

/* ---------- lightbox ---------- */
var lb = document.createElement("div");
lb.className = "lightbox";
lb.innerHTML = '<button class="lb-close" aria-label="Close photo">✕</button><img alt="">';
document.body.appendChild(lb);
document.addEventListener("click", function(e){
  var img = e.target.closest && e.target.closest(".ph img");
  if(img){ lb.querySelector("img").src = img.src; lb.querySelector("img").alt = img.alt || ""; lb.classList.add("on"); return; }
  if(e.target.closest && e.target.closest(".lightbox")){ lb.classList.remove("on"); }
});
document.addEventListener("keydown", function(e){ if(e.key === "Escape") lb.classList.remove("on"); });

/* ---------- time-aware greeting + contextual hints ---------- */
var now = new Date(), hr = now.getHours(), day = now.getDay();
var greetEl = document.querySelector("[data-greet]");
if(greetEl){
  var g = hr < 5 ? "" : hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : hr < 22 ? "Good evening" : "";
  greetEl.textContent = g ? g + " — welcome to" : "Welcome to";
}
var hintStrip = document.getElementById("hintStrip");
if(hintStrip){
  var hints = [];
  if(hr >= 22 || hr < 8) hints.push({c:"info", i:"🤫", t:"Quiet hours are 11:00 PM – 8:00 AM. Thanks for keeping the volume cozy."});
  if(day === 3 && hr >= 16) hints.push({c:"gold", i:"🗑️", t:"It's Wednesday — bins go to the curb this evening for Thursday morning pickup."});
  if(hr >= 8 && hr < 11) hints.push({c:"gold", i:"⏰", t:"Checking out today? Checkout is at 11:00 AM — message us on Airbnb if you need a hand."});
  if(hints.length){
    var h = hints[0];
    hintStrip.innerHTML = '<div class="callout ' + h.c + '"><span class="ico">' + h.i + '</span><span>' + h.t + "</span></div>";
    hintStrip.classList.add("on");
  }
}

/* ---------- PWA install nudge ---------- */
var deferredPrompt = null;
window.addEventListener("beforeinstallprompt", function(e){
  e.preventDefault();
  deferredPrompt = e;
  document.querySelectorAll(".install-btn").forEach(function(b){ b.style.display = "inline-flex"; });
});
document.addEventListener("click", function(e){
  var b = e.target.closest && e.target.closest(".install-btn");
  if(!b) return;
  if(deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function(){ deferredPrompt = null; });
  } else {
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var tip = document.getElementById("iosTip");
    if(tip){ tip.classList.add("on"); }
    if(!isIOS) toast("In your browser menu, choose “Add to Home Screen”");
  }
});

/* ---------- service worker ---------- */
if("serviceWorker" in navigator && location.protocol !== "file:"){
  window.addEventListener("load", function(){
    var base = document.body.getAttribute("data-swbase") || "./";
    navigator.serviceWorker.register(base + "sw.js").catch(function(){});
  });
}

/* ---------- hours parser + open-now ---------- */
/* Handles: "Mon-Fri 8:30am-5pm, Sat 9am-10pm, Sun closed" · "Daily 9am-11pm" ·
   "Mon-Sun 24 hours" · "Daily until 9pm (Sun until 6pm)" · "Open daily until 2am".
   Returns {open:bool, until:"11pm"} or null if unparseable. */
var DAYS = ["sun","mon","tue","wed","thu","fri","sat"];
function parseTime(s){
  var m = s.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if(!m) return null;
  var h = parseInt(m[1],10), min = m[2]?parseInt(m[2],10):0;
  if(m[3]==="pm" && h!==12) h+=12;
  if(m[3]==="am" && h===12) h=0;
  return h*60+min;
}
function dayRange(tok){
  tok = tok.toLowerCase().replace(/\./g,"");
  var m = tok.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if(m){
    var a = DAYS.indexOf(m[1]), b = DAYS.indexOf(m[2]), out=[], i=a;
    while(true){ out.push(i); if(i===b) break; i=(i+1)%7; }
    return out;
  }
  m = tok.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if(m) return [DAYS.indexOf(m[1])];
  if(/daily|every ?day/.test(tok)) return [0,1,2,3,4,5,6];
  return null;
}
function openNow(hours){
  if(!hours) return null;
  var h = hours.toLowerCase();
  if(/varies|check |event-based|shows |open very late|open late on weekends/.test(h)) return null;
  if(/24 hours/.test(h)) return {open:true, until:"24 hours"};
  if(/^open daily until\s+(midnight|\d)/.test(h)){
    var od = h.match(/until\s+(midnight|\d{1,2}(?::\d{2})?(?:am|pm))/);
    var ct = od[1]==="midnight" ? 1440 : parseTime(od[1]);
    if(ct!==null){
      var nw0 = new Date(), m0 = nw0.getHours()*60+nw0.getMinutes();
      if(ct <= 720) ct += 1440; /* small-hours closing wraps past midnight */
      var op0 = 12*60; /* these spots open around noon */
      var isOpen = (m0 >= op0 && m0 < ct) || (ct > 1440 && m0 < ct-1440);
      return {open:isOpen, until:fmt(ct%1440)};
    }
  }
  var nw = new Date(), d = nw.getDay(), mins = nw.getHours()*60 + nw.getMinutes();
  /* "daily until 9pm (sun until 6pm)" style */
  var um = h.match(/until\s+(\d{1,2}(?::\d{2})?(?:am|pm))/);
  if(um && !/[-–]\s*\d/.test(h.replace(/\(.*\)/,""))){
    var closeT = parseTime(um[1]);
    var pm = h.match(/\((sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s*[-–]\s*(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)?\s+until\s+(\d{1,2}(?::\d{2})?(?:am|pm))\)/);
    if(pm){ var dd = dayRange(pm[1]); if(dd && dd.indexOf(d)>=0) closeT = parseTime(pm[2]); }
    if(closeT===null) return null;
    var openT = 8*60; /* assume morning open for "until" style (groceries) */
    if(closeT < openT) closeT += 24*60;
    var ok = mins >= openT-90 && mins < closeT;
    return {open: ok, until: fmt(closeT%1440)};
  }
  /* segment style */
  var segs = h.split(/[,;]/), today = [], yesterday = [];
  for(var i=0;i<segs.length;i++){
    var seg = segs[i].trim();
    var dm = seg.match(/^((?:(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s*[-–&]\s*(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)*)|daily|open daily|mon\s*[-–]\s*sun)/i);
    var days = null, rest = seg;
    if(dm){
      var dtok = dm[1].replace(/^open\s+/,"");
      rest = seg.slice(dm[0].length).trim();
      days = [];
      dtok.split(/[&]| and /).forEach(function(part){
        var r = dayRange(part.trim()); if(r) days = days.concat(r);
      });
      if(!days.length) days = null;
    }
    if(/closed/.test(rest)){ if(days && days.indexOf(d)>=0) today.push(null); continue; }
    var tm = rest.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/g);
    if(!tm) continue;
    tm.forEach(function(t){
      var p = t.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/);
      var o = parseTime(p[1]), c = parseTime(p[2]);
      if(o===null||c===null) return;
      var span = {o:o, c: c<=o ? c+1440 : c};
      if(!days || days.indexOf(d)>=0) today.push(span);
      var yd = (d+6)%7;
      if(!days || days.indexOf(yd)>=0) yesterday.push(span);
    });
  }
  var open = false, until = null;
  today.forEach(function(s){ if(s && mins>=s.o && mins<s.c){ open=true; until=fmt(s.c%1440); } });
  yesterday.forEach(function(s){ if(s && s.c>1440 && mins < s.c-1440){ open=true; until=fmt((s.c-1440)%1440); } });
  if(!today.length && !yesterday.length) return null;
  return {open:open, until:until};
}
function fmt(m){
  var h = Math.floor(m/60), mm = m%60, ap = h>=12?"pm":"am";
  var hh = h%12; if(hh===0) hh=12;
  return hh + (mm? ":"+(mm<10?"0":"")+mm : "") + ap;
}

/* ---------- places explorer ---------- */
var placesRoot = document.getElementById("places");
if(placesRoot && window.PLACES){
  var state = {type:"all", q:"", late:false, openNow:false};
  var chipsEl = document.getElementById("typeChips");
  if(chipsEl && window.PLACE_TYPES){
    window.PLACE_TYPES.forEach(function(t){
      var b = document.createElement("button");
      b.className = "fchip" + (t.key==="all"?" on":"");
      b.innerHTML = '<span aria-hidden="true">' + t.icon + "</span>" + t.label;
      b.setAttribute("data-type", t.key);
      chipsEl.appendChild(b);
    });
    chipsEl.addEventListener("click", function(e){
      var b = e.target.closest("button[data-type]");
      if(!b) return;
      state.type = b.getAttribute("data-type");
      chipsEl.querySelectorAll(".fchip").forEach(function(c){ c.classList.toggle("on", c===b); });
      render();
    });
  }
  var q = document.getElementById("placeSearch");
  if(q) q.addEventListener("input", function(){ state.q = q.value.trim().toLowerCase(); render(); });
  var lateTog = document.getElementById("lateTog"), openTog = document.getElementById("openTog");
  if(lateTog) lateTog.addEventListener("change", function(){ state.late = lateTog.checked; lateTog.closest(".tog").classList.toggle("on", state.late); render(); });
  if(openTog) openTog.addEventListener("change", function(){ state.openNow = openTog.checked; openTog.closest(".tog").classList.toggle("on", state.openNow); render(); });

  var TYPE_LABEL = {};
  (window.PLACE_TYPES||[]).forEach(function(t){ TYPE_LABEL[t.key]=t; });

  function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

  function render(){
    var list = window.PLACES.filter(function(p){
      if(state.type!=="all" && p.type!==state.type) return false;
      if(state.late && !p.openLate) return false;
      if(state.q){
        var hay = (p.name+" "+(p.cuisine||"")+" "+(p.goodFor||"")+" "+(p.desc||"")).toLowerCase();
        if(hay.indexOf(state.q)<0) return false;
      }
      if(state.openNow){
        var st = openNow(p.hours);
        if(!st || !st.open) return false;
      }
      return true;
    });
    list.sort(function(a,b){ return (a.walkMin||99) - (b.walkMin||99); });
    var cl = document.getElementById("countLine");
    if(cl) cl.textContent = list.length ? list.length + " place" + (list.length===1?"":"s") + " · sorted by walking distance" : "";
    placesRoot.innerHTML = list.length ? list.map(card).join("") : '<div class="empty-msg">Nothing matches those filters — try widening them a little.</div>';
  }
  function card(p){
    var st = openNow(p.hours);
    var badges = "";
    if(st) badges += st.open ? '<span class="badge open">Open now' + (st.until && st.until!=="24 hours" ? " · till " + st.until : "") + "</span>" : '<span class="badge closed">Closed now</span>';
    if(p.openLate) badges += '<span class="badge late">🌙 late</span>';
    var t = TYPE_LABEL[p.type] || {icon:"📍",label:""};
    var meta = [];
    meta.push('<span>' + t.icon + " " + esc(t.label) + "</span>");
    if(p.cuisine && p.cuisine!==t.label) meta.push('<span class="dot">' + esc(p.cuisine) + "</span>");
    if(p.price) meta.push('<span class="dot">' + esc(p.price) + "</span>");
    var foot = '<span class="p-walk">🚶 ' + esc(p.walk) + "</span>";
    if(p.maps) foot += '<a class="p-dir" href="' + esc(p.maps) + '" target="_blank" rel="noopener">Directions ↗</a>';
    return '<div class="place">' +
      '<div class="p-top"><div class="p-name">' + esc(p.name) + '</div><div class="p-badges">' + badges + "</div></div>" +
      '<div class="p-meta">' + meta.join("") + "</div>" +
      (p.goodFor ? '<div class="p-good">' + esc(p.goodFor) + "</div>" : "") +
      (p.desc ? '<div class="p-desc">' + esc(p.desc) + "</div>" : "") +
      '<div class="p-meta">🕐 ' + esc(p.hours) + "</div>" +
      '<div class="p-foot">' + foot + "</div>" +
      "</div>";
  }
  render();
}
})();

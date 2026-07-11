/* NamastayTO Guest Guides — shared interactions. No analytics, no cookies, no external requests. */
(function(){
"use strict";

/* ================= i18n ================= */
var LANGS = [
  {c:"en", n:"English"},
  {c:"fr", n:"Français"},
  {c:"es", n:"Español"},
  {c:"de", n:"Deutsch"},
  {c:"pt", n:"Português"},
  {c:"hi", n:"हिन्दी"},
  {c:"zh", n:"中文"},
  {c:"ja", n:"日本語"},
  {c:"ko", n:"한국어"}
];
var dict = null;          /* active translation dict (null = English) */
var origHTML = null;      /* element -> original English innerHTML */
var curLang = "en";

function T(key, fallback){
  if(dict && dict.ui && dict.ui[key]) return dict.ui[key];
  return fallback;
}
function X(text){ /* literal-English lookup for JS-built labels */
  if(dict && dict.x && dict.x[text]) return dict.x[text];
  return text;
}

function swbase(){ return document.body.getAttribute("data-swbase") || "./"; }

var langCache = {};
function loadLang(code){
  return new Promise(function(res, rej){
    if(langCache[code]) return res(langCache[code]);
    var s = document.createElement("script");
    s.src = swbase() + "js/i18n/" + code + ".js";
    s.onload = function(){ langCache[code] = window.NSTO_I18N; res(langCache[code]); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

function snapshotOriginals(){
  if(origHTML) return;
  origHTML = new Map();
  document.querySelectorAll("[data-i18n]").forEach(function(el){
    origHTML.set(el, el.innerHTML);
  });
  document.querySelectorAll(".quickbar a, .quickbar button, label.tog").forEach(function(el){
    el.childNodes.forEach(function(n){
      if(n.nodeType === 3 && n.textContent.trim()) n._orig = n.textContent.trim();
    });
  });
}

function applyLang(code){
  snapshotOriginals();
  curLang = code;
  try{ localStorage.setItem("nsto-lang", code); }catch(e){}
  var done = function(){
    document.documentElement.lang = code;
    document.querySelectorAll("[data-i18n]").forEach(function(el){
      var k = el.getAttribute("data-i18n");
      if(dict && dict.s && dict.s[k]) el.innerHTML = dict.s[k];
      else if(origHTML.has(el)) el.innerHTML = origHTML.get(el);
    });
    document.querySelectorAll(".quickbar a, .quickbar button, label.tog").forEach(function(el){
      el.childNodes.forEach(function(n){
        if(n.nodeType === 3 && n._orig) n.textContent = dict ? X(n._orig) : n._orig;
      });
    });
    var q = document.getElementById("placeSearch");
    if(q) q.placeholder = T("searchPh", "Search tacos, coffee, karaoke…");
    paintGreeting(); paintHints(); paintPickerBtn();
    if(window.__renderPlaces) window.__renderPlaces();
    if(window.__renderChips) window.__renderChips();
  };
  if(code === "en"){ dict = null; done(); return Promise.resolve(); }
  return loadLang(code).then(function(d){ dict = d; done(); }, function(){ dict = null; curLang="en"; done(); });
}

/* picker UI (injected — no HTML edits needed) */
function buildPicker(){
  var bar = document.querySelector(".topbar");
  var theme = document.getElementById("themeBtn");
  if(!bar || !theme) return;
  var wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;gap:8px;align-items:center;position:relative";
  bar.replaceChild(wrap, theme);
  var btn = document.createElement("button");
  btn.className = "theme-btn"; btn.id = "langBtn";
  btn.style.cssText = "width:auto;padding:0 13px;font-size:14px;font-weight:650;gap:6px";
  btn.setAttribute("aria-label","Choose language");
  wrap.appendChild(btn); wrap.appendChild(theme);
  var menu = document.createElement("div");
  menu.className = "lang-menu";
  LANGS.forEach(function(l){
    var b = document.createElement("button");
    b.textContent = l.n;
    b.setAttribute("data-lang", l.c);
    menu.appendChild(b);
  });
  wrap.appendChild(menu);
  btn.addEventListener("click", function(e){ e.stopPropagation(); menu.classList.toggle("on"); });
  document.addEventListener("click", function(){ menu.classList.remove("on"); });
  menu.addEventListener("click", function(e){
    var b = e.target.closest("button[data-lang]");
    if(!b) return;
    menu.classList.remove("on");
    applyLang(b.getAttribute("data-lang"));
  });
  paintPickerBtn();
}
function paintPickerBtn(){
  var btn = document.getElementById("langBtn");
  if(!btn) return;
  var l = LANGS.filter(function(x){ return x.c === curLang; })[0] || LANGS[0];
  btn.innerHTML = '🌐 <span>' + (curLang === "en" ? "EN" : l.n) + "</span>";
  var menu = document.querySelector(".lang-menu");
  if(menu) menu.querySelectorAll("button").forEach(function(b){
    b.classList.toggle("on", b.getAttribute("data-lang") === curLang);
  });
}

/* ================= theme ================= */
var root = document.documentElement;
function themeNow(){
  var t = root.getAttribute("data-theme");
  if(t) return t;
  return (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
}
function paintThemeBtn(){
  var b = document.getElementById("themeBtn");
  if(b){ b.textContent = themeNow()==="dark" ? "☀️" : "🌙"; }
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

/* ================= toast ================= */
var toastEl, toastTimer;
function toast(msg){
  if(!toastEl){ toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); }
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ toastEl.classList.remove("show"); }, 2400);
}

/* ================= copy ================= */
document.addEventListener("click", function(e){
  var c = e.target.closest && e.target.closest("[data-copy]");
  if(!c) return;
  var txt = c.getAttribute("data-copy");
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ toast(T("copied","Copied: ") + txt); }, function(){ toast(txt); });
  } else { toast(txt); }
});

/* ================= reveal ================= */
document.addEventListener("click", function(e){
  var r = e.target.closest && e.target.closest(".reveal");
  if(!r) return;
  if(r.classList.contains("shown")){
    var v = r.getAttribute("data-v");
    if(v && navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(v).then(function(){ toast(T("copiedClip","Copied to clipboard")); }); }
    return;
  }
  try{
    var val = atob(r.getAttribute("data-secret"));
    r.textContent = val;
    r.setAttribute("data-v", val);
    r.classList.add("shown");
    r.removeAttribute("data-i18n");
  }catch(err){}
});

/* ================= arrival picker ================= */
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

/* ================= journey nav scrollspy ================= */
var jlinks = Array.prototype.slice.call(document.querySelectorAll(".jnav a[href^='#']"));
if(jlinks.length){
  var sections = jlinks.map(function(a){ return document.getElementById(a.getAttribute("href").slice(1)); }).filter(Boolean);
  var spy = function(){
    var y = window.scrollY + 130, cur = sections[0];
    sections.forEach(function(s){ if(s.offsetTop <= y) cur = s; });
    jlinks.forEach(function(a){
      var on = a.getAttribute("href") === "#" + cur.id;
      a.classList.toggle("on", on);
      if(on){
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

/* ================= lightbox ================= */
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

/* ================= greeting + hints ================= */
function paintGreeting(){
  var greetEl = document.querySelector("[data-greet]");
  if(!greetEl) return;
  var hr = new Date().getHours();
  var txt = hr >= 5 && hr < 12 ? T("greetMorning","Good morning — welcome to")
          : hr >= 12 && hr < 17 ? T("greetAfternoon","Good afternoon — welcome to")
          : hr >= 17 && hr < 22 ? T("greetEvening","Good evening — welcome to")
          : T("greetWelcome","Welcome to");
  greetEl.textContent = txt;
}
function paintHints(){
  var hintStrip = document.getElementById("hintStrip");
  if(!hintStrip) return;
  var now = new Date(), hr = now.getHours(), day = now.getDay();
  var hints = [];
  if(hr >= 22 || hr < 8) hints.push({c:"info", i:"🤫", t:T("hintQuiet","Quiet hours are 11:00 PM – 8:00 AM. Thanks for keeping the volume cozy.")});
  if(day === 3 && hr >= 16) hints.push({c:"gold", i:"🗑️", t:T("hintBins","It's Wednesday — bins go to the curb this evening for Thursday morning pickup.")});
  if(hr >= 8 && hr < 11) hints.push({c:"gold", i:"⏰", t:T("hintCheckout","Checking out today? Checkout is at 11:00 AM — message us on Airbnb if you need a hand.")});
  if(hints.length){
    var h = hints[0];
    hintStrip.innerHTML = '<div class="callout ' + h.c + '"><span class="ico">' + h.i + '</span><span>' + h.t + "</span></div>";
    hintStrip.classList.add("on");
  } else { hintStrip.classList.remove("on"); hintStrip.innerHTML = ""; }
}

/* ================= PWA install nudge ================= */
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
    if(!isIOS) toast(T("homeMenu","In your browser menu, choose “Add to Home Screen”"));
  }
});

/* ================= service worker ================= */
if("serviceWorker" in navigator && location.protocol !== "file:"){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register(swbase() + "sw.js").catch(function(){});
  });
}

/* ================= hours parser ================= */
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
  if(/24 hours/.test(h)) return {open:true, until:"24h"};
  if(/^open daily until\s+(midnight|\d)/.test(h)){
    var od = h.match(/until\s+(midnight|\d{1,2}(?::\d{2})?(?:am|pm))/);
    var ct = od[1]==="midnight" ? 1440 : parseTime(od[1]);
    if(ct!==null){
      var nw0 = new Date(), m0 = nw0.getHours()*60+nw0.getMinutes();
      if(ct <= 720) ct += 1440;
      var op0 = 12*60;
      var isOpen = (m0 >= op0 && m0 < ct) || (ct > 1440 && m0 < ct-1440);
      return {open:isOpen, until:fmt(ct%1440)};
    }
  }
  var nw = new Date(), d = nw.getDay(), mins = nw.getHours()*60 + nw.getMinutes();
  var um = h.match(/until\s+(\d{1,2}(?::\d{2})?(?:am|pm))/);
  if(um && !/[-–]\s*\d/.test(h.replace(/\(.*\)/,""))){
    var closeT = parseTime(um[1]);
    var pm = h.match(/\((sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s*[-–]\s*(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)?\s+until\s+(\d{1,2}(?::\d{2})?(?:am|pm))\)/);
    if(pm){ var dd = dayRange(pm[1]); if(dd && dd.indexOf(d)>=0) closeT = parseTime(pm[2]); }
    if(closeT===null) return null;
    var openT = 8*60;
    if(closeT < openT) closeT += 24*60;
    var ok = mins >= openT-90 && mins < closeT;
    return {open: ok, until: fmt(closeT%1440)};
  }
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
    if(/closed/.test(rest)){ continue; }
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

/* ================= places explorer ================= */
var placesRoot = document.getElementById("places");
if(placesRoot && window.PLACES){
  var state = {type:"all", q:"", late:false, openNow:false};
  var chipsEl = document.getElementById("typeChips");
  var renderChips = function(){
    if(!chipsEl || !window.PLACE_TYPES) return;
    chipsEl.innerHTML = "";
    window.PLACE_TYPES.forEach(function(t){
      var b = document.createElement("button");
      b.className = "fchip" + (t.key===state.type?" on":"");
      b.innerHTML = '<span aria-hidden="true">' + t.icon + "</span>" + X(t.label);
      b.setAttribute("data-type", t.key);
      chipsEl.appendChild(b);
    });
  };
  window.__renderChips = renderChips;
  renderChips();
  if(chipsEl) chipsEl.addEventListener("click", function(e){
    var b = e.target.closest("button[data-type]");
    if(!b) return;
    state.type = b.getAttribute("data-type");
    chipsEl.querySelectorAll(".fchip").forEach(function(c){ c.classList.toggle("on", c===b); });
    render();
  });
  var q = document.getElementById("placeSearch");
  if(q) q.addEventListener("input", function(){ state.q = q.value.trim().toLowerCase(); render(); });
  var lateTog = document.getElementById("lateTog"), openTog = document.getElementById("openTog");
  if(lateTog) lateTog.addEventListener("change", function(){ state.late = lateTog.checked; lateTog.closest(".tog").classList.toggle("on", state.late); render(); });
  if(openTog) openTog.addEventListener("change", function(){ state.openNow = openTog.checked; openTog.closest(".tog").classList.toggle("on", state.openNow); render(); });

  var TYPE_LABEL = {};
  (window.PLACE_TYPES||[]).forEach(function(t){ TYPE_LABEL[t.key]=t; });

  var esc = function(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };
  var ptr = function(p, field){
    if(dict && dict.places && dict.places[p.name] && dict.places[p.name][field]) return dict.places[p.name][field];
    return field==="g" ? p.goodFor : p.desc;
  };

  var card = function(p){
    var st = openNow(p.hours);
    var badges = "";
    if(st) badges += st.open ? '<span class="badge open">' + T("openNowB","Open now") + (st.until && st.until!=="24h" ? " · " + T("till","till") + " " + st.until : "") + "</span>" : '<span class="badge closed">' + T("closedB","Closed now") + "</span>";
    if(p.openLate) badges += '<span class="badge late">🌙 ' + T("lateB","late") + "</span>";
    var t = TYPE_LABEL[p.type] || {icon:"📍",label:""};
    var meta = [];
    meta.push('<span>' + t.icon + " " + esc(X(t.label)) + "</span>");
    if(p.cuisine && p.cuisine!==t.label) meta.push('<span class="dot">' + esc(X(p.cuisine)) + "</span>");
    if(p.price) meta.push('<span class="dot">' + esc(p.price) + "</span>");
    var foot = '<span class="p-walk">🚶 ' + esc(p.walk).replace("min", T("min","min")) + "</span>";
    if(p.maps) foot += '<a class="p-dir" href="' + esc(p.maps) + '" target="_blank" rel="noopener">' + T("directions","Directions") + " ↗</a>";
    var g = ptr(p,"g"), dsc = ptr(p,"d");
    return '<div class="place">' +
      '<div class="p-top"><div class="p-name">' + esc(p.name) + '</div><div class="p-badges">' + badges + "</div></div>" +
      '<div class="p-meta">' + meta.join("") + "</div>" +
      (g ? '<div class="p-good">' + esc(g) + "</div>" : "") +
      (dsc ? '<div class="p-desc">' + esc(dsc) + "</div>" : "") +
      '<div class="p-meta">🕐 ' + esc(p.hours) + "</div>" +
      '<div class="p-foot">' + foot + "</div>" +
      "</div>";
  };
  var render = function(){
    var list = window.PLACES.filter(function(p){
      if(state.type!=="all" && p.type!==state.type) return false;
      if(state.late && !p.openLate) return false;
      if(state.q){
        var hay = (p.name+" "+(p.cuisine||"")+" "+(p.goodFor||"")+" "+(p.desc||"")+" "+(ptr(p,"g")||"")+" "+(ptr(p,"d")||"")).toLowerCase();
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
    if(cl) cl.textContent = list.length ? T("countLine","{n} places · sorted by walking distance").replace("{n}", list.length) : "";
    placesRoot.innerHTML = list.length ? list.map(card).join("") : '<div class="empty-msg">' + T("empty","Nothing matches those filters — try widening them a little.") + "</div>";
  };
  window.__renderPlaces = render;
  render();
}

/* ================= boot ================= */
buildPicker();
paintThemeBtn();
paintGreeting();
paintHints();
var startLang = "";
try{ startLang = localStorage.getItem("nsto-lang") || ""; }catch(e){}
if(!startLang){
  var nav = (navigator.language || "en").slice(0,2).toLowerCase();
  startLang = LANGS.some(function(l){ return l.c === nav; }) ? nav : "en";
}
if(startLang !== "en") applyLang(startLang);
else { curLang = "en"; paintPickerBtn(); }
})();

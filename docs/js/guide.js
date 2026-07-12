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
    if(typeof paintGuideSearch === "function") paintGuideSearch();
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

/* ================= reveal + secret pop ================= */
var secretEl, secretTimer;
function showSecret(icon, value, copied){
  if(!secretEl){
    secretEl = document.createElement("div");
    secretEl.className = "secret-pop";
    document.body.appendChild(secretEl);
    secretEl.addEventListener("click", function(){ secretEl.classList.remove("show"); });
  }
  secretEl.innerHTML = '<div class="sp-card"><div class="sp-label">' + icon + '</div><div class="sp-val">' +
    value + "</div>" + (copied ? '<div class="sp-note">' + T("copiedClip","Copied to clipboard") + "</div>" : "") + "</div>";
  secretEl.classList.add("show");
  clearTimeout(secretTimer);
  secretTimer = setTimeout(function(){ secretEl.classList.remove("show"); }, 4200);
}
function secretIcon(r){ return r.closest && r.closest(".essentials") ? "📶" : "🔑"; }
document.addEventListener("click", function(e){
  var r = e.target.closest && e.target.closest(".reveal");
  if(!r) return;
  if(r.classList.contains("shown")){
    var v = r.getAttribute("data-v");
    if(v && navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(v).then(function(){}, function(){}); }
    showSecret(secretIcon(r), v, true);
    return;
  }
  try{
    var val = atob(r.getAttribute("data-secret"));
    r.textContent = val;
    r.setAttribute("data-v", val);
    r.classList.add("shown");
    r.removeAttribute("data-i18n");
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(val).then(function(){}, function(){}); }
    showSecret(secretIcon(r), val, true);
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
function torontoTime(){
  var tz = "America/Toronto";
  var h = 0, label = "";
  try{
    h = parseInt(new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"2-digit",hour12:false}).format(new Date()),10) % 24;
    label = new Intl.DateTimeFormat(curLang === "en" ? "en-US" : curLang,
              {timeZone:tz, hour:"numeric", minute:"2-digit"}).format(new Date());
  }catch(e){
    var d = new Date(); h = d.getHours();
    label = new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit",hour12:true}).format(d);
  }
  return {h:h, label:label};
}
function paintHints(){
  var hintStrip = document.getElementById("hintStrip");
  if(!hintStrip) return;
  var now = new Date(), hr = now.getHours(), day = now.getDay();
  var tor = torontoTime();
  var hints = [];
  if(tor.h >= 23 || tor.h < 8) hints.push({c:"info", i:"🤫", t:T("hintQuiet","It's {time} in Toronto — quiet hours (11 PM – 8 AM) are in effect. Thanks for keeping the volume cozy.").replace("{time}", tor.label)});
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

/* ================= in-guide search (room guides only) ================= */
var gsBox, gsInput, gsResults, gsSel = -1, gsMatches = [];
function buildGuideSearch(){
  if(!document.getElementById("arrive")) return;   /* room guides only, not aroundus */
  var bar = document.querySelector(".topbar");
  if(!bar) return;
  var btn = document.createElement("button");
  btn.className = "theme-btn"; btn.id = "guideSearchBtn";
  btn.type = "button"; btn.textContent = "🔍";
  btn.setAttribute("aria-label", T("gsearchTitle","Search this guide"));
  bar.insertBefore(btn, bar.lastChild);   /* left of the language/theme cluster */

  gsBox = document.createElement("div");
  gsBox.className = "gsearch";
  gsBox.innerHTML =
    '<div class="gsearch-panel"><div class="gsearch-bar">' +
      '<input type="search" id="guideSearchInput" autocomplete="off" enterkeyhint="search">' +
      '<button class="gsearch-close" aria-label="Close">✕</button></div>' +
    '<div class="gsearch-results" id="guideSearchResults"></div></div>';
  document.body.appendChild(gsBox);
  gsInput = gsBox.querySelector("#guideSearchInput");
  gsResults = gsBox.querySelector("#guideSearchResults");

  btn.addEventListener("click", openGuideSearch);
  gsBox.querySelector(".gsearch-close").addEventListener("click", closeGuideSearch);
  gsBox.addEventListener("click", function(e){ if(e.target === gsBox) closeGuideSearch(); });
  gsInput.addEventListener("input", renderGuideSearch);
  gsInput.addEventListener("keydown", function(e){
    if(e.key === "Escape") return closeGuideSearch();
    if(e.key === "ArrowDown"){ e.preventDefault(); moveSel(1); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); moveSel(-1); }
    else if(e.key === "Enter"){ e.preventDefault(); var m = gsMatches[gsSel < 0 ? 0 : gsSel]; if(m) goToResult(m); }
  });
  paintGuideSearch();
}
function paintGuideSearch(){
  if(gsInput) gsInput.placeholder = T("gsearchPh","Search this guide…");
}
function txt(el){ return el ? (el.innerText || el.textContent || "").replace(/\s+/g," ").trim() : ""; }
/* Search synonyms, per language. Typing any word in a group also finds the others,
   so "trash" finds the "garbage" card. Only ADD entries — expansion never hides results.
   Proper nouns (Kumbah, Oliver, Ossington, TTC, Green P, Roku) stay in the content in
   every language, so keep them in each language's groups when translating. */
var SEARCH_SYN = {
  en: [
    ["garbage","trash","rubbish","bin","bins","waste","litter","recycle","recycling","compost","dispose","disposal"],
    ["wifi","wi-fi","internet","wireless","network","password","hotspot"],
    ["ac","air conditioning","air conditioner","aircon","cooling","heat","heater","heating","thermostat","temperature","warm","cold","blanket","climate"],
    ["checkout","check-out","leaving","depart","departure"],
    ["checkin","check-in","arrival","arriving"],
    ["laundry","washer","washing","dryer","detergent","wash"],
    ["parking","park","car","permit","green p","vehicle"],
    ["subway","metro","ttc","transit","train","ossington","station","line 2"],
    ["pets","pet","dog","cat","kumbah","oliver","allergy","allergies","hypoallergenic"],
    ["luggage","bags","bag","suitcase","baggage","storage","drop-off","drop off"],
    ["quiet","noise","noisy","volume","loud","sleep","earplugs"],
    ["kitchen","cook","cooking","stove","fridge","refrigerator","food","microwave","dishes"],
    ["towel","towels"],
    ["bidet","washlet"],
    ["iron","ironing"],
    ["shower","bath","bathroom","washroom","toilet","tub"],
    ["door","key","code","keypad","lock","entrance"],
    ["tv","television","roku","remote","netflix"],
    ["smoke","smoking","cigarette","vape","vaping"],
    ["emergency","fire","911","exit","safety"],
    ["umbrella","rain","weather"],
    ["coffee","tea","kettle","espresso"],
    ["address","location","directions","map"]
  ],
  fr: [
    ["poubelle","poubelles","ordures","déchets","recyclage","recycler","compost","tri","corbeille","détritus"],
    ["wifi","wi-fi","internet","sans fil","réseau","mot de passe"],
    ["climatisation","clim","climatiseur","air conditionné","chauffage","chauffer","radiateur","température","froid","chaud","couverture","thermostat"],
    ["départ","check-out","partir","quitter","fin de séjour"],
    ["arrivée","check-in","enregistrement","arriver"],
    ["laverie","lessive","lave-linge","machine à laver","sèche-linge","laver","linge","détergent"],
    ["stationnement","parking","garer","voiture","permis","auto","véhicule"],
    ["métro","ttc","transport","train","ossington","station","ligne 2","tramway"],
    ["animaux","animal","chien","chienne","chat","kumbah","oliver","allergie","allergies"],
    ["bagages","valise","valises","sac","sacs","consigne","dépôt"],
    ["silence","calme","bruit","volume","dormir","sommeil","tranquille"],
    ["cuisine","cuisiner","cuisinière","réfrigérateur","frigo","nourriture","micro-ondes","vaisselle","plaque"],
    ["serviette","serviettes"],
    ["bidet"],
    ["fer","fer à repasser","repasser","repassage"],
    ["douche","salle de bain","bain","toilette","toilettes","wc","baignoire","lavabo"],
    ["porte","clé","clef","code","clavier","serrure","entrée","verrou"],
    ["télé","télévision","roku","télécommande","netflix"],
    ["fumer","fumée","cigarette","tabac","vapoter"],
    ["urgence","urgences","feu","incendie","911","sortie","secours","sécurité"],
    ["parapluie","pluie","météo","temps"],
    ["café","thé","bouilloire","expresso"],
    ["adresse","emplacement","localisation","itinéraire","direction","carte","plan"]
  ],
  es: [
    ["basura","desperdicios","desechos","reciclaje","reciclar","compost","cubo","papelera","tacho"],
    ["wifi","wi-fi","internet","inalámbrico","red","contraseña","clave"],
    ["aire acondicionado","aire","clima","calefacción","calentador","calor","frío","temperatura","manta","termostato"],
    ["salida","check-out","partida","irse","dejar"],
    ["entrada","llegada","check-in","registro","llegar"],
    ["lavandería","lavadora","secadora","lavar","ropa","detergente","colada"],
    ["estacionamiento","aparcamiento","parking","coche","carro","auto","permiso","vehículo"],
    ["metro","subte","ttc","transporte","tren","ossington","estación","línea 2","tranvía"],
    ["mascotas","mascota","perro","perra","gato","kumbah","oliver","alergia","alergias"],
    ["equipaje","maleta","maletas","bolsa","bolsas","consigna","guardar"],
    ["silencio","ruido","volumen","dormir","sueño","tapones","tranquilo"],
    ["cocina","cocinar","estufa","fogón","refrigerador","nevera","heladera","comida","microondas","platos"],
    ["toalla","toallas"],
    ["bidé","bidet"],
    ["plancha","planchar","planchado"],
    ["ducha","baño","bañera","tina","inodoro","lavabo","aseo"],
    ["puerta","llave","código","teclado","cerradura","entrada","cerrojo"],
    ["tele","televisión","televisor","roku","control remoto","mando","netflix"],
    ["fumar","humo","cigarrillo","tabaco","vapear"],
    ["emergencia","emergencias","fuego","incendio","911","salida","seguridad"],
    ["paraguas","sombrilla","lluvia","clima","tiempo"],
    ["café","té","tetera","hervidor","espresso"],
    ["dirección","ubicación","localización","cómo llegar","mapa"]
  ],
  de: [
    ["müll","abfall","recycling","wiederverwertung","kompost","mülleimer","tonne","biomüll"],
    ["wlan","wifi","wi-fi","internet","drahtlos","netzwerk","passwort","kennwort"],
    ["klimaanlage","klima","kühlung","heizung","heizen","heizkörper","temperatur","kalt","warm","decke","thermostat"],
    ["abreise","check-out","auschecken","abfahrt","verlassen"],
    ["anreise","ankunft","check-in","einchecken","ankommen"],
    ["wäsche","waschküche","waschmaschine","trockner","waschen","waschmittel"],
    ["parken","parkplatz","auto","wagen","fahrzeug","genehmigung","parkschein"],
    ["u-bahn","ubahn","metro","ttc","transit","zug","ossington","station","linie 2","straßenbahn"],
    ["haustiere","haustier","hund","hündin","katze","kumbah","oliver","allergie","allergien"],
    ["gepäck","koffer","tasche","taschen","aufbewahrung"],
    ["ruhe","ruhezeiten","lärm","geräusch","lautstärke","schlafen","ohrstöpsel","leise"],
    ["küche","kochen","herd","kühlschrank","essen","lebensmittel","mikrowelle","geschirr"],
    ["handtuch","handtücher"],
    ["bidet"],
    ["bügeleisen","bügeln","bügelbrett"],
    ["dusche","bad","badezimmer","wanne","badewanne","toilette","wc","waschbecken"],
    ["tür","schlüssel","code","tastenfeld","schloss","eingang","riegel"],
    ["fernseher","fernsehen","roku","fernbedienung","netflix"],
    ["rauchen","rauch","zigarette","tabak","dampfen"],
    ["notfall","feuer","brand","911","ausgang","notausgang","sicherheit"],
    ["regenschirm","schirm","regen","wetter"],
    ["kaffee","tee","wasserkocher","espresso"],
    ["adresse","standort","lage","wegbeschreibung","richtung","karte"]
  ],
  pt: [
    ["lixo","resíduos","reciclagem","reciclar","compostagem","compost","lixeira","cesto"],
    ["wifi","wi-fi","internet","sem fio","rede","senha","palavra-passe"],
    ["ar condicionado","ar","clima","refrigeração","aquecimento","aquecedor","calor","frio","temperatura","cobertor","manta","termostato"],
    ["saída","check-out","partida","sair","deixar"],
    ["entrada","chegada","check-in","registro","chegar"],
    ["lavanderia","lavandaria","máquina de lavar","secadora","lavar","roupa","detergente"],
    ["estacionamento","parque","carro","auto","permissão","veículo"],
    ["metrô","metro","ttc","transporte","trem","comboio","ossington","estação","linha 2","bonde","elétrico"],
    ["animais","animal","cachorro","cão","cadela","gato","kumbah","oliver","alergia","alergias"],
    ["bagagem","mala","malas","bolsa","bolsas","guarda-volumes","armazenamento"],
    ["silêncio","barulho","ruído","volume","dormir","sono","tampões","tranquilo"],
    ["cozinha","cozinhar","fogão","geladeira","frigorífico","comida","micro-ondas","louça"],
    ["toalha","toalhas"],
    ["bidê","bidet"],
    ["ferro","ferro de passar","passar","engomar"],
    ["chuveiro","banho","banheiro","casa de banho","banheira","vaso","sanitário","pia","lavatório"],
    ["porta","chave","código","teclado","fechadura","entrada","trava"],
    ["televisão","tv","roku","controle remoto","comando","netflix"],
    ["fumar","fumaça","cigarro","tabaco","vapear"],
    ["emergência","fogo","incêndio","911","saída","segurança"],
    ["guarda-chuva","sombrinha","chuva","tempo","clima"],
    ["café","chá","chaleira","expresso","espresso"],
    ["endereço","localização","local","como chegar","direção","mapa"]
  ],
  ko: [
    ["쓰레기","분리수거","재활용","퇴비","음식물","휴지통"],
    ["와이파이","wifi","인터넷","무선","네트워크","비밀번호","암호","패스워드"],
    ["에어컨","냉방","난방","히터","온도","추워","더워","따뜻","담요"],
    ["체크아웃","퇴실","출발","떠나","나가"],
    ["체크인","입실","도착","들어"],
    ["세탁","빨래","세탁기","건조기","세제"],
    ["주차","주차장","자동차","허가증","차량"],
    ["지하철","전철","ttc","교통","기차","오싱턴","ossington","2호선","노선","전차"],
    ["반려동물","애완동물","강아지","고양이","쿰바","kumbah","올리버","oliver","알레르기"],
    ["짐","수하물","캐리어","가방","보관"],
    ["정숙","조용","소음","시끄","볼륨","수면","귀마개"],
    ["주방","부엌","요리","가스레인지","냉장고","음식","전자레인지","그릇","설거지"],
    ["수건","타월"],
    ["비데","bidet"],
    ["다리미","다림질"],
    ["샤워","욕실","화장실","목욕","욕조","변기","세면대"],
    ["열쇠","코드","비밀번호","키패드","잠금","도어락","입구","현관"],
    ["티비","텔레비전","로쿠","roku","리모컨","넷플릭스","netflix"],
    ["흡연","담배","연기","금연","전자담배"],
    ["비상","응급","화재","출구","비상구","안전"],
    ["우산","날씨"],
    ["커피","주전자","에스프레소"],
    ["주소","위치","길찾기","방향","지도","오시는 길"]
  ],
  zh: [
    ["垃圾","废物","回收","分类","堆肥","厨余","垃圾桶"],
    ["wifi","无线","网络","上网","互联网","密码"],
    ["空调","冷气","制冷","暖气","加热","取暖器","温度","毯子","恒温"],
    ["退房","离开","出发","退宿"],
    ["入住","到达","登记","抵达"],
    ["洗衣","洗衣机","烘干机","洗涤剂","洗衣液","衣服"],
    ["停车","车位","汽车","许可","车辆"],
    ["地铁","ttc","交通","火车","轻轨","有轨电车","2号线","ossington"],
    ["宠物","kumbah","oliver","过敏"],
    ["行李","箱子","寄存","存放"],
    ["安静","噪音","声音","音量","睡觉","睡眠","耳塞"],
    ["厨房","做饭","炉子","灶","冰箱","食物","微波炉","餐具"],
    ["毛巾","浴巾"],
    ["坐浴盆","洁身器","bidet"],
    ["熨斗","熨衣","熨烫"],
    ["淋浴","浴室","洗澡","卫生间","浴缸","马桶","洗手间","水槽"],
    ["钥匙","密码","键盘","门锁","入口","大门"],
    ["电视","roku","遥控器","奈飞","netflix"],
    ["吸烟","抽烟","香烟","电子烟"],
    ["紧急","火灾","出口","安全"],
    ["雨伞","下雨","天气"],
    ["咖啡","水壶","浓缩咖啡","意式"],
    ["地址","位置","路线","方向","地图","怎么走"]
  ],
  ja: [
    ["ゴミ","ごみ","生ゴミ","リサイクル","分別","コンポスト","堆肥"],
    ["wifi","ワイファイ","無線","ネット","インターネット","パスワード","暗証"],
    ["エアコン","冷房","暖房","ヒーター","温度","寒い","暑い","毛布","サーモスタット"],
    ["チェックアウト","退室","出発"],
    ["チェックイン","到着","入室"],
    ["洗濯","洗濯機","乾燥機","洗剤","ランドリー"],
    ["駐車","駐車場","許可","車両","パーキング"],
    ["地下鉄","電車","ttc","交通","路面電車","2号線","ossington","メトロ"],
    ["ペット","クンバ","kumbah","オリバー","oliver","アレルギー"],
    ["荷物","スーツケース","バッグ","かばん","保管"],
    ["静か","静粛","騒音","音量","睡眠","耳栓","うるさ"],
    ["キッチン","台所","料理","コンロ","冷蔵庫","食べ物","電子レンジ","食器"],
    ["タオル"],
    ["ビデ","bidet"],
    ["アイロン"],
    ["シャワー","浴室","風呂","トイレ","バスタブ","洗面"],
    ["ドア","鍵","暗証番号","キーパッド","ロック","入口","玄関"],
    ["テレビ","roku","ロク","リモコン","ネットフリックス","netflix"],
    ["喫煙","タバコ","たばこ","禁煙","電子タバコ"],
    ["緊急","火事","出口","非常口","安全"],
    ["傘","天気"],
    ["コーヒー","お茶","ケトル","やかん","エスプレッソ"],
    ["住所","場所","行き方","道順","地図","アクセス"]
  ],
  hi: [
    ["कचरा","कूड़ा","कूड़ेदान","रीसाइक्लिंग","रीसायकल","कम्पोस्ट","खाद","garbage","trash"],
    ["वाईफाई","wifi","इंटरनेट","इन्टरनेट","नेटवर्क","पासवर्ड","वायरलेस"],
    ["एसी","ac","वातानुकूलन","हीटर","हीटिंग","तापमान","ठंड","गरम","कंबल","कम्बल"],
    ["चेक-आउट","चेकआउट","checkout","प्रस्थान","निकल"],
    ["चेक-इन","चेकइन","checkin","आगमन","पहुंच"],
    ["लॉन्ड्री","कपड़े धोना","वॉशर","वॉशिंग मशीन","ड्रायर","धोना","डिटर्जेंट","laundry"],
    ["पार्किंग","parking","गाड़ी","कार","परमिट","वाहन"],
    ["सबवे","मेट्रो","ttc","ट्रेन","परिवहन","ossington","स्टेशन","लाइन 2","subway"],
    ["पालतू","कुत्ता","बिल्ली","कुम्बा","kumbah","ओलिवर","oliver","एलर्जी","pets","dog"],
    ["सामान","बैग","सूटकेस","लगेज","भंडारण","luggage"],
    ["शांति","शोर","आवाज़","वॉल्यूम","सोना","नींद","इयरप्लग","quiet"],
    ["रसोई","किचन","खाना बनाना","चूल्हा","फ्रिज","रेफ्रिजरेटर","भोजन","माइक्रोवेव","बर्तन","kitchen"],
    ["तौलिया","तौलिये","towel"],
    ["बिडेट","bidet"],
    ["इस्त्री","प्रेस","iron"],
    ["शावर","बाथरूम","स्नान","नहाना","टॉयलेट","शौचालय","बाथटब","shower","toilet"],
    ["दरवाज़ा","दरवाजा","चाबी","कुंजी","कोड","कीपैड","ताला","प्रवेश","door","key"],
    ["टीवी","tv","टेलीविजन","रोकू","roku","रिमोट","नेटफ्लिक्स","netflix"],
    ["धूम्रपान","सिगरेट","धुआं","तंबाकू","वेप","smoking"],
    ["आपातकाल","आग","निकास","सुरक्षा","emergency","fire","exit"],
    ["छाता","बारिश","मौसम","umbrella","rain"],
    ["कॉफी","चाय","केतली","एस्प्रेसो","coffee","tea"],
    ["पता","स्थान","रास्ता","दिशा","नक्शा","मानचित्र","address","map"]
  ]
};
function fold(s){ return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function expandToken(t){
  var groups = SEARCH_SYN[curLang] || SEARCH_SYN.en, set = [t];
  for(var i=0;i<groups.length;i++){
    var g = groups[i], hit = false;
    for(var j=0;j<g.length;j++){ if(fold(g[j]) === t){ hit = true; break; } }
    if(hit) for(var k=0;k<g.length;k++){ var fw = fold(g[k]); if(set.indexOf(fw) < 0) set.push(fw); }
  }
  return set;
}
function tokenInHay(hay, w){
  /* short latin words (ac, tv, tri, car, key…) match whole-word only, so "tri" doesn't hit "distributeurs" */
  if(w.length <= 3 && /^[a-z0-9]+$/.test(w)) return new RegExp("(^|[^a-z0-9])" + w + "([^a-z0-9]|$)").test(hay);
  return hay.indexOf(w) >= 0;
}
function hayHasToken(hay, t){
  var set = expandToken(t);
  for(var k=0;k<set.length;k++){ if(tokenInHay(hay, set[k])) return true; }
  return false;
}
function buildGuideIndex(){
  var out = [];
  var add = function(cat, title, snippet, target){
    if(!title && !snippet) return;
    out.push({cat:cat, title:title, snippet:snippet, hay:fold(title+" "+snippet), target:target});
  };
  var ess = document.querySelector(".essentials");
  if(ess) ess.querySelectorAll(".ess-item").forEach(function(it){
    add("", txt(it.querySelector(".ess-label")), txt(it.querySelector(".ess-value, .ess-act, .reveal")), it);
  });
  var nudge = document.querySelector(".nudge");
  if(nudge) add("", txt(nudge.querySelector("h3")), txt(nudge), nudge);
  document.querySelectorAll("section.section").forEach(function(sec){
    var secName = txt(sec.querySelector("h2")).replace(/^✦\s*/,"");
    sec.querySelectorAll("details.faq-item, details.howto").forEach(function(d){
      add(secName, txt(d.querySelector("summary")), txt(d.querySelector(".body")), d);
    });
    sec.querySelectorAll(".fact").forEach(function(f){
      add(secName, txt(f.querySelector(".f-t")), txt(f.querySelector(".f-d")), f);
    });
    sec.querySelectorAll(".rule").forEach(function(rl){
      add(secName, txt(rl.querySelector("b")), txt(rl.querySelector("span")), rl);
    });
    sec.querySelectorAll(".card > h3").forEach(function(h){
      add(secName, txt(h), txt(h.parentNode), h.parentNode);
    });
    sec.querySelectorAll(".callout").forEach(function(c){
      add(secName, "", txt(c), c);
    });
    sec.querySelectorAll(".steps > li").forEach(function(li){
      add(secName, txt(li.querySelector("b")), txt(li.querySelector("small")), li);
    });
  });
  return out;
}
function renderGuideSearch(){
  var q = fold((gsInput.value || "").trim());
  gsSel = -1;
  if(!q){ gsResults.innerHTML = ""; gsMatches = []; return; }
  var toks = q.split(/\s+/);
  var idx = buildGuideIndex();
  gsMatches = idx.filter(function(e){ return toks.every(function(t){ return hayHasToken(e.hay, t); }); });
  gsMatches.sort(function(a,b){
    var at = fold(a.title).indexOf(toks[0]) >= 0 ? 0 : 1;
    var bt = fold(b.title).indexOf(toks[0]) >= 0 ? 0 : 1;
    return at - bt;
  });
  gsMatches = gsMatches.slice(0, 14);
  if(!gsMatches.length){ gsResults.innerHTML = '<div class="gsearch-empty">' + T("gsearchEmpty","No matches — try another word") + "</div>"; return; }
  var esc = function(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
  gsResults.innerHTML = gsMatches.map(function(m, i){
    return '<button data-i="' + i + '">' +
      (m.cat ? '<div class="gs-cat">' + esc(m.cat) + "</div>" : "") +
      (m.title ? '<div class="gs-title">' + esc(m.title) + "</div>" : "") +
      (m.snippet ? '<div class="gs-snip">' + esc(m.snippet) + "</div>" : "") + "</button>";
  }).join("");
  Array.prototype.forEach.call(gsResults.querySelectorAll("button"), function(b){
    b.addEventListener("click", function(){ goToResult(gsMatches[+b.getAttribute("data-i")]); });
  });
}
function moveSel(d){
  var btns = gsResults.querySelectorAll("button");
  if(!btns.length) return;
  gsSel = (gsSel + d + btns.length) % btns.length;
  btns.forEach(function(b,i){ b.classList.toggle("sel", i === gsSel); });
  btns[gsSel].scrollIntoView({block:"nearest"});
}
function openDetailsChain(el){
  var d = el.closest("details");
  while(d){ d.open = true; d = d.parentElement && d.parentElement.closest("details"); }
  if(el.tagName === "DETAILS") el.open = true;
}
function goToResult(m){
  if(!m) return;
  closeGuideSearch();
  var target = m.target;
  openDetailsChain(target);
  setTimeout(function(){
    var y = target.getBoundingClientRect().top + window.scrollY - 96;
    window.scrollTo({top: y < 0 ? 0 : y, behavior:"smooth"});
    target.classList.add("search-flash");
    setTimeout(function(){ target.classList.remove("search-flash"); }, 1700);
  }, 60);
}
function openGuideSearch(){
  gsBox.classList.add("on");
  gsInput.value = ""; gsResults.innerHTML = ""; gsMatches = []; gsSel = -1;
  setTimeout(function(){ gsInput.focus(); }, 40);
}
function closeGuideSearch(){ if(gsBox) gsBox.classList.remove("on"); }

/* ================= boot ================= */
buildGuideSearch();
buildPicker();
paintThemeBtn();
paintGreeting();
paintHints();
setInterval(paintHints, 60000);   /* keep the Toronto clock in the quiet-hours banner current */
var startLang = "";
try{ startLang = localStorage.getItem("nsto-lang") || ""; }catch(e){}
if(!startLang){
  var nav = (navigator.language || "en").slice(0,2).toLowerCase();
  startLang = LANGS.some(function(l){ return l.c === nav; }) ? nav : "en";
}
if(startLang !== "en") applyLang(startLang);
else { curLang = "en"; paintPickerBtn(); }
})();

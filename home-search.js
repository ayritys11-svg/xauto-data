(function(){
  /* Etusivun hakulomake: merkki ja malli kirjoittamalla tai listasta (oikeista ilmoituksista). Lisää hakuehtoja avaa lisäkentät liukuen; haku vie Autot-sivulle valinnoilla. */
  var LIST="/autot/", BASE=window.VELO_BASE||"https://raw.githubusercontent.com/ayritys11-svg/xauto-data/main/";
  var tl=document.querySelector(".xh .tiles"); if(tl){tl.remove()}
  var ld=document.querySelector(".xh .hero .lead"); if(ld){ld.textContent="Autollesi valmiiksi laskettu hinta avaimet käteen -palveluna."}
  /* Korityyppien ikonit: terävät, matalat sivuprofiilit */
  var ICONS={"Sedan": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"4,31 4,26 7,22 20,20 30,12 42,9 60,9 72,11 84,20 104,22 115,25 116,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"54,20 54,11.2 66,12.5 73,20\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"26,20 32,14 41,11.2 51,11.2 51,20\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Maastoauto": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"9,31 9,7 11,3.5 64,3.5 66,4.5 71,13.5 108,14.5 112,16 113,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"14,11.5 14,6.5 31,6.5 31,11.5\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"34,11.5 34,6.5 50,6.5 50,11.5\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"53,11.5 53,6.5 63,6.5 67,11.5\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><rect x=\"5\" y=\"25.5\" width=\"8\" height=\"3.2\" rx=\"1\" fill=\"currentColor\"/><rect x=\"109\" y=\"25\" width=\"9\" height=\"3.4\" rx=\"1\" fill=\"currentColor\"/><path d=\"M12 22.5 H38 M80 22.5 H106\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"27\" cy=\"33\" r=\"10.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"27\" cy=\"33\" r=\"5.2\" fill=\"#AEB6BF\"/><circle cx=\"27\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"93\" cy=\"33\" r=\"10.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"93\" cy=\"33\" r=\"5.2\" fill=\"#AEB6BF\"/><circle cx=\"93\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Viistoperä": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"6,31 6,22 10,12 18,9 60,9 72,12 86,19 110,21 114,25 114,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"12,19 16,12 36,11.2 36,19\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"39,19 39,11.2 58,11.2 69,13.5 79,19\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Farmari": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"4,31 4,22 7,11 14,9 72,9 84,12 98,20 113,22 116,26 116,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"9,19 12,11.5 40,11.5 40,19\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"43,19 43,11.5 70,11.5 80,13.5 91,19\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Coupé": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"4,31 4,25 7,21.5 24,19 42,10.5 54,9.5 70,11 86,19 106,21 115,24 116,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"31,19 43,12.6 52,11.6 61,13 67,19\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Crossover": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"4,31 4,20 9,10 18,7.5 70,7.5 82,10 95,17 112,19.5 116,23 116,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"10,17 15,10 42,10 42,17\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"45,17 45,10 68,10 79,12 88,17\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Tila-auto": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"4,31 4,10 8,5 76,5 88,9 104,17 114,19 116,23 116,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"9,15 9,8 36,8 36,15\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"39,15 39,8 66,8 66,15\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"69,15 69,8 80,8 92,15\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Avolava": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"5,31 5,15 44,15 44,4.6 46,3.5 64,3.5 66,4.5 71,13.5 108,14.5 112,16 113,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"48,11.5 48,6.5 55,6.5 55,11.5\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><polygon points=\"58,11.5 58,6.5 63,6.5 67,11.5\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><path d=\"M6 15.2 H43\" stroke=\"#fff\" stroke-width=\".8\" opacity=\".35\"/><rect x=\"5\" y=\"25.5\" width=\"8\" height=\"3.2\" rx=\"1\" fill=\"currentColor\"/><rect x=\"109\" y=\"25\" width=\"9\" height=\"3.4\" rx=\"1\" fill=\"currentColor\"/><path d=\"M12 22.5 H38 M80 22.5 H106\" stroke=\"currentColor\" stroke-width=\"3\" stroke-linecap=\"round\"/><circle cx=\"27\" cy=\"33\" r=\"10.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"27\" cy=\"33\" r=\"5.2\" fill=\"#AEB6BF\"/><circle cx=\"27\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"93\" cy=\"33\" r=\"10.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"93\" cy=\"33\" r=\"5.2\" fill=\"#AEB6BF\"/><circle cx=\"93\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>", "Pakettiauto": "<svg viewBox=\"0 0 120 44\" aria-hidden=\"true\" shape-rendering=\"geometricPrecision\"><ellipse cx=\"60\" cy=\"41.6\" rx=\"54\" ry=\"1.5\" fill=\"currentColor\" opacity=\".12\"/><polygon points=\"4,31 4,6 8,3 72,3 84,7 102,16 113,18 116,22 116,31\" fill=\"currentColor\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linejoin=\"round\"/><polygon points=\"76,14 76,7 83,8 94,14\" fill=\"#C9D2DC\" stroke=\"#C9D2DC\" stroke-width=\".8\" stroke-linejoin=\"round\"/><circle cx=\"26\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"26\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"26\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/><circle cx=\"94\" cy=\"33\" r=\"8.6\" fill=\"#15181C\" stroke=\"#fff\" stroke-width=\"2.4\"/><circle cx=\"94\" cy=\"33\" r=\"4.6\" fill=\"#AEB6BF\"/><circle cx=\"94\" cy=\"33\" r=\"1.6\" fill=\"#15181C\"/></svg>"};
  Array.prototype.forEach.call(document.querySelectorAll(".xh .type"),function(bt){ var k=bt.textContent.trim(), sv=bt.querySelector("svg"); if(ICONS[k]){ if(sv){ sv.outerHTML=ICONS[k]; } } });
  var box=document.querySelector(".xh .search"); if(!box){return}
  var fields=box.querySelector(".fields"), sel=fields.querySelectorAll("select");
  var CARS=[];
  function el(t,c){ var e=document.createElement(t); if(c){e.className=c} return e; }
  function opt(v,t){ var o=el("option"); o.value=v; if(t){o.textContent=t} return o; }
  function fmt(n){ return new Intl.NumberFormat("fi-FI").format(n); }
  function has(v,q){ q=String(q||"").trim().toLowerCase(); if(!q){return true} if(!v){return true} return String(v).toLowerCase().indexOf(q)>=0; }
  function hasStrict(v,q){ q=String(q||"").trim().toLowerCase(); return !q || String(v||"").toLowerCase().indexOf(q)>=0; }
  function combo(id,ph){
    var w=el("div","vcb"), i=el("input"), d=el("datalist"), x=el("button","vx");
    i.id=id; i.setAttribute("data-list",id+"s"); i.autocomplete="off"; i.placeholder=ph; i.setAttribute("aria-label",ph); d.id=id+"s";
    x.type="button"; x.setAttribute("aria-label","Tyhjennä"); x.textContent="×"; x.hidden=true;
    w.appendChild(i); w.appendChild(x); w.appendChild(d);
    i.addEventListener("input",function(){ x.hidden=!i.value; });
    x.addEventListener("click",function(){ i.value=""; x.hidden=true; i.dispatchEvent(new Event("input",{bubbles:true})); i.focus(); });
    return {w:w,i:i,d:d,x:x,get:function(){return i.value.trim()},clear:function(){i.value="";x.hidden=true}};
  }
  function pick(ph,vals){ var s=el("select"); s.setAttribute("aria-label",ph); s.appendChild(opt("",ph)); vals.forEach(function(v){ s.appendChild(opt(String(v[0]),v[1])); }); return {w:s,i:s,get:function(){return s.value},clear:function(){s.value=""}}; }
  function steps(a,b,d,f){ var o=[]; for(var x=a;x<=b;x+=d){o.push([x,f(x)])} return o; }
  function gear(t){ return !t ? "" : (/MANUAL|MT\b|STICK/i.test(t) ? "Manuaali" : "Automaatti"); }
  function drive(d){ return ({AWD:"Neliveto","4WD":"Neliveto",FWD:"Etuveto",RWD:"Takaveto"})[d]||""; }
  function mn(c){ return /^\d/.test(c.model||"") ? c.make+" "+c.model : (c.model||""); }
  function fill(d,keys){ d.innerHTML=""; keys.sort().forEach(function(k){ d.appendChild(opt(k)); }); }

  /* perushaku */
  var MK=combo("vh-make","Merkki (kirjoita tai valitse)"), MD=combo("vh-model","Malli (kirjoita tai valitse)");
  sel[0].parentNode.replaceChild(MK.w,sel[0]); sel[1].parentNode.replaceChild(MD.w,sel[1]);
  /* vaihteluvälit avautuvat alapaneeliin (Minimi – Maksimi, numeronäppäimistö) */
  var R={pmin:"",pmax:"",ymin:"",ymax:"",kmin:"",kmax:""};
  function rlabel(a,b,u,lab){ var f=function(v){ return v ? (u==="€" ? fmt(+v) : (u==="km" ? fmt(+v) : String(v))) : ""; }; a=f(a); b=f(b); if(!a){ if(!b){ return lab; } } return lab+": "+(a||"…")+" – "+(b||"…")+(u ? " "+u : ""); }
  function rbtn(k1,k2,lab,u){
    var bt=el("button","vrf"); bt.type="button";
    function upd(){ var t=rlabel(R[k1],R[k2],u,lab); bt.textContent=t; bt.classList.toggle("set",t!==lab); }
    bt.addEventListener("click",function(){ if(!window.VeloRange){return} window.VeloRange({title:lab,unit:u,min:R[k1],max:R[k2],onOk:function(a,b){ R[k1]=a; R[k2]=b; upd(); count(); }}); });
    upd(); return {w:bt,upd:upd};
  }
  var PR=rbtn("pmin","pmax","Hinta","€"); sel[2].parentNode.replaceChild(PR.w,sel[2]);

  /* lisähakuehdot */
  var X={
    fuel:combo("vh-fuel","Käyttövoima"), gear:combo("vh-gear","Vaihteisto"), drive:combo("vh-drive","Veto"),

    hpmin:pick("Teho vähintään",steps(150,600,50,function(v){return v+" hv"}))
  };
  var wrap=el("div","vmore"), inner=el("div","vmore-in"), grid=el("div","vmore-grid");
  var YR=rbtn("ymin","ymax","Vuosimalli","");
  ["fuel","gear","drive"].forEach(function(k){ grid.appendChild(X[k].w); }); grid.appendChild(YR.w); var KM=rbtn("kmin","kmax","Mittarilukema","km"); grid.appendChild(KM.w); grid.appendChild(X.hpmin.w);
  inner.appendChild(grid); wrap.appendChild(inner); fields.parentNode.insertBefore(wrap,fields.nextSibling);
  wrap.setAttribute("aria-hidden","true");

  var btn=box.querySelectorAll(".sbar button"), clr=btn[0], more=btn[1], go=btn[2];
  more.setAttribute("aria-expanded","false");
  wrap.addEventListener("transitionend",function(e){ if(e.target===wrap){ if(wrap.classList.contains("open")){ wrap.classList.add("done"); } } });
  more.addEventListener("click",function(){
    var open=!wrap.classList.contains("open"); wrap.classList.remove("done"); wrap.classList.toggle("open",open);
    wrap.setAttribute("aria-hidden",open ? "false" : "true"); more.setAttribute("aria-expanded",String(open));
    more.textContent=open ? "Vähemmän hakuehtoja" : "Lisää hakuehtoja";
  });

  function types(){ return Array.prototype.filter.call(box.querySelectorAll(".type"),function(b){return b.getAttribute("aria-pressed")==="true"}).map(function(b){return b.textContent.trim()}); }
  function inR(v,lo,hi){ lo=+lo||0; hi=+hi||0; if(!lo){ if(!hi){return true} } if(v==null){return true} if(lo){ if(v<lo){return false} } if(hi){ if(v>hi){return false} } return true; }
  function ok(c){
    var t=types(); if(t.length){ if(!t.some(function(x){return hasStrict(c.body,x)})){return false} }
    if(!hasStrict(c.make,MK.get())){return false} if(!hasStrict(mn(c),MD.get())){return false}
    if(!has(c.fuel,X.fuel.get())){return false} if(!has(gear(c.transmission),X.gear.get())){return false} if(!has(drive(c.drivetrain),X.drive.get())){return false}
    var mid=c.total ? c.total.mid : null;
    return inR(mid,R.pmin,R.pmax) ? (inR(c.year,R.ymin,R.ymax) ? (inR(c.km,R.kmin,R.kmax) ? inR(c.hp||null,X.hpmin.get(),0) : false) : false) : false;
  }
  function count(){ go.textContent="Hae autoja"+(CARS.length ? " ("+CARS.filter(ok).length+")" : ""); }
  function models(){ var o={}; CARS.forEach(function(c){ if(hasStrict(c.make,MK.get())){ o[mn(c)]=1; } }); fill(MD.d,Object.keys(o)); }
  fetch(BASE+"data/listings.json?t="+Math.floor(Date.now()/60000),{cache:"no-store"}).then(function(r){return r.json()}).then(function(j){
    CARS=j.cars||[]; var m={},f={},g={},d={};
    CARS.forEach(function(c){ m[c.make]=1; if(c.fuel){f[c.fuel]=1} var a=gear(c.transmission); if(a){g[a]=1} var b=drive(c.drivetrain); if(b){d[b]=1} });
    fill(MK.d,Object.keys(m)); fill(X.fuel.d,Object.keys(f)); fill(X.gear.d,Object.keys(g)); fill(X.drive.d,Object.keys(d)); models(); count();
  }).catch(function(){});
  box.addEventListener("input",function(e){ if(e.target===MK.i){models()} count(); });
  box.addEventListener("change",count);
  box.addEventListener("click",function(e){ if(e.target.closest(".type")){ setTimeout(count,0); } });
  function url(){
    var u=new URLSearchParams(), set=function(k,v){ if(v){u.set(k,v)} };
    set("make",MK.get()); set("model",MD.get()); Object.keys(R).forEach(function(k){ set(k,R[k]); });
    Object.keys(X).forEach(function(k){ set(k,X[k].get()); });
    var t=types(); if(t.length){u.set("body",t.join("|"))}
    var q=u.toString(); return LIST+(q ? "?"+q : "");
  }
  go.addEventListener("click",function(){ location.href=url(); });
  box.addEventListener("keydown",function(e){ if(e.key==="Enter"){ if(e.target.tagName==="INPUT"){ location.href=url(); } } });
  clr.addEventListener("click",function(){ MK.clear(); MD.clear(); Object.keys(R).forEach(function(k){R[k]=""}); PR.upd(); YR.upd(); KM.upd(); Object.keys(X).forEach(function(k){X[k].clear()}); models(); setTimeout(count,0); });
})();

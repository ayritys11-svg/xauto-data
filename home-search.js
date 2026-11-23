(function(){
  /* Etusivun hakulomake: merkki ja malli kirjoittamalla tai listasta (oikeista ilmoituksista). Lisää hakuehtoja avaa lisäkentät liukuen; haku vie Autot-sivulle valinnoilla. */
  var LIST="/autot/", BASE=window.VELO_BASE||"https://raw.githubusercontent.com/ayritys11-svg/xauto-data/main/";
  var tl=document.querySelector(".xh .tiles"); if(tl){tl.remove()}
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
  var PR=rbtn("pmin","pmax","Yht. hinta","€"); sel[2].parentNode.replaceChild(PR.w,sel[2]);

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

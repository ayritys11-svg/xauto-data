/* X-auto autoverolaskuri: lataa laskurin HTML ja käynnistää sen */
(function(){
var root=document.querySelector(".xac");if(!root)return;
var base=root.dataset.base||"";
fetch(base+"calc.html").then(function(r){if(!r.ok)throw new Error(r.status);return r.text()}).then(function(h){root.innerHTML=h;XAUTO_MAIN();}).catch(function(){root.innerHTML='<p style="padding:16px">Laskurin lataus epäonnistui. Lataa sivu uudelleen.</p>';});
function XAUTO_MAIN(){var XAB=((document.querySelector(".xac")||{dataset:{}}).dataset.base||"")+"data/";
var D=null,$=function(i){return document.getElementById(i)};
function fmt(n){return new Intl.NumberFormat('fi-FI',{maximumFractionDigits:0}).format(Math.round(n))}
function fmtp(n){return new Intl.NumberFormat('fi-FI',{minimumFractionDigits:1,maximumFractionDigits:1}).format(n)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
var M=null,makes=[],byMake={};
/* Harvinaisten mallien arvio: lähimmät päätökset + yhteiset korjauskertoimet (kalibroitu takaisintestissä) */
var AN=null;
function anResolve(mk,md,kw){if(!AN)return null;var kb=kw?Math.floor(kw/10):-1,best=null,bs=-1;
  Object.keys(AN.d).forEach(function(k){var p=k.split("|");if(p[0]!==mk)return;var m=p[1],e=AN.d[k];
    if(!(m===md||md.indexOf(m+" ")===0||m.indexOf(md+" ")===0||md.replace(/[\s-]/g,"")===m.replace(/[\s-]/g,"")))return;
    var sc=(kw&&e.kw[kw]?2e6:0)+(kb>=0&&e.kb[kb]?1e6:0)+e.m[0];if(sc>bs){bs=sc;best=m;}});return best;}
function anP(make,model,kw,reg){
  if(!AN||!kw)return null;var mk=String(make).trim().toUpperCase().replace(/\s+/g," "),md=String(model).trim().toUpperCase().replace(/\s+/g," ");
  md=anResolve(mk,md,kw)||md;var e=AN.d[mk+"|"+md];if(!e||!e.x)return null;var kb=Math.floor(kw/10),y=+reg.slice(0,4)+(+reg.slice(5,7)-1)/12,R=[];
  [kb,kb-1,kb+1].forEach(function(b){(e.x[b]||[]).forEach(function(x){var ry=+x[1].slice(0,4)+(+x[1].slice(5,7)-1)/12;
    if(x[5]>0&&Math.abs(ry-y)<=1&&Math.abs(x[0]-kw)<=Math.max(10,kw*0.05))R.push({kw:x[0],d:Math.abs(x[0]-kw),dy:Math.abs(ry-y),p:x[5],x:x});});});
  if(!R.length)return null;R.sort(function(a,b){return a.d-b.d||a.dy-b.dy;});
  var ps=R.map(function(r){return r.p;});
  return{p:R[0].p,lo:Math.min.apply(null,ps),hi:Math.max.apply(null,ps),n:R.length,yr:+R[0].x[1].slice(0,4),kw:R[0].kw,level:"lähin päätös, "+md,tier:"matala",fallback:true,rows:R.map(function(r){return r.x;})};
}
function sameCar(make,model,kw,reg){
  if(!SC||!kw||!reg)return null;var mk=String(make).trim().toUpperCase().replace(/\s+/g," "),md=String(model).trim().toUpperCase().replace(/\s+/g," ");
  var e=SC.d[mk+"|"+md];if(!e||!e[kw]){var m2=anResolve(mk,md,kw);if(m2)e=SC.d[mk+"|"+m2];}
  if(!e||!e[kw])return{none:true};var rm=+reg.slice(0,4)*12+(+reg.slice(5,7)),E=e[kw],T=[["T1",6,3],["T2",12,3],["T3",12,1]];
  for(var t=0;t<T.length;t++){var L=[];Object.keys(E).forEach(function(ym){var y=+ym,xm=Math.floor(y/100)*12+y%100;if(Math.abs(xm-rm)<=T[t][1])E[ym].forEach(function(a){L.push(a);});});
    var n=L.reduce(function(a,b){return a+b[1]},0);if(n<T[t][2])continue;
    L.sort(function(a,b){return a[0]-b[0]});var c=0,med=null;for(var k=0;k<L.length;k++){c+=L[k][1];if(c>=n/2){med=L[k][0]/10;break;}}
    return{p:med,n:n,tier:T[t][0],dm:T[t][1],lo:L[0][0]/10,hi:L[L.length-1][0]/10,e:SC.stat[T[t][0]==="T3"?"T2":T[t][0]]};}
  return{none:true};
}
var EP=null;
function epaLookup(make,model,reg,cc){
  if(!EP||!reg)return null;var mk=String(make).trim().toUpperCase().replace(/\s+/g," "),md=String(model).trim().toUpperCase().replace(/\s+/g," ");
  var mks=[mk];if(mk==="DODGE"&&/^RAM/.test(md))mks.push("RAM");if(mk==="RAM")mks.push("DODGE");
  var best=null,bmk=null;mks.forEach(function(m){var D=EP.d[m];if(!D)return;Object.keys(D).forEach(function(b){var md2=md.replace(/^RAM\s*/,"");
    if((md===b||md.indexOf(b+" ")===0||md2===b||md2.indexOf(b+" ")===0)&&(!best||b.length>best.length)){best=b;bmk=m;}});});
  if(!best)return{none:true};
  var y=+reg.slice(0,4),mo=+reg.slice(5,7),ys=mo>=7?[y,y+1]:[y],L=EP.d[bmk][best].filter(function(r){return ys.indexOf(r[0])>=0&&(!cc||Math.abs(r[1]*1000-cc)<=150);});
  if(!L.length)return{none:true,model:best};
  var vs=L.map(function(r){return r[2]}).sort(function(a,b){return a-b}),lo=vs[0],hi=vs[vs.length-1],med=vs[Math.floor(vs.length/2)],W=reg>="2018-09-01";
  var base={epa:true,lo:lo,hi:hi,n:L.length,wltp:W,t:"",kw:KW(),cc:cc||0,name:bmk+" "+best};
  if(hi-lo<=6)return Object.assign(base,{v:med,variants:L});
  var seen={},opts=[];L.sort(function(a,b){return a[2]-b[2]}).forEach(function(r){var k=r[3]+r[1]+r[4]+r[5]+r[2];if(seen[k])return;seen[k]=1;
    opts.push(Object.assign({},base,{v:r[2],lo:r[2],hi:r[2],n:1,name:r[3]+", "+r[1].toFixed(1).replace(".",",")+" l, "+r[4]+", "+r[5]+" (EPA "+r[0]+")",cc:Math.round(r[1]*1000),y0:r[0],y1:r[0]}));});
  return{choose:opts.slice(0,12),epa:true};
}
function anEst(mk,md,kw,age,kmK,today){
  if(!AN)return null;var e=AN.d[mk+"|"+md];if(!e)return null;
  var kb=kw?Math.floor(kw/10):-1,v,lvl,b;
  if(kw&&e.kw[kw]&&e.kw[kw][0]>=2){v=e.kw[kw];lvl="sama malli ja sama teho ("+kw+" kW)";b=v[0]>=12?"kw12+":v[0]>=4?"kw4-11":"kw2-3";}
  else if(kb>=0&&e.kb[kb]){v=e.kb[kb];lvl="sama malli ja tehoryhmä ("+kb*10+ " – " +(kb*10+9)+" kW)";b=v[0]<=3?"kb1-3":"kb4+";}
  else{v=e.m;lvl="sama malli, eri tehot";b="m";}
  var c=AN.co[e.s],k=kmK/10,t=(today-new Date("2020-01-01T00:00:00Z"))/(365.25*86400000);
  var f=c[0]*age+c[1]*age*age+c[2]*k+c[3]*k*k/10+c[4]*t;
  var ext=Math.max(0,kmK-v[3])/10+Math.max(0,age-v[5]),ex=Math.min(ext,6);
  var lnV=v[1]+f+AN.cal.bias[b]+AN.cal.bias.ext*ex;
  var s=Math.sqrt(Math.pow(AN.cal.s[b],2)+Math.pow(0.03*ex,2));
  return{V:Math.exp(lnV),s:s,lvl:lvl,b:b,n:v[0],ext:ext,kmMin:v[2],kmMax:v[3],ageMin:v[4],ageMax:v[5],med:AN.cal.med[b],rows:(e.x&&kb>=0&&e.x[kb])||null,seg:e.s};
}
function makeAutovero(D){
  var R=D.rates,T=D.tmax,idx={};
  Object.keys(D.g).forEach(function(k){idx[k.toUpperCase()]=D.g[k];});
  var idxW={},idxWF={},idxW3={};if(D.w)Object.keys(D.w).forEach(function(k){idxW[k.toUpperCase()]=D.w[k];});
  if(D.wf)Object.keys(D.wf).forEach(function(k){idxWF[k.toUpperCase()]=D.wf[k];});if(D.w3)Object.keys(D.w3).forEach(function(k){idxW3[k.toUpperCase()]=D.w3[k];});
  function pickG(mk,md,kb,fu,res){var k=mk+"|"+md+"|"+kb;if(kb<0)return null;
    if(fu&&idxWF[k+"|"+fu.toUpperCase()]){res.level="malli, teho ja käyttövoima ("+fu+"), viimeisen 12 kk päätökset";return{g:idxWF[k+"|"+fu.toUpperCase()],wm:true};}
    if(idxW[k]){res.level="malli ja teho, viimeisen 12 kk päätökset";return{g:idxW[k],wm:true};}
    if(idxW3[k]){res.level="malli ja teho, vain "+idxW3[k][0]+" päätöstä viimeisen 12 kk ajalta (tuettu yhteisillä kertoimilla)";return{g:idxW3[k],wm:true,w3:true};}
    if(idx[k]){res.level="malli ja teho";return{g:idx[k],wm:false};}
    return null;}
  function dt(s){return new Date(s+"T00:00:00Z");}
  function cl(c){c=Math.round(c);return Math.max(0,Math.min(359,c));}
  function rate(reg,co2,wltp,ev){
    var d=dt(reg),c=cl(co2),y=d.getUTCFullYear();
    if(ev&&d>=dt("2021-10-01"))return{p:0,src:"täyssähköauto 0 % (käyttöönotto 1.10.2021 tai myöhemmin)"};
    if(co2===0&&d>=dt("2021-10-01"))return{p:0,src:"0 g/km 0 % (laki 1172/2021)"};
    if(wltp){
      if(d>=dt("2019-01-01"))return{p:R.t18[c][1],src:"verotaulukko 1A (WLTP)"};
      if(d>=dt("2018-12-03"))return{p:R.t18[c][0],src:"verotaulukko 1A, laki 1365/2018"};
      if(d>=dt("2018-09-01"))return{p:R.t570_wltp_2018_09_12[c],src:"verotaulukko 1A, laki 570/2018"};
      return{p:null,src:"WLTP-taulukkoa ei ole ennen 1.9.2018 rekisteröidyille autoille"};
    }
    if(y<1958)return{p:0,src:"ennen vuotta 1958 rekisteröidyt: autoveroa ei ole peritty"};
    if(y<2008)return null;
    if(d<dt("2009-04-01"))return{p:R.t08[Math.max(c,60)],src:"verotaulukko 1, laki 1292/2007"};
    if(d<dt("2012-04-01"))return{p:R.t09[Math.max(c,60)],src:"verotaulukko 1, laki 5/2009"};
    if(y<2016)return{p:R.t12[c],src:"verotaulukko 1, laki 1316/2011"};
    return{p:R.t15[c][Math.min(y-2016,3)],src:"verotaulukko 1 (laki 1481/2015, 1172/2021)"};
  }
  function oldRate(i){
    var O=D.old,nm=String(i.make||"").trim().toUpperCase().replace(/\s+/g," ")+" "+String(i.model||"").trim().toUpperCase().replace(/\s+/g," "),y=+i.reg.slice(0,4),p=null,src="";
    if(y<2003){var L=O.pre[nm]||[];for(var k=0;k<L.length;k++)if(L[k][0]<=i.reg&&L[k][1]>=i.reg){p=L[k][2];break;}
      if(p!==null){p=p*O.fPre;src="mallikohtainen vertailuvero (ennen 2003), korjattu todellisten päätösten mukaan";}}
    else{var q=O.mid[nm+"|"+Math.round(i.kw||0)];
      if(q!==undefined){p=q*O.fMid;src="mallikohtainen vertailuvero (2003 – 2007), korjattu todellisten päätösten mukaan";}}
    if(p===null){p=y<2003?19:23;src="mallia ei vertailuveroluettelossa, käytetty tyypillistä efektiivistä prosenttia";return{p:p,src:src,rough:true};}
    return{p:p,src:src};
  }
  function estimate(i){
    var today=new Date(),res={warnings:[]};
    var r=rate(i.reg,i.co2,!!i.wltp,!!i.ev);
    if(r===null){r=oldRate(i);if(r.rough)res.warnings.push("Mallia ei löytynyt vertailuveroluettelosta (tai tehoa ei annettu), joten veroprosentti on karkea. Arvio on epävarma.");res.warnings.push("Ennen 2008 verotettujen autojen vero lasketaan mallikohtaisesta vertailuverosta, ja todellinen vero poikkeaa listasta tyypillisesti noin 5 %, joskus yli 20 %.");}
    if(i.pOv!=null&&!(r&&r.p===0)){r={p:i.pOv,src:i.pSrc};}
    res.p=r.p;res.pSource=r.src;
    if(r.p!==null&&r.p!==0&&i.price>0){res.V=i.price;res.given=true;res.tax=i.price*r.p/100;res.taxLow=res.tax;res.taxHigh=res.tax;res.level="annettu hinta";if(r.rough)res.warnings.push("Veroprosentti on karkea (ennen 2008 rekisteröity auto, mallia ei löytynyt luettelosta).");return res;}
    if(r.p===null){res.error=r.src;return res;}
    if(r.p===0){res.V=null;res.tax=0;res.taxLow=0;res.taxHigh=0;res.level="nolla";return res;}
    var mk=String(i.make||"").trim().toUpperCase().replace(/\s+/g," "),md=String(i.model||"").trim().toUpperCase().replace(/\s+/g," ");
    var kb=i.kw?Math.floor(i.kw/10):-1,g=null,wm=false;
    var w3=false,PG=pickG(mk,md,kb,i.fu,res);if(PG){g=PG.g;wm=PG.wm;w3=!!PG.w3;}
    var age=Math.max(0,(today-dt(i.reg))/(365.25*86400000)),km=i.km/1000;
    if(!g){var md2=anResolve(mk,md,i.kw);if(md2&&md2!==md){res.warnings.push("Mallin nimi tulkittiin Verohallinnon nimeksi "+md2+".");md=md2;
        PG=pickG(mk,md,kb,i.fu,res);if(PG){g=PG.g;wm=PG.wm;w3=!!PG.w3;}}}
    if(!g){var a=anEst(mk,md,i.kw,age,km,today);
      if(a){res.an=a;res.V=a.V;res.s=a.s;res.n=a.n;res.level="lähimmät päätökset: "+a.lvl;res.age=age;res.kmK=km;res.a98=a.ageMax;res.k98=a.kmMax;res.win=false;res.dataEnd=AN.end;
        res.VLow=a.V*Math.exp(-1.28*a.s);res.VHigh=a.V*Math.exp(1.28*a.s);res.tax=a.V*r.p/100;res.taxLow=res.VLow*r.p/100;res.taxHigh=res.VHigh*r.p/100;
        res.warnings.push("Mallia on verotettu harvoin, joten verotusarvo on arvioitu "+a.n+" lähimmästä päätöksestä ("+a.lvl+"). Arvio on epävarmempi kuin yleisillä malleilla.");
        if(a.ext>2)res.warnings.push("Auto on selvästi enemmän ajettu tai vanhempi kuin vertailuautot ("+a.kmMin+ " – " +a.kmMax+" tkm, "+a.ageMin+ " – " +a.ageMax+" v). Arvio ulottuu vertailuaineiston ulkopuolelle.");
        return res;}
      if(idx[mk+"|"+md]){g=idx[mk+"|"+md];res.level="vain malli";res.warnings.push("Tehoa (kW) vastaavia päätöksiä ei löytynyt riittävästi, joten arvio on karkeampi.");}}
    if(!g){res.error="Tätä mallia ei löydy Verohallinnon päätöksistä. Tarkista merkin ja mallin kirjoitusasu (Verohallinnon nimi, esim. CORVETTE) tai syötä verotusarvo hintakenttään.";return res;}
    var t=Math.min((today-dt("2020-01-01"))/(365.25*86400000),T);
    var V,s,a98,k98;
    if(wm){var ne=g[8]||g[0];V=Math.exp(g[1]+g[2]*age+g[3]*age*age+g[4]*km/10);s=w3?(D.w3s||0.13):Math.max(g[5],0.04)*Math.sqrt((ne+5)/Math.max(ne-5,1));a98=g[6];k98=g[7];}
    else{V=Math.exp(g[1]+g[2]*age+g[3]*age*age+g[4]*km/10+g[5]*t);s=Math.max(g[6],0.08)*(res.level==="vain malli"?1.8:1)*Math.sqrt((g[0]+5)/Math.max(g[0]-5,1));a98=g[7];k98=g[8];}
    res.V=V;res.VLow=V*Math.exp(-1.28*s);res.VHigh=V*Math.exp(1.28*s);
    res.tax=V*r.p/100;res.taxLow=res.VLow*r.p/100;res.taxHigh=res.VHigh*r.p/100;
    res.n=g[0];res.s=s;res.age=age;res.kmK=km;res.a98=a98;res.k98=k98;res.win=wm&&!w3;res.w3=w3;res.dataEnd=D.wend||'';
    if(age>a98)res.warnings.push("Auto on vanhempi kuin useimmat vastaavat päätökset, joten arvio on epävarma.");
    if(km>k98)res.warnings.push("Ajokilometrit ovat suuremmat kuin useimmissa vastaavissa päätöksissä, joten arvio on epävarma.");
    return res;
  }
  return{rate:rate,estimate:estimate};
}
function init(d){
  D=d;M=makeAutovero(D);
  var s={};Object.keys(D.g).forEach(function(k){var p=k.split("|");if(!byMake[p[0]]){byMake[p[0]]={};makes.push(p[0]);}byMake[p[0]][p[1]]=1;});
  makes.sort();
  $("makes").innerHTML=makes.map(function(m){return'<option value="'+esc(m)+'">'}).join("");
  $("load").hidden=true;
}
var C2=null,forced=null,TL={B:"bensiini",D:"diesel",HB:"bensiinihybridi (mild/täys, ei ladattava)",HD:"dieselhybridi (mild/täys, ei ladattava)",PB:"lataushybridi (bensiini)",PD:"lataushybridi (diesel)",E:"täyssähkö",G:"kaasu/muu"};
function lookupCo2(make,model,kw,reg,type,cc){
  if(!C2)return null;
  var mk=make.trim().toUpperCase().replace(/\s+/g," "),md=model.trim().toUpperCase().replace(/\s+/g," "),y=+reg.slice(0,4),wf=reg>="2018-09-01",V={},tol=Math.max(3,kw*0.03);
  ["w","n"].forEach(function(b){Object.keys(C2[b]).forEach(function(k){
    var p=k.split("|");if(p[0]!==mk)return;
    if(!(p[1]===md||p[1].indexOf(md+" ")===0||md.indexOf(p[1]+" ")===0))return;
    var vk=p[1]+"|"+p[2]+"|"+p[3]+"|"+p[4];(V[vk]=V[vk]||{name:p[1],t:p[2],kw:+p[3],cc:+p[4]})[b]=C2[b][k];});});
  var all=[];
  Object.keys(V).forEach(function(k){
    var x=V[k];if(type&&x.t!==type&&!(type==="B"&&x.t==="HB")&&!(type==="D"&&x.t==="HD"))return;
    var hyb=x.t.charAt(0)==="H"||x.t.charAt(0)==="P";
    if(!hyb&&kw&&Math.abs(x.kw-kw)>tol)return;
    if(cc>0&&x.cc>0&&Math.abs(x.cc-cc)>cc*0.04)return;
    var v=wf?(x.w||x.n):(x.n||x.w),isW=wf?!!x.w:!x.n;
    if(!v)return;
    if(y<v[4]-1||y>v[5]+1)return;
    all.push({name:x.name,t:x.t,kw:x.kw,cc:x.cc,v:v[0],lo:v[1],hi:v[2],n:v[3],y0:v[4],y1:v[5],wltp:isW,swap:isW!==wf,d:kw?Math.abs(x.kw-kw):0});});
  if(kw){var ex=all.filter(function(a){return a.kw===kw;});if(ex.length)all=ex;}
  all.sort(function(a,b){return b.n-a.n;});
  if(!all.length)return{none:true};
  if(all.length>1){var rest=0;for(var q=1;q<all.length;q++)rest+=all[q].n;if(all[0].n>=5*rest){all[0].dominant=rest;return all[0];}}
  var vs=all.map(function(a){return a.v;}),mx=Math.max.apply(null,vs),mn=Math.min.apply(null,vs);
  if(all.length===1||(mx-mn)<=Math.max(8,mx*0.06))return all[0];
  return{choose:all.slice(0,8)};
}
var PT=null;
function empP(make,model,kw,reg){
  if(!PT||reg<"2012-04-01")return null;
  var yr=+reg.slice(0,4),mk=make.trim().toUpperCase().replace(/\s+/g," "),md=model.trim().toUpperCase().replace(/\s+/g," "),ys=[yr],best=null;
  if(yr>=2019)ys.push(yr-1,yr+1,yr-2);
  function mk2(v,lvl,y,kwu){var sp=v[3]-v[2];return{p:v[1],lo:v[2],hi:v[3],n:v[0],sp:sp,share:v[4],yr:y,kw:kwu,level:lvl,tier:(v[0]>=4&&sp<=0.3)?"korkea":(v[0]>=4&&sp<=1)?"keskitaso":"matala"};}
  for(var a=0;a<ys.length&&!best;a++){
    var c=[];[0,-1,1,-2,2].forEach(function(d){if(!kw)return;var v=PT.kw[mk+"|"+md+"|"+(kw+d)+"|"+ys[a]];if(v)c.push(mk2(v,"malli ja teho",ys[a],kw+d));});
    c.sort(function(x,y){return y.n-x.n;});
    if(c.length)best=c[0];}
  if(!best||best.tier==="matala"){for(var b=0;b<ys.length;b++){var v=PT.m[mk+"|"+md+"|"+ys[b]];if(v&&v[0]>=8){var m=mk2(v,"vain malli",ys[b],0);if(m.tier!=="matala"){best=m;break;}if(!best)best=m;}}}
  return best;
}
var CM=null;
function US(){return $("units").value==="us";}
function KW(){var v=+$("kw").value||0;return Math.round(US()?v*0.7457:v);}
function KM(){var v=+$("km").value||0;return Math.round(US()?v*1.609344:v);}
function MASS(){var v=+$("mass").value||0;return Math.round(US()?v*0.45359:v);}
function CC(){var v=+$("cc").value||0;return v>0&&v<20?Math.round(v*1000):v;}
function applyUnits(){var u=US();$("kwl").textContent=u?"Teho (hp)":"Teho (kW)";$("kml").textContent=u?"Ajomailit (mi)":"Ajokilometrit";$("massl").textContent=u?"Omamassa (lb, valinnainen)":"Omamassa (kg, valinnainen)";}
function estCo2(i){
  if(!CM)return null;
  var m=i.mass>0?CM.m:CM.nm,die=i.die?1:0,W=i.reg>="2019-01-01"?1:0,yr=+i.reg.slice(0,4);
  var x=m.f.map(function(f){return{iskutilavuus:i.cc,suurinNettoteho:i.kw,cyl:i.cyl||(i.cc>4500?8:i.cc>2500?6:4),turbo:i.turbo?1:0,die:die,W:W,yr:yr,mass:i.mass}[f];});
  var s=m.b;
  for(var k=0;k<m.t.length;k++){var t=m.t[k],j=0;for(;;){var n=t[j];if(n[5]){s+=n[4];break;}j=x[n[0]]<=n[1]?n[2]:n[3];}}
  var v=Math.exp(s),q=i.cc>3500?m.q.b:m.q.s;
  return{v:Math.round(v),lo:Math.round(v*Math.exp(q[0])),hi:Math.round(v*Math.exp(q[1])),est:true,wltp:W===1,t:"",withMass:i.mass>0};
}
function updModels(){
  var m=$("make").value.trim().toUpperCase().replace(/\s+/g," "),o=byMake[m]?Object.keys(byMake[m]).sort():[];
  $("models").innerHTML=o.map(function(x){return'<option value="'+esc(x)+'">'}).join("");
}
var lastText="";
function buildReport(r,inp){
  var R={};var p=r.p,V=r.V;
  R.win=!!r.win;R.w3=!!r.w3;R.vero=!!r.vero;R.ownV=r.ownV||null;R.tri=r.tri||null;R.an=r.an||null;R.tax=r.tax;R.p=p;R.pLo=r.pLo!=null?r.pLo:p;R.pHi=r.pHi!=null?r.pHi:p;R.V=V;R.pSource=r.pSource;R.vLevel=r.level;R.n=r.n||null;R.dataEnd=r.dataEnd||"";
  R.warnings=(r.warnings||[]).slice();
  var reasons=[],tips=[],cap=3;/* 0 matala,1 kohtalainen,2 hyvä,3 korkea */
  /* verotusarvon vaihteluvälit */
  if(r.s&&!r.given&&p){var z80=1.28,z95=1.96,z50=0.674;
    R.V50=[V*Math.exp(-z50*r.s),V*Math.exp(z50*r.s)];R.V80=[V*Math.exp(-z80*r.s),V*Math.exp(z80*r.s)];R.V95=[V*Math.exp(-z95*r.s),V*Math.exp(z95*r.s)];
    R.t50=[R.V50[0]*p/100,R.V50[1]*p/100];
    R.t80=[r.taxLow,r.taxHigh];
    R.t95=[R.V95[0]*R.pLo/100,R.V95[1]*R.pHi/100];
    R.tBestWorst=[Math.min(R.t95[0],R.t80[0]),Math.max(R.t95[1],R.t80[1])];}
  else if(r.given&&p){R.tBestWorst=[V*R.pLo/100,V*R.pHi/100];}
  /* luottamus */
  var pTxt;
  if(r.tax===0){reasons.push("Veroprosentti on 0 %, joten vero on varma 0 €.");}
  else{
    if(inp.co2src&&inp.co2src.est){cap=Math.min(cap,1);reasons.push("CO2 on arvio moottorin tiedoista ("+inp.co2src.lo+ " – " +inp.co2src.hi+" g/km), ei auton oma arvo.");tips.push("Syötä auton todellinen CO2-arvo (rekisteriote, COC-todistus tai tyyppihyväksyntä). Se poistaa veroprosentin epävarmuuden.");}
    else if(inp.emp){var t=inp.emp.tier;cap=Math.min(cap,t==="korkea"?3:t==="keskitaso"?2:1);reasons.push("Veroprosentti perustuu "+inp.emp.n+" saman mallin aiempaan päätökseen (luottamus: "+t+"), prosenttien vaihteluväli "+fmtp(inp.emp.lo)+ " – " +fmtp(inp.emp.hi)+" %.");if(t!=="korkea")tips.push("Tarkka CO2-arvo asiakirjoista varmistaisi veroprosentin.");}
    else if(inp.co2src&&inp.co2src.epa){cap=Math.min(cap,1);reasons.push("CO2 USA:n EPA-datasta (CARB-oletus). Veroprosentti osuu testin perusteella tyypillisesti ±2,5 prosenttiyksikön päähän.");tips.push("Varmista katsastajan CARB-laskelman CO2 ennen sitovaa tarjousta.");}
    else if(inp.co2src){var c=inp.co2src;reasons.push("CO2 haettu Traficomin rekisteristä ("+c.n+" autoa, vaihteluväli "+c.lo+ " – " +c.hi+" g/km).");if(c.hi-c.lo>Math.max(10,c.v*0.08)){cap=Math.min(cap,2);tips.push("Saman mallin CO2 vaihtelee versioiden välillä. Tarkista auton oma arvo.");}if(c.dominant)cap=Math.min(cap,2);if(c.t&&(c.t.charAt(0)==="P"||c.t.charAt(0)==="H")){cap=Math.min(cap,2);tips.push("Hybridillä NEDC/WLTP-peruste vaikuttaa prosenttiin. Varmista peruste asiakirjoista.");}}
    else if(inp.mpgCo2){cap=Math.min(cap,1);reasons.push("CO2 laskettu EPA-kulutuksesta (CARB-auton oletus). Menetelmä on päätelty kolmesta USA-autosta, ei Veron julkaisema.");tips.push("Varmista katsastusasemalta CARB-laskelman CO2-arvo ennen sitovaa tarjousta.");}
    else if(inp.massCo2){reasons.push("CO2 laskettu kokonaismassasta (autoverolaki 5 a §), koska päästöarvoa ei ole asiakirjoissa. Testiautossa (Peugeot 2008, 2016) Veron päätös vastasi täsmälleen tätä laskentaa.");}
    else if(inp.reg&&inp.reg<"2008-01-01"){reasons.push("Auto on rekisteröity ennen vuotta 2008, joten CO2:ta ei tarvita. Vero perustuu mallin vertailuveroon.");}
    else{reasons.push("CO2 annettu käsin, veroprosentti luetaan suoraan Verohallinnon taulukosta.");}
    if(r.pSource&&/vertailuvero|karkea|tyypillistä/.test(r.pSource)){cap=Math.min(cap,1);reasons.push("Ennen 2008 rekisteröidyn auton vero perustuu vertailuveroluetteloon. Tämä on epätarkempaa kuin uudemmilla autoilla.");}
    if(r.given){cap=Math.min(cap,1);reasons.push("Verotusarvona on käytetty annettua hintaa. Verohallinto käyttää päätöksessä oman mallinsa arvoa, joka voi poiketa hinnasta.");tips.push("Syötä merkki, malli, teho ja kilometrit, niin verotusarvo arvioidaan Veron päätösdatasta.");}
    else if(r.vero){reasons.push("Verotusarvo on Verohallinnon oma hintatieto (sama malli, jolla Vero tekee päätöksen). Epävarmuutta jää vain siitä, että hinta muuttuu ennen verotuspäivää, ja siitä, vastaavatko syötetyt tiedot (km, ensirekisteröinti, malli) päätöksen tietoja. Välit ovat oletus (±1,5 %), ei mitattu.");}
    else if(r.an){var a=r.an;cap=Math.min(cap,a.b==="kw12+"?2:1);
      reasons.push("Verotusarvo: mallia on verotettu harvoin, joten arvio perustuu "+a.n+" lähimpään päätökseen ("+a.lvl+"). Ne on säädetty tämän auton ikään, kilometreihin ja nykyhetkeen yhteisillä kertoimilla, jotka on laskettu noin 120 000 päätöksestä (hintaluokka: "+a.seg+").");
      reasons.push("Tämän tason menetelmä on testattu takaisin noin 16 000 ennusteella: mediaanivirhe noin "+Math.round(a.med*100)+" %. Välit on kalibroitu samasta testistä.");
      if(a.ext>2){cap=0;reasons.push("Auto on selvästi vertailuautojen ulkopuolella ("+a.kmMin+ " – " +a.kmMax+" tkm, "+a.ageMin+ " – " +a.ageMax+" v). Tällaisissa tapauksissa virhe oli testissä noin kaksinkertainen, ja väli on levennetty.");}
      tips.push("Tarkista kW-arvo tarkasti: sama teho kuin vertailupäätöksissä tarkentaa arviota eniten.");}
    else if(r.w3){cap=Math.min(cap,1);reasons.push("Verotusarvo: vain "+r.n+" saman mallin ja tehoryhmän päätöstä viimeisen 12 kk ajalta. Arvio käyttää niitä, mutta iän ja kilometrien vaikutus on tuettu yhteisillä kertoimilla. Takaisintestissä (noin 2 500 ennustetta) mediaanivirhe oli noin 7 %, kun vanhalla menetelmällä se oli noin 10 %.");}
    else if(r.n!=null){if(r.win&&r.n>=30)reasons.push("Verotusarvo: "+r.n+" saman mallin ja tehoryhmän päätöstä viimeiseltä 12 kuukaudelta (aineisto päättyy "+(r.dataEnd||"?")+").");
      else if(r.win){cap=Math.min(cap,2);reasons.push("Verotusarvo: vain "+r.n+" päätöstä viimeiseltä 12 kuukaudelta, joten arvio on herkempi.");}
      else if(r.level==="vain malli"){cap=Math.min(cap,1);reasons.push("Verotusarvo on arvioitu koko mallin päätöksistä, ilman tehoryhmää ("+r.n+" päätöstä).");tips.push("Tarkista kW-arvo. Tehoryhmän päätökset tarkentaisivat arviota.");}
      else{cap=Math.min(cap,2);reasons.push("Verotusarvo: "+r.n+" päätöstä koko aineistosta (ei tarpeeksi viimeiseltä 12 kuukaudelta), mukana aikatrendi.");}
      reasons.push("Verotusarvon hajonta mallissa: noin ±"+Math.round(r.s*100)+" % (1 keskihajonta).");
      if(r.age>r.a98){cap=Math.min(cap,1);reasons.push("Auto on vanhempi kuin 98 % vastaavista päätöksistä ("+r.a98.toFixed(1)+" v). Arvio ulottuu aineiston reunalle.");}
      if(r.kmK>r.k98){cap=Math.min(cap,1);reasons.push("Kilometrit ovat suuremmat kuin 98 %:ssa vastaavista päätöksistä ("+Math.round(r.k98)+" tkm).");}
      if(r.kmK<2&&r.age>2){cap=Math.min(cap,2);reasons.push("Ajokilometrit ovat tavallista pienemmät. Vero käsittelee tällaisen auton usein keskimääräistä arvokkaampana.");}
      if(!inp.price)tips.push("Anna ilmoitushinta, niin laskuri vertaa sitä mallin arvioon ja varoittaa isosta erosta.");}
    if(inp.ev||(inp.co2===0&&!inp.pOv)){reasons.push("Sähköauton verotusarvo riippuu myös akun koosta, jota Verohallinnon aineistossa ei ole. Saman mallin ja tehon autoilla voi olla eri akku, jolloin yksittäinen auto voi poiketa välistä.");tips.push("Anna akun koko tai tarkka versio. Se tarkentaa sähköauton verotusarvoa.");}
    var w=R.tBestWorst&&r.tax>0?(R.tBestWorst[1]-R.tBestWorst[0])/2/r.tax:0;R.halfWidth=w;
    var lvl=w<=0.10?3:w<=0.20?2:w<=0.35?1:0;lvl=Math.min(lvl,cap);R.level=lvl;}
  if(r.tax===0)R.level=3;
  R.levelName=["Matala","Kohtalainen","Hyvä","Korkea"][R.level];
  R.reasons=reasons;R.tips=tips;
  /* herkkyydet */
  R.sens={};
  try{if(!r.given&&r.tax>0&&inp.make&&inp.model){var e2=M.estimate(Object.assign({},inp,{km:inp.km+10000,price:0}));if(!e2.error)R.sens.km10k=e2.tax-r.tax;}
    if(r.tax>0&&!inp.pOv&&inp.co2>0){var e3=M.estimate(Object.assign({},inp,{co2:inp.co2+10,price:r.given?inp.price:0}));if(!e3.error)R.sens.co2p10=e3.tax-r.tax;}}catch(x){}
  /* ilmoitushinta */
  if(inp.price>0&&V&&!r.given){R.listPrice=inp.price;R.vsPrice=V/inp.price-1;}
  return R;
}
function reportHtml(R){
  var bar='<span class="lvl l'+R.level+'">'+R.levelName+' luottamus</span>';
  var h='<details class="rep" open><summary>Tarkkuusraportti '+bar+'</summary>';
  if(R.tax===0)h+='<p>'+esc(R.reasons[0])+'</p>';
  else{
    if(R.tBestWorst){h+='<table><tr><td>Odotettu vero<small>'+(R.V80?'Mallin paras arvio':'Laskettu annetusta hinnasta')+'</small></td><td>'+fmt(R.tax)+' €</td></tr>';
      if(R.t50)h+='<tr><td>Todennäköinen väli (50 %)<small>Puolet vastaavista päätöksistä osuu tälle välille</small></td><td>'+fmt(R.t50[0])+ ' – ' +fmt(R.t50[1])+' €</td></tr>';
      if(R.t80)h+='<tr><td>Luotettava väli (80 %)<small>Verotusarvo '+fmt(R.V80[0])+ ' – ' +fmt(R.V80[1])+' €'+(R.pHi>R.pLo+0.05?', veroprosentti huomioiden CO2:n epävarmuus':'')+'</small></td><td>'+fmt(R.t80[0])+ ' – ' +fmt(R.t80[1])+' €</td></tr>';
      var pt=R.pHi>R.pLo+0.05?'veroprosentti '+fmtp(R.pLo)+ ' – ' +fmtp(R.pHi)+' %':'veroprosentti '+fmtp(R.p)+' %';
      if(R.V95)h+='<tr><td>Paras ja pahin tapaus<small>Verotusarvo '+fmt(R.V95[0])+ ' – ' +fmt(R.V95[1])+' € (95 %), '+pt+'</small></td><td>'+fmt(R.tBestWorst[0])+ ' – ' +fmt(R.tBestWorst[1])+' €</td></tr>';
      else if(R.pHi>R.pLo+0.05)h+='<tr><td>Paras ja pahin tapaus<small>Verotusarvo annettu hinta, '+pt+'</small></td><td>'+fmt(R.tBestWorst[0])+ ' – ' +fmt(R.tBestWorst[1])+' €</td></tr>';
      else h+='<tr><td>Vaihteluväli<small>Ei laskettavissa: verotusarvoksi on oletettu annettu hinta. Verohallinnon oma arvo voi olla eri, tyypillisesti muutamia prosentteja.</small></td><td>–</td></tr>';
      h+='</table>';}
    h+='<h3>Mihin arvio perustuu</h3><ul>'+R.reasons.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>';
    if(R.an&&R.an.rows){h+='<h3>Vertailupäätökset (uusimmat)</h3><div style="overflow-x:auto"><table><tr><td><small>Teho · ensirek. · päätös · km</small></td><td><small>Verotusarvo · vero-%</small></td></tr>'+R.an.rows.slice().reverse().map(function(x){return'<tr><td>'+x[0]+' kW · '+x[1]+' · '+x[2]+' · '+fmt(x[3]*1000)+' km</td><td>'+fmt(x[4])+' € · '+fmtp(x[5])+' %</td></tr>'}).join('')+'</table></div>';}
    if(R.pSource)h+='<p class="m">Veroprosentin lähde: '+esc(R.pSource)+' → '+fmtp(R.p)+' %.</p>';
    var sn=[];if(R.sens.km10k!=null)sn.push('+10 000 km ajokilometreissä muuttaisi veroa noin '+(R.sens.km10k>=0?'+':'−')+fmt(Math.abs(R.sens.km10k))+' €');
    if(R.sens.co2p10!=null)sn.push('+10 g/km CO2:ssa muuttaisi veroa noin '+(R.sens.co2p10>=0?'+':'−')+fmt(Math.abs(R.sens.co2p10))+' €');
    if(sn.length)h+='<h3>Herkkyys</h3><ul>'+sn.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>';
    if(R.vsPrice!=null)h+='<p class="m">Verotusarvon arvio on '+(R.vsPrice>=0?'+':'−')+Math.round(Math.abs(R.vsPrice)*100)+' % ilmoitushinnasta ('+fmt(R.listPrice)+' €). Verohallinto vähentää ilmoitushinnoista tyypillisesti 3 – 15 %.</p>';
    if(R.tips.length)h+='<h3>Mikä tarkentaisi arviota</h3><ul>'+R.tips.map(function(x){return'<li>'+esc(x)+'</li>'}).join('')+'</ul>';
    h+='<h3>Menetelmän tarkkuus</h3><p class="m">'+(R.w3?'Vähän päätöksiä: ryhmän omat päätökset, ikä- ja kilometrivaikutus tuettu yhteisillä kertoimilla. Takaisintestissä mediaanivirhe noin 7 % ja 80 % alle noin 17 %; väli on kalibroitu tämän mukaan.':R.vero?'Verotusarvo on Verohallinnon hintatietopalvelusta, joten verotusarvon arviointivirhettä ei ole.':R.an?'Harvinaisen mallin arvio: lähimmät päätökset säädettynä yhteisillä kertoimilla. Kertoimet ja välit on kalibroitu takaisintestissä, jossa jokainen päätös ennustettiin vain sitä edeltävillä päätöksillä (11/2025 – 10/2026).':R.win?'Tämä arvio käyttää viimeisen 12 kuukauden päätöksiä, joissa uusimmat painavat eniten (puoliintumisaika 3 kk). Menetelmä on testattu neljällä erillisellä jaksolla (8/2025 – 10/2026, noin 12 700 päätöstä, malli sovitettu vain testijaksoa edeltäviin päätöksiin): verotusarvon mediaanivirhe oli 3,9 – 4,0 %, ja 80 %:n välille osui 79 – 83 % ja 95 %:n välille 92 – 95 % todellisista päätöksistä.':(R.V80?'Tämä arvio käyttää koko aineiston mallia, koska viimeiseltä 12 kuukaudelta ei ollut tarpeeksi päätöksiä. Tämän tason välien osumatarkkuutta ei ole erikseen mitattu, ja välit on tarkoituksella tehty leveämmiksi.':'Verotusarvo on annettu, joten tarkkuus riippuu siitä, vastaako hinta Verohallinnon omaa arvoa.'))+' Verohallinnon lopullinen päätös perustuu aina sen omaan verotusarvoon.</p>';}
  h+='<details class="json"><summary>Koneluettava raportti (JSON)</summary><pre id="repjson"></pre></details></details>';
  return h;
}
function show(r,inp){
  var o=$("out");
  if(r.error){o.innerHTML='<h2>Tulos</h2><div class="note b">'+esc(r.error)+'</div>'+(r.p!==null&&r.p!==undefined?'<p>Veroprosentti: <strong>'+fmtp(r.p)+' %</strong> ('+esc(r.pSource)+')</p>':'');lastText="";return;}
  var rows='<tr><td>Veroprosentti<small>'+esc(r.pSource)+'</small></td><td>'+fmtp(r.p)+' %</td></tr>';
  if(r.given)rows+='<tr><td>Yleinen myyntihinta<small>Annettu hinta</small></td><td>'+fmt(r.V)+' €</td></tr>';
  else if(r.V!=null)rows+='<tr><td>Verotusarvo (arvio)<small>Vastaavien päätösten perusteella, '+r.n+' päätöstä ('+esc(r.level)+')</small></td><td>'+fmt(r.V)+' €<small>'+fmt(r.VLow)+ ' – ' +fmt(r.VHigh)+' €</small></td></tr>';
  if(inp&&inp.co2src&&inp.co2src.est){var e=inp.co2src;rows='<tr><td>CO2-arvo (arvio moottorin tiedoista, EI rekisteriarvo)<small>Vaihteluväli '+e.lo+ ' – ' +e.hi+' g/km, '+(e.wltp?'WLTP':'NEDC')+'-oletus'+(e.withMass?', omamassa mukana':'')+'. Vahvistettava ennen tarjousta.</small></td><td>'+e.v+' g/km</td></tr>'+rows;
    (r.warnings=r.warnings||[]).push("CO2-arvo on arvio rekisterin vastaavista autoista, ei auton oma arvo. Vero voi poiketa tuntuvasti. Todellinen arvo määräytyy yksittäishyväksynnässä.");}
  else if(inp&&inp.co2src&&inp.co2src.epa){var c=inp.co2src;rows='<tr><td>CO2-arvo (USA:n EPA, CARB-oletus)<small>'+esc(c.name)+', '+c.n+' EPA-versio'+(c.n>1?'ta':'')+(c.hi>c.lo?', vaihteluväli '+c.lo+ ' – ' +c.hi+' g/km':'')+'. EPA:n yhdistetty CO2 (g/mailia ÷ 1,609), '+(c.wltp?'WLTP':'NEDC')+'-taulukolla.</small></td><td>'+c.v+' g/km</td></tr>'+rows;
    (r.warnings=r.warnings||[]).push("CO2 on USA:n EPA:n arvo (fueleconomy.gov). Oletus: katsastaja tekee CARB-laskelman, joka vastaa EPA:n arvoa. Testissä 364 USA-mallin Veron päätöksellä (Challenger, Charger, Camaro, Corvette ym.) EPA-arvo antoi veroprosentin tyypillisesti noin 2,5 prosenttiyksikön tarkkuudella ja keskimäärin noin 1 prosenttiyksikön liian suureksi (varovainen suunta). Jos CARB-laskelmaa ei tehdä, Vero laskee CO2:n kokonaismassasta.");}
  else if(inp&&inp.co2src){var c=inp.co2src;rows='<tr><td>CO2-arvo (haettu Traficomin rekisteristä)<small>'+esc(c.name)+', '+(TL[c.t]||'')+', '+(c.cc?c.cc+' cm³, ':'')+c.kw+' kW, '+c.n+' rekisteröityä autoa, vaihteluväli '+c.lo+ ' – ' +c.hi+' g/km, '+(c.wltp?'WLTP':'NEDC')+'</small></td><td>'+c.v+' g/km</td></tr>'+rows;
    if(c.t.charAt(0)==="P"||c.t.charAt(0)==="H"){var ar=M.rate(inp.reg,inp.co2,!inp.wltp,inp.ev);
      if(ar&&ar.p!=null&&r.p!=null&&Math.abs(ar.p-r.p)>0.05){var base=r.given?r.V:r.V,at=base*ar.p/100;
        (r.warnings=r.warnings||[]).push("Hybridin CO2-peruste (NEDC/WLTP) vaikuttaa veroprosenttiin. Rekisterin mukaan peruste on "+(c.wltp?"WLTP":"NEDC")+" ("+fmtp(r.p)+" %). Jos auton asiakirjoissa peruste onkin "+(c.wltp?"NEDC":"WLTP")+", prosentti on "+fmtp(ar.p)+" % ja vero noin "+fmt(at)+" €. Tarkista peruste rekisteriotteesta tai ilmoituksesta.");}}
    if(c.dominant)(r.warnings=r.warnings||[]).push("Rekisterissä on samalle mallille ja teholle myös muita versioita ("+c.dominant+" autoa), joilla CO2 on eri. Valittu yleisin versio. Tarkista CO2 auton asiakirjoista.");
    if(c.swap)(r.warnings=r.warnings||[]).push("CO2-arvo löytyi vain toisella mittaustavalla (WLTP/NEDC) kuin rekisteröintipäivä edellyttäisi. Tarkista arvo.");
    if(c.hi-c.lo>Math.max(10,c.v*0.08))(r.warnings=r.warnings||[]).push("Saman mallin CO2-arvot vaihtelevat ("+c.lo+ " – " +c.hi+" g/km), esim. renkaiden tai varustelun takia. Tarkista oikea arvo rekisteriotteesta tai tyyppihyväksynnästä.");}
  if(r.cmp&&!r.cmp.error&&r.cmp.tax!=null&&!r.given)rows+='<tr><td>Vertailu: vero ilmoitushinnasta<small>'+fmt(inp.price)+' € × '+fmtp(r.cmp.p)+' %, Verohallinnon laskurin tapa. Oikea päätös käyttää Veron mallin arvoa.</small></td><td>'+fmt(r.cmp.tax)+' €</td></tr>';
  var warn=(r.warnings||[]).map(function(w){return'<div class="note w">'+esc(w)+'</div>'}).join("");
  var head=null;
  if(r.tax>0&&!r.given&&r.V!=null){var vm=Math.round(0.674*(r.s||0.06)*1000)/10,v80=Math.round(1.28*(r.s||0.06)*1000)/10,e1m=vm,e180=v80;
    if(r.pHi>r.pLo+0.05){var pr=(r.pHi-r.pLo)/2/r.p;e1m=Math.round(Math.sqrt(vm*vm+Math.pow(pr*67,2))*10)/10;e180=Math.round(Math.sqrt(v80*v80+Math.pow(pr*128,2))*10)/10;}
    var S=r.same,has2=S&&!S.none,t2=has2?r.V*S.p/100:null,av=has2&&!inp.massCo2,t3=av?(r.tax+t2)/2:r.tax,pe=has2?(S.hi-S.lo<0.05?[0,0]:S.e):null;
    var e2m=has2?Math.round(Math.sqrt(vm*vm+pe[0]*pe[0])*10)/10:null,e280=has2?Math.round(Math.sqrt(v80*v80+pe[1]*pe[1])*10)/10:null;
    var e3m=av?Math.round((e1m+e2m)/2*10)/10:e1m,e380=av?Math.round((e180+e280)/2*10)/10:e180;
    function F(x){return String(x).replace(".",",")}
    r.tri={V:r.V,r1:r.tax,p1:r.p,r1e:[e1m,e180],r2:t2,p2:has2?S.p:null,r2n:has2?S.n:0,r2e:has2?[e2m,e280]:null,r3:t3,r3e:[e3m,e380]};
    var pSrc1=inp.pOv!=null?'veroprosentti aiemmista päätöksistä, koska CO2 ei ollut tiedossa':(inp.co2src&&inp.co2src.est?'CO2 arvioitu moottorin tiedoista':inp.co2src&&inp.co2src.epa?'CO2 USA:n EPA-datasta ('+inp.co2src.v+' g/km, CARB-oletus)':inp.co2src?'CO2 Traficomin rekisteristä ('+inp.co2src.v+' g/km)':'CO2 '+inp.co2+' g/km')+', Verohallinnon CO2-taulukko';
    head='<div class="tri"><p class="m3">Verotusarvo kaikilla riveillä on '+(r.vero?'Verohallinnon hintatieto':'laskurin arvio')+' <b>'+fmt(r.V)+' €</b> ('+esc(r.level||'')+', heitto ±'+F(vm)+' %, 80 % alle ±'+F(v80)+' %'+(r.vero?', oletus hinnan muutoksesta ennen verotusta':'')+').'+(r.vero&&r.ownV?' Laskurin oma arvio olisi ollut '+fmt(r.ownV)+' €.':'')+' Rivit eroavat vain veroprosentin lähteeltä.</p>'
     +'<div class="tr"><div><b>1. CO2-taulukon veroprosentti</b><small>'+fmt(r.V)+' € × '+fmtp(r.p)+' % ('+esc(pSrc1)+'). Sama laskutapa kuin Verohallinnon laskurissa.</small><small class="he">Heitto: puolet tapauksista ±'+F(e1m)+' %, 80 % alle ±'+F(e180)+' %</small></div><div class="v">'+fmt(r.tax)+' €</div></div>'
     +(has2?'<div class="tr"><div><b>2. Saman auton päätösten veroprosentti</b><small>'+fmt(r.V)+' € × '+fmtp(S.p)+' %. Mediaani '+S.n+' päätöksestä: sama malli, sama teho ('+inp.kw+' kW), ensirekisteröinti ±'+S.dm+' kk. '+(S.hi-S.lo<0.05?'Kaikissa sama prosentti.':'Prosentit '+fmtp(S.lo)+ ' – ' +fmtp(S.hi)+' %.')+(S.tier==="T3"?' Vain '+S.n+' päätös'+(S.n>1?'tä':'')+', joten luotettavuus on heikompi.':'')+'</small><small class="he">Heitto: puolet tapauksista ±'+F(e2m)+' %, 80 % alle ±'+F(e280)+' %</small></div><div class="v">'+fmt(t2)+' €</div></div>'
       :'<div class="tr"><div><b>2. Saman auton päätösten veroprosentti</b><small>Ei päätöksiä samalla mallilla ja teholla ('+(inp.kw||'?')+' kW), joiden ensirekisteröinti on ±12 kk.</small></div><div class="v">–</div></div>')
     +'<div class="tr big3"><div><b>3. '+(av?'Keskiarvo (1 ja 2)':'Lopullinen arvio (vain rivi 1)')+'</b>'+(inp.massCo2?'<small>Rivi 2 ei koske tätä autoa: muiden autojen prosentit perustuvat niiden omiin CO2-arvoihin, mutta tämän auton CO2 lasketaan kokonaismassasta.</small>':'')+'<small class="he">Heitto: puolet tapauksista ±'+F(e3m)+' %, 80 % alle ±'+F(e380)+' %</small></div><div class="v">'+fmt(t3)+' €</div></div>'
     +'</div>'
     +(has2&&!inp.massCo2&&Math.abs(r.p-S.p)>0.5&&Math.abs(r.p/S.p-1)>0.1?'<div class="note w">Veroprosentit eroavat: CO2-taulukosta '+fmtp(r.p)+' %, saman auton päätöksistä '+fmtp(S.p)+' %. Tämä viittaa yleensä väärään CO2-arvoon, eri moottoriversioon tai hybridin NEDC/WLTP-perusteeseen. Tarkista CO2 auton asiakirjoista.</div>':'')
     +'<p class="m3">Takaisintestissä (noin 12 500 päätöstä 8/2025 – 10/2026, verotusarvo arvioitu vain aiemmista päätöksistä): rivi 1 oikealla CO2:lla heitti 3,9 %, rivi 2 4,6 % ja keskiarvo 4,3 % (mediaani). Saman auton päätösten prosentti osui täsmälleen oikeaan 60 %:ssa tapauksista.</p>';}
  if(!head)head=r.tax===0?'<div class="big">0 €</div><div class="range">Autovero on 0 %.</div>':'<div class="big">'+fmt(r.tax)+' €</div><div class="range">'+(r.given&&!r.co2range?'Laskettu annetusta hinnasta. Verohallinto voi päätöksessään käyttää eri verotusarvoa.':(r.given?'Laskettu annetusta hinnasta, vaihteluväli veroprosentin epävarmuuden mukaan ':'Arvio, vaihteluväli ')+fmt(r.taxLow)+ ' – ' +fmt(r.taxHigh)+' €')+'</div>';
  var RP=buildReport(r,inp||{});window.xautoReport=RP;
  o.innerHTML='<h2>Autovero</h2>'+head+'<table>'+rows+'</table>'+warn+reportHtml(RP)+'<div class="actions"><button class="btn" type="button" id="copy">Kopioi erittely</button></div><p class="status" id="cs" role="status"></p>';
  try{var pj=$("repjson");if(pj)pj.textContent=JSON.stringify(RP,function(k,v){return typeof v==="number"?Math.round(v*1000)/1000:v},1);}catch(x){}
  lastText=(inp&&inp.co2src?"CO2: "+inp.co2src.v+" g/km ("+(inp.co2src.est?"ARVIO "+inp.co2src.lo+ " – " +inp.co2src.hi+", vahvistettava":"Traficom, "+inp.co2src.n+" autoa")+")\n":"")+"Autovero"+(r.given&&!r.co2range?"": " (arvio)")+": "+(r.tax===0?"0 €":fmt(r.tax)+" €"+(r.given&&!r.co2range?"":" (vaihteluväli "+fmt(r.taxLow)+ " – " +fmt(r.taxHigh)+" €)"))+"\nVeroprosentti: "+fmtp(r.p)+" % ("+r.pSource+")"+(r.given?"\nYleinen myyntihinta: "+fmt(r.V)+" €":r.V!=null?"\nVerotusarvo (arvio): "+fmt(r.V)+" €":"");
  if(r.tri)lastText="Verotusarvo (arvio): "+fmt(r.tri.V)+" €\n1. CO2-taulukon prosentti "+fmtp(r.tri.p1)+" %: "+fmt(r.tri.r1)+" € (heitto ±"+r.tri.r1e[0]+" %, 80 %: ±"+r.tri.r1e[1]+" %)\n2. Saman auton päätösten prosentti: "+(r.tri.r2!=null?fmtp(r.tri.p2)+" %: "+fmt(r.tri.r2)+" € ("+r.tri.r2n+" päätöstä, heitto ±"+r.tri.r2e[0]+" %)":"ei päätöksiä")+"\n3. "+(r.tri.r2!=null?"Keskiarvo":"Lopullinen arvio")+": "+fmt(r.tri.r3)+" € (heitto ±"+r.tri.r3e[0]+" %, 80 %: ±"+r.tri.r3e[1]+" %)\n"+lastText;
  $("copy").addEventListener("click",function(){
    var cs=$("cs");
    function fb(){var ta=document.createElement("textarea");ta.value=lastText;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");cs.textContent="Kopioitu.";}catch(e){cs.textContent="Kopiointi ei onnistunut. Valitse teksti käsin.";}document.body.removeChild(ta);}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(lastText).then(function(){cs.textContent="Kopioitu."},fb);}else fb();
  });
}
function calc(e){
  if(e)e.preventDefault();
  if(!M){$("out").innerHTML='<div class="note b">Aineisto ei ole vielä latautunut.</div>';return;}
  var reg=$("reg").value,co2=$("co2").value,km=$("km").value;
  var todayS=new Date().toISOString().slice(0,10);
  if(reg&&reg>todayS){$("out").innerHTML='<h2>Tulos</h2><div class="note w">Ensirekisteröintipäivä on tulevaisuudessa. Tarkista päivämäärä.</div>';return;}
  if(+$("km").value<0||+$("price").value<0){$("out").innerHTML='<h2>Tulos</h2><div class="note w">Kilometrit ja hinta eivät voi olla negatiivisia.</div>';return;}
  var old=reg&&reg<"2008-01-01",hasP=+$("price").value>0;
  var needCo2=co2===""&&!old;
  if(!reg||(needCo2&&(!$("make").value.trim()||!$("model").value.trim()))||(!hasP&&(!$("make").value.trim()||!$("model").value.trim()||km===""))){$("out").innerHTML='<h2>Tulos</h2><div class="note w">Täytä ensirekisteröintipäivä. Jos CO2-arvoa ei ole, täytä myös merkki ja malli (sekä teho ja voimansiirto), niin arvo haetaan Traficomin rekisteristä. Lisäksi tarvitaan joko myyntihinta tai merkki, malli ja ajokilometrit.</div>';return;}
  var co2src=null,basisW=$("basis").value==="wltp",massCo2=null,mpgCo2=null;
  var mpg=+$("mpg").value||0;
  if(mpg>0&&co2===""&&!$("noco2").checked&&!$("ev").checked){var dz=$("ptype").value==="D"||$("ptype").value==="HD";var mc2=Math.round((dz?10180:8887)/(mpg*1.609344));
    mpgCo2={v:mc2,mpg:mpg};co2=String(mc2);needCo2=false;basisW=reg>="2018-09-01";}
  if($("noco2").checked){var gm=+$("gmass").value||0;if(US()&&gm>0)gm=Math.round(gm*0.45359);
    if(!(gm>0)){$("out").innerHTML='<h2>Tulos</h2><div class="note w">Kun CO2-arvoa ei ole asiakirjoissa, Vero laskee sen kokonaismassasta. Täytä kokonaismassa (Moottorin tiedot -osiossa).</div>';return;}
    var base=$("ptype").value==="D"||$("ptype").value==="HD"?gm*0.1109-49.8028:gm*0.1109-5.1164,ratio=KW()/gm;
    var mc=Math.round(base*(ratio>=0.15?1.5:1));massCo2={v:mc,gm:gm,ratio:ratio,mult:ratio>=0.15};co2=String(mc);needCo2=false;$("co2").value=mc;basisW=false;}
  if(reg<"2018-09-01")basisW=false;
  var emp=null,usedEmp=false,xr=null;
  if(needCo2&&!forced&&!$("ev").checked){emp=empP($("make").value,$("model").value,KW(),reg);
    if(emp&&emp.tier!=="matala"&&!US()){usedEmp=true;var L0=lookupCo2($("make").value,$("model").value,KW(),reg,$("ptype").value,CC());if(L0&&!L0.none&&!L0.choose&&!L0.alt&&!L0.est)xr=L0;}}
  if(forced){co2src=forced;forced=null;co2=co2src.v;basisW=co2src.wltp;needCo2=true;}
  else if(usedEmp){co2="100";basisW=false;}
  else if(needCo2){co2src=null;
    if(US()&&!$("ev").checked){var ep=epaLookup($("make").value,$("model").value,reg,CC());if(ep&&!ep.none)co2src=ep;}
    if(!co2src)co2src=lookupCo2($("make").value,$("model").value,KW(),reg,$("ptype").value,CC());
    if((!co2src||co2src.none)&&!$("ev").checked){var ep2=epaLookup($("make").value,$("model").value,reg,CC());if(ep2&&!ep2.none)co2src=ep2;}
    if((!co2src||co2src.none)&&CC()>0&&KW()>0&&["HB","HD","PB","PD"].indexOf($("ptype").value)<0){
      var es=estCo2({cc:CC(),kw:KW(),cyl:+$("cyl").value||0,turbo:$("turbo").checked,die:$("ptype").value==="D",mass:MASS(),reg:reg});
      if(es)co2src=es;}
    if(!co2src||co2src.none){var ep=emp||anP($("make").value,$("model").value,KW(),reg);
      if(ep){emp=ep;usedEmp=true;co2="100";basisW=false;co2src=null;emp.fallback=true;}}
    if(!usedEmp&&(!co2src||co2src.none)){$("out").innerHTML='<h2>Tulos</h2><div class="note b">CO2-arvoa ei löytynyt Traficomin rekisteristä tälle merkille, mallille ja teholle'+($("ptype").value?' valitulla voimansiirrolla':'')+' (esim. USA-malli ilman EU-versiota). Syötä CO2-arvo käsin tai täytä alla olevat moottorin tiedot (iskutilavuus ja teho), niin CO2 arvioidaan.</div>';return;}
    if(co2src&&co2src.choose){var el=co2src.choose;$("out").innerHTML='<h2>Valitse oikea versio</h2><div class="note w">'+(co2src.epa?'USA:n EPA-datassa on useita versioita (moottori, vaihteisto, veto), joiden CO2 eroaa. Valitse auton versio ilmoituksen tai ikkunatarran mukaan:':'Rekisterissä on useita versioita, joiden CO2 eroaa. Valitse auton versio (tarkista rekisteriotteesta tai ilmoituksesta):')+'</div><div class="actions" style="flex-direction:column;align-items:stretch">'+el.map(function(a,i){return'<button type="button" class="btn pick" data-i="'+i+'" style="text-align:left;height:auto;padding:8px 12px">'+esc(a.name+', '+(TL[a.t]||a.t)+', '+(a.cc?a.cc+' cm³, ':'')+a.kw+' kW')+'<br><small>'+a.v+' g/km ('+(a.wltp?'WLTP':'NEDC')+')'+(a.epa?', EPA-arvo':', '+a.n+' autoa, rekisteröity '+a.y0+ ' – ' +a.y1)+'</small></button>';}).join("")+'</div>';
      Array.prototype.forEach.call($("out").querySelectorAll(".pick"),function(bt){bt.addEventListener("click",function(){forced=el[+bt.getAttribute("data-i")];calc();});});return;}
    if(co2src){co2=co2src.v;basisW=co2src.wltp;}}
  var inp={fu:({B:"Bensiini",D:"Diesel",HB:"Bensiini ja sähkö",PB:"Bensiini ja sähkö",HD:"Diesel ja sähkö",PD:"Diesel ja sähkö"})[$("ptype").value]||"",mpgCo2:mpgCo2,massCo2:massCo2,co2src:co2src,make:$("make").value,model:$("model").value,kw:KW(),reg:reg,km:KM(),co2:+co2||0,price:+$("price").value||0,wltp:basisW,ev:$("ev").checked,emp:usedEmp?emp:null,empInfo:(!usedEmp&&emp)?emp:null,pOv:usedEmp?emp.p:null,pSrc:usedEmp?("Verohallinnon aiemmat päätökset: "+emp.n+" päätöstä ("+emp.level+(emp.kw?", "+emp.kw+" kW":"")+", rekisteröity "+emp.yr+"), luottamus "+emp.tier):null};
  var res,hasMM=inp.make.trim()&&inp.model.trim();
  if(inp.price>0&&hasMM){var rn=M.estimate(Object.assign({},inp,{price:0}));
    if(!rn.error){res=rn;res.cmp=M.estimate(inp);
      if(res.V&&Math.abs(res.V/inp.price-1)>0.25)res.warnings.push("Verotusarvon arvio ("+fmt(res.V)+" €) poikkeaa ilmoitushinnasta yli 25 %. Tarkista merkki, malli, teho, ensirekisteröinti ja kilometrit.");}
    else{res=M.estimate(inp);res.warnings.push("Mallin verotusarvoa ei voitu arvioida ("+rn.error+") joten tulos on laskettu annetusta hinnasta. Verohallinnon päätös voi poiketa.");}}
  else res=M.estimate(inp);
  if(co2src&&co2src.est&&!res.error&&res.p!==0){var a=M.estimate(Object.assign({},inp,{co2:co2src.lo})),b=M.estimate(Object.assign({},inp,{co2:co2src.hi}));
    if(!a.error&&!b.error){res.co2range=true;res.taxLow=Math.min(res.taxLow,a.taxLow,b.taxLow);res.taxHigh=Math.max(res.taxHigh,a.taxHigh,b.taxHigh);}}
  if(inp.emp&&inp.emp.fallback&&!res.error)res.warnings.push("CO2-arvoa ei löytynyt Traficomin rekisteristä tälle teholle (todennäköisesti USA-malli). Veroprosentti on otettu lähimmästä saman mallin Verohallinnon päätöksestä ("+inp.emp.kw+" kW, rekisteröity "+inp.emp.yr+": "+fmtp(inp.emp.p)+" %)"+(inp.emp.hi>inp.emp.lo?". Lähellä olevissa päätöksissä prosentti vaihtelee "+fmtp(inp.emp.lo)+ " – " +fmtp(inp.emp.hi)+" %, mikä voi johtua varustepaketeista (esim. eri CO2)":"")+". Varmista CO2 yksittäishyväksynnästä tai syötä se käsin.");
  if(inp.emp&&!res.error&&res.p!==0){var e=inp.emp,vl=res.given?res.V:res.VLow,vh=res.given?res.V:res.VHigh;
    res.taxLow=Math.min(res.taxLow,vl*e.lo/100);res.taxHigh=Math.max(res.taxHigh,vh*e.hi/100);if(e.hi>e.lo)res.co2range=true;
    if(e.yr!==+reg.slice(0,4))res.warnings.push("Saman mallin päätökset löytyivät vuodelta "+e.yr+", ei rekisteröintivuodelta "+reg.slice(0,4)+". Veroprosentti on lähimmän vuoden mukaan.");
    if(e.tier==="keskitaso")res.warnings.push("Saman mallin päätösten veroprosentit vaihtelevat ("+fmtp(e.lo)+ " – " +fmtp(e.hi)+" %), todennäköisesti versioiden CO2-erojen takia. Tarkista CO2 auton asiakirjoista, jos mahdollista.");
    if(xr){var rr=M.rate(reg,xr.v,xr.wltp,inp.ev);if(rr&&rr.p!=null&&Math.abs(rr.p-e.p)>0.5)res.warnings.push("Ristiintarkistus: Traficomin rekisterin CO2 ("+xr.v+" g/km, "+(xr.wltp?"WLTP":"NEDC")+") antaisi "+fmtp(rr.p)+" %, mutta Verohallinnon päätösten mukaan prosentti on "+fmtp(e.p)+" %. Käytetty päätösten prosenttia.");}}
  if(inp.empInfo&&!res.error)res.warnings.push("Saman mallin aiemmissa päätöksissä veroprosentti vaihtelee paljon ("+fmtp(inp.empInfo.lo)+ " – " +fmtp(inp.empInfo.hi)+" %, "+inp.empInfo.n+" päätöstä), joten sitä ei käytetty pohjana.");
  if(!res.error){var pl=res.p,ph=res.p;
    function rp(c,w){var q=M.rate(reg,c,w,inp.ev);return q&&q.p!=null?q.p:null;}
    if(inp.emp){pl=inp.emp.lo;ph=inp.emp.hi;}
    else if(co2src&&co2src.est){var x1=rp(co2src.lo,co2src.wltp),x2=rp(co2src.hi,co2src.wltp);if(x1!=null)pl=Math.min(pl,x1);if(x2!=null)ph=Math.max(ph,x2);}
    else if(co2src){var y1=rp(co2src.lo,co2src.wltp),y2=rp(co2src.hi,co2src.wltp);if(y1!=null)pl=Math.min(pl,y1);if(y2!=null)ph=Math.max(ph,y2);}
    res.pLo=Math.min(pl,res.p);res.pHi=Math.max(ph,res.p);}
  var vp=+$("vprice").value||0;
  if(vp>0&&!res.error&&res.p>0){var own=res.V;res.ownV=own;res.V=vp;res.given=false;res.an=null;res.win=false;res.w3=false;res.n=null;res.s=0.015;res.vero=true;
    res.level="Verohallinnon hintatietopalvelu, kuluvan päivän hinta";res.tax=vp*res.p/100;res.VLow=vp*Math.exp(-1.28*0.015);res.VHigh=vp*Math.exp(1.28*0.015);res.taxLow=res.VLow*res.p/100;res.taxHigh=res.VHigh*res.p/100;
    if(inp.emp&&res.pLo!=null){res.taxLow=res.VLow*res.pLo/100;res.taxHigh=res.VHigh*res.pHi/100;}
    if(own)res.warnings.unshift("Verotusarvona on Verohallinnon hintatietopalvelun hinta "+fmt(vp)+" €. Laskurin oma arvio oli "+fmt(own)+" € ("+(own>=vp?"+":"−")+Math.round(Math.abs(own/vp-1)*100)+" %). Hintatieto koskee vain kuluvaa päivää: hinnat laskevat tyypillisesti noin 0,4 % kuukaudessa, joten jos auto verotetaan 1 – 2 kuukauden päästä, arvo voi olla hieman pienempi.");}
  if(mpgCo2&&!res.error)res.warnings.unshift("CO2 laskettu EPA-kulutuksesta (CARB-auto): "+(($("ptype").value==="D"||$("ptype").value==="HD")?"10 180":"8 887")+" g CO2/gallona ÷ ("+String(mpgCo2.mpg).replace('.',',')+" mpg × 1,609) = "+mpgCo2.v+" g/km, "+(reg>="2018-09-01"?"WLTP":"NEDC")+"-taulukolla. Tämä on oma päättelymme, ei Veron julkaisema kaava: se vastasi Corvetten (2021) ja Mustang GT:n (2016 – 2017) päätöksiä noin 1 prosenttiyksikön tarkkuudella. Katsastajan CARB-laskelma ratkaisee lopullisen arvon. Jos laskelmaa ei tehdä, Vero laskee CO2:n kokonaismassasta (yleensä selvästi suurempi).");
  if(massCo2&&!res.error)res.warnings.unshift("CO2 on laskettu kokonaismassasta, kuten autoverolaki (5 a §) edellyttää, kun päästöarvoa ei ole tiedossa: "+massCo2.gm+" kg × 0,1109 − "+($("ptype").value==="D"||$("ptype").value==="HD"?"49,8":"5,1")+" = "+Math.round(massCo2.mult?massCo2.v/1.5:massCo2.v)+" g/km"+(massCo2.mult?", kerrottuna 1,5:llä, koska teho/kokonaismassa on "+massCo2.ratio.toFixed(3).replace('.',',')+" (vähintään 0,15)":"")+" → "+massCo2.v+" g/km. Laskenta on NEDC-taulukolla; uusille (WLTP-aikaisille) autoille Veron käytäntö on varmistettava.");
  if(!res.error&&res.p>0)res.same=sameCar(inp.make,inp.model,inp.kw,inp.reg);
  show(res,inp);
}
$("f").addEventListener("submit",calc);
$("make").addEventListener("input",updModels);
$("units").addEventListener("change",applyUnits);
$("clr").addEventListener("click",function(){setTimeout(function(){applyUnits();$("out").innerHTML='<div class="empty">Täytä tiedot ja paina "Laske autovero".</div>';},0);});
$("sample").addEventListener("click",function(){
  $("units").value="eu";applyUnits();$("make").value="TOYOTA";updModels();$("model").value="RAV4 HYBRID";$("kw").value=131;$("reg").value="2021-04-13";$("km").value=60000;$("co2").value="";$("basis").value="wltp";$("ev").checked=false;calc();
});
var SC=null;fetch(XAB+"same.json").then(function(r){return r.ok?r.json():null}).then(function(j){SC=j;}).catch(function(){});
fetch(XAB+"epa_co2.json").then(function(r){return r.ok?r.json():null}).then(function(j){EP=j;}).catch(function(){});
fetch(XAB+"analog.json").then(function(r){return r.ok?r.json():null}).then(function(j){AN=j;}).catch(function(){});
fetch(XAB+"p_table.json").then(function(r){return r.ok?r.json():null}).then(function(j){PT=j;}).catch(function(){});
fetch(XAB+"co2_model.json").then(function(r){return r.ok?r.json():null}).then(function(j){CM=j;}).catch(function(){});
fetch(XAB+"co2_table.json").then(function(r){return r.ok?r.json():null}).then(function(j){C2=j;}).catch(function(){});
fetch(XAB+"autovero_core.json").then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(init).catch(function(){$("load").className="note b";$("load").textContent="Aineiston lataus epäonnistui. Lataa sivu uudelleen.";});
}
})();

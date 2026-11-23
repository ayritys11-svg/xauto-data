/* X-auto: autoilmoitukset (lista + yksittäinen ilmoitus). Data: data/listings.json */
(function () {
  var root = document.querySelector(".xl"); if (!root) return;
  var base = root.dataset.base || "", tarjous = root.dataset.offer || "/kysy-lisatietoa/";
  var DATA = null, F = { make: "", fuel: "", sort: "save", good: false };
  // Muistetaan vain järjestys, ei suodattimia (muuten kävijä näkee vain osan autoista eikä tiedä miksi)
  try { localStorage.removeItem("xl-f"); var so = localStorage.getItem("xl-sort"); if (so) F.sort = so; } catch (e) {}

  function fmt(n) { return new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 0 }).format(Math.round(n)); }
  function eur(n) { return fmt(n) + " €"; }
  function rng(a, b) { return Math.round(a) === Math.round(b) ? eur(a) : fmt(a) + " – " + fmt(b) + " €"; }
  function pc(n) { return String(n).replace(".", ",") + " %"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var CAR = '<svg viewBox="0 0 120 50" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 36v-7l10-3 14-14h44l16 14 18 2 6 8"/><path d="M6 36h108"/><circle cx="32" cy="38" r="7" fill="#EEF0F3"/><circle cx="90" cy="38" r="7" fill="#EEF0F3"/></svg>';
  function photo(c, tag) {
    if (tag && isRare(c)) tag = tag + " · HARVINAINEN";
    var img = c.img ? '<img src="' + esc(c.img) + '" alt="' + esc(c.title) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createRange().createContextualFragment(window.__xlCar))">' : CAR;
    return '<div class="ph">' + img + (tag ? '<span class="tag">' + esc(tag) + "</span>" : "") + "</div>";
  }
  window.__xlCar = CAR;
  var CONF = { korkea: "Tarkka arvio", keskitaso: "Kohtalainen tarkkuus", matala: "Epävarma arvio" };
  // Tarkkuus = kuinka tarkasti lopullinen autovero tiedetään: autoveron vaihteluväli prosentteina autoveroarviosta
  function taxAcc(c) {
    var t = (c.rows && c.rows.tax) || [0, 0], avg = (c.autovero && c.autovero.avg) || 0;
    var pct = avg > 0 ? Math.max(0, (t[1] - t[0]) / 2) / avg * 100 : 0;
    return { pct: pct, cls: pct <= 10 ? "korkea" : pct <= 30 ? "keskitaso" : "matala" };
  }
  function exact(c) { return taxAcc(c).cls === "korkea"; }
  function conf(c) {
    var a = taxAcc(c);
    return '<span class="conf ' + a.cls + '" title="Kuinka tarkasti lopullinen autovero tiedetään"><i></i>' + CONF[a.cls] + " · autovero ±" + Math.round(a.pct) + " %</span>";
  }
  function saveBadge(c) {
    if (isRare(c)) return '<span class="sv r">' + (c.fleet === 0 ? "Ei yhtään Suomessa" : "Vain " + fmt(c.fleet) + " kpl Suomessa") + "</span>" + (c.saving > 0 ? ' <span class="sv g">' + eur(c.saving) + " halvempi</span>" : "");
    if (c.saving == null) return '<span class="sv n">Ei vertailukohtaa Suomessa</span>';
    return c.saving > 0 ? '<span class="sv g">' + eur(c.saving) + " halvempi</span>" : '<span class="sv b">' + eur(-c.saving) + " kalliimpi</span>";
  }
  function origin(c) { return (c.country === "CA" || /^(ON|QC|BC|AB)$/.test(c.state || "") ? "KANADA" : "USA") + (c.state ? " · " + c.state : ""); }

  function list() {
    var cars = DATA.cars.slice();
    var makes = {}, fuels = {};
    cars.forEach(function (c) { makes[c.make] = 1; fuels[c.fuel] = 1; });
    var v = cars.filter(function (c) { return match(c.make, F.make) && match(c.fuel, F.fuel) && (!F.good || ok(c)) && (!F.rare || isRare(c)); });
    var SV = function (c) { return c.saving == null ? -1e9 : c.saving; };
    var CR = { korkea: 0, keskitaso: 1, matala: 2 };
    var HT = function (c) { return Math.round(taxAcc(c).pct * 10); };
    var S = { save: function (a, b) { return (HT(a) - HT(b)) || SV(b) - SV(a); }, saveonly: function (a, b) { return SV(b) - SV(a); }, rare: function (a, b) { return (a.fleet || 0) - (b.fleet || 0) || SV(b) - SV(a); }, low: function (a, b) { return a.total.mid - b.total.mid; }, high: function (a, b) { return b.total.mid - a.total.mid; }, new: function (a, b) { return b.year - a.year || a.km - b.km; }, km: function (a, b) { return a.km - b.km; } };
    v.sort(S[F.sort] || S.save);
    function dl(id, o) { return '<datalist id="' + id + '">' + Object.keys(o).sort().map(function (k) { return '<option value="' + esc(k) + '">'; }).join("") + "</datalist>"; }
    function opts(o, cur, all) { return '<option value="">' + all + "</option>" + Object.keys(o).sort().map(function (k) { return '<option' + (k === cur ? " selected" : "") + ">" + esc(k) + "</option>"; }).join(""); }
    var good = cars.filter(ok).length;
    root.innerHTML =
      '<div class="top"><div><h1>Autot USA:sta Suomeen</h1><p>Jokaiselle autolle on laskettu koko hinta Suomessa rekisteröitynä: kuljetus, tulli, ALV, autovero ja rekisteröinti. Suomen hintaa halvemmat autot näytetään ensin. Vertailuhinta on Verohallinnon arvio vastaavan auton hinnasta Suomessa, ja liikennemäärä on Traficomin rekisteristä. Autot ovat New Yorkin ja New Jerseyn autoliikkeistä.</p></div></div>' +
      (DATA.mock ? '<div class="note">Testidata: nämä neljä autoa ovat esimerkkejä hakuohjelman testaamiseen. Oikeat ilmoitukset päivittyvät tähän joka yö, kun API-avain on otettu käyttöön.</div>' : "") +
      '<div class="bar"><div class="cb"><input id="xl-make" list="xl-makes" autocomplete="off" placeholder="Kaikki merkit" aria-label="Merkki" value="' + esc(F.make) + '">' + (F.make ? '<button type="button" class="x" data-k="make" aria-label="Tyhjennä merkki">×</button>' : "") + dl("xl-makes", makes) + "</div>" +
      '<div class="cb"><input id="xl-fuel" list="xl-fuels" autocomplete="off" placeholder="Kaikki käyttövoimat" aria-label="Käyttövoima" value="' + esc(F.fuel) + '">' + (F.fuel ? '<button type="button" class="x" data-k="fuel" aria-label="Tyhjennä käyttövoima">×</button>' : "") + dl("xl-fuels", fuels) + "</div>" +
      '<select id="xl-sort" aria-label="Järjestys"><option value="save">Pienin heitto ensin</option><option value="saveonly">Suurin säästö</option><option value="rare">Harvinaisin Suomessa</option><option value="low">Halvin ensin</option><option value="high">Kallein ensin</option><option value="new">Uusin ensin</option><option value="km">Vähiten ajettu</option></select>' +
      (good < cars.length ? '<label class="tg"><input type="checkbox" id="xl-good"' + (F.good ? " checked" : "") + "> Vain Suomen hintaa halvemmat (" + good + ")</label>" : "") +
      '<label class="tg"><input type="checkbox" id="xl-rare"' + (F.rare ? " checked" : "") + "> Vain harvinaiset (alle " + RARE + " Suomessa) (" + cars.filter(isRare).length + ")</label></div>" +
      '<p class="cnt">' + (v.length < cars.length ? "Näytetään " + v.length + " / " + cars.length + ' autoa · <button type="button" id="xl-clear" class="clr">Tyhjennä suodattimet</button>' : v.length + " autoa") + " · päivitetty " + new Date(DATA.updated).toLocaleDateString("fi-FI") + "</p>" +
      (v.length ? '<div class="grid">' + v.map(card).join("") + "</div>" : '<div class="empty">Valituilla ehdoilla ei löytynyt autoja.</div>');
    root.querySelector("#xl-sort").value = F.sort;
    root.querySelector("#xl-sort").addEventListener("change", function (e) { F.sort = e.target.value; keep(); list(); });
    ["make", "fuel"].forEach(function (k) {
      var el = root.querySelector("#xl-" + k);
      el.addEventListener("input", function () { F[k] = el.value; var pos = el.selectionStart; list(); var n = root.querySelector("#xl-" + k); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} });
    });
    Array.prototype.forEach.call(root.querySelectorAll(".cb .x"), function (b) { b.addEventListener("click", function () { F[b.dataset.k] = ""; list(); }); });
    var xg = root.querySelector("#xl-good"); if (xg) xg.addEventListener("change", function (e) { F.good = e.target.checked; keep(); list(); });
    var clr = root.querySelector("#xl-clear"); if (clr) clr.addEventListener("click", function () { F.make = ""; F.fuel = ""; F.good = false; F.rare = false; list(); });
    root.querySelector("#xl-rare").addEventListener("change", function (e) { F.rare = e.target.checked; keep(); list(); });
  }
  // Suomen hintataso vaihteluvälinä (verotusarvon 80 %:n väli, pyöristys 100 €)
  function fiR(c) { if (c.saving == null) return "ei vertailukohtaa"; var A = c.autovero || {}, lo = A.VLo, hi = A.VHi; if (!lo || !hi) return eur(c.fiPrice); return rng(Math.round(lo / 100) * 100, Math.round(hi / 100) * 100); }
  function gear(t) { return !t ? "" : /MANUAL|MT\b|STICK/i.test(t) ? "Manuaali" : "Automaatti"; }
  var RARE = 300;
  function isRare(c) { return c.fleet != null && c.fleet < RARE; }
  function fleetTxt(c) { return c.fleet === 0 ? "ei yhtään" : fmt(c.fleet) + " kpl"; }
  // Haku: kirjoitettu teksti osuu, jos se löytyy nimestä (kirjainkoolla ei väliä)
  function match(val, q) { q = String(q || "").trim().toLowerCase(); return !q || String(val || "").toLowerCase().indexOf(q) >= 0; }
  function ok(c) { return c.saving != null && c.saving > 0; }
  function keep() { try { localStorage.setItem("xl-sort", F.sort); } catch (e) {} }
  function card(c) {
    return '<a class="car" href="#' + esc(c.id) + '"><h3>' + esc(c.title) + '</h3><p class="spec">' + [fmt(c.km) + " km", c.fuel, c.hp ? c.hp + " hv" : "", c.body || c.engine].filter(Boolean).map(esc).join(" · ") + "</p>" + photo(c, null) +
      '<div class="price"><b>' + rng(c.total.lo, c.total.hi) + "</b></div><div class=\"badges\">" + saveBadge(c) + "</div>" +
      '<div class="row"><span>Hinta USA:ssa</span><b>' + fmt(c.priceUsd) + " $</b></div>" +
      (c.fleet != null && !isRare(c) ? '<div class="row"><span>Suomessa liikenteessä</span><b>' + fleetTxt(c) + "</b></div>" : "") +
      '<div class="row"><span>' + (exact(c) ? "Autovero" : "Autovero (arvio)") + '</span><b>' + (c.autovero.avg === 0 ? "0 €" : eur(c.autovero.avg)) + "</b></div>" +
      (isRare(c) ? "" : '<div class="row"><span>Vastaava auto Suomessa</span><b>' + fiR(c) + "</b></div>") + conf(c) + "</a>";
  }

  function line(t, d, v, chip) { return '<div class="ln"><div class="t">' + t + (chip ? '<span class="chip">' + chip + "</span>" : "") + '</div><div class="d">' + d + '</div><div class="v">' + v + "</div></div>"; }
  function detail(c) {
    var R = c.rows, A = c.autovero;
    var s1 =
      line("Auton hinta", "", eur(R.car)) +
      line("Kuljetus " + (origin(c).indexOf("KANADA") === 0 ? "Kanadasta" : "USA:sta") + " Suomeen", "Rahti ja vakuutus Suomen satamaan" + (c.city || c.state ? ", lähtö " + esc([c.city, c.state].filter(Boolean).join(", ")) : ""), rng(R.ship, R.shipHi), "arvio") +
      line("Tulli 0 – 10 %", R.usOrigin ? "USA:ssa valmistettu (VIN alkaa " + esc(c.vin.charAt(0)) + "): 0 % alkuperätodistuksella (EU 2026/1455), muuten 10 %" : "Valmistettu muualla kuin USA:ssa (VIN alkaa " + esc(c.vin.charAt(0)) + "): 10 %", rng(R.duty[0], R.duty[1])) +
      line("Huolinta ja satamamaksut", "Tullaus ja käsittely", eur(R.huolinta), "arvio") +
      line("Arvonlisävero 25,5 %", "Auton, kuljetuksen, tullin ja huolinnan päälle", rng(R.vat[0], R.vat[1])) +
      line("Katsastus ja rekisteröinti", "Rekisteröintikatsastus, yksittäishyväksyntä, kilvet", eur(R.reg), "arvio") +
      line("X-auton palvelumaksu", "Auton haku, tarkastus, kaupat, kuljetus ja paperit", eur(R.fee)) +
      line("Autovero", exact(c) ? "Erittely alla" : "Arvio, erittely alla", A.avg === 0 ? "0 €" : rng(R.tax[0], R.tax[1]));
    var s2;
    if (A.p === 0) {
      s2 = line("Veroprosentti", esc(A.pSrc), "0 %") + '<div class="ln sum"><div class="t">Autovero</div><div class="v">0 €</div></div>';
    } else {
      s2 = line("Verotusarvo", esc(A.level) + ". " + (A.n && !/päätös/.test(A.level) ? A.n + " päätöstä. " : "") + "Tyypillinen heitto ±" + pc((A.s * 100).toFixed(1)), eur(A.V)) +
        line("a) CO₂-laskenta", "CO₂ " + A.co2 + " g/km (" + esc(A.co2src) + ") → " + esc(A.pSrc) + " " + pc(A.p), eur(A.a)) +
        (A.same ? line("b) Valmiit autoveropäätökset", A.same.n + " päätöstä samasta mallista ja teholla (" + A.kw + " kW). Mediaani " + pc(A.same.p) + " (vaihtelu " + pc(A.same.lo) + " – " + pc(A.same.hi) + ")", eur(A.b)) :
          line("b) Valmiit autoveropäätökset", "Samasta autosta ei ole riittävästi päätöksiä vertailuun. Arvio perustuu CO₂-laskentaan.", "–")) +
        '<div class="ln sum"><div class="t">' + (exact(c) ? "Autovero" : "Autoveroarvio") + '</div><div class="d">' + (A.same ? "a- ja b-tavan keskiarvo, " : "") + "vaihteluväli " + rng(R.tax[0], R.tax[1]) + '</div><div class="v">' + eur(A.avg) + "</div></div>";
    }
    var SP = c.spec || [], has = function (k) { return SP.some(function (x) { return x[0] === k; }); };
    var facts = [["Vuosimalli", c.year], ["Varustelu", c.trim], ["Ajettu", fmt(c.km) + " km"], ["Väri", c.color], ["Sisustus", c.interior], ["Valmistajan sertifioima käytetty (CPO)", c.cpo ? "Kyllä" : ""]]
      .concat(has("Moottori") || /^electric$/i.test(c.engine || "") ? [] : [["Moottori", c.engine]])
      .concat(has("Polttoaine") ? [] : [["Käyttövoima", c.fuel]])
      .concat(has("Vaihteisto") ? [] : [["Vaihteisto", gear(c.transmission)]])
      .concat(has("Veto") ? [] : [["Veto", ({ AWD: "Neliveto (AWD)", "4WD": "Neliveto (4WD)", FWD: "Etuveto", RWD: "Takaveto" })[c.drivetrain] || c.drivetrain]])
      .concat(SP)
      .concat([["Teho autoverolaskennassa", A.kw ? A.kw + " kW" + (A.kwSrc === "vin" ? " (VIN)" : " (arvio)") : ""], ["Suomessa liikenteessä (Traficom 9/2026)", c.fleet != null ? fleetTxt(c) : ""], ["Sijainti", [c.city, c.state].filter(Boolean).join(", ")], ["VIN", c.vin]])
      .filter(function (f) { return f[1]; });
    var isCons = function (f) { return /ulutus/.test(f[0]); }, cons = facts.filter(isCons), firstCons = facts.findIndex(isCons);
    if (cons.length) { facts = facts.filter(function (f) { return !isCons(f); }); facts.splice(firstCons, 0, ["__CONS__", cons]); }
    var box = function (f) { var k = /liikenteessä/.test(f[0]) ? ' class="k-fleet"' : f[0] === "VIN" ? ' class="k-vin"' : ""; return "<div" + k + "><span>" + f[0] + "</span><b>" + esc(f[1]) + "</b>" + (f[0] === "VIN" ? '<button type="button" class="copy" data-copy="' + esc(f[1]) + '" aria-label="Kopioi VIN-koodi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>Kopioi</span></button>' : "") + "</div>"; };
    facts = facts.map(function (f) { return f[0] === "__CONS__" ? '<span class="frow">' + f[1].map(box).join("") + "</span>" : box(f); }).join("");
    root.innerHTML =
      '<a class="back" href="#">← Kaikki autot</a>' +
      '<div class="hd">' + gallery(c) + '<div class="info"><h1>' + esc(c.title) + '</h1><p class="spec">' + [fmt(c.km) + " km", c.fuel, c.hp ? c.hp + " hv" : "", c.body || "", ({ AWD: "Neliveto", "4WD": "Neliveto", FWD: "Etuveto", RWD: "Takaveto" })[c.drivetrain] || ""].filter(Boolean).map(esc).join(" · ") + "</p>" +
      '<div><small style="color:var(--muted)">Hinta Suomessa rekisteröitynä</small><div class="big">' + rng(c.total.lo, c.total.hi) + "</div></div>" + saveBadge(c) + conf(c) +
      '<a class="cta" href="' + esc(tarjous + (tarjous.indexOf("?") >= 0 ? "&" : "?") + "auto=" + encodeURIComponent(c.vin) + "&nimi=" + encodeURIComponent(c.title)) + '">Kysy lisätietoa</a>' +
      "</div></div>" +
      '<section class="sec"><h2><b>1</b>Mistä hinta koostuu</h2>' + s1 + "</section>" +
      '<section class="sec"><h2><b>2</b>Mistä autoveroarvio koostuu</h2><p class="lead">Autovero = verotusarvo × veroprosentti. Verotusarvo on arvioitu Verohallinnon omista päätöksistä, veroprosentti CO₂-taulukosta ja valmiista päätöksistä.</p>' + s2 +
      (c.warnings.length ? '<ul class="warn">' + c.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : "") + "</section>" +
      '<section class="sec"><h2><b>3</b>Loppuhinta ja vertailu Suomeen</h2><div class="cmp"><div><small>Tuotuna ja rekisteröitynä</small><b>' + rng(c.total.lo, c.total.hi) + "</b></div><div><small>" + (isRare(c) ? "Verotusarvo (arvio)" : "Vastaava auto Suomessa (Veron verotusarvo)") + "</small><b>" + (isRare(c) ? rng(Math.round(c.autovero.VLo / 100) * 100, Math.round(c.autovero.VHi / 100) * 100) : fiR(c)) + "</b></div>" + (isRare(c) ? '<div class="rare"><small>Suomessa liikenteessä (Traficom 9/2026)</small><b>' + (c.fleet === 0 ? "Ei yhtään" : fmt(c.fleet) + " kpl") + "</b>" : c.saving == null ? "<div><small>Ero</small><b>–</b>" : "<div><small>Ero keskiarvolla</small><b style=\"color:" + (c.saving > 0 ? "var(--good)" : "var(--bad)") + '">' + (c.saving > 0 ? "−" : "+") + eur(Math.abs(c.saving)) + "</b>") + "</div></div>" +
      '<p class="lead" style="margin-top:12px">Alaraja: tulli 0 % (jos mahdollista) ja autovero alarajalla. Yläraja: tulli 10 %, autovero ylärajalla ja kuljetus 15 % arvioitua kalliimpi. Verohallinto päättää lopullisen autoveron. Arvio-merkityt kulut tarkentuvat tarjouksessa.</p></section>' +
      '<section class="sec"><h2>Tiedot</h2><div class="facts">' + facts + "</div></section>";
    bindGallery(c);
    var single = root.querySelector(".gal .ph img:not(#xl-main)");
    if (single) { single.style.cursor = "zoom-in"; single.addEventListener("click", function () { openLB([c.img], 0, c.title); }); }
    Array.prototype.forEach.call(root.querySelectorAll(".copy"), function (b) {
      b.addEventListener("click", function () {
        var t = b.dataset.copy, lbl = b.querySelector("span");
        var done = function () { lbl.textContent = "Kopioitu!"; b.classList.add("ok"); setTimeout(function () { lbl.textContent = "Kopioi"; b.classList.remove("ok"); }, 1800); };
        var fallback = function () { var r = document.createRange(), el = b.previousElementSibling; r.selectNodeContents(el); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); try { document.execCommand("copy"); done(); } catch (e) { lbl.textContent = "Valittu – paina Ctrl+C"; } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
      });
    });
    window.scrollTo(0, 0);
  }
  // Kuvagalleria: myyjän kuvat nimetään VIN-1.jpg, VIN-2.jpg, ...
  function urls(c) {
    if (!c.img) return [];
    var m = c.img.match(/^(.*-)(\d+)(\.\w+)$/), n = Math.min(c.photos || 1, 40), out = [];
    if (!m) return [c.img];
    for (var i = 1; i <= n; i++) out.push(m[1] + i + m[3]);
    return out;
  }
  function gallery(c) {
    var U = urls(c);
    if (U.length < 2) return '<div class="gal">' + photo(c, origin(c)) + "</div>";
    return '<div class="gal"><div class="ph main"><img id="xl-main" src="' + esc(U[0]) + '" alt="' + esc(c.title) + ' kuva 1" referrerpolicy="no-referrer"><span class="tag">' + esc(origin(c)) + '</span>' +
      '<button type="button" class="nav prev" aria-label="Edellinen kuva">‹</button><button type="button" class="nav next" aria-label="Seuraava kuva">›</button><span class="num" id="xl-num">1 / ' + U.length + "</span></div>" +
      '<div class="thumbs" id="xl-th">' + U.map(function (u, i) { return '<button type="button" data-i="' + i + '"' + (i === 0 ? ' aria-current="true"' : "") + ' aria-label="Kuva ' + (i + 1) + '"><img src="' + esc(u) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>'; }).join("") + "</div></div>";
  }
  function bindGallery(c) {
    var U = urls(c), main = root.querySelector("#xl-main"); if (!main || U.length < 2) return;
    var ok = U.map(function () { return true; }), cur = 0, th = root.querySelector("#xl-th");
    function show(i) {
      var n = U.length, k = 0; i = ((i % n) + n) % n;
      while (!ok[i] && k++ < n) i = (i + 1) % n;
      cur = i; main.src = U[i]; root.querySelector("#xl-num").textContent = (i + 1) + " / " + n;
      Array.prototype.forEach.call(th.children, function (b) { b.toggleAttribute("aria-current", +b.dataset.i === i); });
      var b = th.children[i]; if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    Array.prototype.forEach.call(th.querySelectorAll("img"), function (im, i) { im.addEventListener("error", function () { ok[i] = false; im.parentNode.hidden = true; }); });
    main.addEventListener("error", function () { ok[cur] = false; if (ok.some(Boolean)) show(cur + 1); else main.parentNode.outerHTML = photo({ title: c.title }, origin(c)); });
    th.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) show(+b.dataset.i); });
    root.querySelector(".nav.prev").addEventListener("click", function () { show(cur - 1); });
    root.querySelector(".nav.next").addEventListener("click", function () { show(cur + 1); });
    root.querySelector(".gal").addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") show(cur - 1); if (e.key === "ArrowRight") show(cur + 1); });
    main.style.cursor = "zoom-in";
    main.addEventListener("click", function () { openLB(U.filter(function (u, i) { return ok[i]; }), U.filter(function (u, i) { return ok[i]; }).indexOf(U[cur]), c.title); });
    var x0 = null; main.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  // Kuvien suurennus: koko ruutu, sormilla zoomaus (pinch), kaksoisnapautus, vetäminen, pyyhkäisy, hiiren rulla
  function openLB(list, start, title) {
    if (!list.length) return;
    var i = Math.max(0, start), sc = 1, tx = 0, ty = 0;
    var lb = document.createElement("div"); lb.className = "xl-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Kuvat: " + title);
    lb.innerHTML = '<div class="xl-lb-stage"><img alt=""></div><button type="button" class="xl-lb-x" aria-label="Sulje">×</button>' +
      (list.length > 1 ? '<button type="button" class="xl-lb-p" aria-label="Edellinen kuva">‹</button><button type="button" class="xl-lb-n" aria-label="Seuraava kuva">›</button>' : "") +
      '<div class="xl-lb-c"></div><div class="xl-lb-h">Zoomaa sormilla tai kaksoisnapautuksella · hiirellä rullalla</div>';
    document.body.appendChild(lb);
    var stage = lb.querySelector(".xl-lb-stage"), img = stage.querySelector("img"), cnt = lb.querySelector(".xl-lb-c");
    var prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    function clamp() {
      if (sc <= 1) { sc = 1; tx = 0; ty = 0; return; }
      var r = stage.getBoundingClientRect(), w = img.offsetWidth || r.width, h = img.offsetHeight || r.height;
      var mx = Math.max(0, (w * sc - r.width) / 2), my = Math.max(0, (h * sc - r.height) / 2);
      tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    }
    function apply(anim) { clamp(); img.style.transition = anim ? "transform .2s ease" : "none"; img.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + sc + ")"; img.style.cursor = sc > 1 ? "grab" : "zoom-in"; }
    function load(k) { i = (k + list.length) % list.length; sc = 1; tx = 0; ty = 0; img.src = list[i]; img.alt = title + " kuva " + (i + 1); cnt.textContent = (i + 1) + " / " + list.length; apply(false); }
    function zoomAt(ns, cx, cy) {
      var r = stage.getBoundingClientRect(), ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
      ns = Math.max(1, Math.min(5, ns)); tx = ox - (ox - tx) * (ns / sc); ty = oy - (oy - ty) * (ns / sc); sc = ns;
    }
    function close() { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prevOverflow; lb.remove(); }
    function onKey(e) { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") load(i - 1); else if (e.key === "ArrowRight") load(i + 1); }
    document.addEventListener("keydown", onKey);
    lb.querySelector(".xl-lb-x").addEventListener("click", close);
    var bp = lb.querySelector(".xl-lb-p"), bn = lb.querySelector(".xl-lb-n");
    if (bp) bp.addEventListener("click", function () { load(i - 1); });
    if (bn) bn.addEventListener("click", function () { load(i + 1); });
    stage.addEventListener("click", function (e) { if (e.target === stage && sc === 1) close(); });
    // Hiiri: rulla zoomaa, kaksoisklikkaus vaihtaa 1x/2,5x, vetäminen siirtää
    stage.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); apply(false); }, { passive: false });
    img.addEventListener("dblclick", function (e) { zoomAt(sc > 1 ? 1 : 2.5, e.clientX, e.clientY); apply(true); });
    var drag = null;
    img.addEventListener("mousedown", function (e) { if (sc <= 1) return; e.preventDefault(); drag = { x: e.clientX - tx, y: e.clientY - ty }; img.style.cursor = "grabbing"; });
    window.addEventListener("mousemove", function (e) { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(false); });
    window.addEventListener("mouseup", function () { if (drag) { drag = null; apply(false); } });
    // Kosketus: kaksi sormea zoomaa, yksi sormi siirtää (zoomattuna) tai vaihtaa kuvaa (pyyhkäisy), kaksoisnapautus zoomaa
    var t0 = null, pinch = null, lastTap = 0;
    function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    stage.addEventListener("touchstart", function (e) {
      if (e.touches.length === 2) { var a = e.touches[0], b = e.touches[1]; pinch = { d: dist(a, b), s: sc, mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2, tx: tx, ty: ty }; t0 = null; }
      else if (e.touches.length === 1) { var t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY, tx: tx, ty: ty, time: Date.now(), moved: false }; }
    }, { passive: true });
    stage.addEventListener("touchmove", function (e) {
      e.preventDefault();
      if (pinch) {
        if (e.touches.length < 2) return;
        var a = e.touches[0], b = e.touches[1], mx = (a.clientX + b.clientX) / 2, my = (a.clientY + b.clientY) / 2;
        sc = pinch.s; tx = pinch.tx; ty = pinch.ty; zoomAt(pinch.s * dist(a, b) / pinch.d, pinch.mx, pinch.my);
        tx += mx - pinch.mx; ty += my - pinch.my; apply(false);
      } else if (t0) {
        var t = e.touches[0], dx = t.clientX - t0.x, dy = t.clientY - t0.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) t0.moved = true;
        if (sc > 1) { tx = t0.tx + dx; ty = t0.ty + dy; apply(false); }
        else { img.style.transition = "none"; img.style.transform = "translateX(" + dx + "px)"; }
      }
    }, { passive: false });
    stage.addEventListener("touchend", function (e) {
      if (pinch) { if (e.touches.length === 0) { pinch = null; if (sc < 1.05) { sc = 1; } apply(true); } return; }
      if (!t0) return;
      var t = e.changedTouches[0], dx = t.clientX - t0.x, now = Date.now();
      if (!t0.moved) {
        if (now - lastTap < 300) { zoomAt(sc > 1 ? 1 : 2.5, t.clientX, t.clientY); apply(true); lastTap = 0; } else lastTap = now;
      } else if (sc === 1) {
        if (Math.abs(dx) > 60 && list.length > 1) load(i + (dx < 0 ? 1 : -1)); else apply(true);
      }
      t0 = null;
    });
    load(i);
  }

  function route() {
    if (!DATA) return;
    var id = decodeURIComponent(location.hash.slice(1));
    var c = id && DATA.cars.filter(function (x) { return x.id === id; })[0];
    if (c) detail(c); else list();
  }
  window.addEventListener("hashchange", route);
  root.innerHTML = '<div class="empty">Ladataan autoja…</div>';
  fetch(base + "data/listings.json?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) { DATA = j; route(); })
    .catch(function () { root.innerHTML = '<div class="empty">Ilmoitusten lataus epäonnistui. Lataa sivu uudelleen.</div>'; });
})();

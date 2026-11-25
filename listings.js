/* Yhteinen datalataus: näytetään heti selaimen muistissa oleva versio, haetaan tuore taustalla (yksi haku per sivu). */
if (!window.veloLoad) window.veloLoad = function (base, cb) {
  var K = "velo-data-v1", old = null;
  try { old = JSON.parse(localStorage.getItem(K) || "null"); } catch (e) { old = null; }
  if (old) { if (old.cars) cb(old, true); }
  if (!window.__veloP) {
    window.__veloP = fetch(base + "data/listings.json?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { try { localStorage.setItem(K, t); } catch (e) {} return JSON.parse(t); });
  }
  window.__veloP.then(function (j) { if (!old || JSON.stringify(old) !== JSON.stringify(j)) cb(j, false); })
    .catch(function (e) { if (!old) cb(null, false, e); });
};
/* Velo: autoilmoitukset (lista + yksittäinen ilmoitus). Data: data/listings.json */
(function () {
  var root = document.querySelector(".xl"); if (!root) return;
  var MODE = root.dataset.mode || "", LISTURL = root.dataset.list || "", LIMIT = +root.dataset.limit || 12;
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
    /* Korttikuva valmiiksi rajattuna kuvapalvelussa: tasavärinen reunus (esim. valkoinen kehys auton ympärillä) leikataan pois
       ja kuva täyttää kortin heti ilman viivettä. Jos palvelu ei vastaa, näytetään alkuperäinen kuva. */
    var img = c.img ? '<img src="' + esc(cardImg(c.img)) + '" data-o="' + esc(c.img) + '" alt="' + esc(c.title) + '" loading="lazy" referrerpolicy="no-referrer" onerror="xlImgErr(this)">' : CAR;
    return '<div class="ph">' + img + (tag ? '<span class="tag">' + esc(tag) + "</span>" : "") + "</div>";
  }
  window.__xlCar = CAR;
  /* Varusteet VIN-tiedoista ryhmiteltyinä (vain valmistajan vakiovarusteet) */
  function equipHtml(c) {
    var G = c.equip || [];
    if (!G.length) return "";
    return '<div class="eq">' + G.map(function (g) {
      return "<div><h3>" + esc(g[0]) + "</h3><ul>" + g[1].map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>";
    }).join("") + '<p class="eqn">Varusteet valmistajan VIN-tietojen mukaan (vakiovarusteet). Lisävarusteet ja tarkka varustelu varmistetaan tarjousvaiheessa.</p></div>';
  }
  function cardImg(u) { return "https://images.weserv.nl/?url=" + encodeURIComponent(u) + "&trim=12&w=640&h=480&fit=contain&cbg=ffffff&output=jpg&q=80"; }
  window.xlImgErr = function (im) {
    var o = im.getAttribute("data-o");
    if (o) { im.removeAttribute("data-o"); im.src = o; return; }
    im.replaceWith(document.createRange().createContextualFragment(window.__xlCar));
  };
  var CONFP = { korkea: "Tarkka hinta-arvio", keskitaso: "Kohtalaisen tarkka hinta-arvio", matala: "Epätarkka hinta-arvio" };
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
    return '<span class="conf ' + a.cls + '" title="Kuinka tarkasti hinta ja autovero tiedetään"><i></i>' + CONFP[a.cls] + " · autovero ±" + Math.round(a.pct) + "\u00a0%</span>";
  }
  var SHOW_SAVE = false; /* vihreä "halvempi"-laatikko pois toistaiseksi; true palauttaa sen */
  function saveBadge(c, full) {
    var kS = full ? " kuin Suomessa" : "";
    /* Harvinaiset: ei sinistä kpl-laatikkoa eikä punaista kalliimpi-merkintää (kpl-määrä näkyy rivinä kuten muillakin) */
    if (isRare(c)) return SHOW_SAVE && c.saving > 0 ? '<span class="sv g">' + eur(c.saving) + " halvempi" + kS + "</span>" : "";
    if (c.saving == null) return '<span class="sv n">Ei vertailukohtaa Suomessa</span>';
    return c.saving > 0 ? (SHOW_SAVE ? '<span class="sv g">' + eur(c.saving) + " halvempi" + kS + "</span>" : "") : '<span class="sv b">' + eur(-c.saving) + " kalliimpi" + kS + "</span>";
  }
  function origin(c) { return (c.country === "CA" || /^(ON|QC|BC|AB)$/.test(c.state || "") ? "KANADA" : "USA") + (c.state ? " · " + c.state : ""); }

  var TXT = ["q", "make", "model", "trim", "body", "fuel", "gear", "drive", "loc", "color", "doors", "steer"], NUM = ["pmin", "pmax", "ymin", "ymax", "kmin", "kmax", "dmin", "dmax", "hpmin", "hpmax", "co2max", "smin", "cmax", "emax", "rmin"], EXTRA = ["trim", "body", "gear", "drive", "loc", "color", "pmin", "pmax", "ymin", "ymax", "kmin", "kmax", "dmin", "dmax"], TECH = ["steer", "hpmin", "hpmax", "co2max", "smin", "doors", "cmax", "emax", "rmin"], OPEN = false;
  // tekninen arvo ilmoituksen teknisistä tiedoista; vaihteluvälistä keskiarvo
  function sv(c, key) { var s = (c.spec || []).filter(function (x) { return x[0] === key; })[0]; if (!s) return null; var m = String(s[1]).match(/\d+(?:,\d+)?/g); if (!m) return null; var a = m.slice(0, 2).map(function (x) { return parseFloat(x.replace(",", ".")); }); return /–/.test(s[1]) ? (a[0] + a[1]) / 2 : a[0]; }
  function fuelCons(c) { return c.fuel === "Sähkö" ? null : sv(c, "Keskikulutus (EPA)"); }
  function evCons(c) { return c.fuel === "Sähkö" ? sv(c, "Keskikulutus (EPA)") : null; }
  function steerOf(c) { var s = String(c.steering || "").toLowerCase(); if (/right|oikea|rhd/.test(s)) return "Oikealta ohjattava"; if (/left|vasen|lhd/.test(s)) return "Vasemmalta ohjattava"; return /^(JP|GB|UK|IE|AU|NZ)$/.test(c.country || "") ? "Oikealta ohjattava" : "Vasemmalta ohjattava"; }
  function doorsOf(c) { var d = sv(c, "Ovet"); return d ? String(d) : ""; }
  function modelName(c) { return /^\d/.test(c.model || "") ? c.make + " " + c.model : c.model || ""; }
  function driveFi(d) { return ({ AWD: "Neliveto", "4WD": "Neliveto", FWD: "Etuveto", RWD: "Takaveto" })[d] || ""; }
  function locFi(c) { return ({ NY: "New York", NJ: "New Jersey" })[c.state] || c.state || ""; }
  function colorFi(s) {
    s = String(s || "").toLowerCase(); if (!s || /unspec|unknown|other/.test(s)) return "";
    var T = [["black", "Musta"], ["white", "Valkoinen"], ["pearl", "Valkoinen"], ["gray", "Harmaa"], ["grey", "Harmaa"], ["silver", "Hopea"], ["blue", "Sininen"], ["navy", "Sininen"], ["red", "Punainen"], ["green", "Vihreä"], ["brown", "Ruskea"], ["beige", "Beige"], ["yellow", "Keltainen"], ["orange", "Oranssi"], ["purple", "Violetti"], ["gold", "Kulta"]];
    for (var i = 0; i < T.length; i++) if (s.indexOf(T[i][0]) >= 0) return T[i][1];
    return "Muu";
  }
  function displ(c) {
    var m = /(\d+(?:[.,]\d+)?)\s*L\b/i.exec(c.engine || "");
    if (!m) { var s = (c.spec || []).filter(function (x) { return x[0] === "Moottori"; })[0]; m = s ? /(\d+(?:,\d+)?)\s*l\b/.exec(s[1]) : null; }
    return m ? parseFloat(m[1].replace(",", ".")) : null;
  }
  function num(s) { s = String(s == null ? "" : s).replace(/\s/g, "").replace(",", "."); var n = parseFloat(s.replace(/[^\d.]/g, "")); return isNaN(n) ? null : n; }
  function hay(c) { return [c.title, c.make, c.model, c.trim, c.body, c.fuel, c.engine, c.color, colorFi(c.color), c.city, locFi(c), driveFi(c.drivetrain), gear(c.transmission)].concat((c.spec || []).map(function (x) { return x[1]; })).join(" ").toLowerCase(); }
  function words(c, q) { q = String(q || "").trim().toLowerCase(); if (!q) return true; var h = hay(c); return q.split(/\s+/).every(function (w) { return h.indexOf(w) >= 0; }); }
  function inR(v, lo, hi) { lo = num(lo); hi = num(hi); if (lo == null) { if (hi == null) return true; } if (v == null) return true; /* puuttuva tieto ei piilota autoa */ if (lo != null) { if (v < lo) return false; } if (hi != null) { if (v > hi) return false; } return true; }
  function pass(c, skip) {
    var t = function (k, val) { return k === skip || !val || match(val, F[k]); }; /* puuttuva tieto ei piilota autoa */
    return words(c, F.q) && t("make", c.make) && t("model", modelName(c)) && t("trim", c.trim) && t("body", c.body) && t("fuel", c.fuel) && t("gear", gear(c.transmission)) && t("drive", driveFi(c.drivetrain)) && t("loc", locFi(c)) && t("color", colorFi(c.color)) && t("doors", doorsOf(c)) && t("steer", steerOf(c)) &&
      inR(c.total && c.total.mid, F.pmin, F.pmax) && inR(c.year, F.ymin, F.ymax) && inR(c.km, F.kmin, F.kmax) && inR(displ(c), F.dmin, F.dmax) &&
      inR(c.hp || null, F.hpmin, F.hpmax) && inR(sv(c, "CO₂ (EPA)"), null, F.co2max) && inR(sv(c, "Istumapaikat"), F.smin, null) && inR(fuelCons(c), null, F.cmax) && inR(evCons(c), null, F.emax) && inR(sv(c, "Toimintamatka (EPA)"), F.rmin, null) &&
      (skip === "good" || !F.good || ok(c)) && (skip === "rare" || !F.rare || isRare(c)) && (skip === "fav" || !F.fav || isFav(c.id));
  }
  var SV = function (c) { return c.saving == null ? -1e9 : c.saving; };
  var HT = function (c) { return Math.round(taxAcc(c).pct * 10); };
  var S = { save: function (a, b) { return (HT(a) - HT(b)) || SV(b) - SV(a); }, saveonly: function (a, b) { return SV(b) - SV(a); }, rare: function (a, b) { return (a.fleet || 0) - (b.fleet || 0) || SV(b) - SV(a); }, low: function (a, b) { return a.total.mid - b.total.mid; }, high: function (a, b) { return b.total.mid - a.total.mid; }, new: function (a, b) { return b.year - a.year || a.km - b.km; }, old: function (a, b) { return a.year - b.year || a.km - b.km; }, km: function (a, b) { return a.km - b.km; } };
  var SORTOPTS = '<option value="save">Pienin heitto ensin</option><option value="saveonly">Suurin säästö</option><option value="rare">Harvinaisin Suomessa</option><option value="low">Halvin ensin</option><option value="high">Kallein ensin</option><option value="new">Uusin ensin</option><option value="old">Vanhin ensin</option><option value="km">Vähiten ajettu</option>';
  function list() {
    var cars = DATA.cars.slice();
    // vaihtoehdot rajautuvat muiden valintojen mukaan (esim. merkki → mallit)
    var O = {}; ["make", "model", "trim", "body", "fuel", "gear", "drive", "loc", "color", "doors", "steer"].forEach(function (k) { O[k] = {}; });
    var val = { make: function (c) { return c.make; }, model: modelName, trim: function (c) { return c.trim; }, body: function (c) { return c.body; }, fuel: function (c) { return c.fuel; }, gear: function (c) { return gear(c.transmission); }, drive: function (c) { return driveFi(c.drivetrain); }, loc: locFi, color: function (c) { return colorFi(c.color); }, doors: doorsOf, steer: steerOf };
    Object.keys(O).forEach(function (k) { cars.forEach(function (c) { var x = val[k](c); if (x) { if (pass(c, k)) O[k][x] = 1; } }); });
    ["Musta", "Valkoinen", "Harmaa", "Hopea", "Sininen", "Punainen", "Vihreä", "Ruskea", "Beige", "Keltainen", "Oranssi"].forEach(function (k) { O.color[k] = 1; }); /* värit aina valittavissa */
    O.steer["Vasemmalta ohjattava"] = 1; O.steer["Oikealta ohjattava"] = 1; // molemmat aina valittavissa (Japanin autot oikealta ohjattavia)
    var v = cars.filter(function (c) { return pass(c); });
    v.sort(S[F.sort] || S.save);
    function dl(id, o, keep) { var ks = keep ? o : Object.keys(o).sort(function (a, b) { return a.localeCompare(b, "fi"); }); return '<datalist id="' + id + '">' + ks.map(function (k) { return '<option value="' + esc(k) + '">'; }).join("") + "</datalist>"; }
    function cb(k, ph, o) { return '<div class="cb"><input id="xl-' + k + '" data-f="' + k + '" ' + (Object.keys(o).length ? 'data-list="xl-' + k + 's" ' : "") + 'autocomplete="off" placeholder="' + ph + '" aria-label="' + ph + '" value="' + esc(F[k] || "") + '">' + (F[k] ? '<button type="button" class="x" data-k="' + k + '" aria-label="Tyhjennä">×</button>' : "") + dl("xl-" + k + "s", o) + "</div>"; }
    function nb(k, ph, steps) { return '<div class="cb n"><input id="xl-' + k + '" data-f="' + k + '" data-list="xl-' + k + 's" inputmode="decimal" autocomplete="off" placeholder="' + ph + '" aria-label="' + ph + '" value="' + esc(F[k] || "") + '">' + dl("xl-" + k + "s", steps, true) + "</div>"; }
    function rg(a, b) { return '<div class="rg">' + a + b + "</div>"; }
    // Vaihteluväli (min – max): napautus avaa alapaneelin numeronäppäimistöllä
    function rtxt(a, b, u) { var f = function (v) { var n = num(v); return n == null ? "" : (u === "l" ? String(n).replace(".", ",") : u === "" ? String(n) : fmt(n)); }; a = f(a); b = f(b); if (!a) { if (!b) return ""; } return (a || "…") + " – " + (b || "…") + (u ? " " + u : ""); }
    function rb(k1, k2, label, u) { var t = rtxt(F[k1], F[k2], u); return '<button type="button" class="vrf' + (t ? " set" : "") + '" data-r="' + k1 + "," + k2 + "," + esc(label) + "," + u + '"><span>' + esc(t ? label + ": " + t : label) + "</span></button>"; }
    var st = function (a, b, d, f) { var o = []; for (var x = a; x <= b + 1e-9; x += d) o.push(f ? f(x) : String(x)); return o; };
    var yrs = cars.map(function (c) { return c.year; }), y0 = Math.min.apply(null, yrs), y1 = Math.max.apply(null, yrs);
    var PR = st(20000, 200000, 10000, fmt), KM = [10000, 20000, 30000, 50000, 75000, 100000, 150000].map(fmt), DS = st(1, 7, 0.5, function (x) { return x.toFixed(1).replace(".", ","); }), YR = st(y0, y1, 1);
    var nExtra = EXTRA.concat(TECH).filter(function (k) { return F[k]; }).length;
    var HP = st(100, 700, 50), CO = st(100, 400, 50), SE = ["2", "4", "5", "7"], CN = st(6, 16, 1), EN = st(16, 26, 2), RA = st(300, 600, 50);
    // Valintaruutujen luvut lasketaan muiden valittujen ehtojen mukaan (esim. Audi → vain Audien halvemmat)
    var good = cars.filter(function (c) { return pass(c, "good") && ok(c); }).length, rareN = cars.filter(function (c) { return pass(c, "rare") && isRare(c); }).length, favN = cars.filter(function (c) { return pass(c, "fav") && isFav(c.id); }).length;
    root.innerHTML =
      '<div class="top"><div><h1>Autot USA:sta Suomeen</h1><p>Jokaiselle autolle on laskettu koko hinta Suomessa rekisteröitynä: kuljetus, tulli, ALV, autovero ja rekisteröinti. Suomen hintaa halvemmat autot näytetään ensin. Vertailuhinta on Verohallinnon arvio vastaavan auton hinnasta Suomessa, ja liikennemäärä on Traficomin rekisteristä.</p></div></div>' +
      (DATA.mock ? '<div class="note">Testidata: nämä neljä autoa ovat esimerkkejä hakuohjelman testaamiseen.</div>' : "") +
      '<div class="bar' + (OPEN ? " open" : "") + '">' +
      cb("q", "Hakusana", {}) + cb("make", "Kaikki merkit", O.make) + cb("model", "Kaikki mallit", O.model) + cb("fuel", "Kaikki käyttövoimat", O.fuel) +
            '<div class="ext">' +
      cb("trim", "Mallitarkennus", O.trim) + cb("body", "Korimalli", O.body) + cb("gear", "Vaihteisto", O.gear) + cb("drive", "Veto", O.drive) + cb("loc", "Sijainti", O.loc) + cb("color", "Väri", O.color) + rb("kmin", "kmax", "Mittarilukema", "km") +
      rb("pmin", "pmax", "Hinta", "€") + rb("ymin", "ymax", "Vuosimalli", "") + rb("dmin", "dmax", "Moottorin tilavuus", "l") +
      "</div>" +
      '<div class="tech">' +
      rb("hpmin", "hpmax", "Teho", "hv") + nb("co2max", "CO₂-päästöt max g/km", CO) + nb("smin", "Henkilömäärä vähintään", SE) +
      cb("doors", "Ovien lukumäärä", O.doors) + cb("steer", "Ohjauslaite", O.steer) + nb("cmax", "Kulutus max l/100 km", CN) + nb("emax", "Sähkö max kWh/100 km", EN) + nb("rmin", "Toimintamatka min km", RA) +
      "</div>" +
      '<label class="tg"><input type="checkbox" id="xl-good"' + (F.good ? " checked" : "") + "> Vain Suomen hintaa halvemmat (" + good + ")</label>" +
      '<label class="tg"><input type="checkbox" id="xl-rare"' + (F.rare ? " checked" : "") + "> Vain harvinaiset (alle " + RARE + " Suomessa) (" + rareN + ")</label>" +
      '<label class="tg" id="xl-favl"' + (FAV.length || F.fav ? "" : " hidden") + '><input type="checkbox" id="xl-fav"' + (F.fav ? " checked" : "") + '><span id="xl-favn"> Vain suosikit (' + favN + ")</span></label>" +
      '<button type="button" class="moref" id="xl-more" aria-expanded="' + OPEN + '">' + (OPEN ? "Näytä vähemmän suodattimia" : "Näytä lisää suodattimia") + (nExtra ? " (" + nExtra + " valittu)" : "") + "</button>" +
      "</div>" +
      '<div class="sortbox"><label for="xl-sort">Järjestys</label><select id="xl-sort" aria-label="Järjestys">' + SORTOPTS + '</select>' + "</div>" +
      '<p class="cnt">' + (v.length < cars.length ? "Näytetään " + v.length + " / " + cars.length + ' autoa · <button type="button" id="xl-clear" class="clr">Tyhjennä suodattimet</button>' : v.length + " autoa") + " · päivitetty " + new Date(DATA.updated).toLocaleDateString("fi-FI") + "</p>" +
      (v.length ? '<div class="grid">' + v.map(card).join("") + "</div>" : '<div class="empty">' + (F.fav ? (FAV.length ? "Suosikeistasi yksikään ei vastaa valittuja ehtoja." : "Sinulla ei ole vielä suosikkeja. Tallenna auto suosikiksi painamalla autokortin tähteä.") : "Valituilla ehdoilla ei löytynyt autoja.") + "</div>");
    root.querySelector("#xl-sort").value = F.sort;
    root.querySelector("#xl-sort").addEventListener("change", function (e) { F.sort = e.target.value; keep(); list(); });
    Array.prototype.forEach.call(root.querySelectorAll("input[data-f]"), function (el) {
      var k = el.dataset.f;
      el.addEventListener("input", function () { F[k] = el.value; var pos = el.selectionStart; list(); var n = root.querySelector("#xl-" + k); n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} });
    });
    Array.prototype.forEach.call(root.querySelectorAll(".cb .x"), function (b) { b.addEventListener("click", function () { F[b.dataset.k] = ""; list(); }); });
    root.querySelector("#xl-more").addEventListener("click", function () { OPEN = !OPEN; list(); });
    Array.prototype.forEach.call(root.querySelectorAll(".vrf[data-r]"), function (b) {
      b.addEventListener("click", function () {
        var r = b.getAttribute("data-r").split(",");
        window.VeloRange({ title: r[2], unit: r[3], dec: r[3] === "l", min: F[r[0]], max: F[r[1]], onOk: function (a, c) { F[r[0]] = a; F[r[1]] = c; list(); } });
      });
    });
    var xg = root.querySelector("#xl-good"); if (xg) xg.addEventListener("change", function (e) { F.good = e.target.checked; keep(); list(); });
    var clr = root.querySelector("#xl-clear"); if (clr) clr.addEventListener("click", function () { TXT.concat(NUM).forEach(function (k) { F[k] = ""; }); F.good = false; F.rare = false; F.fav = false; list(); });
    root.querySelector("#xl-rare").addEventListener("change", function (e) { F.rare = e.target.checked; keep(); list(); });
    var xf = root.querySelector("#xl-fav"); if (xf) xf.addEventListener("change", function (e) { F.fav = e.target.checked; list(); });
  }
  // Suomen hintataso vaihteluvälinä (verotusarvon 80 %:n väli, pyöristys 100 €)
  /* Arvo Suomessa kaikille autoille, myös harvinaisille (Verohallinnon arvio, vaikka vertailukohtaa ei olisi) */
  function arvoFi(c) { var A = c.autovero || {}; if (c.saving == null) { return A.VLo ? (A.VHi ? rng(Math.round(A.VLo / 100) * 100, Math.round(A.VHi / 100) * 100) : "–") : "–"; } return fiR(c); }
  function fiR(c) { if (c.saving == null) return "ei vertailukohtaa"; var A = c.autovero || {}, lo = A.VLo, hi = A.VHi; if (!lo || !hi) return eur(c.fiPrice); return rng(Math.round(lo / 100) * 100, Math.round(hi / 100) * 100); }
  function gear(t) { return !t ? "" : /MANUAL|MT\b|STICK/i.test(t) ? "Manuaali" : "Automaatti"; }
  var RARE = 1500;
  function isRare(c) { return c.fleet != null && c.fleet < RARE; }
  function fleetTxt(c) { return c.fleet === 0 ? "ei yhtään" : fmt(c.fleet) + " kpl"; }
  // Haku: kirjoitettu teksti osuu, jos se löytyy nimestä (kirjainkoolla ei väliä)
  // "|" erottaa vaihtoehdot (esim. etusivun korityypit: Sedan|Coupé)
  function match(val, q) { q = String(q || "").trim().toLowerCase(); if (!q) return true; var v = String(val || "").toLowerCase(); return q.split("|").some(function (x) { x = x.trim(); return !x || v.indexOf(x) >= 0; }); }
  function ok(c) { return c.saving != null && c.saving > 0; }
  function keep() { try { localStorage.setItem("xl-sort", F.sort); } catch (e) {} }
  // Suosikit: tallennetaan tähän selaimeen (localStorage). Jos tallennus ei toimi, suosikit pysyvät muistissa tämän käynnin ajan.
  var FAV = (function () { try { return JSON.parse(localStorage.getItem("velo-fav") || "[]") || []; } catch (e) { return []; } })();
  function isFav(id) { return FAV.indexOf(id) >= 0; }
  function setFav(id, on) { FAV = FAV.filter(function (x) { return x !== id; }); if (on) FAV.push(id); try { localStorage.setItem("velo-fav", JSON.stringify(FAV)); } catch (e) {} }
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z"/></svg>';
  function favBtn(c) { var on = isFav(c.id); return '<button type="button" class="fav" data-fav="' + esc(c.id) + '" aria-pressed="' + on + '" aria-label="' + (on ? "Poista suosikeista" : "Tallenna suosikiksi") + '" title="' + (on ? "Poista suosikeista" : "Tallenna suosikiksi") + '">' + STAR + "</button>"; }
  function card(c) {
    return '<a class="car" href="' + esc(LISTURL) + '#' + esc(c.id) + '">' + '<div class="phw">' + photo(c, null) + favBtn(c).replace('class="fav"', 'class="fav fav-ph"') + "</div>" + '<h3>' + esc(c.title) + '</h3><p class="spec">' + [fmt(c.km) + " km", c.fuel].filter(Boolean).map(esc).join("\u00a0· ") + "</p>" +
      '<div class="price"><b>' + eur(Math.round((c.total.lo + c.total.hi) / 200) * 100) + "</b>" + favBtn(c) + "</div>" + (function (b) { return b ? '<div class="badges">' + b + "</div>" : ""; })(saveBadge(c)) +
      (c.fleet != null ? '<div class="row arvo"><span>Sama malli Suomessa</span><b' + (isRare(c) ? ' class="rc"' : "") + ">" + fleetTxt(c) + "</b></div>" : "") +
      '<div class="row arvo"><span>Arvo Suomessa</span><b>' + arvoFi(c) + "</b></div>" + conf(c) + "</a>";
  }

  function line(t, d, v, chip) { return '<div class="ln"><div class="t">' + t + (chip ? '<span class="chip">' + chip + "</span>" : "") + '</div><div class="d">' + d + '</div><div class="v">' + v + "</div></div>"; }
  var REG_FAST = 200; /* pikarekisteröinnin (48 h) lisähinta perusrekisteröintiin */
  /* täysvakuutus kuljetukselle: 1,5 % auton hinnasta, vähintään 150 € */
  function taxModal(sec, btn) {
    var old = document.getElementById("xl-taxm"); if (old) old.parentNode.removeChild(old);
    if (!sec) { if (btn) btn.style.display = "none"; return; }
    var m = document.createElement("div");
    m.id = "xl-taxm"; m.className = "xl xl-taxm"; m.hidden = true;
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-label", "Autoveron erittely");
    m.innerHTML = '<div class="tm-bar"><button type="button" class="tm-x" aria-label="Sulje ja palaa ilmoitukseen">‹ Takaisin</button></div><div class="tm-body"></div>';
    /* erittelyssä kaikki selitykset auki, ei ?-nappeja */
    Array.prototype.forEach.call(sec.querySelectorAll(".qh"), function (q) { q.parentNode.removeChild(q); });
    Array.prototype.forEach.call(sec.querySelectorAll(".qht"), function (t) { t.hidden = false; });
    m.querySelector(".tm-body").appendChild(sec);
    document.body.appendChild(m);
    var pushed = false;
    function shut(fromPop) {
      if (m.hidden) return;
      m.hidden = true; document.documentElement.style.overflow = "";
      if (pushed) { pushed = false; if (!fromPop) history.back(); }
    }
    function open() {
      m.hidden = false; m.scrollTop = 0; document.documentElement.style.overflow = "hidden";
      try { history.pushState({ xlTax: 1 }, ""); pushed = true; } catch (e) {}
    }
    m.shut = shut;
    if (btn) btn.addEventListener("click", open);
    m.querySelector(".tm-x").addEventListener("click", function () { shut(false); });
    m.addEventListener("keydown", function (e) { if (e.key === "Escape") shut(false); });
  }
  /* selaimen takaisin-ele sulkee erittelyn eikä poistu ilmoitukselta */
  window.addEventListener("popstate", function () { var m = document.getElementById("xl-taxm"); if (m) if (m.shut) m.shut(true); });
  var QL = '<button type="button" class="qh ql" aria-label="Näytä selitys" aria-expanded="false">?</button>';
  var DET = [150, 450]; /* detailing: peruspesu ja sisäpuhdistus / kiillotus, vahaus ja syväpuhdistus */
  /* valikollinen hintarivi: kiinni näkyy lyhyt nimi, auki pitkä; arvo = perushinta + valinnan lisähinta */
  function opt(t, base, o) {
    return line(t, '<span class="regw"><span class="regshow">' + o[0][0] + '</span><select class="regsel xo" data-base="' + base + '" aria-label="' + t + '">' +
      o.map(function (x) { return '<option value="' + x[2] + '" data-s="' + x[0] + '">' + (x[1] + " " + eur(base + x[2])).replace(/ /g, "\u00a0") + "</option>"; }).join("") + "</select></span>", '<span class="xov">' + eur(base + o[0][2]) + "</span>");
  }
  var INSP_FULL = 250; /* laaja tarkastus paikan päällä ennen ostoa */
  function insFull(R) { return Math.max(150, Math.round(R.car * 0.015 / 10) * 10); }
  function detail(c) {
    var EVC = c.fuel === "Sähkö"; /* täyssähköauto: ei autoveroa, ei autoverolaatikkoa */
    var R = c.rows, A = c.autovero;
    var s1 =
      line("Auton hinta", "", eur(R.car)) +
      line("Kuljetus " + (c.city || c.state ? esc([c.city, c.state].filter(Boolean).join(", ")) : (origin(c).indexOf("KANADA") === 0 ? "Kanada" : "USA")) + " → Vantaa", "", rng(R.ship, R.shipHi), "arvio") +
      (R.duty[0] > 0 ? line("Tulli 10 %", "", eur(R.duty[0])) : "") +
      line("Huolinta ja satamamaksut", "", eur(R.huolinta), "arvio") +
      line("Arvonlisävero 25,5 %", "", rng(R.vat[0], R.vat[1])) +
      line("Velon palvelumaksu", "Auton haku, tarkastus, kaupat, kuljetus ja paperit", eur(R.fee)) +
      (EVC ? "" : line('Autovero <button type="button" class="qh ql qm" aria-label="Näytä autoveron erittely" aria-haspopup="dialog">?</button>', "", A.avg === 0 ? "0 €" : rng(R.tax[0], R.tax[1]))) +
      opt("Katsastus ja rekisteröinti", R.reg, [["Perus", "Perusrekisteröinti", 0], ["Pika", "Pikarekisteröinti", REG_FAST]]) +
      opt("Detailing", 0, [["Ei", "Ei detailingia", 0], ["Perus", "Peruspesu", DET[0]], ["Laaja", "Laaja detailing", DET[1]]]);
    var s2;
    if (A.p === 0) {
      s2 = line("Veroprosentti", esc(A.pSrc), "0 %") + '<div class="ln sum"><div class="t">Autovero</div><div class="v">0 €</div></div>';
    } else {
      s2 = line('Auton arvo Suomessa <button type="button" class="qh ql" aria-label="Näytä selitys" aria-expanded="false">?</button>', '<span class="qht" hidden>' + esc(A.level) + ". " + (A.n && !/päätös/.test(A.level) ? A.n + " päätöstä. " : "") + "Tyypillinen heitto ±" + pc((A.s * 100).toFixed(1)) + "</span>", eur(A.V)) +
        line('a) CO₂-laskenta ' + QL, '<span class="qht" hidden>CO₂ ' + A.co2 + " g/km (" + esc(A.co2src) + ") → " + esc(A.pSrc) + " " + pc(A.p) + "</span>", eur(A.a)) +
        (A.same ? line("b) Valmiit autoveropäätökset", A.same.n + " päätöstä samasta mallista ja teholla (" + A.kw + " kW). Mediaani " + pc(A.same.p) + " (vaihtelu " + pc(A.same.lo) + " – " + pc(A.same.hi) + ")", eur(A.b)) :
          line("b) Valmiit autoveropäätökset", "Samasta autosta ei ole riittävästi päätöksiä vertailuun. Arvio perustuu CO₂-laskentaan.", "–")) +
        '<div class="ln sum"><div class="t">' + (exact(c) ? "Autovero" : "Autoveroarvio") + '</div><div class="d">' + (A.same ? "a- ja b-tavan keskiarvo, " : "") + "vaihteluväli " + rng(R.tax[0], R.tax[1]) + '</div><div class="v">' + eur(A.avg) + "</div></div>";
    }
    var SP = (c.spec || []).map(function (x) { return EVC ? (x[0] === "Moottori" ? ["Moottori", "Sähkö"] : x) : x; }), has = function (k) { return SP.some(function (x) { return x[0] === k; }); };
    var facts = [["Vuosimalli", c.year], ["Varustelu", c.trim], ["Ajettu", fmt(c.km) + " km"], ["Väri", c.color], ["Sisustus", c.interior], ["Valmistajan sertifioima käytetty (CPO)", c.cpo ? "Kyllä" : ""]]
      .concat(has("Moottori") ? [] : [["Moottori", EVC ? "Sähkö" : c.engine]])
      .concat(has("Polttoaine") ? [] : [["Käyttövoima", c.fuel]])
      .concat(has("Vaihteisto") ? [] : [["Vaihteisto", gear(c.transmission)]])
      .concat(has("Veto") ? [] : [["Veto", ({ AWD: "Neliveto (AWD)", "4WD": "Neliveto (4WD)", FWD: "Etuveto", RWD: "Takaveto" })[c.drivetrain] || c.drivetrain]])
      .concat(SP)
      .concat([["Teho autoverolaskennassa", A.kw ? A.kw + " kW" + (A.kwSrc === "vin" ? " (VIN)" : " (arvio)") : ""], ["Sama malli Suomessa" + ((function () { var AB = { "bensiini": "bens.", "diesel": "dies.", "hybridi": "hybr.", "avoauto": "avo", "farmari": "farm.", "viistoperä": "viistop.", "sedan": "sedan" }; var w = (c.gen ? ["kori " + c.gen[0] + (c.gen[1] < 2090 ? " – " + c.gen[1] : " –")] : []).concat((c.fleetWhy || []).map(function (x) { return AB[x] || x; })).slice(0, 3); return w.length ? " (" + w.join(", ") + ")" : ""; })()), c.fleet != null ? fleetTxt(c) : ""], ["Koko malli Suomessa", c.fleetModel != null ? (c.fleetModel === 0 ? "ei yhtään" : fmt(c.fleetModel) + " kpl") : ""], ["Sijainti", [c.city, c.state].filter(Boolean).join(", ")], ["VIN", c.vin]])
      .filter(function (f) { return f[1]; });
    var isCons = function (f) { return /ulutus/.test(f[0]); }, cons = facts.filter(isCons), firstCons = facts.findIndex(isCons);
    if (cons.length) { facts = facts.filter(function (f) { return !isCons(f); }); facts.splice(firstCons, 0, ["__CONS__", cons]); }
    var box = function (f) { var k = /Sama malli/.test(f[0]) ? ' class="k-fleet"' : f[0] === "VIN" ? ' class="k-vin"' : ""; return "<div" + k + "><span>" + f[0] + "</span><b>" + esc(f[1]) + "</b>" + (f[0] === "VIN" ? '<button type="button" class="copy" data-copy="' + esc(f[1]) + '" aria-label="Kopioi VIN-koodi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg><span>Kopioi</span></button>' : "") + "</div>"; };
    facts = facts.map(function (f) { return f[0] === "__CONS__" ? '<span class="frow">' + f[1].map(box).join("") + "</span>" : box(f); }).join("");
    root.innerHTML =
      '<a class="back" href="#">← Kaikki autot</a>' +
      '<div class="hd">' + gallery(c) + '<div class="info"><div class="ttl"><h1>' + esc(c.title) + '</h1>' + favBtn(c) + "</div>" + '<p class="spec">' + [fmt(c.km) + " km", c.fuel, c.hp ? c.hp + " hv" : "", c.body || "", ({ AWD: "Neliveto", "4WD": "Neliveto", FWD: "Etuveto", RWD: "Takaveto" })[c.drivetrain] || ""].filter(Boolean).map(esc).join("\u00a0· ") + "</p>" +
      '<div><small style="color:var(--muted)">Hinta Suomessa rekisteröitynä</small><div class="big"><span class="xtot" data-lo="' + c.total.lo + '" data-hi="' + c.total.hi + '">' + rng(c.total.lo, c.total.hi) + "</span></div></div>" + saveBadge(c, 1) + conf(c) +
      '<a class="cta" href="' + esc(tarjous + (tarjous.indexOf("?") >= 0 ? "&" : "?") + "auto=" + encodeURIComponent(c.vin) + "&nimi=" + encodeURIComponent(c.title)) + '">Kysy lisätietoa</a>' +
      "</div></div>" +
      '<section class="sec sec-info"><h2>Tiedot ja varusteet</h2><div class="facts">' + facts + "</div>" + equipHtml(c) + "</section>" +
      '<section class="sec"><h2><b>1</b>Mistä hinta koostuu</h2>' + s1 + "</section>" +
      (EVC ? "" : '<section class="sec sec2" id="xl-sec2"><h2><span>Mistä autoveroarvio koostuu</span><button type="button" class="qh qr" aria-label="Näytä selitys" aria-expanded="false">?</button></h2><p class="lead qht" hidden>Autovero = auton arvo Suomessa × veroprosentti. Auton arvo Suomessa on arvioitu Verohallinnon omista päätöksistä, veroprosentti CO₂-taulukosta ja valmiista päätöksistä.</p>' + s2 +
      ('<ul class="warn"><li>Tarkka autovero lasketaan tarjousvaiheessa auton VIN-numeron ja tarkkojen tietojen perusteella. Lopullisen autoveron määrää Verohallinto.</li>' + c.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>") + "</section>") +
      '<section class="sec"><h2><b>2</b>Loppuhinta ja vertailu Suomeen</h2><div class="cmp"><div><small>Tuotuna ja rekisteröitynä</small><b><span class="xtot" data-lo="' + c.total.lo + '" data-hi="' + c.total.hi + '">' + rng(c.total.lo, c.total.hi) + "</span></b></div>" + (isRare(c) ? "" : "<div><small>Arvo Suomessa</small><b>" + fiR(c) + "</b></div>") + (isRare(c) ? '<div class="rare"><small>Sama malli Suomessa (Traficom 9/2026)</small><b>' + (c.fleet === 0 ? "Ei yhtään" : fmt(c.fleet) + " kpl") + "</b>" : c.saving == null ? "<div><small>Ero</small><b>–</b>" : "<div><small>Ero keskiarvolla</small><b style=\"color:" + (c.saving > 0 ? "var(--good)" : "var(--bad)") + '">' + (c.saving > 0 ? "−" : "+") + eur(Math.abs(c.saving)) + "</b>") + "</div></div>" +
      (EVC ? '<p class="lead" style="margin-top:12px">Yläraja: kuljetus 15 % arvioitua kalliimpi. Arvio-merkityt kulut tarkentuvat tarjouksessa.</p>' + (c.warnings.length ? '<ul class="warn">' + c.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : "") : '<p class="lead" style="margin-top:12px">Alaraja: tulli 0 % (jos mahdollista) ja autovero alarajalla. Yläraja: tulli 10 %, autovero ylärajalla ja kuljetus 15 % arvioitua kalliimpi. Verohallinto päättää lopullisen autoveron. Arvio-merkityt kulut tarkentuvat tarjouksessa.</p>') + '</section>' +
      "";
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
    // ?-nappi näyttää/piilottaa autoveron selityksen
    Array.prototype.forEach.call(root.querySelectorAll(".qh"), function (q) {
      if (q.classList.contains("qm")) return;
      q.addEventListener("click", function () { var ln = q.closest(".ln"), t = ln ? ln.querySelector(".qht") : q.closest("h2").nextElementSibling; if (!t) return; var open = t.hidden; t.hidden = !open; q.setAttribute("aria-expanded", String(open)); q.classList.toggle("on", open); });
    });
    // Autoveron erittely (osio "Mistä autoveroarvio koostuu") aukeaa omana koko näytön näkymänään Autovero-rivin ?-napista
    taxModal(root.querySelector("#xl-sec2"), root.querySelector(".qm"));
    // Valikolliset rivit (vakuutus, rekisteröinti, tarkastus, detailing) päivittävät rivinsä ja loppuhinnat heti
    var xos = root.querySelectorAll(".xo");
    function upd() {
      var sum = 0;
      Array.prototype.forEach.call(xos, function (se) {
        var v = +se.value || 0, o = se.options[se.selectedIndex], w = se.closest(".ln");
        sum += v;
        var sh = se.parentNode.querySelector(".regshow"); if (sh) sh.textContent = o.getAttribute("data-s");
        var ov = w && w.querySelector(".xov"); if (ov) ov.textContent = eur(+se.getAttribute("data-base") + v);
      });
      Array.prototype.forEach.call(root.querySelectorAll(".xtot"), function (el) { el.textContent = rng(+el.getAttribute("data-lo") + sum, +el.getAttribute("data-hi") + sum); });
    }
    Array.prototype.forEach.call(xos, function (se) { se.addEventListener("change", upd); });
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
      if (!main.isConnected) return; /* sivu vaihtui jo: myöhässä tullut kuvavirhe ei saa kaatua */
      var n = U.length, k = 0; i = ((i % n) + n) % n;
      while (!ok[i] && k++ < n) i = (i + 1) % n;
      cur = i; main.src = U[i]; root.querySelector("#xl-num").textContent = (i + 1) + " / " + n;
      Array.prototype.forEach.call(th.children, function (b) { b.toggleAttribute("aria-current", +b.dataset.i === i); });
      var b = th.children[i]; if (b) { var tr = th.getBoundingClientRect(), br = b.getBoundingClientRect(); if (br.left < tr.left) th.scrollLeft += br.left - tr.left; else if (br.right > tr.right) th.scrollLeft += br.right - tr.right; } /* vain pikkukuvarivi vierii sivuttain, sivu ei hyppää */
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

  // Kuvien suurennus: koko ruutu, sormilla zoomaus, kaksoisnapautus, vetäminen ja pehmeä pyyhkäisy kuvasta toiseen
  function openLB(list, start, title) {
    if (!list.length) return;
    var n = list.length, i = Math.max(0, start), sc = 1, tx = 0, ty = 0, busy = false;
    var coarse = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
    var lb = document.createElement("div"); lb.className = "xl-lb"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-label", "Kuvat: " + title);
    lb.innerHTML = '<div class="xl-lb-stage"><div class="xl-lb-track">' + [0, 1, 2].map(function () { return '<div class="xl-lb-slide"><img alt="" draggable="false"></div>'; }).join("") + '</div></div>' +
      '<button type="button" class="xl-lb-x" aria-label="Sulje">×</button>' +
      (n > 1 ? '<button type="button" class="xl-lb-p" aria-label="Edellinen kuva">‹</button><button type="button" class="xl-lb-n" aria-label="Seuraava kuva">›</button>' : "") +
      '<div class="xl-lb-c"></div><div class="xl-lb-h">' + (coarse ? "Zoomaa sormilla" : "Zoomaa kaksoisklikkauksella tai hiiren rullalla") + '</div>';
    document.body.appendChild(lb);
    var stage = lb.querySelector(".xl-lb-stage"), track = lb.querySelector(".xl-lb-track"), imgs = track.querySelectorAll("img"), cnt = lb.querySelector(".xl-lb-c");
    var prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = "hidden";
    function W() { return stage.clientWidth; }
    function cur() { return imgs[1]; }
    function setTrack(x, anim) { track.style.transition = anim ? "transform .3s cubic-bezier(.22,.61,.36,1)" : "none"; track.style.transform = "translate3d(" + (-W() + x) + "px,0,0)"; }
    function clamp() {
      if (sc <= 1) { sc = 1; tx = 0; ty = 0; return; }
      var img = cur(), r = stage.getBoundingClientRect(), w = img.offsetWidth || r.width, h = img.offsetHeight || r.height;
      var mx = Math.max(0, (w * sc - r.width) / 2), my = Math.max(0, (h * sc - r.height) / 2);
      tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    }
    function apply(anim) { clamp(); var img = cur(); img.style.transition = anim ? "transform .2s ease" : "none"; img.style.transform = "translate3d(" + tx + "px," + ty + "px,0) scale(" + sc + ")"; img.style.cursor = sc > 1 ? "grab" : "zoom-in"; }
    function idx(k) { return (k % n + n) % n; }
    function load(k) {
      i = idx(k); sc = 1; tx = 0; ty = 0;
      [i - 1, i, i + 1].forEach(function (q, s2) { var im = imgs[s2]; var u = list[idx(q)]; if (im.getAttribute("src") !== u) im.src = u; im.style.transform = ""; im.style.transition = "none"; im.alt = title + " kuva " + (idx(q) + 1); });
      if (n === 1) { imgs[0].removeAttribute("src"); imgs[2].removeAttribute("src"); }
      cnt.textContent = (i + 1) + " / " + n; setTrack(0, false); apply(false);
      var pre = new Image(); pre.src = list[idx(i + 2)]; var pre2 = new Image(); pre2.src = list[idx(i - 2)];
    }
    // Liukuu seuraavaan (dir = 1) tai edelliseen (dir = -1) kuvaan
    function go(dir) {
      if (busy || n < 2) return; busy = true;
      if (sc > 1) { sc = 1; tx = 0; ty = 0; apply(true); }
      setTrack(-dir * W(), true);
      setTimeout(function () { load(i + dir); busy = false; }, 310);
    }
    function zoomAt(ns, cx, cy) {
      var r = stage.getBoundingClientRect(), ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
      ns = Math.max(1, Math.min(4, ns)); tx = ox - (ox - tx) * (ns / sc); ty = oy - (oy - ty) * (ns / sc); sc = ns;
    }
    function close() { document.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); document.documentElement.style.overflow = prevOverflow; lb.remove(); }
    function onKey(e) { if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1); }
    function onResize() { setTrack(0, false); apply(false); }
    document.addEventListener("keydown", onKey); window.addEventListener("resize", onResize);
    lb.querySelector(".xl-lb-x").addEventListener("click", close);
    var bp = lb.querySelector(".xl-lb-p"), bn = lb.querySelector(".xl-lb-n");
    if (bp) bp.addEventListener("click", function () { go(-1); });
    if (bn) bn.addEventListener("click", function () { go(1); });
    stage.addEventListener("click", function (e) { if (!coarse && sc === 1 && e.target.tagName !== "IMG") close(); });
    // Hiiri
    stage.addEventListener("wheel", function (e) { e.preventDefault(); zoomAt(sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2), e.clientX, e.clientY); apply(false); }, { passive: false });
    stage.addEventListener("dblclick", function (e) { if (coarse) return; zoomAt(sc > 1 ? 1 : 2.5, e.clientX, e.clientY); apply(true); });
    var drag = null;
    stage.addEventListener("mousedown", function (e) { if (sc <= 1) return; e.preventDefault(); drag = { x: e.clientX - tx, y: e.clientY - ty }; cur().style.cursor = "grabbing"; });
    window.addEventListener("mousemove", function (e) { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; apply(false); });
    window.addEventListener("mouseup", function () { if (drag) { drag = null; apply(false); } });
    // Kosketus
    var t0 = null, pinch = null, lastTap = 0;
    function dist(a, b) { return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    stage.addEventListener("touchstart", function (e) {
      if (busy) return;
      if (e.touches.length === 2) { var a = e.touches[0], b = e.touches[1]; pinch = { d: dist(a, b), s: sc, mx: (a.clientX + b.clientX) / 2, my: (a.clientY + b.clientY) / 2, tx: tx, ty: ty }; if (t0) setTrack(0, true); t0 = null; }
      else if (e.touches.length === 1) { var t = e.touches[0]; t0 = { x: t.clientX, y: t.clientY, tx: tx, ty: ty, time: Date.now(), moved: false, axis: null }; }
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
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) t0.moved = true;
        if (sc > 1) { tx = t0.tx + dx; ty = t0.ty + dy; apply(false); }
        else if (n > 1) {
          if (!t0.axis && t0.moved) t0.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (t0.axis === "x") setTrack(dx, false);
        }
      }
    }, { passive: false });
    stage.addEventListener("touchend", function (e) {
      if (pinch) { if (e.touches.length === 0) { pinch = null; if (sc < 1.05) sc = 1; apply(true); } return; }
      if (!t0) return;
      var t = e.changedTouches[0], dx = t.clientX - t0.x, dt = Math.max(1, Date.now() - t0.time), now = Date.now();
      if (!t0.moved) {
        if (now - lastTap < 300) { zoomAt(sc > 1 ? 1 : 2.5, t.clientX, t.clientY); apply(true); lastTap = 0; } else lastTap = now;
      } else if (sc === 1 && t0.axis === "x" && n > 1) {
        var fast = Math.abs(dx) / dt > 0.45;
        if (Math.abs(dx) > W() * 0.2 || (fast && Math.abs(dx) > 30)) go(dx < 0 ? 1 : -1); else setTrack(0, true);
      }
      t0 = null;
    });
    load(i);
  }

  // Etusivun nosto: samat autokortit kuin Autot-sivulla. Halvemmat ensin (mallit vuorotellen), sitten harvinaiset.
  var FSORT = "";
  function featured() {
    var withImg = DATA.cars.filter(function (c) { return c.img; });
    var good = withImg.filter(function (c) { return c.saving > 0; }).sort(function (a, b) { return b.saving - a.saving; });
    var rest = withImg.filter(function (c) { return !(c.saving > 0); }).sort(function (a, b) { return (a.fleet || 0) - (b.fleet || 0); });
    function rounds(list, max) {
      var g = {}, order = [], out = [];
      list.forEach(function (c) { var k = c.make + "|" + c.model; if (!g[k]) { g[k] = []; order.push(k); } g[k].push(c); });
      for (var r = 0; r < 60 && out.length < max; r++) { var added = false; order.forEach(function (k) { if (out.length < max && g[k][r]) { out.push(g[k][r]); added = true; } }); if (!added) break; }
      return out;
    }
    var pick = rounds(good, LIMIT); if (pick.length < LIMIT) pick = pick.concat(rounds(rest, LIMIT - pick.length));
    // Järjestys: oletuksena suositellut (yllä), muuten sama järjestys kuin Autot-sivulla
    if (FSORT) pick = withImg.slice().sort(S[FSORT] || S.save).slice(0, LIMIT);
    root.innerHTML = '<div class="sortbox"><label for="xl-fsort">Järjestys</label><select id="xl-fsort" aria-label="Järjestys"><option value="">Suositellut</option>' + SORTOPTS + "</select></div>" +
      '<div class="grid">' + pick.map(card).join("") + '</div><div class="more"><a href="' + esc(LISTURL) + '">Näytä kaikki autot</a></div>';
    var fs = root.querySelector("#xl-fsort"); fs.value = FSORT;
    fs.addEventListener("change", function () { FSORT = fs.value; if (FSORT) { F.sort = FSORT; keep(); } featured(); });
  }
  // Etusivun hakulomake välittää valinnat osoitteessa: /autot/?make=Porsche&pmax=60000&body=Sedan|Coupé&open=1
  (function () {
    try {
      var u = new URLSearchParams(location.search);
      TXT.concat(NUM).forEach(function (k) { var x = u.get(k); if (x) F[k] = x; });
      if (u.get("open") === "1") OPEN = true;
      if (u.get("fav") === "1") F.fav = true; /* valikon Suosikit-linkki: /autot/?fav=1 */
      var anyExtra = EXTRA.concat(TECH).some(function (k) { return F[k]; });
      if (anyExtra) OPEN = true;
    } catch (e) {}
  })();
  // Tähti: tallenna/poista suosikki. Kortti on linkki, joten painallus ei saa avata ilmoitusta.
  document.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest(".xl .fav") : null; if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var id = b.getAttribute("data-fav"), on = !isFav(id); setFav(id, on);
    Array.prototype.forEach.call(document.querySelectorAll(".xl .fav"), function (x) { if (x.getAttribute("data-fav") === id) { x.setAttribute("aria-pressed", String(on)); x.setAttribute("aria-label", on ? "Poista suosikeista" : "Tallenna suosikiksi"); x.title = x.getAttribute("aria-label"); } });
    if (MODE !== "featured") { if (!location.hash || location.hash === "#") {
      if (F.fav) { var y = window.scrollY; list(); window.scrollTo(0, y); return; } /* suosikkinäkymä: poistettu suosikki häviää listasta */
      /* muuten ei piirretä listaa uudelleen (se vilkkui): päivitetään vain suodattimen määrä */
      var fl = root.querySelector("#xl-favl"), fn = root.querySelector("#xl-favn");
      if (fn) { var n = 0; DATA.cars.forEach(function (x) { if (isFav(x.id)) { if (pass(x, "fav")) n++; } }); fn.textContent = " Vain suosikit (" + n + ")"; }
      if (fl) fl.hidden = !FAV.length;
    } }
  }, true);
  function route() {
    if (!DATA) return;
    if (MODE === "featured") { featured(); return; }
    var id = decodeURIComponent(location.hash.slice(1));
    var c = id && DATA.cars.filter(function (x) { return x.id === id; })[0];
    if (c) detail(c); else list();
  }
  // Vierityskohta säilyy: sivun päivitys tai paluu ilmoituksesta listaan palauttaa samaan kohtaan.
  // Sisältö piirretään vasta datan tultua, joten selaimen oma palautus ei toimi: tallennetaan kohta itse.
  var SK = "velo-scroll:" + location.pathname + location.search, firstRoute = true, saveT = 0;
  function skey(h) { return SK + (h == null ? location.hash : h); }
  function saveScroll(h) { try { sessionStorage.setItem(skey(h), String(Math.round(window.scrollY))); } catch (e) {} }
  function restoreScroll() {
    var y = null; try { y = sessionStorage.getItem(skey()); } catch (e) {}
    if (y == null) return;
    y = +y; window.scrollTo(0, y);
    requestAnimationFrame(function () { window.scrollTo(0, y); });
    setTimeout(function () { if (Math.abs(window.scrollY - y) > 40) window.scrollTo(0, y); }, 350);
  }
  if (MODE !== "featured") {
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
    window.addEventListener("scroll", function () { clearTimeout(saveT); saveT = setTimeout(function () { saveScroll(); }, 150); }, { passive: true });
    window.addEventListener("pagehide", function () { saveScroll(); });
    window.addEventListener("hashchange", function (e) {
      clearTimeout(saveT);
      var oh = ""; try { oh = new URL(e.oldURL).hash; } catch (x) {}
      try { sessionStorage.setItem(skey(oh), String(Math.round(window.scrollY))); } catch (x) {}
      route();
      if (!location.hash || location.hash === "#") restoreScroll(); /* takaisin listaan: samaan kohtaan */
    });
  }
  root.innerHTML = '<div class="empty">Ladataan autoja…</div>';
  window.veloLoad(base, function (j) {
    if (!j) { root.innerHTML = '<div class="empty">Ilmoitusten lataus epäonnistui. Lataa sivu uudelleen.</div>'; return; }
    var had = !!DATA, y = window.scrollY;
    DATA = j; route();
    if (MODE === "featured") return;
    if (had) { window.scrollTo(0, y); return; } /* tuore data tuli taustalla: ei hypätä ylös */
    if (firstRoute) {
      firstRoute = false;
      var nt = ""; try { var ne = performance.getEntriesByType("navigation")[0]; nt = ne ? ne.type : ""; } catch (e) {}
      if (nt === "reload" || nt === "back_forward") restoreScroll();
    }
  });
})();

/* Velo-valintalista: oma pudotusvalikko kirjoitettaville kentille (input[data-list] + datalist).
   iPhonen Safari ei näytä datalistia valikkona, joten valinnat näytetään itse. Toimii sekä Autot-sivulla että etusivun haussa. */
(function () {
  if (window.VeloCombo) return;
  window.VeloCombo = true;
  var panel = null, cur = null, act = -1, skipId = null, skipT = 0;
  function opts(inp) {
    var d = document.getElementById(inp.getAttribute("data-list"));
    if (!d) return [];
    var all = Array.prototype.map.call(d.options, function (o) { return o.value; });
    var q = inp.value.trim().toLowerCase();
    if (!q || all.some(function (v) { return v.toLowerCase() === q; })) return all;
    var f = all.filter(function (v) { return v.toLowerCase().indexOf(q) >= 0; });
    return f.length ? f : all;
  }
  function close() { if (panel) { panel.remove(); panel = null; } cur = null; act = -1; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render() {
    if (!cur) return;
    var list = opts(cur);
    if (!list.length) { close(); return; }
    if (!panel) { panel = document.createElement("div"); panel.className = "vdd"; panel.setAttribute("role", "listbox"); }
    var host = cur.parentNode;
    if (panel.parentNode !== host) host.appendChild(panel);
    place();
    panel.innerHTML = list.map(function (v, i) { return '<button type="button" role="option" class="vdd-o' + (i === act ? " on" : "") + (v === cur.value ? " sel" : "") + '" data-v="' + esc(v) + '">' + esc(v) + "</button>"; }).join("");
  }
  /* Lista avautuu sinne, missä on tilaa (näppäimistön yläpuolelle), eikä sivua vieritetä */
  function place() {
    if (!panel || !cur) return;
    var r = cur.getBoundingClientRect(), v = window.visualViewport, vh = v ? v.height + v.offsetTop : window.innerHeight;
    var below = vh - r.bottom - 8, above = r.top - 64;
    var up = below < 200 ? above > below : false;
    panel.classList.toggle("up", up);
    panel.style.maxHeight = Math.max(120, Math.min(300, (up ? above : below) - 8)) + "px";
  }
  if (window.visualViewport) { window.visualViewport.addEventListener("resize", function () { place(); }); }
  function open(inp) {
    if (Date.now() - skipT < 450) return; /* juuri valittu: estä haamuklikkaus ja uudelleenpiirron fokus */
    if (cur !== inp) { close(); cur = inp; }
    act = -1; render();
  }
  function pick(v) {
    var inp = cur; if (!inp) return;
    skipId = inp.id; skipT = Date.now();
    inp.value = v; close();
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    var n = inp.id ? document.getElementById(inp.id) : inp;
    if (n) n.blur();
  }
  document.addEventListener("focusin", function (e) { var t = e.target; if (t.matches) { if (t.matches("input[data-list]")) open(t); } });
  document.addEventListener("click", function (e) { var t = e.target; if (t.matches) { if (t.matches("input[data-list]")) { if (!panel) open(t); } } });
  document.addEventListener("input", function (e) { if (e.target === cur) { act = -1; render(); } });
  /* Valinta napautuksella (click), ei kosketuksen alussa: näin listaa voi vierittää sormella. */
  document.addEventListener("click", function (e) {
    var o = e.target.closest ? e.target.closest(".vdd-o") : null;
    if (o) { e.preventDefault(); pick(o.getAttribute("data-v")); }
  });
  document.addEventListener("mousedown", function (e) { if (e.target.closest) { if (e.target.closest(".vdd")) e.preventDefault(); } });
  document.addEventListener("pointerdown", function (e) {
    if (panel) { if (!panel.contains(e.target)) { if (e.target !== cur) close(); } }
  });
  document.addEventListener("keydown", function (e) {
    if (!cur) return;
    if (e.target !== cur) return;
    var n = panel ? panel.children.length : 0;
    if (e.key === "Escape") { close(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); if (!panel) render(); act = Math.min(n - 1, act + 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); act = Math.max(0, act - 1); render(); }
    else if (e.key === "Enter") { if (act >= 0) { if (panel) { e.preventDefault(); e.stopPropagation(); pick(panel.children[act].getAttribute("data-v")); } } }
  }, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Tab") close(); });
})();

/* Velo-väliikkuna: alhaalta avautuva paneeli "Minimi – Maksimi" numeronäppäimistöllä (kuten Nettiautossa). */
(function () {
  if (window.VeloRange) return;
  function fmt(n) { return new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 }).format(n); }
  function clean(v, dec) { v = String(v || "").replace(/\s/g, ""); if (dec) { v = v.replace(".", ",").replace(/[^0-9,]/g, ""); var i = v.indexOf(","); if (i >= 0) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, "").slice(0, 1); return v; } return v.replace(/[^0-9]/g, ""); }
  function show(v, dec) { v = clean(v, dec); if (!v) return ""; if (dec) return v; return fmt(+v); }
  window.VeloRange = function (o) {
    var old = document.querySelector(".vrs"); if (old) old.remove();
    var w = document.createElement("div"); w.className = "vrs";
    w.innerHTML = '<div class="vrs-bg"></div><div class="vrs-sh" role="dialog" aria-label="' + o.title + '"><div class="vrs-hd"><b>' + o.title + '</b><button type="button" class="vrs-ok">OK</button></div>' +
      '<div class="vrs-row"><input class="vrs-a" inputmode="' + (o.dec ? "decimal" : "numeric") + '" ' + (o.dec ? "" : 'pattern="[0-9]*" ') + 'placeholder="Minimi" aria-label="Minimi" autocomplete="off"><span class="vrs-d">–</span><input class="vrs-b" inputmode="' + (o.dec ? "decimal" : "numeric") + '" ' + (o.dec ? "" : 'pattern="[0-9]*" ') + 'placeholder="Maksimi" aria-label="Maksimi" autocomplete="off"><span class="vrs-u">' + (o.unit || "") + '</span></div>' +
      '<button type="button" class="vrs-clr">Tyhjennä</button></div>';
    document.body.appendChild(w);
    /* Sivu ei saa liikkua paneelin ollessa auki: lukitaan vieritys ja palautetaan sama kohta suljettaessa */
    var sy = window.scrollY, bs = document.body.style, prev = [bs.position, bs.top, bs.left, bs.right, bs.width];
    bs.position = "fixed"; bs.top = -sy + "px"; bs.left = "0"; bs.right = "0"; bs.width = "100%";
    function unlock() { bs.position = prev[0]; bs.top = prev[1]; bs.left = prev[2]; bs.right = prev[3]; bs.width = prev[4]; window.scrollTo(0, sy); }
    var a = w.querySelector(".vrs-a"), b = w.querySelector(".vrs-b"), sh = w.querySelector(".vrs-sh");
    a.value = show(o.min, o.dec); b.value = show(o.max, o.dec);
    [a, b].forEach(function (i) { i.addEventListener("input", function () { var p = i.value.length - i.selectionStart; i.value = show(i.value, o.dec); var q = Math.max(0, i.value.length - p); try { i.setSelectionRange(q, q); } catch (e) {} }); });
    function vp() { var v = window.visualViewport; if (!v) return; if (window.innerWidth >= 700) { sh.style.bottom = ""; return; } var off = window.innerHeight - (v.height + v.offsetTop); sh.style.bottom = Math.max(0, off) + "px"; }
    if (window.visualViewport) { window.visualViewport.addEventListener("resize", vp); window.visualViewport.addEventListener("scroll", vp); }
    function done(ok) {
      if (window.visualViewport) { window.visualViewport.removeEventListener("resize", vp); window.visualViewport.removeEventListener("scroll", vp); }
      document.removeEventListener("keydown", key, true);
      var x = clean(a.value, o.dec).replace(",", "."), y = clean(b.value, o.dec).replace(",", ".");
      if (x) { if (y) { if (+x > +y) { var t = x; x = y; y = t; } } }
      if (document.activeElement) document.activeElement.blur();
      unlock();
      w.classList.remove("in"); setTimeout(function () { w.remove(); }, 220);
      if (ok) o.onOk(x, y);
    }
    function key(e) { if (e.key === "Escape") done(false); if (e.key === "Enter") { e.preventDefault(); if (document.activeElement === a) b.focus(); else done(true); } }
    document.addEventListener("keydown", key, true);
    w.querySelector(".vrs-ok").addEventListener("click", function () { done(true); });
    w.querySelector(".vrs-bg").addEventListener("click", function () { done(true); });
    w.querySelector(".vrs-clr").addEventListener("click", function () { a.value = ""; b.value = ""; a.focus(); });
    try { a.focus({ preventScroll: true }); } catch (e) { a.focus(); }
    requestAnimationFrame(function () { w.classList.add("in"); vp(); });
  };
})();

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
      (skip === "good" || !F.good || ok(c)) && (skip === "rare" || !F.rare || isRare(c));
  }
  function list() {
    var cars = DATA.cars.slice();
    // vaihtoehdot rajautuvat muiden valintojen mukaan (esim. merkki → mallit)
    var O = {}; ["make", "model", "trim", "body", "fuel", "gear", "drive", "loc", "color", "doors", "steer"].forEach(function (k) { O[k] = {}; });
    var val = { make: function (c) { return c.make; }, model: modelName, trim: function (c) { return c.trim; }, body: function (c) { return c.body; }, fuel: function (c) { return c.fuel; }, gear: function (c) { return gear(c.transmission); }, drive: function (c) { return driveFi(c.drivetrain); }, loc: locFi, color: function (c) { return colorFi(c.color); }, doors: doorsOf, steer: steerOf };
    Object.keys(O).forEach(function (k) { cars.forEach(function (c) { var x = val[k](c); if (x) { if (pass(c, k)) O[k][x] = 1; } }); });
    O.steer["Vasemmalta ohjattava"] = 1; O.steer["Oikealta ohjattava"] = 1; // molemmat aina valittavissa (Japanin autot oikealta ohjattavia)
    var v = cars.filter(function (c) { return pass(c); });
    var SV = function (c) { return c.saving == null ? -1e9 : c.saving; };
    var HT = function (c) { return Math.round(taxAcc(c).pct * 10); };
    var S = { save: function (a, b) { return (HT(a) - HT(b)) || SV(b) - SV(a); }, saveonly: function (a, b) { return SV(b) - SV(a); }, rare: function (a, b) { return (a.fleet || 0) - (b.fleet || 0) || SV(b) - SV(a); }, low: function (a, b) { return a.total.mid - b.total.mid; }, high: function (a, b) { return b.total.mid - a.total.mid; }, new: function (a, b) { return b.year - a.year || a.km - b.km; }, old: function (a, b) { return a.year - b.year || a.km - b.km; }, km: function (a, b) { return a.km - b.km; } };
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
    var good = cars.filter(function (c) { return pass(c, "good") && ok(c); }).length, rareN = cars.filter(function (c) { return pass(c, "rare") && isRare(c); }).length;
    root.innerHTML =
      '<div class="top"><div><h1>Autot USA:sta Suomeen</h1><p>Jokaiselle autolle on laskettu koko hinta Suomessa rekisteröitynä: kuljetus, tulli, ALV, autovero ja rekisteröinti. Suomen hintaa halvemmat autot näytetään ensin. Vertailuhinta on Verohallinnon arvio vastaavan auton hinnasta Suomessa, ja liikennemäärä on Traficomin rekisteristä.</p></div></div>' +
      (DATA.mock ? '<div class="note">Testidata: nämä neljä autoa ovat esimerkkejä hakuohjelman testaamiseen.</div>' : "") +
      '<div class="bar' + (OPEN ? " open" : "") + '">' +
      cb("q", "Hakusana", {}) + cb("make", "Kaikki merkit", O.make) + cb("model", "Kaikki mallit", O.model) + cb("fuel", "Kaikki käyttövoimat", O.fuel) +
      '<select id="xl-sort" aria-label="Järjestys"><option value="save">Pienin heitto ensin</option><option value="saveonly">Suurin säästö</option><option value="rare">Harvinaisin Suomessa</option><option value="low">Halvin ensin</option><option value="high">Kallein ensin</option><option value="new">Uusin ensin</option><option value="old">Vanhin ensin</option><option value="km">Vähiten ajettu</option></select>' +
      '<div class="ext">' +
      cb("trim", "Mallitarkennus", O.trim) + cb("body", "Korimalli", O.body) + cb("gear", "Vaihteisto", O.gear) + cb("drive", "Veto", O.drive) + cb("loc", "Sijainti", O.loc) + cb("color", "Väri", O.color) + rb("kmin", "kmax", "Mittarilukema", "km") +
      rb("pmin", "pmax", "Yht. hinta", "€") + rb("ymin", "ymax", "Vuosimalli", "") + rb("dmin", "dmax", "Moottorin tilavuus", "l") +
      "</div>" +
      '<label class="tg"><input type="checkbox" id="xl-good"' + (F.good ? " checked" : "") + "> Vain Suomen hintaa halvemmat (" + good + ")</label>" +
      '<label class="tg"><input type="checkbox" id="xl-rare"' + (F.rare ? " checked" : "") + "> Vain harvinaiset (alle " + RARE + " Suomessa) (" + rareN + ")</label>" +
      '<button type="button" class="moref" id="xl-more" aria-expanded="' + OPEN + '">' + (OPEN ? "Näytä vähemmän suodattimia" : "Näytä lisää suodattimia") + (nExtra ? " (" + nExtra + " valittu)" : "") + "</button>" +
      '<div class="tech">' +
      rb("hpmin", "hpmax", "Teho", "hv") + nb("co2max", "CO₂-päästöt max g/km", CO) + nb("smin", "Henkilömäärä vähintään", SE) +
      cb("doors", "Ovien lukumäärä", O.doors) + cb("steer", "Ohjauslaite", O.steer) + nb("cmax", "Kulutus max l/100 km", CN) + nb("emax", "Sähkö max kWh/100 km", EN) + nb("rmin", "Toimintamatka min km", RA) +
      "</div></div>" +
      '<p class="cnt">' + (v.length < cars.length ? "Näytetään " + v.length + " / " + cars.length + ' autoa · <button type="button" id="xl-clear" class="clr">Tyhjennä suodattimet</button>' : v.length + " autoa") + " · päivitetty " + new Date(DATA.updated).toLocaleDateString("fi-FI") + "</p>" +
      (v.length ? '<div class="grid">' + v.map(card).join("") + "</div>" : '<div class="empty">Valituilla ehdoilla ei löytynyt autoja.</div>');
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
    var clr = root.querySelector("#xl-clear"); if (clr) clr.addEventListener("click", function () { TXT.concat(NUM).forEach(function (k) { F[k] = ""; }); F.good = false; F.rare = false; list(); });
    root.querySelector("#xl-rare").addEventListener("change", function (e) { F.rare = e.target.checked; keep(); list(); });
  }
  // Suomen hintataso vaihteluvälinä (verotusarvon 80 %:n väli, pyöristys 100 €)
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
  function card(c) {
    return '<a class="car" href="' + esc(LISTURL) + '#' + esc(c.id) + '"><h3>' + esc(c.title) + '</h3><p class="spec">' + [fmt(c.km) + " km", c.fuel, c.hp ? c.hp + " hv" : "", c.body || c.engine].filter(Boolean).map(esc).join(" · ") + "</p>" + photo(c, null) +
      '<div class="price"><b>' + rng(c.total.lo, c.total.hi) + "</b></div><div class=\"badges\">" + saveBadge(c) + "</div>" +
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
      line("Velon palvelumaksu", "Auton haku, tarkastus, kaupat, kuljetus ja paperit", eur(R.fee)) +
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
    root.innerHTML = '<div class="grid">' + pick.map(card).join("") + '</div><div class="more"><a href="' + esc(LISTURL) + '">Näytä kaikki autot</a></div>';
  }
  // Etusivun hakulomake välittää valinnat osoitteessa: /autot/?make=Porsche&pmax=60000&body=Sedan|Coupé&open=1
  (function () {
    try {
      var u = new URLSearchParams(location.search);
      TXT.concat(NUM).forEach(function (k) { var x = u.get(k); if (x) F[k] = x; });
      if (u.get("open") === "1") OPEN = true;
      var anyExtra = EXTRA.concat(TECH).some(function (k) { return F[k]; });
      if (anyExtra) OPEN = true;
    } catch (e) {}
  })();
  function route() {
    if (!DATA) return;
    if (MODE === "featured") { featured(); return; }
    var id = decodeURIComponent(location.hash.slice(1));
    var c = id && DATA.cars.filter(function (x) { return x.id === id; })[0];
    if (c) detail(c); else list();
  }
  if (MODE !== "featured") window.addEventListener("hashchange", route);
  root.innerHTML = '<div class="empty">Ladataan autoja…</div>';
  fetch(base + "data/listings.json?t=" + Math.floor(Date.now() / 60000), { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) { DATA = j; route(); })
    .catch(function () { root.innerHTML = '<div class="empty">Ilmoitusten lataus epäonnistui. Lataa sivu uudelleen.</div>'; });
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

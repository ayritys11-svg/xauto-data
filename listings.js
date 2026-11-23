/* X-auto: autoilmoitukset (lista + yksittäinen ilmoitus). Data: data/listings.json */
(function () {
  var root = document.querySelector(".xl"); if (!root) return;
  var base = root.dataset.base || "", tarjous = root.dataset.offer || "/pyyda-tarjous/";
  var DATA = null, F = { make: "", fuel: "", sort: "save", good: false };
  // Muistetaan vain järjestys, ei suodattimia (muuten kävijä näkee vain osan autoista eikä tiedä miksi)
  try { localStorage.removeItem("xl-f"); var so = localStorage.getItem("xl-sort"); if (so) F.sort = so; } catch (e) {}

  function fmt(n) { return new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 0 }).format(Math.round(n)); }
  function eur(n) { return fmt(n) + " €"; }
  function rng(a, b) { return Math.round(a) === Math.round(b) ? eur(a) : fmt(a) + "–" + fmt(b) + " €"; }
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
  function conf(c) {
    var t = c.total || {}, mid = (t.lo + t.hi) / 2, pct = mid ? Math.round((t.hi - t.lo) / 2 / mid * 100) : null;
    return '<span class="conf ' + c.confidence + '" title="Loppuhinnan vaihteluväli keskiarvosta"><i></i>' + CONF[c.confidence] + (pct != null ? " · heitto ±" + pct + " %" : "") + "</span>";
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
    var S = { save: function (a, b) { return SV(b) - SV(a); }, rare: function (a, b) { return (a.fleet || 0) - (b.fleet || 0) || SV(b) - SV(a); }, low: function (a, b) { return a.total.mid - b.total.mid; }, high: function (a, b) { return b.total.mid - a.total.mid; }, new: function (a, b) { return b.year - a.year || a.km - b.km; }, km: function (a, b) { return a.km - b.km; } };
    v.sort(S[F.sort] || S.save);
    function dl(id, o) { return '<datalist id="' + id + '">' + Object.keys(o).sort().map(function (k) { return '<option value="' + esc(k) + '">'; }).join("") + "</datalist>"; }
    function opts(o, cur, all) { return '<option value="">' + all + "</option>" + Object.keys(o).sort().map(function (k) { return '<option' + (k === cur ? " selected" : "") + ">" + esc(k) + "</option>"; }).join(""); }
    var good = cars.filter(ok).length;
    root.innerHTML =
      '<div class="top"><div><h1>Autot USA:sta Suomeen</h1><p>Jokaiselle autolle on laskettu koko hinta Suomessa rekisteröitynä: kuljetus, tulli, ALV, autovero ja rekisteröinti. Suomen hintaa halvemmat autot näytetään ensin. Vertailuhinta on Verohallinnon arvio vastaavan auton hinnasta Suomessa, ja liikennemäärä on Traficomin rekisteristä. Autot ovat New Yorkin ja New Jerseyn autoliikkeistä.</p></div></div>' +
      (DATA.mock ? '<div class="note">Testidata: nämä neljä autoa ovat esimerkkejä hakuohjelman testaamiseen. Oikeat ilmoitukset päivittyvät tähän joka yö, kun API-avain on otettu käyttöön.</div>' : "") +
      '<div class="bar"><div class="cb"><input id="xl-make" list="xl-makes" autocomplete="off" placeholder="Kaikki merkit (kirjoita tai valitse)" aria-label="Merkki" value="' + esc(F.make) + '">' + (F.make ? '<button type="button" class="x" data-k="make" aria-label="Tyhjennä merkki">×</button>' : "") + dl("xl-makes", makes) + "</div>" +
      '<div class="cb"><input id="xl-fuel" list="xl-fuels" autocomplete="off" placeholder="Kaikki käyttövoimat (kirjoita tai valitse)" aria-label="Käyttövoima" value="' + esc(F.fuel) + '">' + (F.fuel ? '<button type="button" class="x" data-k="fuel" aria-label="Tyhjennä käyttövoima">×</button>' : "") + dl("xl-fuels", fuels) + "</div>" +
      '<select id="xl-sort" aria-label="Järjestys"><option value="save">Suurin säästö</option><option value="rare">Harvinaisin Suomessa</option><option value="low">Halvin ensin</option><option value="high">Kallein ensin</option><option value="new">Uusin ensin</option><option value="km">Vähiten ajettu</option></select>' +
      (good < cars.length ? '<label class="tg"><input type="checkbox" id="xl-good"' + (F.good ? " checked" : "") + "> Vain Suomen hintaa halvemmat (" + good + ")</label>" : "") +
      '<label class="tg"><input type="checkbox" id="xl-rare"' + (F.rare ? " checked" : "") + "> Vain harvinaiset (alle " + RARE + " Suomessa) (" + cars.filter(isRare).length + ")</label></div>" +
      '<p class="cnt">' + (v.length < cars.length ? "Näytetään " + v.length + " / " + cars.length + ' autoa · <button type="button" id="xl-clear" class="clr">Tyhjennä suodattimet</button>' : v.length + " autoa") + " · päivitetty " + new Date(DATA.updated).toLocaleDateString("fi-FI") + " · dollarin kurssi " + String(DATA.fx.rate).replace(".", ",") + "</p>" +
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
    return '<a class="car" href="#' + esc(c.id) + '"><h3>' + esc(c.title) + '</h3><p class="spec">' + [c.fuel, c.engine, fmt(c.km) + " km"].filter(Boolean).map(esc).join(" · ") + "</p>" + photo(c, null) +
      '<div class="price"><b>' + rng(c.total.lo, c.total.hi) + "</b></div><div class=\"badges\">" + saveBadge(c) + "</div>" +
      '<div class="row"><span>Hinta USA:ssa</span><b>' + fmt(c.priceUsd) + " $</b></div>" +
      (c.fleet != null && !isRare(c) ? '<div class="row"><span>Suomessa liikenteessä</span><b>' + fleetTxt(c) + "</b></div>" : "") +
      '<div class="row"><span>Autovero (arvio)</span><b>' + (c.autovero.avg === 0 ? "0 €" : eur(c.autovero.avg)) + "</b></div>" +
      (isRare(c) ? "" : '<div class="row"><span>Vastaava auto Suomessa</span><b>' + fiR(c) + "</b></div>") + conf(c) + "</a>";
  }

  function line(t, d, v, chip) { return '<div class="ln"><div class="t">' + t + (chip ? '<span class="chip">' + chip + "</span>" : "") + '</div><div class="d">' + d + '</div><div class="v">' + v + "</div></div>"; }
  function detail(c) {
    var R = c.rows, A = c.autovero;
    var s1 =
      line("Auton hinta", fmt(c.priceUsd) + " $, kurssi 1 € = " + String(c.fx).replace(".", ",") + " $", eur(R.car)) +
      line("Kuljetus " + (origin(c).indexOf("KANADA") === 0 ? "Kanadasta" : "USA:sta") + " Suomeen", "Rahti ja vakuutus Suomen satamaan" + (c.city || c.state ? ", lähtö " + esc([c.city, c.state].filter(Boolean).join(", ")) : ""), rng(R.ship, R.shipHi), "arvio") +
      line("Tulli 0–10 %", R.usOrigin ? "USA:ssa valmistettu (VIN alkaa " + esc(c.vin.charAt(0)) + "): 0 % alkuperätodistuksella (EU 2026/1455), muuten 10 %" : "Valmistettu muualla kuin USA:ssa (VIN alkaa " + esc(c.vin.charAt(0)) + "): 10 %", rng(R.duty[0], R.duty[1])) +
      line("Huolinta ja satamamaksut", "Tullaus ja käsittely", eur(R.huolinta), "arvio") +
      line("Arvonlisävero 25,5 %", "Auton, kuljetuksen, tullin ja huolinnan päälle", rng(R.vat[0], R.vat[1])) +
      line("Katsastus ja rekisteröinti", "Rekisteröintikatsastus, yksittäishyväksyntä, kilvet", eur(R.reg), "arvio") +
      line("X-auton palvelumaksu", "Auton haku, tarkastus, kaupat, kuljetus ja paperit", eur(R.fee)) +
      line("Autovero", "Arvio, erittely alla", A.avg === 0 ? "0 €" : rng(R.tax[0], R.tax[1]));
    var s2;
    if (A.p === 0) {
      s2 = line("Veroprosentti", esc(A.pSrc), "0 %") + '<div class="ln sum"><div class="t">Autovero</div><div class="v">0 €</div></div>';
    } else {
      s2 = line("Verotusarvo", esc(A.level) + ". " + (A.n && !/päätös/.test(A.level) ? A.n + " päätöstä. " : "") + "Tyypillinen heitto ±" + pc((A.s * 100).toFixed(1)), eur(A.V)) +
        line("a) CO₂-laskenta", "CO₂ " + A.co2 + " g/km (" + esc(A.co2src) + ") → " + esc(A.pSrc) + " " + pc(A.p), eur(A.a)) +
        (A.same ? line("b) Valmiit autoveropäätökset", A.same.n + " päätöstä samasta mallista ja teholla (" + A.kw + " kW). Mediaani " + pc(A.same.p) + " (vaihtelu " + pc(A.same.lo) + "–" + pc(A.same.hi) + ")", eur(A.b)) :
          line("b) Valmiit autoveropäätökset", "Samasta autosta ei ole riittävästi päätöksiä vertailuun. Arvio perustuu CO₂-laskentaan.", "–")) +
        '<div class="ln sum"><div class="t">Autoveroarvio</div><div class="d">' + (A.same ? "a- ja b-tavan keskiarvo, " : "") + "vaihteluväli " + rng(R.tax[0], R.tax[1]) + '</div><div class="v">' + eur(A.avg) + "</div></div>";
    }
    var facts = [["Vuosimalli", c.year], ["Ajettu", fmt(c.km) + " km"], ["Moottori", c.engine], ["Käyttövoima", c.fuel], ["Teho (Veron tiedoista)", A.kw ? A.kw + " kW" : "–"], ["Vaihteisto", gear(c.transmission)], ["Suomessa liikenteessä (Traficom 9/2026)", c.fleet != null ? fleetTxt(c) : ""], ["Sijainti", [c.city, c.state].filter(Boolean).join(", ")], ["Veto", c.drivetrain], ["VIN", c.vin]]
      .filter(function (f) { return f[1]; }).map(function (f) { return "<div><span>" + f[0] + "</span><b>" + esc(f[1]) + "</b></div>"; }).join("");
    root.innerHTML =
      '<a class="back" href="#">← Kaikki autot</a>' +
      '<div class="hd">' + gallery(c) + '<div class="info"><h1>' + esc(c.title) + '</h1><p class="spec">' + [fmt(c.km) + " km", c.fuel, c.engine, c.drivetrain].filter(Boolean).map(esc).join(" · ") + "</p>" +
      '<div><small style="color:var(--muted)">Hinta Suomessa rekisteröitynä</small><div class="big">' + rng(c.total.lo, c.total.hi) + "</div></div>" + saveBadge(c) + conf(c) +
      '<a class="cta" href="' + esc(tarjous) + "?auto=" + encodeURIComponent(c.vin) + '">Pyydä sitova tarjous</a>' +
      "</div></div>" +
      '<section class="sec"><h2><b>1</b>Mistä hinta koostuu</h2>' + s1 + "</section>" +
      '<section class="sec"><h2><b>2</b>Mistä autoveroarvio koostuu</h2><p class="lead">Autovero = verotusarvo × veroprosentti. Verotusarvo on arvioitu Verohallinnon omista päätöksistä, veroprosentti CO₂-taulukosta ja valmiista päätöksistä.</p>' + s2 +
      (c.warnings.length ? '<ul class="warn">' + c.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : "") + "</section>" +
      '<section class="sec"><h2><b>3</b>Loppuhinta ja vertailu Suomeen</h2><div class="cmp"><div><small>Tuotuna ja rekisteröitynä</small><b>' + rng(c.total.lo, c.total.hi) + "</b></div><div><small>" + (isRare(c) ? "Verotusarvo (arvio)" : "Vastaava auto Suomessa (Veron verotusarvo)") + "</small><b>" + (isRare(c) ? rng(Math.round(c.autovero.VLo / 100) * 100, Math.round(c.autovero.VHi / 100) * 100) : fiR(c)) + "</b></div>" + (isRare(c) ? '<div class="rare"><small>Suomessa liikenteessä (Traficom 9/2026)</small><b>' + (c.fleet === 0 ? "Ei yhtään" : fmt(c.fleet) + " kpl") + "</b>" : c.saving == null ? "<div><small>Ero</small><b>–</b>" : "<div><small>Ero keskiarvolla</small><b style=\"color:" + (c.saving > 0 ? "var(--good)" : "var(--bad)") + '">' + (c.saving > 0 ? "−" : "+") + eur(Math.abs(c.saving)) + "</b>") + "</div></div>" +
      '<p class="lead" style="margin-top:12px">Alaraja: tulli 0 % (jos mahdollista) ja autovero alarajalla. Yläraja: tulli 10 %, autovero ylärajalla ja kuljetus 15 % arvioitua kalliimpi. Verohallinto päättää lopullisen autoveron. Arvio-merkityt kulut tarkentuvat tarjouksessa.</p></section>' +
      '<section class="sec"><h2>Tiedot</h2><div class="facts">' + facts + "</div></section>";
    bindGallery(c);
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
    var x0 = null; main.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener("touchend", function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  function route() {
    if (!DATA) return;
    var id = decodeURIComponent(location.hash.slice(1));
    var c = id && DATA.cars.filter(function (x) { return x.id === id; })[0];
    if (c) detail(c); else list();
  }
  window.addEventListener("hashchange", route);
  root.innerHTML = '<div class="empty">Ladataan autoja…</div>';
  fetch(base + "data/listings.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) { DATA = j; route(); })
    .catch(function () { root.innerHTML = '<div class="empty">Ilmoitusten lataus epäonnistui. Lataa sivu uudelleen.</div>'; });
})();

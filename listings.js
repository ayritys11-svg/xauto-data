/* X-auto: autoilmoitukset (lista + yksittäinen ilmoitus). Data: data/listings.json */
(function () {
  var root = document.querySelector(".xl"); if (!root) return;
  var base = root.dataset.base || "", tarjous = root.dataset.offer || "/pyyda-tarjous/";
  var DATA = null, F = { make: "", fuel: "", sort: "save", good: false };
  try { var sv = JSON.parse(localStorage.getItem("xl-f") || "null"); if (sv) F = Object.assign(F, sv); } catch (e) {}

  function fmt(n) { return new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 0 }).format(Math.round(n)); }
  function eur(n) { return fmt(n) + " €"; }
  function rng(a, b) { return Math.round(a) === Math.round(b) ? eur(a) : fmt(a) + "–" + fmt(b) + " €"; }
  function pc(n) { return String(n).replace(".", ",") + " %"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var CAR = '<svg viewBox="0 0 120 50" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 36v-7l10-3 14-14h44l16 14 18 2 6 8"/><path d="M6 36h108"/><circle cx="32" cy="38" r="7" fill="#EEF0F3"/><circle cx="90" cy="38" r="7" fill="#EEF0F3"/></svg>';
  function photo(c, tag) {
    var img = c.img ? '<img src="' + esc(c.img) + '" alt="' + esc(c.title) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createRange().createContextualFragment(window.__xlCar))">' : CAR;
    return '<div class="ph">' + img + (tag ? '<span class="tag">' + esc(tag) + "</span>" : "") + "</div>";
  }
  window.__xlCar = CAR;
  var CONF = { korkea: "Tarkka arvio", keskitaso: "Kohtalainen tarkkuus", matala: "Epävarma arvio" };
  function conf(c) { return '<span class="conf ' + c.confidence + '"><i></i>' + CONF[c.confidence] + "</span>"; }
  function saveBadge(c) {
    if (c.saving > 0 && c.sure === false) return '<span class="sv u">Mahdollisesti ' + eur(c.saving) + " halvempi</span>";
    return c.saving > 0 ? '<span class="sv g">' + eur(c.saving) + " halvempi</span>" : '<span class="sv b">' + eur(-c.saving) + " kalliimpi</span>";
  }
  function origin(c) { return c.state === "ON" || c.state === "QC" || c.state === "BC" || c.state === "AB" ? "KANADA" : "USA" + (c.state ? " · " + c.state : ""); }

  function list() {
    var cars = DATA.cars.slice();
    var makes = {}, fuels = {};
    cars.forEach(function (c) { makes[c.make] = 1; fuels[c.fuel] = 1; });
    var v = cars.filter(function (c) { return (!F.make || c.make === F.make) && (!F.fuel || c.fuel === F.fuel) && (!F.good || ok(c)); });
    var S = { save: function (a, b) { return b.saving - a.saving; }, low: function (a, b) { return a.total.mid - b.total.mid; }, high: function (a, b) { return b.total.mid - a.total.mid; }, new: function (a, b) { return b.year - a.year || a.km - b.km; }, km: function (a, b) { return a.km - b.km; } };
    v.sort(S[F.sort] || S.save);
    function opts(o, cur, all) { return '<option value="">' + all + "</option>" + Object.keys(o).sort().map(function (k) { return '<option' + (k === cur ? " selected" : "") + ">" + esc(k) + "</option>"; }).join(""); }
    var good = cars.filter(ok).length;
    root.innerHTML =
      '<div class="top"><div><h1>Autot USA:sta ja Kanadasta</h1><p>Jokaiselle autolle on laskettu koko hinta Suomessa rekisteröitynä: kuljetus, tulli, ALV, autovero ja rekisteröinti. Vertailuhinta on Verohallinnon arvio vastaavan auton hinnasta Suomessa.</p></div></div>' +
      (DATA.mock ? '<div class="note">Testidata: nämä neljä autoa ovat esimerkkejä hakuohjelman testaamiseen. Oikeat ilmoitukset päivittyvät tähän joka yö, kun API-avain on otettu käyttöön.</div>' : "") +
      '<div class="bar"><select id="xl-make" aria-label="Merkki">' + opts(makes, F.make, "Kaikki merkit") + '</select><select id="xl-fuel" aria-label="Käyttövoima">' + opts(fuels, F.fuel, "Kaikki käyttövoimat") + '</select>' +
      '<select id="xl-sort" aria-label="Järjestys"><option value="save">Suurin säästö</option><option value="low">Halvin ensin</option><option value="high">Kallein ensin</option><option value="new">Uusin ensin</option><option value="km">Vähiten ajettu</option></select>' +
      '<label class="tg"><input type="checkbox" id="xl-good"' + (F.good ? " checked" : "") + "> Vain varmasti Suomen hintaa halvemmat (" + good + ")</label></div>" +
      '<p class="cnt">' + v.length + " autoa · päivitetty " + new Date(DATA.updated).toLocaleDateString("fi-FI") + " · dollarin kurssi " + String(DATA.fx.rate).replace(".", ",") + "</p>" +
      (v.length ? '<div class="grid">' + v.map(card).join("") + "</div>" : '<div class="empty">Valituilla ehdoilla ei löytynyt autoja.</div>');
    root.querySelector("#xl-sort").value = F.sort;
    ["make", "fuel", "sort"].forEach(function (k) { root.querySelector("#xl-" + k).addEventListener("change", function (e) { F[k] = e.target.value; keep(); list(); }); });
    root.querySelector("#xl-good").addEventListener("change", function (e) { F.good = e.target.checked; keep(); list(); });
  }
  function ok(c) { return c.sure === undefined ? c.saving > 0 : c.sure; }
  function keep() { try { localStorage.setItem("xl-f", JSON.stringify(F)); } catch (e) {} }
  function card(c) {
    return '<a class="car" href="#' + esc(c.id) + '"><h3>' + esc(c.title) + '</h3><p class="spec">' + [c.fuel, c.engine, fmt(c.km) + " km"].filter(Boolean).map(esc).join(" · ") + "</p>" + photo(c, origin(c)) +
      '<div class="price"><b>' + rng(c.total.lo, c.total.hi) + "</b>" + saveBadge(c) + "</div>" +
      '<div class="row"><span>Hinta USA:ssa</span><b>' + fmt(c.priceUsd) + " $</b></div>" +
      '<div class="row"><span>Autovero (arvio)</span><b>' + (c.autovero.avg === 0 ? "0 €" : eur(c.autovero.avg)) + "</b></div>" +
      '<div class="row"><span>Vastaava auto Suomessa</span><b>' + eur(c.fiPrice) + "</b></div>" + conf(c) + "</a>";
  }

  function line(t, d, v, chip) { return '<div class="ln"><div class="t">' + t + (chip ? '<span class="chip">' + chip + "</span>" : "") + '</div><div class="d">' + d + '</div><div class="v">' + v + "</div></div>"; }
  function detail(c) {
    var R = c.rows, A = c.autovero;
    var s1 =
      line("Auton hinta", fmt(c.priceUsd) + " $, kurssi 1 € = " + String(c.fx).replace(".", ",") + " $", eur(R.car)) +
      line("Kuljetus " + (origin(c).indexOf("KANADA") === 0 ? "Kanadasta" : "USA:sta") + " Suomeen", "Rahti ja vakuutus Suomen satamaan" + (c.state ? ", lähtö " + esc(c.state) : ""), rng(R.ship, R.shipHi), "arvio") +
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
    var facts = [["Vuosimalli", c.year], ["Ajettu", fmt(c.km) + " km (" + fmt(c.miles) + " mi)"], ["Moottori", c.engine], ["Käyttövoima", c.fuel], ["Teho (Veron tiedoista)", A.kw ? A.kw + " kW" : "–"], ["Vaihteisto", c.transmission], ["Veto", c.drivetrain], ["Myyjä", [c.dealer, c.city, c.state].filter(Boolean).join(", ")], ["VIN", c.vin]]
      .filter(function (f) { return f[1]; }).map(function (f) { return "<div><span>" + f[0] + "</span><b>" + esc(f[1]) + "</b></div>"; }).join("");
    root.innerHTML =
      '<a class="back" href="#">← Kaikki autot</a>' +
      '<div class="hd">' + gallery(c) + '<div class="info"><h1>' + esc(c.title) + '</h1><p class="spec">' + [fmt(c.km) + " km", c.fuel, c.engine, c.drivetrain].filter(Boolean).map(esc).join(" · ") + "</p>" +
      '<div><small style="color:var(--muted)">Hinta Suomessa rekisteröitynä</small><div class="big">' + rng(c.total.lo, c.total.hi) + "</div></div>" + saveBadge(c) + conf(c) +
      '<a class="cta" href="' + esc(tarjous) + "?auto=" + encodeURIComponent(c.vin) + '">Pyydä sitova tarjous</a>' +
      (c.vdp ? '<a href="' + esc(c.vdp) + '" target="_blank" rel="noopener" style="font-size:13.5px">Alkuperäinen ilmoitus myyjän sivulla ↗</a>' : "") + "</div></div>" +
      '<section class="sec"><h2><b>1</b>Mistä hinta koostuu</h2>' + s1 + "</section>" +
      '<section class="sec"><h2><b>2</b>Mistä autoveroarvio koostuu</h2><p class="lead">Autovero = verotusarvo × veroprosentti. Verotusarvo on arvioitu Verohallinnon omista päätöksistä, veroprosentti CO₂-taulukosta ja valmiista päätöksistä.</p>' + s2 +
      (c.warnings.length ? '<ul class="warn">' + c.warnings.map(function (w) { return "<li>" + esc(w) + "</li>"; }).join("") + "</ul>" : "") + "</section>" +
      '<section class="sec"><h2><b>3</b>Loppuhinta ja vertailu Suomeen</h2><div class="cmp"><div><small>Tuotuna ja rekisteröitynä</small><b>' + rng(c.total.lo, c.total.hi) + "</b></div><div><small>Vastaava auto Suomessa (Veron verotusarvo)</small><b>" + eur(c.fiPrice) + "</b></div><div><small>Ero keskiarvolla</small><b style=\"color:" + (c.saving > 0 ? "var(--good)" : "var(--bad)") + '">' + (c.saving > 0 ? "−" : "+") + eur(Math.abs(c.saving)) + "</b></div></div>" +
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

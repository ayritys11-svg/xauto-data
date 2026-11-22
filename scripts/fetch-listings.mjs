// X-auto: hakee autoilmoitukset auto.devistä, laskee jokaiselle hinnan Suomeen
// (kuljetus, tulli, ALV, autovero, rekisteröinti, palvelumaksu) ja kirjoittaa data/listings.json.
// Ajo: AUTODEV_KEY=... node scripts/fetch-listings.mjs   (tai --mock testidatalla)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEngine } from "./engine.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "config/settings.json"), "utf8"));
const Q = JSON.parse(fs.readFileSync(path.join(ROOT, "config/searches.json"), "utf8")).searches;
const KEY = process.env.AUTODEV_KEY || "";
const MOCK = process.argv.includes("--mock");
const DBG = process.argv.includes("--debug");
const today = new Date();

const X = loadEngine(ROOT);
const M = X.M();
const CORE = JSON.parse(fs.readFileSync(path.join(ROOT, "data/autovero_core.json"), "utf8"));
const C2 = JSON.parse(fs.readFileSync(path.join(ROOT, "data/co2_table.json"), "utf8"));

const up = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, " ");
const r0 = (n) => Math.round(n);
const r10 = (n) => Math.round(n / 10) * 10;
const r100 = (n) => Math.round(n / 100) * 100;

async function usdEur() {
  try {
    const t = await (await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml")).text();
    const m = t.match(/currency='USD' rate='([\d.]+)'/);
    const d = t.match(/time='(\d{4}-\d{2}-\d{2})'/);
    if (m) return { rate: +m[1], date: d ? d[1] : today.toISOString().slice(0, 10), src: "EKP" };
  } catch (e) {}
  return { rate: S.usdEurFallback, date: "oletus", src: "asetukset" };
}

async function search(q) {
  const out = [];
  for (let page = 1; page <= (q.pages || 1); page++) {
    const p = new URLSearchParams({ "vehicle.make": q.make, "vehicle.model": q.model, "vehicle.year": q.year, page: String(page), limit: "20" });
    if (q.price) p.set("retailListing.price", q.price);
    p.set("retailListing.miles", "1-" + S.maxMailit);
    const url = "https://api.auto.dev/listings?" + p.toString();
    const res = await fetch(url, { headers: { Authorization: "Bearer " + KEY } });
    if (!res.ok) { console.error("HTTP", res.status, url, (await res.text()).slice(0, 300)); break; }
    const j = await res.json();
    const d = Array.isArray(j.data) ? j.data : [];
    out.push(...d);
    if (d.length < 20) break;
  }
  return out;
}

// Polttoaine: auto.dev -> Veron käyttövoima ja Traficomin tyyppikoodi
function fuelOf(v) {
  const f = up(v.fuel) + " " + up(v.model) + " " + up(v.trim) + " " + up(v.engine);
  if (/ELECTRIC|\bEV\b|BEV/.test(f) && !/HYBRID|PLUG/.test(f)) return { fu: "Sähkö", t: "E", ev: true, fi: "Sähkö" };
  if (/PLUG|PHEV|PRIME|4XE|ENERGI|RECHARGE/.test(f)) return { fu: "Bensiini ja sähkö", t: "PB", phev: true, fi: "Lataushybridi" };
  if (/HYBRID|\d{3}H\b/.test(f)) return { fu: "Bensiini ja sähkö", t: "HB", fi: "Hybridi" };
  if (/DIESEL/.test(f)) return { fu: "Diesel", t: "D", fi: "Diesel" };
  return { fu: "Bensiini", t: "B", fi: "Bensiini" };
}
function ccOf(v) { const m = String(v.engine || "").match(/(\d\.\d)\s*L/i); return m ? Math.round(+m[1] * 1000) : 0; }
// Veron mallinimi: poistetaan USA:n lisämääreet
function veroModels(model) {
  const m = up(model), list = [m];
  const s = m.replace(/\s+(HYBRID|PLUG-IN HYBRID|PLUG-IN|PRIME|AWD|4XE)$/g, "").trim();
  if (s !== m) list.push(s);
  return list;
}
// Teho (kW) Traficomin rekisteristä: sama merkki, malli, käyttövoima ja iskutilavuus
function kwGuess(mk, models, t, cc, fu) {
  const cnt = {};
  for (const b of ["w", "n"]) for (const k of Object.keys(C2[b])) {
    const p = k.split("|");
    if (p[0] !== mk || !models.some((m) => p[1] === m || p[1].indexOf(m + " ") === 0)) continue;
    if (t && p[2] !== t && !(t === "B" && p[2] === "HB")) continue;
    if (cc && +p[4] && Math.abs(+p[4] - cc) > cc * 0.04) continue;
    if (!(+p[3] > 0)) continue;
    cnt[p[3]] = (cnt[p[3]] || 0) + (C2[b][k][3] || 1);
  }
  const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  if (best) return +best[0];
  // Varalla: Veron päätösryhmä (merkki|malli|kW/10), jossa eniten päätöksiä
  let bk = -1, bn = 0;
  for (const src of [CORE.wf, CORE.w, CORE.g]) for (const k of Object.keys(src || {})) {
    const p = k.split("|");
    if (p[0] !== mk || !models.includes(p[1]) || p.length < 3) continue;
    if (src === CORE.wf && fu && p[3] !== fu) continue;
    if (src[k][0] > bn) { bn = src[k][0]; bk = +p[2]; }
  }
  return bk >= 0 ? bk * 10 + 5 : 0;
}


// EPA-haku: sama merkki, malli, vuosimalli, iskutilavuus, hybridi/ei, veto ja vaihteisto
const EPA = JSON.parse(fs.readFileSync(path.join(ROOT, "data/epa_co2.json"), "utf8")).d;
function epaMatch(mk, v, F, cc, year) {
  const D = EPA[mk]; if (!D) return null;
  const md = up(v.model), words = new Set((md + " " + up(v.trim) + " " + up(v.drivetrain)).split(/[\s\/-]+/));
  const bases = Object.keys(D).filter((b) => md === b || md.indexOf(b + " ") === 0 || b.indexOf(md + " ") === 0 || md.replace(/[\s-]/g, "") === b.replace(/[\s-]/g, ""));
  if (!bases.length) return null;
  const awd = /AWD|4WD|4X4/i.test(v.drivetrain || "") || /AWD|4WD|4X4/.test(md + " " + up(v.trim));
  const man = /MANUAL/i.test(v.transmission || "");
  let R = [];
  for (const b of bases) for (const r of D[b]) {
    if (r[0] !== year) continue;
    if (cc && Math.abs(r[1] * 1000 - cc) > 150) continue;
    const nm = up(r[3]), hy = /HYBRID|\d{3}H\b|PLUG/.test(nm);
    if (!!(F.t === "HB" || F.t === "PB") !== hy && !(F.t === "B" && hy && /HYBRID/.test(md))) continue;
    if (/PLUG|PRIME/.test(nm) !== !!F.phev) continue;
    if ((r[5] === "4WD") !== awd && (r[5] === "4WD" || r[5] === "FWD" || r[5] === "RWD")) continue;
    if (/^M/.test(r[4]) !== man) continue;
    const extra = nm.split(/[\s\/-]+/).filter((w) => w && !words.has(w) && !["AWD","FWD","RWD","4WD","2WD"].includes(w) && !md.includes(w));
    R.push({ v: r[2], ex: extra.length, nm: r[3] });
  }
  if (!R.length) return null;
  const minEx = Math.min(...R.map((r) => r.ex));
  R = R.filter((r) => r.ex === minEx);
  const vs = R.map((r) => r.v).sort((a, b) => a - b);
  const mean = Math.round(vs.reduce((a, b) => a + b, 0) / vs.length);
  return { v: mean, lo: vs[0], hi: vs[vs.length - 1], n: vs.length, src: "EPA " + year + ": " + [...new Set(R.map((r) => r.nm))].join(", ") + (vs.length > 1 ? " (" + vs.length + " versiota, " + vs[0] + "–" + vs[vs.length - 1] + " g/km)" : "") };
}

function calc(L, fx) {
  const v = L.vehicle || {}, rl = L.retailListing || {};
  const vin = v.vin || L.vin;
  const priceUsd = +rl.price || 0, miles = +rl.miles || +rl.mileage || +L.miles || 0;
  const year = +v.year;
  if (!vin || !priceUsd || !year || year < S.minVuosi) { DBG && console.error("perustiedot puuttuu", vin); return null; }
  const mk = up(v.make), F = fuelOf(v), cc = ccOf(v), models = veroModels(v.model);
  const reg = (year - 1) + "-10-01"; // USA:n mallivuosi alkaa tyypillisesti edellisenä syksynä
  const km = Math.round(miles * 1.609344);
  const W = reg >= "2018-09-01"; // WLTP-taulukko vain 1.9.2018 alkaen rekisteröidyille
  const kw = kwGuess(mk, models, F.t, F.ev ? 0 : cc, F.fu);
  const warn = [];

  // 1) CO2 ja veroprosentti
  let co2 = null, co2lo = null, co2hi = null, co2src = "", p = 0, pSrc = "", pA = [0, 0];
  if (F.ev) { p = 0; pSrc = "täyssähköauto 0 %"; co2 = 0; }
  else {
    const e = epaMatch(mk, v, F, cc, year);
    if (e) { co2 = e.v; co2lo = e.lo; co2hi = e.hi; co2src = e.src;
      if (e.hi - e.lo > 10) warn.push("EPA-datassa on tälle autolle useita versioita (" + e.lo + "–" + e.hi + " g/km). Tarkka arvo varmistetaan VIN-numerosta tarjousvaiheessa."); }
    if (co2 == null) { DBG && console.error("ei CO2", vin, mk, v.model); return null; }
    const r = M.rate(reg, co2, W, false);
    if (!r || r.p == null) { DBG && console.error("ei prosenttia", vin, co2); return null; }
    p = r.p; pSrc = r.src;
    pA = [M.rate(reg, co2lo, W, false).p, M.rate(reg, co2hi, W, false).p];
    if (F.phev) warn.push("Lataushybridin CO₂ tarkistetaan erikseen: EPA:n arvo ei suoraan vastaa EU-mittausta.");
  }

  // 2) Verotusarvo (paras malli-nimi = pienin hajonta)
  let best = null;
  for (const md of models) {
    const e = M.estimate({ reg, co2: co2 || 0, wltp: W, ev: !!F.ev, make: mk, model: md, kw, km, fu: F.fu });
    if (e && !e.error && e.V && (!best || e.s < best.s)) best = Object.assign(e, { md });
  }
  if (F.ev) {
    for (const md of models) {
      const e = M.estimate({ reg, co2: 100, wltp: W, ev: false, make: mk, model: md, kw, km, fu: F.fu });
      if (e && !e.error && e.V && (!best || e.s < (best.s || 9))) best = Object.assign(e, { md });
    }
  }
  if (!best) { DBG && console.error("ei verotusarvoa", vin, models); return null; }
  const V = best.V, VLo = best.VLow, VHi = best.VHigh;

  // 3) Valmiit autoveropäätökset samasta autosta (vain veroprosentin varmistus)
  let same = null;
  if (!F.ev && kw) {
    const names = [...new Set([...models, X.anResolve(mk, best.md, kw)].filter(Boolean))];
    for (const nm of names) { const s = X.sameCar(mk, nm, kw, reg); if (s && s.p != null && s.n >= 3 && (!same || s.n > same.n)) same = { p: s.p, n: s.n, lo: s.lo, hi: s.hi }; }
  }

  const taxA = V * p / 100, taxB = same ? V * same.p / 100 : null;
  const tax = taxB != null ? (taxA + taxB) / 2 : taxA;
  const pLo = Math.min(p, pA[0], same ? same.p : p), pHi = Math.max(p, pA[1], same ? same.p : p);
  const taxLo = VLo * pLo / 100, taxHi = VHi * pHi / 100;

  // 4) Hintaerittely
  const st = String(rl.state || "").toUpperCase();
  const ship = S.lansiosavaltiot.includes(st) ? S.kuljetus.lansi : S.kuljetus.ita;
  const car = priceUsd / fx.rate;
  const usOrigin = /^[145]/.test(vin);
  const dutyLo = usOrigin ? 0 : (car + ship) * S.tulli, dutyHi = (car + ship * S.kuljetusYlarajaKerroin) * S.tulli;
  const vatLo = (car + ship + dutyLo + S.huolinta) * S.alv, vatHi = (car + ship * S.kuljetusYlarajaKerroin + dutyHi + S.huolinta) * S.alv;
  const fixed = S.huolinta + S.katsastusJaRekisterointi + S.palvelumaksu;
  const totLo = car + ship + dutyLo + vatLo + fixed + taxLo;
  const totHi = car + ship * S.kuljetusYlarajaKerroin + dutyHi + vatHi + fixed + taxHi;
  const totMid = car + ship + (dutyLo + dutyHi) / 2 + (vatLo + vatHi) / 2 + fixed + tax;

  // 5) Suomen hintataso = verotusarvo (Veron arvio vastaavan auton yleisestä myyntihinnasta Suomessa)
  const saving = V - totMid;
  const sPct = best.s;
  const outside = (best.warnings || []).some((w) => /vanhempi kuin|suuremmat kuin|ulkopuolelle/.test(w));
  const conf = F.phev || sPct > 0.15 || !kw || best.w3 || outside ? "matala" : sPct > 0.07 ? "keskitaso" : "korkea";
  if (!kw && !F.ev) warn.push("Moottorin tehoa ei löytynyt Traficomin rekisteristä. Verotusarvo on arvioitu koko mallin päätöksistä, joten vaihteluväli on leveä.");
  if (best.warnings) warn.push(...best.warnings.filter((w) => !/tulkittiin/.test(w)));

  return {
    id: vin, vin, year, make: v.make, model: v.model, trim: v.trim || "",
    title: [year, v.make, v.model, v.trim].filter(Boolean).join(" "),
    miles, km, engine: v.engine || "", fuel: F.fi, drivetrain: v.drivetrain || "", transmission: v.transmission || "",
    img: rl.primaryImage || "", photos: rl.photoCount || 0,
    dealer: rl.dealer || "", city: rl.city || "", state: st, vdp: rl.vdp || "", carfax: rl.carfaxUrl || "",
    priceUsd, fx: fx.rate, fxDate: fx.date,
    rows: {
      car: r0(car), ship: r0(ship), shipHi: r0(ship * S.kuljetusYlarajaKerroin),
      duty: [r0(dutyLo), r0(dutyHi)], usOrigin, huolinta: S.huolinta,
      vat: [r0(vatLo), r0(vatHi)], reg: S.katsastusJaRekisterointi, fee: S.palvelumaksu,
      tax: [r0(taxLo), r0(taxHi)]
    },
    autovero: {
      V: r10(V), VLo: r10(VLo), VHi: r10(VHi), s: +sPct.toFixed(3), n: best.n, level: best.level,
      kw, cc, co2, co2lo, co2hi, co2src, p, pSrc, pRange: [pA[0], pA[1]],
      a: r0(taxA), same, b: taxB != null ? r0(taxB) : null, avg: r0(tax)
    },
    total: { lo: r100(totLo), hi: r100(totHi), mid: r100(totMid) },
    fiPrice: r100(V), saving: r100(saving), savingPct: +(saving / V * 100).toFixed(1),
    confidence: conf, warnings: [...new Set(warn)].slice(0, 4),
    listedAt: L.createdAt || "", updatedAt: L.updatedAt || ""
  };
}

const MOCK_DATA = [
  { vin: "5YFB4MDE0PP000001", createdAt: "2026-11-20", vehicle: { vin: "5YFB4MDE0PP000001", year: 2023, make: "Toyota", model: "Corolla Hybrid", trim: "LE AWD", engine: "1.8L I4 Hybrid", fuel: "Hybrid", drivetrain: "AWD", transmission: "CVT" },
    retailListing: { price: 16995, miles: 7903, dealer: "Esimerkkiliike", city: "Columbus", state: "OH", vdp: "", primaryImage: "", photoCount: 0 } },
  { vin: "1FA6P8CF0J5000002", createdAt: "2026-11-20", vehicle: { vin: "1FA6P8CF0J5000002", year: 2018, make: "Ford", model: "Mustang", trim: "GT", engine: "5.0L V8", fuel: "Gasoline", drivetrain: "RWD", transmission: "Automatic" },
    retailListing: { price: 24500, miles: 41000, dealer: "Esimerkkiliike", city: "Tampa", state: "FL", vdp: "", primaryImage: "", photoCount: 0 } },
  { vin: "7SAYGDEE0PF000003", createdAt: "2026-11-20", vehicle: { vin: "7SAYGDEE0PF000003", year: 2023, make: "Tesla", model: "Model Y", trim: "Long Range AWD", engine: "Electric", fuel: "Electric", drivetrain: "AWD", transmission: "Automatic" },
    retailListing: { price: 27900, miles: 22000, dealer: "Esimerkkiliike", city: "Austin", state: "TX", vdp: "", primaryImage: "", photoCount: 0 } },
  { vin: "2T3DWRFV0LW000004", createdAt: "2026-11-20", vehicle: { vin: "2T3DWRFV0LW000004", year: 2020, make: "Toyota", model: "RAV4 Hybrid", trim: "XLE", engine: "2.5L I4 Hybrid", fuel: "Hybrid", drivetrain: "AWD", transmission: "CVT" },
    retailListing: { price: 23900, miles: 48000, dealer: "Esimerkkiliike", city: "Phoenix", state: "AZ", vdp: "", primaryImage: "", photoCount: 0 } }
];

const fx = MOCK ? { rate: S.usdEurFallback, date: "testi", src: "asetukset" } : await usdEur();
let raw = [];
if (MOCK) raw = MOCK_DATA;
else {
  if (!KEY) { console.error("AUTODEV_KEY puuttuu"); process.exit(1); }
  for (const q of Q) { const r = await search(q); console.log(q.make, q.model, r.length); raw.push(...r); }
}
const seen = new Set(), cars = [];
let skipped = 0;
for (const L of raw) {
  const vin = (L.vehicle && L.vehicle.vin) || L.vin;
  if (!vin || seen.has(vin)) continue;
  seen.add(vin);
  let c = null;
  try { c = calc(L, fx); } catch (e) { console.error(vin, e.message); }
  if (!c) { skipped++; continue; }
  if (S.naytaVainKannattavat && c.saving <= 0) continue;
  cars.push(c);
}
cars.sort((a, b) => b.saving - a.saving);
const out = { updated: today.toISOString(), fx, mock: MOCK, count: cars.length, skipped, cars };
fs.writeFileSync(path.join(ROOT, "data/listings.json"), JSON.stringify(out));
console.log("Valmis:", cars.length, "autoa,", skipped, "ohitettu");

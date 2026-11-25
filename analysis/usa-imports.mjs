// Arvio: mitä autoja on tuotu käytettyinä Yhdysvalloista/Kanadasta Suomeen (Traficomin ajoneuvojen avoin data).
// Käytettynä tuotu = ensirekisteröinti Suomessa yli 180 pv käyttöönoton jälkeen.
// Pohjois-Amerikan auto = VIN alkaa 1, 4, 5 (USA) tai 2 (Kanada) – kertoo valmistusmaan, ei ostomaata (siksi Euroopan-mallit erotellaan merkeittäin varovasti).
import readline from "node:readline";
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let H = null, n = 0;
const by = {}, byMake = {}, byYear = {};
const day = (s) => {
  s = String(s);
  let m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/); if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]) / 864e5;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/); if (m) return Date.UTC(+m[1], (+m[2] || 7) - 1, +m[3] || 1) / 864e5;
  return null;
};
let shown = 0;
for await (const line of rl) {
  const f = line.split(";");
  if (!H) { H = {}; f.forEach((k, i) => (H[k.replace(/"/g, "").trim()] = i)); console.error("KENTÄT:", Object.keys(H).join(",")); continue; }
  const g = (k) => (H[k] != null ? (f[H[k]] || "").replace(/"/g, "").trim() : "");
  if (shown < 3) { shown++; console.error("ESIMERKKI:", ["ajoneuvoluokka","ensirekisterointipvm","kayttoonottopvm","merkkiSelvakielinen","kaupallinenNimi","valmistenumero2"].map((k) => k + "=" + g(k)).join(" | ")); }
  const cls = g("ajoneuvoluokka");
  if (!/^(M1|N1)/.test(cls)) continue;
  const vin = g("valmistenumero2") || g("valmistenumero");
  if (!/^[1245]/.test(vin)) continue;
  const er = day(g("ensirekisterointipvm")), ko = day(g("kayttoonottopvm"));
  if (er == null || ko == null || er - ko < 180) continue;
  let make = g("merkkiSelvakielinen").toUpperCase().replace("TESLA MOTORS", "TESLA").replace("DAIMLERCHRYSLER", "CHRYSLER");
  // Euroopassa uutena myydyt / Euroopasta tuodut merkit pois: tavoitteena puhdas USA-tuonti
  if (/^(TESLA|OPEL|LANCIA|BMW|MERCEDES|VOLKSWAGEN|VOLVO|AUDI|PORSCHE|HYUNDAI|KIA|MAZDA|SUBARU|MITSUBISHI|NISSAN|SMART|FIAT|ALFA)/.test(make)) continue;
  const toks = (g("kaupallinenNimi") || g("mallimerkinta")).toUpperCase().replace(/^\d[DO]\s+/, "").replace(/^(TOYOTA|FORD|CHEVROLET|DODGE)\s+/, "").split(/\s+/);
  let model = toks[0] || "?";
  if (/^(GRAND|TOWN|CROWN|RANGE|SANTA)$/.test(model)) model += " " + (toks[1] || "");
  if (/^RAM$/.test(make)) model = "RAM " + model;
  model += /^N1/.test(cls) ? " (paku/avolava)" : "";
  n++;
  const y = new Date(er * 864e5).getUTCFullYear();
  byYear[y] = (byYear[y] || 0) + 1;
  byMake[make] = (byMake[make] || 0) + 1;
  const k = make + " | " + model; by[k] = by[k] || { n: 0, recent: 0 }; by[k].n++; if (y >= 2021) by[k].recent++;
}
console.log("Pohjois-Amerikassa valmistettuja, käytettynä tuotuja M1+N1 (ilman Euroopan merkkejä) rekisterissä:", n);
console.log("\nTuontivuosittain (ensirekisteröinti Suomessa):"); for (const y of Object.keys(byYear).sort()) if (+y >= 2010) console.log(" ", y, byYear[y]);
console.log("\nMerkit TOP 30:"); Object.entries(byMake).sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(" ", v, k));
console.log("\nMallit TOP 60 (kaikki / tuotu 2021–):"); Object.entries(by).sort((a, b) => b[1].n - a[1].n).slice(0, 60).forEach(([k, v]) => console.log(" ", v.n, "/", v.recent, k));
console.log("\nMallit TOP 40 tuotu 2021 jälkeen:"); Object.entries(by).sort((a, b) => b[1].recent - a[1].recent).slice(0, 60).forEach(([k, v]) => console.log(" ", v.recent, k));

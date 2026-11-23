// Lisätiedot VIN-numerosta: USA:n liikenneviraston (NHTSA vPIC) ilmainen VIN-dekooderi.
// Tulokset tallennetaan välimuistiin (data/vin_cache.json), joten sama VIN haetaan vain kerran.
import fs from "node:fs";
import path from "node:path";

const FIELDS = ["BodyClass", "Doors", "Seats", "SeatRows", "EngineCylinders", "DisplacementL", "EngineHP", "EngineKW", "EngineConfiguration",
  "Turbo", "FuelTypePrimary", "FuelTypeSecondary", "ElectrificationLevel", "DriveType", "TransmissionStyle", "TransmissionSpeeds", "Trim", "Series",
  "PlantCountry", "PlantCity", "GVWR", "BatteryKWh", "WheelBaseShort", "OtherEngineInfo", "ValveTrainDesign", "EngineModel"];

export async function decodeVins(root, vins) {
  const p = path.join(root, "data/vin_cache.json");
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) {}
  const todo = [...new Set(vins)].filter((v) => v && !cache[v]);
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50);
    try {
      const res = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "format=json&data=" + encodeURIComponent(batch.join(";"))
      });
      if (!res.ok) { console.error("vPIC HTTP", res.status); continue; }
      const j = await res.json();
      for (const r of j.Results || []) {
        const o = {};
        for (const f of FIELDS) { const v = String(r[f] ?? "").trim(); if (v && v !== "Not Applicable" && v !== "0") o[f] = v; }
        if (r.VIN) cache[r.VIN] = o;
      }
    } catch (e) { console.error("vPIC", e.message); }
  }
  fs.writeFileSync(p, JSON.stringify(cache));
  return cache;
}

const T = (s, map) => { for (const [re, fi] of map) if (re.test(s)) return fi; return s; };
const BODY = [[/Pickup/i, "Avolava (pickup)"], [/Sport Utility|SUV|MPV/i, "Maastoauto (SUV)"], [/Minivan/i, "Tila-auto"], [/Coupe/i, "Coupé"],
  [/Convertible|Cabriolet/i, "Avoauto"], [/Sedan|Saloon/i, "Sedan"], [/Hatchback|Liftback/i, "Viistoperä"], [/Wagon/i, "Farmari"], [/Van/i, "Pakettiauto"], [/Crossover/i, "Crossover"]];
const DRIVE = [[/AWD|All.Wheel/i, "Neliveto (AWD)"], [/4WD|4x4|Four/i, "Neliveto (4WD)"], [/RWD|Rear/i, "Takaveto"], [/FWD|Front/i, "Etuveto"]];
const FUEL = [[/Electric/i, "Sähkö"], [/Diesel/i, "Diesel"], [/Gasoline/i, "Bensiini"], [/Flexible|E85/i, "Bensiini / E85"]];
const COUNTRY = { "UNITED STATES (USA)": "USA", "CANADA": "Kanada", "MEXICO": "Meksiko", "JAPAN": "Japani", "GERMANY": "Saksa", "SOUTH KOREA": "Etelä-Korea",
  "UNITED KINGDOM (UK)": "Iso-Britannia", "SLOVAKIA": "Slovakia", "CHINA": "Kiina", "SWEDEN": "Ruotsi", "BELGIUM": "Belgia", "AUSTRIA": "Itävalta", "ITALY": "Italia", "HUNGARY": "Unkari", "SOUTH AFRICA": "Etelä-Afrikka" };

// Muodostaa suomenkielisen teknisten tietojen listan ilmoitukselle
export function specFi(d, c) {
  const s = [];
  const add = (k, v) => { if (v != null && v !== "" && !Number.isNaN(v)) s.push([k, String(v)]); };
  if (d.BodyClass) add("Korimalli", T(d.BodyClass, BODY));
  if (d.Doors) add("Ovet", d.Doors);
  if (d.Seats) add("Istumapaikat", d.Seats + (d.SeatRows ? " (" + d.SeatRows + " riviä)" : ""));
  const eng = [];
  if (d.DisplacementL) eng.push((+d.DisplacementL).toFixed(1).replace(".", ",") + " l");
  if (d.EngineCylinders) eng.push(d.EngineCylinders + " sylinteriä" + (d.EngineConfiguration ? " (" + d.EngineConfiguration.replace(/-Shaped|V-Shaped/i, "V").replace(/In-Line/i, "rivi") + ")" : ""));
  if (d.Turbo === "Yes") eng.push("turbo");
  if (/supercharg/i.test(d.OtherEngineInfo || "")) eng.push("ahdin");
  if (eng.length) add("Moottori", eng.join(", "));
  if (d.EngineHP) add("Teho (valmistaja)", Math.round(+d.EngineHP) + " hv / " + Math.round(+d.EngineHP * 0.7457) + " kW");
  if (d.ElectrificationLevel) add("Sähköistys", T(d.ElectrificationLevel, [[/BEV/i, "Täyssähkö"], [/PHEV/i, "Lataushybridi"], [/Strong HEV|HEV/i, "Hybridi"], [/Mild/i, "Kevythybridi"]]));
  if (d.BatteryKWh) add("Akku", d.BatteryKWh.replace(".", ",") + " kWh");
  if (d.DriveType) add("Veto", T(d.DriveType, DRIVE));
  if (d.TransmissionStyle || d.TransmissionSpeeds) add("Vaihteisto", (/Manual/i.test(d.TransmissionStyle || "") ? "Manuaali" : "Automaatti") + (d.TransmissionSpeeds ? ", " + d.TransmissionSpeeds + " vaihdetta" : ""));
  if (d.FuelTypePrimary) add("Polttoaine", T(d.FuelTypePrimary, FUEL) + (d.FuelTypeSecondary ? " + " + T(d.FuelTypeSecondary, FUEL).toLowerCase() : ""));
  // CO2 ja kulutus: jos EPA:lla on useita versioita eri arvoilla, näytetään vaihteluväli eikä keskiarvoa
  if (c && c.co2 > 0) {
    const lo = c.co2lo || c.co2, hi = c.co2hi || c.co2, f = /Diesel/.test(c.fuel || "") ? 26.5 : 23.2, l = (x) => (x / f).toFixed(1).replace(".", ",");
    const fx = (x) => String(x).replace(".", ","), rg = (p) => p ? (p[0] === p[1] ? fx(p[0]) : fx(p[0]) + " – " + fx(p[1])) + " l/100 km" : null;
    if (c.cons && (c.cons[0] || c.cons[1] || c.cons[2])) {
      add("Kulutus kaupungissa (EPA)", rg(c.cons[0])); add("Kulutus maantiellä (EPA)", rg(c.cons[1])); add("Keskikulutus (EPA)", rg(c.cons[2]));
    } else if (!/Sähkö/.test(c.fuel || "")) add("Keskikulutus (EPA, CO₂:sta laskettu)", (lo === hi ? l(lo) : l(lo) + " – " + l(hi)) + " l/100 km");
    add("CO₂ (EPA)", (lo === hi ? lo : lo + " – " + hi) + " g/km");
  }
  // Kokonaismassaa ei näytetä: VIN kertoo vain painoluokan (esim. 2 700 – 3 200 kg), ei tarkkaa massaa
  if (d.WheelBaseShort) add("Akseliväli", Math.round(+d.WheelBaseShort * 2.54) + " cm");
  if (d.PlantCountry) add("Valmistusmaa", (COUNTRY[d.PlantCountry.toUpperCase()] || d.PlantCountry) + (d.PlantCity ? " (" + d.PlantCity.charAt(0) + d.PlantCity.slice(1).toLowerCase() + ")" : ""));
  return s;
}

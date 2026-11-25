// Lisätiedot VIN-numerosta: USA:n liikenneviraston (NHTSA vPIC) ilmainen VIN-dekooderi.
// Tulokset tallennetaan välimuistiin (data/vin_cache.json), joten sama VIN haetaan vain kerran.
import fs from "node:fs";
import path from "node:path";

const FIELDS = ["BodyClass", "Doors", "Seats", "SeatRows", "EngineCylinders", "DisplacementL", "EngineHP", "EngineKW", "EngineConfiguration",
  "Turbo", "FuelTypePrimary", "FuelTypeSecondary", "ElectrificationLevel", "DriveType", "TransmissionStyle", "TransmissionSpeeds", "Trim", "Series",
  "PlantCountry", "PlantCity", "GVWR", "BatteryKWh", "WheelBaseShort", "OtherEngineInfo", "ValveTrainDesign", "EngineModel",
  // varusteet ja turvallisuus (NHTSA: "Standard" = vakiovaruste tässä VIN:ssä)
  "ABS", "ESC", "TractionControl", "TPMS", "KeylessIgnition", "AdaptiveCruiseControl", "ForwardCollisionWarning", "CIB", "DynamicBrakeSupport",
  "PedestrianAutomaticEmergencyBraking", "BlindSpotMon", "BlindSpotIntervention", "LaneDepartureWarning", "LaneKeepSystem", "LaneCenteringAssistance",
  "RearCrossTrafficAlert", "RearAutomaticEmergencyBraking", "ParkAssist", "RearVisibilitySystem", "AdaptiveHeadlights", "AdaptiveDrivingBeam",
  "SemiautomaticHeadlampBeamSwitching", "DaytimeRunningLight", "LowerBeamHeadlampLightSource", "AirBagLocFront", "AirBagLocSide", "AirBagLocCurtain",
  "AirBagLocKnee", "AirBagLocSeatCushion", "Pretensioner", "CurbWeightLB", "TopSpeedMPH", "WheelSizeFront", "WheelSizeRear", "ChargerPowerKW",
  "BatteryType", "Trim2", "EntertainmentSystem"];
const CACHE_V = 2; // nosta, kun FIELDS muuttuu: vanhat välimuistirivit haetaan uudelleen

export async function decodeVins(root, vins) {
  const p = path.join(root, "data/vin_cache.json");
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) {}
  const todo = [...new Set(vins)].filter((v) => v && !(cache[v] && cache[v]._v >= CACHE_V));
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
        const o = { _v: CACHE_V };
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
  if (d.EngineHP) add("Teho (valmistaja)", Math.round(+d.EngineHP * 1.01387) + " hv / " + Math.round(+d.EngineHP * 0.7457) + " kW");
  if (d.ElectrificationLevel) add("Sähköistys", T(d.ElectrificationLevel, [[/BEV/i, "Täyssähkö"], [/PHEV/i, "Lataushybridi"], [/Strong HEV|HEV/i, "Hybridi"], [/Mild/i, "Kevythybridi"]]));
  if (d.BatteryKWh) add("Akku", String(+(+d.BatteryKWh).toFixed(1)).replace(".", ",") + " kWh");
  if (d.DriveType) add("Veto", T(d.DriveType, DRIVE));
  if (d.TransmissionStyle || d.TransmissionSpeeds) add("Vaihteisto", (/Manual/i.test(d.TransmissionStyle || "") ? "Manuaali" : "Automaatti") + (d.TransmissionSpeeds ? (+d.TransmissionSpeeds === 1 ? ", yksi vaihde" : ", " + d.TransmissionSpeeds + " vaihdetta") : ""));
  if (d.FuelTypePrimary) add("Polttoaine", T(d.FuelTypePrimary, FUEL) + (d.FuelTypeSecondary ? " + " + T(d.FuelTypeSecondary, FUEL).toLowerCase() : ""));
  // Sähköauto: virallinen sähkönkulutus ja toimintamatka. Kaupunki- ja maantiearvo vain jos ne ovat virallisissa tiedoissa.
  if (c && c.econs) {
    const fx = (x) => String(x).replace(".", ","), rg = (p, u) => p ? (p[0] === p[1] ? fx(p[0]) : fx(p[0]) + " – " + fx(p[1])) + u : null;
    add("Sähkönkulutus kaupungissa (EPA)", rg(c.econs.city, " kWh/100 km"));
    add("Sähkönkulutus maantiellä (EPA)", rg(c.econs.hwy, " kWh/100 km"));
    add("Keskikulutus (EPA)", rg(c.econs.comb, " kWh/100 km"));
    add("Toimintamatka (EPA)", rg(c.econs.range, " km"));
  }
  // CO2 ja kulutus: jos EPA:lla on useita versioita eri arvoilla, näytetään vaihteluväli eikä keskiarvoa
  if (c && c.co2 > 0) {
    const lo = c.co2lo || c.co2, hi = c.co2hi || c.co2, f = /Diesel/.test(c.fuel || "") ? 26.5 : 23.2, l = (x) => (x / f).toFixed(1).replace(".", ",");
    const fx = (x) => String(x).replace(".", ","), rg = (p) => p ? (p[0] === p[1] ? fx(p[0]) : fx(p[0]) + " – " + fx(p[1])) + " l/100 km" : null;
    if (c.cons && (c.cons[0] || c.cons[1] || c.cons[2])) {
      add("Kulutus kaupungissa (EPA)", rg(c.cons[0])); add("Kulutus maantiellä (EPA)", rg(c.cons[1])); add("Keskikulutus (EPA)", rg(c.cons[2]));
    } else if (!/Sähkö/.test(c.fuel || "")) add("Keskikulutus (EPA, CO₂:sta laskettu)", (lo === hi ? l(lo) : l(lo) + " – " + l(hi)) + " l/100 km");
    add("CO₂ (EPA)", (lo === hi ? lo : lo + " – " + hi) + " g/km");
  }
  if (d.EngineModel) add("Moottorikoodi", d.EngineModel);
  if (d.CurbWeightLB) add("Omamassa (valmistaja)", String(Math.round(+d.CurbWeightLB * 0.4536 / 10) * 10).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " kg");
  if (d.TopSpeedMPH) add("Huippunopeus", Math.round(+d.TopSpeedMPH * 1.609) + " km/h");
  if (d.WheelSizeFront) add("Vanteet", d.WheelSizeFront + (d.WheelSizeRear && d.WheelSizeRear !== d.WheelSizeFront ? " / " + d.WheelSizeRear : "") + " tuumaa");
  if (d.ChargerPowerKW) add("Latausteho (AC)", String(+d.ChargerPowerKW).replace(".", ",") + " kW");
  if (d.BatteryType) add("Akkutyyppi", d.BatteryType.replace(/Lithium-Ion.*|Li-?Ion.*/i, "Litiumioni"));
  // Kokonaismassaa ei näytetä: VIN kertoo vain painoluokan (esim. 2 700 – 3 200 kg), ei tarkkaa massaa
  if (d.WheelBaseShort) add("Akseliväli", Math.round(+d.WheelBaseShort * 2.54) + " cm");
  if (d.PlantCountry) add("Valmistusmaa", (COUNTRY[d.PlantCountry.toUpperCase()] || d.PlantCountry) + (d.PlantCity ? " (" + d.PlantCity.toLowerCase().replace(/(^|[\s-])\S/g, (m) => m.toUpperCase()) + ")" : ""));
  return s;
}

// Varusteet VIN-tiedoista ryhmiteltyinä. Mukaan vain vakiovarusteet ("Standard") – "Optional" ei kerro, onko varuste tässä autossa.
export function equipFi(d) {
  const std = (k) => /^(Standard|Yes)$/i.test(d[k] || "");
  const G = [["Turvallisuus", []], ["Ajoavustimet", []], ["Valot ja mukavuus", []]];
  const put = (g, ok, t) => { if (ok) G[g][1].push(t); };
  put(0, std("ABS"), "ABS-jarrut");
  put(0, std("ESC"), "Ajonvakautusjärjestelmä (ESC)");
  put(0, std("TractionControl"), "Luistonesto");
  const ab = [["AirBagLocFront", "edessä"], ["AirBagLocSide", "sivuilla"], ["AirBagLocCurtain", "verhoturvatyynyt"], ["AirBagLocKnee", "polvissa"], ["AirBagLocSeatCushion", "istuintyynyissä"]]
    .filter(([k]) => d[k] && !/Not Available/i.test(d[k])).map(([, t]) => t);
  put(0, ab.length, "Turvatyynyt: " + ab.join(", "));
  put(0, std("Pretensioner"), "Turvavöiden esikiristimet");
  put(0, /Direct|Indirect|Standard/i.test(d.TPMS || ""), "Rengaspaineiden valvonta");
  put(1, std("AdaptiveCruiseControl"), "Mukautuva vakionopeudensäädin");
  put(1, std("ForwardCollisionWarning"), "Törmäysvaroitin");
  put(1, std("CIB"), "Automaattinen hätäjarrutus");
  put(1, std("PedestrianAutomaticEmergencyBraking"), "Jalankulkijan tunnistus ja hätäjarrutus");
  put(1, std("BlindSpotMon"), "Kuolleen kulman varoitin");
  put(1, std("BlindSpotIntervention"), "Kuolleen kulman avustin");
  put(1, std("LaneDepartureWarning"), "Kaistavahti");
  put(1, std("LaneKeepSystem"), "Kaistallapitoavustin");
  put(1, std("LaneCenteringAssistance"), "Kaistakeskitys");
  put(1, std("RearCrossTrafficAlert"), "Peruutusvaroitin poikittaisliikenteelle");
  put(1, std("RearAutomaticEmergencyBraking"), "Automaattinen jarrutus peruutettaessa");
  put(1, std("ParkAssist"), "Pysäköintitutkat / -avustin");
  put(1, std("RearVisibilitySystem"), "Peruutuskamera");
  // ajovalot vain jos LED tai Xenon (halogeenia ei mainita)
  const hl = d.LowerBeamHeadlampLightSource || "";
  put(2, /LED/i.test(hl), "LED-ajovalot");
  put(2, !/LED/i.test(hl) && /Xenon|HID/i.test(hl), "Xenon-ajovalot");
  put(2, std("AdaptiveHeadlights"), "Kaarrevalot");
  put(2, std("AdaptiveDrivingBeam"), "Mukautuvat kaukovalot (matrix)");
  put(2, std("SemiautomaticHeadlampBeamSwitching"), "Automaattiset kaukovalot");
  put(2, std("DaytimeRunningLight"), "Päiväajovalot");
  put(2, std("KeylessIgnition"), "Avaimeton käynnistys");
  return G.filter(([, a]) => a.length);
}

// Ajaa autoverolaskurin (calc.js) laskentamoottorin Nodessa ilman selainta.
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

export function loadEngine(root) {
  let src = fs.readFileSync(path.join(root, "calc.js"), "utf8");
  // Ohitetaan selaimen latauslogiikka ja paljastetaan sisäiset funktiot.
  src = src.replace('var root=document.querySelector(".xac");if(!root)return;', "");
  src = src.replace(/fetch\(base\+"calc\.html"\)[^\n]*\n/, "globalThis.__XM=XAUTO_MAIN;\n");
  src = src.replace('var base=root.dataset.base||"";', "");
  const hook = 'var D=null,$=function(i){return document.getElementById(i)};';
  if (!src.includes(hook)) throw new Error("calc.js: hook not found");
  src = src.replace(hook, hook + `
globalThis.__XE={set:function(o){D=o.core;M=makeAutovero(D);EP=o.epa;AN=o.an;PT=o.pt;SC=o.same;C2=o.c2;CM=o.cm;},
 M:function(){return M},epaLookup:epaLookup,anP:anP,lookupCo2:lookupCo2,sameCar:sameCar,empP:empP,anResolve:anResolve};return;`);
  const el = { value: "", checked: false, dataset: {} };
  const ctx = { document: { querySelector: () => el, getElementById: () => el }, Intl, Date, Math, JSON, Object, Array, String, Number, console, fetch: () => Promise.reject() };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  ctx.__XM();
  const X = ctx.__XE;
  const J = (f) => JSON.parse(fs.readFileSync(path.join(root, "data", f), "utf8"));
  X.set({ core: J("autovero_core.json"), epa: J("epa_co2.json"), an: J("analog.json"), pt: J("p_table.json"), same: J("same.json"), c2: J("co2_table.json"), cm: J("co2_model.json") });
  return X;
}

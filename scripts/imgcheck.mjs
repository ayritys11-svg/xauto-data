// Diagnostiikka: kokeilee muutaman kuvaosoitteen ja tallentaa tuloksen data/imgcheck.json
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("data/listings.json", "utf8"));
const urls = [];
for (const c of d.cars.slice(0, 4)) { urls.push(c.img); urls.push(c.img.replace(/-1\.(\w+)$/, "-2.$1")); }
const out = [];
for (const u of urls) {
  for (const ref of [null, "https://delicious-phantom-amphisbaena.wpcomstaging.com/"]) {
    try {
      const h = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130 Safari/537.36" };
      if (ref) h.Referer = ref;
      const r = await fetch(u, { headers: h, redirect: "manual" });
      const b = r.status === 200 ? (await r.arrayBuffer()).byteLength : 0;
      out.push({ u, ref: !!ref, status: r.status, type: r.headers.get("content-type"), len: b, loc: r.headers.get("location"), cors: r.headers.get("access-control-allow-origin") });
    } catch (e) { out.push({ u, ref: !!ref, err: String(e) }); }
  }
}
fs.writeFileSync("data/imgcheck.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));

// Diagnostiikka: kuvien todellinen resoluutio ja mahdolliset isommat versiot
import fs from "node:fs";
const d = JSON.parse(fs.readFileSync("data/listings.json", "utf8"));
function jpegSize(buf) {
  let i = 2; while (i < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }; i += 2 + len; } return null;
}
const out = [];
for (const c of d.cars.filter((x) => x.img).slice(0, 6)) {
  const base = c.img;
  for (const u of [base, base + "?w=2000", base + "?width=2000", base + "?size=large", base.replace(/\.jpg$/, "-large.jpg"), base.replace(/\.jpg$/, ".jpeg")]) {
    try { const r = await fetch(u); const b = Buffer.from(await r.arrayBuffer()); out.push({ u, status: r.status, type: r.headers.get("content-type"), bytes: b.length, dim: r.status === 200 ? jpegSize(b) : null }); }
    catch (e) { out.push({ u, err: String(e) }); }
  }
}
fs.writeFileSync("diag/imgsize.json", JSON.stringify(out, null, 1));

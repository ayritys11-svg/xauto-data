# Rakentaa tarkemman liikennemäärädatan: merkki -> malli -> [vuosi, kW, korityyppi, käyttövoima, hybridi, kpl]
import zipfile, csv, io, json, re, collections, sys
z = zipfile.ZipFile('/mnt/user-data/uploads/Ajoneuvorekisteri.zip')
f = io.TextIOWrapper(z.open(z.namelist()[0]), encoding='latin-1')
r = csv.DictReader(f, delimiter=';')
CL = {'M1', 'M1G', 'N1', 'N1G', 'N2', 'N2G'}
agg = collections.Counter()
def zz(x): return re.sub(r'[\s\-\./]', '', (x or '').upper())[:14]
for row in r:
    if row['ajoneuvoluokka'] not in CL: continue
    mk = (row['merkkiSelvakielinen'] or '').upper().strip()
    if not mk: continue
    md = zz(row['kaupallinenNimi'] or row['mallimerkinta'])
    if not md: continue
    y = (row['kayttoonottopvm'] or '')[:4]
    y = int(y) if y.isdigit() else 0
    try: kw = int(round(float(row['suurinNettoteho'] or 0)))
    except: kw = 0
    hy = (2 if row['sahkohybridinluokka'] == '01' else 1) if (row['sahkohybridi'] or '').lower() in ('true', '1', 'k') else 0  # 2 = ladattava hybridi (OVC), 1 = muu hybridi
    agg[(mk, md, y, kw, row['korityyppi'] or '', row['kayttovoima'] or '', hy)] += 1
out = collections.defaultdict(lambda: collections.defaultdict(list))
for (mk, md, y, kw, b, fu, hy), n in agg.items():
    out[mk][md].append([y, kw, b, fu, hy, n])
json.dump({'lahde': 'Traficom avoin data 30.9.2026 (M1, N1, N2), ryhmittely: vuosi, kW, korityyppi, käyttövoima, hybridi (0 ei, 1 hybridi/mild, 2 ladattava)', 'd': out},
          open(sys.argv[1], 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(agg))

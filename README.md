# X-auto data

X-auton autoverolaskurin tiedostot. Lähteet: Verohallinnon julkaisemat autoveropäätökset, Traficomin avoin data ja US EPA fueleconomy.gov.

## Autoilmoitukset

- `scripts/fetch-listings.mjs` hakee autot auto.devistä ja laskee jokaiselle hinnan Suomeen samalla autoveromallilla kuin laskuri (`scripts/engine.mjs` ajaa `calc.js`:n laskentamoottoria).
- Haut: `config/searches.json`. Kulut: `config/settings.json`.
- Ajo joka yö GitHub Actionsissa (`.github/workflows/listings.yml`). API-avain repositorion salaisuutena nimellä `AUTODEV_KEY`.
- Tulos: `data/listings.json`, jonka WordPressin Autot-sivu näyttää (`listings.js`, `listings.css`).
- Testi ilman avainta: `node scripts/fetch-listings.mjs --mock`

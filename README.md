# informes

Spanische Schul-Informes als Website — lesen und abhaken. Statische
[Astro](https://astro.build)-Site, deployt via GitHub Actions auf GitHub Pages
unter **https://informes.xaytag.com**. Verlinkt vom xaytag-Dashboard.

## Inhalt hinzufügen

Informe-Texte liegen als Markdown in `src/content/informes/<slug>.md`. Optionales
Frontmatter:

```md
---
title: Conexión estrella-triángulo   # schöner Titel mit Akzenten (sonst aus Dateiname)
date: 2026-06-21                      # für die Sortierung
---

<fortlaufender spanischer Text>
```

Der `/informe`-Befehl schreibt neue Texte automatisch hierher, committet und
pusht — der Push triggert das Deploy.

## "Geschrieben"-Markierungen (geräteübergreifend)

Die Häkchen werden in einem Cloudflare Worker + Workers KV gespeichert, damit sie
zwischen Handy und Laptop synchron sind. Lesen ist offen; Schreiben braucht eine
PIN (= `WRITE_TOKEN`-Secret des Workers), die pro Browser einmal eingegeben und
dann lokal gemerkt wird. Code unter `worker/`.

### Worker deployen

```bash
cd worker
npx wrangler kv namespace create MARKS   # id in wrangler.toml eintragen
npx wrangler secret put WRITE_TOKEN       # PIN festlegen
npx wrangler deploy
```

Danach die Worker-URL in `src/lib/marks.ts` (`WORKER_URL`) eintragen.

## Entwicklung

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # nach dist/
```

# Darlehen – Rückzahlungen

Kleine App zum Notieren der Rückzahlungen eines Darlehens. Markus trägt ein, die Schuldnerin schaut zur Kontrolle nur an.

## Dateien
- `index.html` – die App (handytauglich, Icon eingebaut)
- `api/daten.js` – Vercel-Funktion: liest und speichert die Daten, prüft den Code

## Einrichten auf Vercel (einmal)
1. **Add New → Project** → dieses Repository importieren → **Deploy** (Einstellungen so lassen).
2. Im Projekt **Storage → Create Database → Upstash for Redis** (gratis) → mit diesem Projekt verbinden.
   Die Variablen `KV_REST_API_URL` und `KV_REST_API_TOKEN` setzt Vercel dabei selbst.
3. **Settings → Environment Variables** – zwei neue Variablen:
   - `SCHREIB_CODE` = Code von Markus (eintragen, löschen, Einstellungen)
   - `LESE_CODE` = Code für die Kontrolle (nur anschauen)
4. **Deployments → … → Redeploy**, damit Speicher und Codes gelten.

## Benutzen
- Markus: App öffnen, eigenen Code eingeben (wird auf dem Gerät gemerkt). Einstellungen → Name, Betrag, «Ausbezahlt am».
- Kontrolle: Link `https://<projekt>.vercel.app/#<LESE_CODE>` schicken – öffnet direkt die Ansicht ohne Eintragen.
- Code ändern: Variable in Vercel ändern und neu deployen; alte Links gehen dann nicht mehr.
- Speichern zwei Geräte gleichzeitig, wird nichts überschrieben: das zweite lädt den neuen Stand und meldet es.

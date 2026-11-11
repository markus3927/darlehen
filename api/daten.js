// Darlehen – Rückzahlungen: Datenspeicher (Vercel-Funktion, ohne Zusatzpakete)
// Speicher: Upstash Redis über Vercel (Storage → Upstash for Redis → mit dem Projekt verbinden).
// Codes als Environment Variables in Vercel:
//   SCHREIB_CODE = Code von Markus (darf eintragen, löschen, Einstellungen ändern)
//   LESE_CODE    = Code für die Kontrolle (darf nur anschauen)

const SCHLUESSEL = 'darlehen';

function speicher() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const befehl = async (args) => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || `Speicher antwortet ${r.status}`);
    return j.result;
  };
  return {
    lies: async () => { const t = await befehl(['GET', SCHLUESSEL]); return t ? JSON.parse(t) : null; },
    schreib: async (d) => befehl(['SET', SCHLUESSEL, JSON.stringify(d)]),
  };
}

function rolle(code) {
  const c = String(code || '').trim();
  if (!c) return null;
  if (process.env.SCHREIB_CODE && c === String(process.env.SCHREIB_CODE).trim()) return 'schreiben';
  if (process.env.LESE_CODE && c === String(process.env.LESE_CODE).trim()) return 'lesen';
  return null;
}

async function leseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const teile = [];
  for await (const t of req) teile.push(t);
  return JSON.parse(Buffer.concat(teile).toString('utf8') || '{}');
}

/** Nur saubere Daten speichern. */
function pruefe(d) {
  if (!d || typeof d !== 'object') throw new Error('Daten fehlen');
  const total = Number(d.total);
  if (!(total > 0 && total < 1e9)) throw new Error('Betrag des Darlehens ungültig');
  if (!Array.isArray(d.zahlungen) || d.zahlungen.length > 5000) throw new Error('Zahlungen ungültig');
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  const zahlungen = d.zahlungen.map((z) => {
    const betrag = Math.round(Number(z.betrag) * 100) / 100;
    if (!iso.test(String(z.datum)) || !(betrag > 0 && betrag < 1e9)) throw new Error('Zahlung ungültig');
    return { id: String(z.id || '').slice(0, 20), datum: z.datum, betrag, art: String(z.art || '').slice(0, 20), notiz: String(z.notiz || '').slice(0, 120) };
  });
  return {
    name: String(d.name || 'Kollegin').slice(0, 60),
    total: Math.round(total * 100) / 100,
    seit: iso.test(String(d.seit || '')) ? d.seit : '',
    zahlungen,
    geaendert: new Date().toISOString(),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const r = rolle(req.headers['x-code']);
  if (!r) { await new Promise((ok) => setTimeout(ok, 700)); return res.status(401).json({ fehler: 'Code falsch' }); }
  const s = speicher();
  if (!s) return res.status(500).json({ fehler: 'Speicher nicht verbunden (Vercel → Storage → Upstash for Redis mit dem Projekt verbinden, dann neu deployen)' });
  try {
    if (req.method === 'GET') return res.status(200).json({ rolle: r, daten: await s.lies() });
    if (req.method === 'PUT') {
      if (r !== 'schreiben') return res.status(403).json({ fehler: 'Nur anschauen erlaubt' });
      const body = await leseBody(req);
      const jetzt = await s.lies();
      // Schutz: wurde inzwischen auf einem anderen Gerät gespeichert, nicht überschreiben
      if (jetzt && (body.basis || '') !== (jetzt.geaendert || '')) return res.status(409).json({ fehler: 'Inzwischen anderswo geändert', daten: jetzt });
      const neu = pruefe(body.daten);
      await s.schreib(neu);
      return res.status(200).json({ rolle: r, daten: neu });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ fehler: 'Methode nicht erlaubt' });
  } catch (e) {
    return res.status(400).json({ fehler: e.message || String(e) });
  }
};

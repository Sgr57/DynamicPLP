const SYSTEM_PROMPT = `Sei un motore di profilazione per un e-commerce di scarpe. Ricevi punteggi di interesse utente (0-100) per colori, stili e categorie.

Compiti:
1. PROFILE: scrivi 1-2 frasi sui gusti ATTUALI. Se c'e' un profilo precedente, aggiornalo.
2. COLOR, STYLE, CATEGORY: converti i punteggi in pesi. Regola: 100→1.0, 50→0.0, 0→-1.0. Usa SOLO le chiavi presenti nei dati.
3. REASON: 1 frase breve in italiano.

Formato (5 righe, nient'altro):
PROFILE: <descrizione gusti>
COLOR <chiave>=<peso>, <chiave>=<peso>
STYLE <chiave>=<peso>, <chiave>=<peso>
CATEGORY <chiave>=<peso>, <chiave>=<peso>
REASON: <motivazione>`

// Few-shot example uses synthetic keys that never appear in real catalog
const FEWSHOT_USER = `Profilo precedente: nessuno. Crea un nuovo profilo basato sui dati.

Interessi utente attuali:
Colori: giallo 100, argento 45, turchese 20
Stili: elegante 100, boho 60
Categorie: sandal 100, mocassino 55

Rispondi con le 5 righe:`

const FEWSHOT_ASSISTANT = `PROFILE: Predilige sandali eleganti in giallo, con interesse per mocassini boho
COLOR giallo=1.0, argento=-0.1, turchese=-0.6
STYLE elegante=1.0, boho=0.2
CATEGORY sandal=1.0, mocassino=0.1
REASON: Forte preferenza per sandali gialli eleganti`

function normalizeKey(key) {
  return key.replace(/ /g, '_')
}

function normalizeToPercent(obj) {
  const entries = Object.entries(obj)
  if (entries.length === 0) return 'nessuno'
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 1)
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${normalizeKey(k)} ${Math.round((v / maxVal) * 100)}`)
    .join(', ')
}

export function buildPrompt(stats, userProfile) {
  const hasProfile = userProfile && userProfile.length > 0

  const profileSection = hasProfile
    ? `Profilo precedente: "${userProfile}"\nAGGIORNA il profilo in base ai nuovi interessi. Descrivi cosa e' cambiato.`
    : 'Profilo precedente: nessuno. Crea un nuovo profilo basato sui dati.'

  const userMessage = `${profileSection}

Interessi utente attuali:
Colori: ${normalizeToPercent(stats.colorAffinity)}
Stili: ${normalizeToPercent(stats.styleAffinity)}
Categorie: ${normalizeToPercent(stats.categoryAffinity)}

Rispondi con le 5 righe:`

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: FEWSHOT_USER },
    { role: 'assistant', content: FEWSHOT_ASSISTANT },
    { role: 'user', content: userMessage },
  ]
}

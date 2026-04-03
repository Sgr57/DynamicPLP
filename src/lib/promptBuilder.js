import { ALL_CATALOG_COLORS } from './colorFamilies'

const CATALOG_COLORS_LIST = ALL_CATALOG_COLORS.join(', ')

const SYSTEM_PROMPT = `Sei un motore di profilazione per un e-commerce di scarpe. Ricevi punteggi di interesse utente (0-100) per colori, stili e categorie.

Catalogo colori disponibili: ${CATALOG_COLORS_LIST}

Compiti:
1. PROFILE: scrivi 1-2 frasi sui gusti ATTUALI. Se c'e' un profilo precedente, aggiornalo.
2. COLOR, STYLE, CATEGORY: converti i punteggi in pesi. Regola: 100→1.0, 50→0.0, 0→-1.0.
   Per i COLORI: puoi aggiungere colori correlati dal catalogo con peso ridotto.
3. REASON: 1 frase breve in italiano.

Formato (5 righe, nient'altro):
PROFILE: <descrizione gusti>
COLOR <chiave>=<peso>, <chiave>=<peso>
STYLE <chiave>=<peso>, <chiave>=<peso>
CATEGORY <chiave>=<peso>, <chiave>=<peso>
REASON: <motivazione>`

// Few-shot example shows the model adding a related color (bordeaux) not in input
const FEWSHOT_USER = `Profilo precedente: nessuno. Crea un nuovo profilo basato sui dati.

Interessi utente attuali:
Colori: rosso 100, nero 40
Stili: elegante 100, boho 60
Categorie: sandal 100, mocassino 55

Rispondi con le 5 righe:`

const FEWSHOT_ASSISTANT = `PROFILE: Predilige sandali eleganti in rosso, con interesse per mocassini boho
COLOR rosso=1.0, bordeaux=0.4, nero=-0.2
STYLE elegante=1.0, boho=0.2
CATEGORY sandal=1.0, mocassino=0.1
REASON: Forte preferenza per sandali rossi eleganti, affinita' con toni caldi`

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

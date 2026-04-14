import { ALL_CATALOG_COLORS } from './colorFamilies'

const CATALOG_COLORS_LIST = ALL_CATALOG_COLORS.join(', ')
const CATALOG_CATEGORIES = 'flat, high_heel, hiking_boot, mans_shoe, running, womans_boot'
const CATALOG_STYLES = 'casual, classic, elegant, minimal, sporty, urban'

const SYSTEM_PROMPT = `Sei un profiler e-commerce scarpe. Analizza le interazioni utente e assegna pesi.

Formato evento: T+Ns | azione | categoria, stili | colore
Azioni positive (debole→forte): aperto dettaglio, tempo nel dettaglio, click colore, click variante, esplorato varianti, rivisitato, riaperto dettaglio
Azioni negative: scrollato via, chiuso subito

Colori: ${CATALOG_COLORS_LIST}
Categorie: ${CATALOG_CATEGORIES}
Stili: ${CATALOG_STYLES}

Rispondi SOLO con 6 righe, formato esatto:
COLOR colore=peso, colore=peso
STYLE stile=peso, stile=peso
CATEGORY categoria=peso, categoria=peso
CONFIDENCE 0.0-1.0
INTENT exploring|deciding|focused
MESSAGE 1-2 frasi in italiano: cosa hai osservato e un suggerimento

Pesi: -1.0 (rifiutato) a 1.0 (molto interessato). Includi solo valori presenti nelle interazioni.`

const FEWSHOT_USER = `Interazioni:
T+0s | aperto dettaglio | flat, elegant | rosso
T+8s | tempo nel dettaglio (8s) | flat, elegant | rosso
T+15s | click variante | flat, elegant | bordeaux
T+30s | aperto dettaglio | running, sporty | nero
T+32s | chiuso subito (2s) | running, sporty | nero
T+45s | click colore | flat, casual | rosso
T+50s | aperto dettaglio | flat, casual | rosso
T+58s | tempo nel dettaglio (8s) | flat, casual | rosso
T+70s | riaperto dettaglio | flat, casual | rosso`

const FEWSHOT_ASSISTANT = `COLOR rosso=1.0, bordeaux=0.5, nero=-0.3
STYLE elegant=0.7, casual=0.8, sporty=-0.5
CATEGORY flat=1.0, running=-0.4
CONFIDENCE 0.8
INTENT exploring
MESSAGE Le flat rosse hanno catturato la tua attenzione, hai guardato anche il bordeaux. Ti mostro opzioni in tonalita' calde.`

export function buildPrompt(eventsText, userProfile) {
  const hasProfile = userProfile && userProfile.length > 0

  const profileSection = hasProfile
    ? `Profilo precedente: "${userProfile}"`
    : ''

  const userMessage = `${profileSection}${profileSection ? '\n\n' : ''}Interazioni:
${eventsText}`

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: FEWSHOT_USER },
    { role: 'assistant', content: FEWSHOT_ASSISTANT },
    { role: 'user', content: userMessage },
  ]
}

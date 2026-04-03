import { ALL_CATALOG_COLORS } from './colorFamilies'

const CATALOG_COLORS_LIST = ALL_CATALOG_COLORS.join(', ')
const CATALOG_CATEGORIES = 'flat, high_heel, hiking_boot, mans_shoe, running, womans_boot'
const CATALOG_STYLES = 'casual, classic, elegant, minimal, sporty, urban'

const SYSTEM_PROMPT = `Sei un profiler per un e-commerce di scarpe. Ricevi la lista cronologica delle interazioni di un utente.
Ogni riga: <T+secondi> | <azione> | <categoria, stili> | <colore>
I timestamp sono secondi dall'inizio sessione. Usa le differenze tra eventi per dedurre durate e ritmi di navigazione.

Azioni positive (dall'interesse piu' debole al piu' forte):
aperto dettaglio, tempo nel dettaglio, click colore, click variante, esplorato varianti, rivisitato, riaperto dettaglio
Azioni negative: scrollato via, chiuso subito

Colori catalogo: ${CATALOG_COLORS_LIST}
Categorie catalogo: ${CATALOG_CATEGORIES}
Stili catalogo: ${CATALOG_STYLES}

Rispondi SOLO con 7 righe:
PROFILE: <1-2 frasi sui gusti attuali>
COLOR <colore>=<peso>, ... (peso da -1.0 a 1.0, puoi aggiungere colori correlati dal catalogo)
STYLE <stile>=<peso>, ...
CATEGORY <categoria>=<peso>, ...
CONFIDENCE: <0.0-1.0, quanto sei sicuro del profilo>
INTENT: <exploring|deciding|focused>
MESSAGE: <frase diretta all'utente in italiano, es. "Ho notato che ti piacciono le scarpe rosse!">`

const FEWSHOT_USER = `Interazioni:
T+0s | aperto dettaglio | flat, elegant | rosso
T+8s | tempo nel dettaglio (8s) | flat, elegant | rosso
T+15s | click variante | flat, elegant | bordeaux
T+30s | aperto dettaglio | running, sporty | nero
T+32s | chiuso subito (2s) | running, sporty | nero
T+45s | click colore | flat, casual | rosso
T+50s | aperto dettaglio | flat, casual | rosso
T+58s | tempo nel dettaglio (8s) | flat, casual | rosso
T+70s | riaperto dettaglio | flat, casual | rosso

Rispondi con le 7 righe:`

const FEWSHOT_ASSISTANT = `PROFILE: Ama le flat, soprattutto rosse. Preferisce stili eleganti e casual. Ha ignorato le running sporty nere.
COLOR rosso=1.0, bordeaux=0.5, nero=-0.3
STYLE elegant=0.7, casual=0.8, sporty=-0.5
CATEGORY flat=1.0, running=-0.4
CONFIDENCE: 0.8
INTENT: exploring
MESSAGE: Ho notato che ti piacciono le flat rosse! Ti mostro piu' opzioni in colori caldi.`

export function buildPrompt(eventsText, userProfile) {
  const hasProfile = userProfile && userProfile.length > 0

  const profileSection = hasProfile
    ? `Profilo precedente: "${userProfile}"`
    : ''

  const userMessage = `${profileSection}${profileSection ? '\n\n' : ''}Interazioni:
${eventsText}

Rispondi con le 7 righe:`

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: FEWSHOT_USER },
    { role: 'assistant', content: FEWSHOT_ASSISTANT },
    { role: 'user', content: userMessage },
  ]
}

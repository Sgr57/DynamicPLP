import { MODEL_CONFIG } from '../data/modelConfig'

const SYSTEM_PROMPT = `Sei un profiler e-commerce scarpe. Analizza le interazioni utente e assegna pesi.

Formato evento: T+Ns | azione | categoria, stili | colore
Azioni positive (debole→forte): aperto dettaglio, tempo nel dettaglio, click colore, click variante, esplorato varianti, rivisitato, riaperto dettaglio
Azioni negative: scrollato via, chiuso subito

I timestamp T+Ns indicano il tempo relativo dall'inizio della sessione. Usa i timestamp per capire:
- Quali interessi sono piu' recenti (piu' rilevanti)
- Quanto tempo l'utente dedica a ogni prodotto
- Se l'interesse cambia nel tempo (shift di preferenza)

ATTENZIONE: Non confondere le dimensioni! Ogni valore va SOLO nella sua riga:
- Colori (riga COLOR): rosso, arancione, giallo, corallo, bordeaux, beige, cammello, cuoio, panna, marrone, marrone chiaro, blu, blu scuro, celeste, verde, verde scuro, oliva, viola, nero, bianco, grigio, grigio chiaro, rosa
- Categorie (riga CATEGORY): flat, high_heel, hiking_boot, mans_shoe, running, womans_boot
- Stili (riga STYLE): casual, classic, elegant, minimal, sporty, urban

Rispondi SOLO con 6 righe, formato esatto:
COLOR colore=peso, colore=peso
STYLE stile=peso, stile=peso
CATEGORY categoria=peso, categoria=peso
CONFIDENCE 0.0-1.0
INTENT exploring|deciding|focused
MESSAGE 1-2 frasi in italiano: cosa hai osservato e un suggerimento

Pesi: -1.0 (rifiutato) a 1.0 (molto interessato). Includi solo valori non-zero presenti nelle interazioni.`

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
  const useFewShot = MODEL_CONFIG.useFewShot !== false

  const profileSection = hasProfile
    ? `Profilo precedente: "${userProfile}"`
    : ''

  const userMessage = `${profileSection}${profileSection ? '\n\n' : ''}Interazioni:
${eventsText}`

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
  if (useFewShot) {
    messages.push(
      { role: 'user', content: FEWSHOT_USER },
      { role: 'assistant', content: FEWSHOT_ASSISTANT },
    )
  }
  messages.push({ role: 'user', content: userMessage })
  return messages
}

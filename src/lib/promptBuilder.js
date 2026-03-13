const SYSTEM_PROMPT = `Sei un motore di profilazione utente per un e-commerce di scarpe. Ricevi statistiche comportamentali aggregate e il tuo profilo precedente dell'utente. Il tuo compito è produrre pesi numerici per colore, stile e categoria che riflettano le preferenze osservate. I pesi vanno da -1.0 (evita) a 1.0 (preferisce fortemente). Se i dati recenti contraddicono il profilo precedente, aggiorna il profilo. Rispondi SEMPRE e SOLO con un oggetto JSON valido. Nessun testo extra.`

const RESPONSE_SCHEMA = `{
  "user_profile": "max 80 parole, appunto per il tuo io futuro",
  "color_weights": { "colore": "peso_da_-1_a_1" },
  "style_weights": { "stile": "peso_da_-1_a_1" },
  "category_weights": { "categoria": "peso_da_-1_a_1" },
  "reasoning": "max 20 parole in italiano per l'utente"
}`

function formatAffinity(obj) {
  const entries = Object.entries(obj)
  if (entries.length === 0) return 'nessuno'
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${Math.round(v * 10) / 10}`)
    .join(', ')
}

function formatTopProducts(products) {
  if (!products || products.length === 0) return 'nessuno'
  return products
    .map(p => `${p.id}(${p.category}, ${p.colors.join('/')}, ${p.styles.join('/')}, score:${p.score})`)
    .join('; ')
}

function formatNegativeSignals(signals) {
  const entries = Object.entries(signals)
  if (entries.length === 0) return 'nessuno'
  return entries
    .sort((a, b) => a[1] - b[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${Math.round(v * 10) / 10}`)
    .join(', ')
}

export function buildPrompt(stats, userProfile) {
  const userMessage = `## Profilo precedente
${userProfile || 'Nessun profilo precedente (prima analisi).'}

## Statistiche comportamentali (${stats.totalInteractions} interazioni)
Colori: ${formatAffinity(stats.colorAffinity)}
Stili: ${formatAffinity(stats.styleAffinity)}
Categorie: ${formatAffinity(stats.categoryAffinity)}
Segnali negativi: ${formatNegativeSignals(stats.negativeSignals)}
Top prodotti: ${formatTopProducts(stats.topProducts)}

## Rispondi con JSON:
${RESPONSE_SCHEMA}`

  return {
    system: SYSTEM_PROMPT,
    user: userMessage,
  }
}

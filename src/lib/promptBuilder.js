const SYSTEM_PROMPT = `Sei un motore di profilazione per un e-commerce di scarpe. Ricevi punteggi di interesse utente (0-100) per colori, stili e categorie. Rispondi con un JSON con pesi da -1.0 a 1.0. Punteggi alti = peso positivo vicino a 1.0, punteggi bassi = peso vicino a 0 o negativo. Rispondi SOLO con JSON valido, nessun testo extra.`

const EXAMPLE = `{"user_profile":"Ama sandali blu eleganti","color_weights":{"blu":0.9,"verde":0.4,"giallo":-0.3},"style_weights":{"elegant":0.8,"minimal":0.4,"sporty":-0.2},"category_weights":{"sandal":0.9,"loafer":0.3},"reasoning":"Cerca sandali eleganti in blu"}`

function normalizeToPercent(obj) {
  const entries = Object.entries(obj)
  if (entries.length === 0) return 'nessuno'
  const maxVal = Math.max(...entries.map(([, v]) => Math.abs(v)), 1)
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${Math.round((v / maxVal) * 100)}`)
    .join(', ')
}

export function buildPrompt(stats, userProfile) {
  const userMessage = `Profilo precedente: ${userProfile || 'nessuno'}

Interessi utente:
Colori: ${normalizeToPercent(stats.colorAffinity)}
Stili: ${normalizeToPercent(stats.styleAffinity)}
Categorie: ${normalizeToPercent(stats.categoryAffinity)}

Esempio formato (usa i dati sopra, NON copiare questi valori):
${EXAMPLE}

Ora rispondi con JSON usando i dati reali sopra:`

  return {
    system: SYSTEM_PROMPT,
    user: userMessage,
  }
}

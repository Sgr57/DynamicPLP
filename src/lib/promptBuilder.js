const SYSTEM_PROMPT = `Sei un motore di profilazione per un e-commerce di scarpe. Ricevi punteggi di interesse utente (0-100) per colori, stili e categorie.

Compiti:
1. user_profile: scrivi 1-2 frasi che descrivono i gusti ATTUALI dell'utente. Se c'e' un profilo precedente, AGGIORNALO: descrivi cosa e' cambiato. Se i nuovi dati contraddicono il profilo, riscrivilo.
2. Pesi: da -1.0 a 1.0. Punteggi alti = peso positivo, bassi = peso negativo o 0.
3. reasoning: 1 frase breve in italiano.

Rispondi SOLO con JSON valido.`

const EXAMPLE_NO_PROFILE = `{"user_profile":"Preferisce scarpe nere sportive, stile urban e running","color_weights":{"nero":0.9,"rosso":0.3},"style_weights":{"urban":0.8,"sporty":0.7,"casual":0.1},"category_weights":{"running":0.9,"hiking_boot":0.3},"reasoning":"Interesse chiaro per scarpe nere sportive"}`

const EXAMPLE_WITH_PROFILE = `{"user_profile":"Passato da sneakers casual a stivali eleganti. Ora preferisce nero e marrone, stile classic","color_weights":{"nero":0.8,"marrone":0.6,"bianco":-0.3},"style_weights":{"classic":0.8,"elegant":0.6,"casual":-0.2},"category_weights":{"mans_shoe":0.8,"hiking_boot":0.4,"running":-0.3},"reasoning":"Shift da casual a elegante, colori scuri"}`

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
  const hasProfile = userProfile && userProfile.length > 0
  const example = hasProfile ? EXAMPLE_WITH_PROFILE : EXAMPLE_NO_PROFILE

  const profileSection = hasProfile
    ? `Profilo precedente: "${userProfile}"\nAGGIORNA il profilo in base ai nuovi interessi. Descrivi cosa e' cambiato.`
    : 'Profilo precedente: nessuno. Crea un nuovo profilo basato sui dati.'

  const userMessage = `${profileSection}

Interessi utente attuali:
Colori: ${normalizeToPercent(stats.colorAffinity)}
Stili: ${normalizeToPercent(stats.styleAffinity)}
Categorie: ${normalizeToPercent(stats.categoryAffinity)}

Esempio formato (usa i dati sopra, NON copiare questi valori):
${example}

Ora rispondi con JSON usando i dati reali sopra:`

  return {
    system: SYSTEM_PROMPT,
    user: userMessage,
  }
}

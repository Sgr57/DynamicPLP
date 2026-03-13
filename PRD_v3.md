# PRD — AI-Powered PLP Personalizzata
## In-Browser LLM per E-Commerce di Calzature — Architettura Local First

**Versione:** 4.0
**Data:** Marzo 2026
**Stato:** Draft definitivo
**Tipo progetto:** Demo tecnica / Proof of Concept
**Changelog v3:** Adozione del paradigma **Local First**. Il catalogo migra da JSON statico a TinyBase con persistenza IndexedDB automatica. Tutta la persistenza converge su un unico layer dati locale reattivo. L'app è progettata per funzionare completamente offline dopo il primo caricamento. Introdotti sync hooks e Service Worker per full offline capability.
**Changelog v4:** Nuova strategia di ranking **Statistiche Aggregate + LLM Profiler**. Il catalogo non entra più nel prompt del LLM. Introdotto `statsAggregator` per aggregare eventi in affinità per attributo (colore, stile, categoria). Introdotto `triggerEngine` con condizioni avanzate (delta significativo). Il LLM riceve ~350 token di statistiche compatte e produce pesi numerici continui (-1.0 a 1.0) per attributo. Il reranker applica pesi continui × moltiplicatori fissi. Eliminati `budgetAllocator`, `behaviorSnapshot`, `memoryManager`. Prompt totale ridotto da ~1500-3000 a ~900 token.

---

## 1. Obiettivo e Vision

### 1.1 Problema

Le Product Listing Page (PLP) tradizionali sono statiche e cloud-dipendenti: mostrano i prodotti in un ordine fisso che non tiene conto del comportamento reale dell'utente, e richiedono connettività continua per funzionare. I sistemi di personalizzazione esistenti trasmettono dati comportamentali a server remoti, sottraendo all'utente il controllo sui propri dati.

### 1.2 Soluzione

Una PLP che si personalizza in tempo reale durante la navigazione, sfruttando un Large Language Model che gira **interamente nel browser dell'utente**, con tutti i dati — catalogo, preferenze, profilo comportamentale — persistiti **localmente nel dispositivo** via TinyBase con IndexedDB. L'app funziona completamente offline dopo il primo caricamento. Nessun dato lascia mai il dispositivo.

### 1.3 Il paradigma Local First

Il PoC è costruito attorno ai principi **Local First** di Ink & Switch:

| Principio | Implementazione |
|---|---|
| **Nessuna dipendenza dalla rete** | TinyBase + IndexedDB + WebLLM, Service Worker per asset offline |
| **Il dispositivo è la fonte di verità** | TinyBase è il sistema di record, non un cache di un backend |
| **Dati dell'utente sotto il suo controllo** | Export completo dei dati, reset locale, nessun cloud |
| **Latenza zero** | Tutte le operazioni sono locali, nessun round-trip |
| **Funziona offline** | After first load, zero network required |

### 1.4 Obiettivi del PoC

- Dimostrare la fattibilità tecnica di un LLM in-browser per un caso d'uso e-commerce reale
- Dimostrare un'architettura **interamente local first**: catalogo, comportamento, profilo AI — tutto su TinyBase locale con IndexedDB
- Creare un artefatto visivamente convincente e interattivo
- Costruire una base di codice estendibile verso sync multi-device (CRDTs nativi TinyBase) senza redesign

---

## 2. Scope

### 2.1 In scope

- PLP di calzature con catalogo mock (30 prodotti) persistito in **TinyBase con IndexedDB**
- Tracking comportamentale con persistenza su TinyBase
- Integrazione WebLLM con Llama 3.2 1B (pesi in IndexedDB, gestito da WebLLM)
- Sistema di memoria persistente (profilo utente + pesi di ranking) su TinyBase
- Aggregazione statistica comportamentale con trigger intelligente (delta significativo)
- Product Drawer laterale con esplorazione varianti
- Re-ranking animato della griglia in tempo reale
- Pannello AI Reasoning visibile all'utente
- Schermata di caricamento con progress (modello + db seed)
- Toggle AI on/off per confronto before/after
- **Export dei dati locali** (JSON download)
- **Service Worker** per full offline capability dopo il primo caricamento
- **Indicatore offline/online** nello stato dell'app

### 2.2 Out of scope

- Backend di qualsiasi tipo
- Sincronizzazione multi-device (architettura è sync-ready, ma la sync non è implementata)
- Autenticazione o gestione utente
- Carrello e checkout
- Filtri manuali (colore, prezzo, taglia)
- Supporto mobile / responsive
- Internazionalizzazione
- Testing automatizzato
- Conflict resolution per sync (futura fase)

---

## 3. Stack Tecnologico

### 3.1 Frontend

| Tecnologia | Versione | Motivazione |
|---|---|---|
| React | 18.x | Componenti riutilizzabili, hooks per stato locale e asincrono |
| Vite | 5.x | Build velocissimo, HMR ottimale, ottimo supporto ESM e Service Worker |
| Tailwind CSS | 3.x | Utility-first, prototipazione rapida |
| Framer Motion | 11.x | Animazioni layout dichiarative per il re-ranking |

### 3.2 Layer dati locale — TinyBase

| Tecnologia | Dimensione | Motivazione |
|---|---|---|
| **TinyBase** | ~10 KB | Store tabellare reattivo con React hooks nativi, persistenza IndexedDB automatica, CRDT nativo per sync futuro |
| **IndexedDB** | API Web nativa | Storage locale universale, gestito automaticamente dal persister TinyBase |

**Perché TinyBase?**

- **Ultra-leggero** (~10 KB vs ~1.5 MB di sql.js WASM) — riduce drasticamente il payload iniziale
- **Reattivo** — hooks React nativi (`useTable`, `useRow`, `useCell`) per aggiornamenti UI automatici
- **CRDT nativo** — `createWsSynchronizer` per sync multi-device futuro senza librerie aggiuntive
- **Zero WASM** — nessun file binario da caricare, avvio istantaneo
- **Persistenza automatica** — IndexedDB persister con auto-load e auto-save, nessun codice manuale di persistenza

### 3.3 LLM In-Browser

| Tecnologia | Versione | Motivazione |
|---|---|---|
| @mlc-ai/web-llm | latest | LLM via WebGPU, supporto nativo Llama 3.2, API semplice |

I pesi del modello vengono gestiti da WebLLM in IndexedDB (comportamento nativo della libreria, invariato rispetto a v2).

### 3.4 Offline capability

| Tecnologia | Motivazione |
|---|---|
| **Service Worker** (Workbox 7.x) | Cache degli asset statici (JS, CSS, HTML) per funzionamento offline completo dopo il primo caricamento |

### 3.5 Utilities

| Tecnologia | Motivazione |
|---|---|
| lodash (`debounce`) | Debounce per il tracker |

### 3.6 Vincoli browser

| Requisito | Browser |
|---|---|
| WebGPU | Chrome 113+, Edge 113+ |
| IndexedDB | Tutti i browser moderni |
| Service Worker | Tutti i browser moderni |

IndexedDB è supportato universalmente. Se WebGPU non è disponibile, il demo mostra un messaggio chiaro. Il layer dati TinyBase + IndexedDB funziona ovunque senza fallback.

---

## 4. Schema del Data Store (TinyBase)

Tutte le entità del sistema risiedono nello stesso store TinyBase, persistito su IndexedDB con il nome `plp_demo`.

TinyBase è schema-free: le tabelle vengono create implicitamente al primo `setRow()`. La struttura sotto documentata è la convenzione adottata dal codice.

### 4.1 Tabella `products`

| Campo | Tipo | Note |
|---|---|---|
| **id** (rowId) | string | `"shoe_001"` — chiave della riga |
| name | string | Nome del prodotto |
| brand | string | Brand |
| category | string | `sneaker` · `boot` · `loafer` · `sandalo` · `mocassino` |
| price | number | Prezzo intero |
| gender | string | `uomo` · `donna` · `unisex` |
| styles | string | JSON array: `'["casual","urban"]'` |
| position | number | Ordine corrente nella griglia (aggiornato dal reranker) |

### 4.2 Tabella `variants`

| Campo | Tipo | Note |
|---|---|---|
| **id** (rowId) | string | ID generato (`"var_001"`) |
| productId | string | Riferimento al prodotto |
| color | string | `"red"` |
| hex | string | `"#E53E3E"` |
| inStock | number | `0` · `1` |

La relazione `products → variants` è 1:N tramite il campo `productId`. La separazione in tabella propria rende facili le query del tipo "tutti i prodotti disponibili in rosso".

### 4.3 Tabella `trackingEvents`

| Campo | Tipo | Note |
|---|---|---|
| **id** (rowId) | string | `"evt_1710000000000_a1b2"` — generato con timestamp + random |
| eventType | string | `"plp.cardClick"`, `"drawer.variantClick"` |
| productId | string | Riferimento al prodotto (opzionale) |
| color | string | Colore associato all'evento (opzionale) |
| weight | number | Peso dell'evento |
| analyzed | number | `0` = nel buffer, `1` = già inviato al LLM |
| createdAt | number | UNIX timestamp ms |

Il campo `analyzed` sostituisce il concetto di "event buffer" della v2: gli eventi non analizzati (`analyzed = 0`) costituiscono il behavioral delta. Dopo ogni chiamata LLM riuscita, vengono marcati `analyzed = 1`. Non vengono mai cancellati — questo permette future analisi storiche o visualizzazioni del journey.

### 4.4 Tabella `aiMemory`

| Campo | Tipo | Note |
|---|---|---|
| **key** (rowId) | string | `"user_profile"` · `"last_weights"` · `"last_stats_snapshot"` · `"last_analysis_at"` |
| value | string | Contenuto serializzato (JSON per oggetti strutturati) |
| updatedAt | number | UNIX timestamp ms |

Chiave-valore per la memoria AI. Le chiavi hanno scopi specifici:

- **`user_profile`** — Profilo qualitativo scritto dal LLM in linguaggio naturale (max 80 parole)
- **`last_weights`** — JSON con `color_weights`, `style_weights`, `category_weights` prodotti dal LLM. Usato per pre-ranking all'avvio e come stato di partenza per il reranker
- **`last_stats_snapshot`** — JSON con l'ultima snapshot di statistiche aggregate inviate al LLM. Usato dal `triggerEngine` per calcolare il delta significativo
- **`last_analysis_at`** — Timestamp dell'ultima analisi. Usato per il cooldown

> **Nota:** La tabella `schema_migrations` non è più necessaria. TinyBase è schema-free — le evoluzioni dello schema avvengono nel codice applicativo tramite logica di versioning nel `store.js`.

---

## 5. Struttura del Progetto

```
/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── sw.js                          # Service Worker (Workbox)
└── src/
    ├── App.jsx
    ├── main.jsx
    │
    ├── components/
    │   ├── ModelLoader.jsx        # Schermata caricamento modello + db seed
    │   ├── PLPGrid.jsx            # Griglia prodotti animata
    │   ├── ProductCard.jsx        # Card singola con tracking
    │   ├── ColorSwatch.jsx        # Pallino colore cliccabile
    │   ├── ProductDrawer.jsx      # Drawer laterale dettaglio
    │   ├── AIReasoningPanel.jsx   # Pannello reasoning LLM
    │   └── OfflineIndicator.jsx   # Badge online/offline status
    │
    ├── hooks/
    │   ├── useModelLoader.js      # Init e stato WebLLM
    │   ├── useReranker.js         # Applica pesi LLM al catalogo
    │   ├── useDrawerTracker.js    # Eventi specifici del drawer
    │   └── useOfflineStatus.js    # Monitora navigator.onLine
    │
    ├── db/
    │   ├── store.js               # Init TinyBase store + IndexedDB persister + seed
    │   ├── productsRepo.js        # Query su products e variants
    │   ├── trackingRepo.js        # Insert eventi, query delta, mark analyzed
    │   └── aiMemoryRepo.js        # get/set per user_profile, last_weights, etc.
    │
    ├── tracking/
    │   ├── trackingConfig.js      # Pesi, soglie, decay config
    │   └── trackingEngine.js      # Cattura eventi → trackingRepo
    │
    ├── ai/
    │   ├── statsAggregator.js     # Aggrega eventi in affinità per attributo (colore, stile, categoria)
    │   └── triggerEngine.js       # Valuta condizioni di trigger per chiamata LLM
    │
    ├── lib/
    │   ├── promptBuilder.js       # Costruisce prompt da stats aggregate + profilo (senza catalogo)
    │   ├── reranker.js            # Scoring con pesi continui dal LLM × moltiplicatori fissi
    │   ├── jsonParser.js          # Parse robusto risposta LLM con fallback
    │   └── dbExporter.js          # Genera JSON dump dello store per il download utente
    │
    └── data/
        ├── products.json          # Sorgente dati per il seed iniziale (non usato a runtime)
        └── modelConfig.js         # Config WebLLM
```

### 5.1 Il pattern Repository

Ogni tabella ha un proprio repository (`productsRepo`, `trackingRepo`, `aiMemoryRepo`). I componenti e gli hook non chiamano mai TinyBase direttamente: accedono ai dati tramite i repository. Questo isola la logica di accesso dati dalla UI e rende possibile evolvere il layer dati senza toccare i componenti.

---

## 6. Layer Dati: TinyBase Store

### 6.1 Inizializzazione

```js
// db/store.js
import { createStore } from 'tinybase'
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db'

export const store = createStore()

export async function initStore() {
  const persister = createIndexedDbPersister(store, 'plp_demo')
  await persister.startAutoLoad()   // carica dati esistenti da IndexedDB
  await persister.startAutoSave()   // salva automaticamente ogni modifica
  await seedIfEmpty()
  return store
}
```

La persistenza è completamente automatica: ogni modifica allo store viene salvata su IndexedDB senza codice manuale. Non esiste un `persistDb()` da chiamare — TinyBase gestisce tutto internamente.

### 6.2 Seed iniziale

Al primo avvio (tabella `products` vuota), `store.js` importa `products.json` e popola `products` e `variants`. Il seed avviene una sola volta. Dopo il seed, `products.json` non viene più letto — il catalogo vive nello store.

```js
async function seedIfEmpty() {
  const products = store.getTable('products')
  if (Object.keys(products).length > 0) return   // già popolato
  const data = await import('../data/products.json')
  // setRow() per ogni prodotto e variante
}
```

---

## 7. Repository Pattern

### 7.1 productsRepo

```js
import { store } from './store'

// Tutti i prodotti ordinati per position (ordine corrente griglia)
export function getProducts() {
  const products = store.getTable('products')
  const variants = store.getTable('variants')
  return Object.entries(products)
    .map(([id, p]) => ({
      ...p, id,
      variants: Object.values(variants).filter(v => v.productId === id)
    }))
    .sort((a, b) => a.position - b.position)
}

// Aggiorna l'ordine della griglia dopo il re-ranking
export function updatePositions(orderedIds) {
  orderedIds.forEach((id, i) => {
    store.setCell('products', id, 'position', i)
  })
}
```

### 7.2 trackingRepo

```js
import { store } from './store'

// Inserisce un evento nel buffer (analyzed = 0)
export function insertEvent(event) {
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  store.setRow('trackingEvents', id, {
    eventType: event.type, productId: event.productId,
    color: event.color, weight: event.weight,
    analyzed: 0, createdAt: Date.now()
  })
}

// Legge il behavioral delta (solo eventi non analizzati)
export function getDelta() {
  return Object.values(store.getTable('trackingEvents'))
    .filter(r => r.analyzed === 0)
    .sort((a, b) => a.createdAt - b.createdAt)
}

// Marca come analizzati dopo una risposta LLM riuscita
export function markAnalyzed() {
  const rows = store.getTable('trackingEvents')
  Object.entries(rows).forEach(([id, row]) => {
    if (row.analyzed === 0) store.setCell('trackingEvents', id, 'analyzed', 1)
  })
}

// Statistiche storiche (per future feature: "il tuo profilo di navigazione")
export function getSessionStats() {
  const rows = store.getTable('trackingEvents')
  const stats = {}
  Object.values(rows).forEach(row => {
    if (!stats[row.eventType]) stats[row.eventType] = { count: 0, totalWeight: 0 }
    stats[row.eventType].count++
    stats[row.eventType].totalWeight += row.weight
  })
  return Object.entries(stats)
    .map(([eventType, s]) => ({ eventType, count: s.count, avgWeight: s.totalWeight / s.count }))
    .sort((a, b) => b.count - a.count)
}
```

### 7.3 aiMemoryRepo

```js
import { store } from './store'

export function getMemoryValue(key) {
  const row = store.getRow('aiMemory', key)
  return row?.value ?? null
}

export function setMemoryValue(key, value) {
  store.setRow('aiMemory', key, { value, updatedAt: Date.now() })
}

// Shortcut per salvare i pesi dal LLM (JSON stringificato)
export function saveWeights(weights) {
  setMemoryValue('last_weights', JSON.stringify(weights))
}

// Shortcut per leggere i pesi (parsed)
export function getWeights() {
  const raw = getMemoryValue('last_weights')
  return raw ? JSON.parse(raw) : null
}

// Salva la snapshot di statistiche per calcolo delta
export function saveStatsSnapshot(snapshot) {
  setMemoryValue('last_stats_snapshot', JSON.stringify(snapshot))
}

// Legge l'ultima snapshot di statistiche (parsed)
export function getStatsSnapshot() {
  const raw = getMemoryValue('last_stats_snapshot')
  return raw ? JSON.parse(raw) : null
}
```

---

## 8. Offline Capability

### 8.1 Service Worker

Workbox precача tutti gli asset statici (HTML, JS, CSS) al primo caricamento. Dopo questo, l'app funziona completamente offline — TinyBase persiste su IndexedDB (locale), WebLLM usa IndexedDB per i pesi.

```js
// sw.js (Workbox)
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)  // iniettato da Vite plugin

// Cache risorse statiche con strategia CacheFirst
registerRoute(
  ({ url }) => url.pathname.match(/\.(js|css|woff2?)$/),
  new CacheFirst({ cacheName: 'static-cache' })
)
```

### 8.2 Flusso al secondo accesso (offline)

```
Utente apre l'app senza rete
  │
  ├─ Service Worker serve HTML + JS da cache
  ├─ TinyBase carica dati da IndexedDB (locale)
  ├─ WebLLM carica pesi del modello da IndexedDB (locale)
  ├─ PLP si apre con l'ultimo reranking da aiMemory
  └─ Tutto funziona: tracking, LLM, re-ranking — zero rete
```

### 8.3 OfflineIndicator

Un badge discreto nell'header mostra lo stato di rete: `🟢 Online` / `🔴 Offline`. Quando offline, una nota contestuale informa che tutte le funzionalità continuano a funzionare normalmente.

---

## 9. Export dei Dati

### 9.1 Export dei dati

Il bottone "Esporta i tuoi dati" nel footer genera un download di un file JSON contenente tutto lo store. L'utente ottiene un file leggibile e interoperabile.

```js
// lib/dbExporter.js
import { store } from '../db/store'

export function exportData() {
  const data = JSON.stringify(store.getContent(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plp_demo_export.json'
  a.click()
}
```

Il file esportato contiene: catalogo prodotti, tutta la storia degli eventi comportamentali, il profilo AI, l'ultimo stato del re-ranking. L'utente può interrogarlo liberamente.

### 9.2 Reset dati

Il bottone "Resetta preferenze" cancella le tabelle `trackingEvents` e `aiMemory`, e ripristina le posizioni dei prodotti all'ordine di default. Il catalogo non viene toccato. La persistenza su IndexedDB è automatica.

---

## 10. Modello LLM

### 10.1 Modello scelto

```
Llama-3.2-1B-Instruct-q4f32_1-MLC
```

### 10.2 Parametri di inferenza

```js
temperature: 0.2
top_p: 0.9
max_tokens: 300
```

I pesi vengono gestiti da WebLLM in IndexedDB (comportamento nativo). Download una sola volta, disponibile offline.

---

## 11. Architettura della Memoria AI

### 11.1 Cosa viene salvato nel db

Quattro righe nella tabella `aiMemory`, quattro scopi diversi:

**`user_profile`** — Il profilo utente scritto dal modello in linguaggio naturale. Max 80 parole. Il modello scrive al suo io futuro.

**`last_weights`** — JSON con `color_weights`, `style_weights`, `category_weights` prodotti dal LLM. Contiene pesi numerici da -1.0 a 1.0 per ogni attributo. Usato dal reranker per lo scoring e per il pre-ranking all'avvio.

**`last_stats_snapshot`** — JSON con l'ultima snapshot di statistiche aggregate (affinità colore, stile, categoria) inviate al LLM. Usato dal `triggerEngine` per calcolare se il delta è significativo (>2 punti su almeno un attributo) ed evitare chiamate LLM ridondanti.

**`last_analysis_at`** — Timestamp dell'ultima analisi. Usato per calcolare il cooldown (30s).

### 11.2 Ciclo di vita della memoria

```
Sessione 1 (primo accesso):
  store senza righe in aiMemory → profilo = null, pesi = null
  PLP mostra prodotti in ordine default (position dal seed)
  L'utente naviga → eventi in trackingEvents (analyzed = 0)
  statsAggregator aggrega → affinità per colore/stile/categoria
  triggerEngine valuta → 10+ interazioni, 8s inattività, delta significativo
  Trigger scatta → promptBuilder assembla stats + profilo null (~900 token)
  LLM risponde → salva user_profile, last_weights, last_stats_snapshot
  markAnalyzed() → tutti gli eventi diventano analyzed = 1
  reranker applica pesi → updatePositions() → griglia si riordina

Sessione 2 (utente torna, anche offline):
  store ha profilo + last_weights + eventi storici (analyzed = 1)
  PLP si apre con ranking da last_weights (pre-personalizzata)
  LLM si carica in background
  Nuovi eventi → trackingEvents (analyzed = 0)
  statsAggregator → nuove affinità
  triggerEngine confronta con last_stats_snapshot → trigger solo se delta >2 punti
  LLM aggiorna pesi → re-ranking
```

---

## 12. Sistema di Tracking

### 12.1 Principi architetturali

1. **Configurazione separata dall'esecuzione** — `trackingConfig.js` è l'unica fonte di verità per pesi e soglie.
2. **Statistiche aggregate, non eventi raw** — Il LLM riceve affinità aggregate per attributo, non gli eventi singoli. Il catalogo non entra mai nel prompt.
3. **Persistenza immediata** — Ogni evento è scritto nello store TinyBase (auto-persisted su IndexedDB) prima di essere processato. Nessun evento va perso.
4. **Storia completa queryabile** — Gli eventi `analyzed = 1` non vengono cancellati. Sono la base per future analisi e visualizzazioni.
5. **Trigger intelligente** — Il LLM viene chiamato solo quando le statistiche cambiano significativamente, non ad ogni accumulo di eventi.

### 12.2 trackingConfig.js

```js
export const TRACKING_CONFIG = {
  triggers: {
    minInteractions: 10,        // ≥10 eventi analyzed=0
    inactivitySeconds: 8,       // ≥8s senza nuovi eventi
    cooldownAfterAnalysis: 30,  // ≥30s dall'ultima chiamata LLM
    significantDelta: 2,        // almeno un attributo cambiato >2 punti
  },
  decay: {
    enabled: true,
    halfLifeSeconds: 120,
  },
  plp: {
    cardHover:     { enabled: true,  weight: 2,  minDurationMs: 1500 },
    cardHoverExit: { enabled: true,  weight: -1, maxDurationMs: 400  },
    swatchHover:   { enabled: true,  weight: 3,  minDurationMs: 500  },
    swatchClick:   { enabled: true,  weight: 4                       },
    cardClick:     { enabled: true,  weight: 5                       },
    cardRevisit:   { enabled: true,  weight: 5                       },
    scrollSkip:    { enabled: true,  weight: -2                      },
  },
  drawer: {
    open:           { enabled: true,  weight: 3                       },
    quickClose:     { enabled: true,  weight: -3, maxDurationMs: 1000 },
    timeSpent:      { enabled: true,  weight: 3,  minDurationMs: 5000 },
    variantHover:   { enabled: true,  weight: 4,  minDurationMs: 500  },
    variantClick:   { enabled: true,  weight: 6                       },
    variantCycling: { enabled: true,  weight: 2,  minVariants: 2      },
    reopen:         { enabled: true,  weight: 5                       },
  },
}
```

### 12.3 statsAggregator — Aggregazione Statistica

`statsAggregator.js` sostituisce `behaviorSnapshot.js`. Legge gli eventi non analizzati (`analyzed = 0`), applica decay temporale e aggrega in affinità per attributo. Per risolvere la relazione evento→attributi, effettua un join con il catalogo prodotti nello store (via `productsRepo`).

```js
// ai/statsAggregator.js
export function aggregateStats() {
  const events = trackingRepo.getDelta()    // analyzed = 0
  const products = productsRepo.getProducts()
  const now = Date.now()
  const halfLife = TRACKING_CONFIG.decay.halfLifeSeconds * 1000

  const colorAffinity = {}    // { nero: 8.3, rosso: 4.1, ... }
  const styleAffinity = {}    // { casual: 7.2, urban: 5.0, ... }
  const categoryAffinity = {} // { sneaker: 9.1, boot: 3.2, ... }
  const negativeSignals = []  // [{ type: 'scrollSkip', attribute: 'elegant' }, ...]
  const productScores = {}    // { shoe_001: 12.4, shoe_007: 8.1, ... }

  for (const e of events) {
    const decayed = e.weight * Math.pow(0.5, (now - e.createdAt) / halfLife)
    const product = products.find(p => p.id === e.productId)
    if (!product) continue

    // Accumula per colore
    if (e.color) {
      colorAffinity[e.color] = (colorAffinity[e.color] || 0) + decayed
    }

    // Accumula per stile (dal prodotto)
    const styles = JSON.parse(product.styles || '[]')
    for (const s of styles) {
      styleAffinity[s] = (styleAffinity[s] || 0) + decayed / styles.length
    }

    // Accumula per categoria (dal prodotto)
    categoryAffinity[product.category] =
      (categoryAffinity[product.category] || 0) + decayed

    // Score per prodotto (per top interagiti)
    productScores[e.productId] =
      (productScores[e.productId] || 0) + decayed

    // Segnali negativi (eventi con peso < 0)
    if (e.weight < 0) {
      negativeSignals.push({
        type: e.eventType.split('.').pop(),
        category: product.category,
        styles,
      })
    }
  }

  // Top 5-8 prodotti interagiti con dettagli
  const topProducts = Object.entries(productScores)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 8)
    .map(([id, score]) => {
      const p = products.find(pr => pr.id === id)
      return { id, category: p.category,
        colors: p.variants.map(v => v.color),
        styles: JSON.parse(p.styles || '[]'), score: Math.round(score * 10) / 10 }
    })

  return {
    colorAffinity, styleAffinity, categoryAffinity,
    negativeSignals, topProducts,
    totalInteractions: events.length,
  }
}
```

### 12.4 triggerEngine — Condizioni di Trigger

`triggerEngine.js` valuta se chiamare il LLM. Tutte le condizioni devono essere vere contemporaneamente:

1. **≥10 nuove interazioni** (`analyzed = 0` count)
2. **≥8 secondi di inattività** (nessun evento tracking recente)
3. **Cooldown ≥30 secondi** dall'ultima chiamata LLM
4. **Delta significativo**: almeno un attributo nell'aggregazione è cambiato di >2 punti rispetto all'ultima snapshot inviata al LLM

La condizione 4 evita chiamate LLM ridondanti quando l'utente interagisce molto ma senza cambiare pattern (es: esplora 10 sneaker nere consecutive — le affinità salgono ma il profilo non cambia).

```js
// ai/triggerEngine.js
export function shouldTrigger(currentStats) {
  const config = TRACKING_CONFIG.triggers
  const delta = trackingRepo.getDelta()

  // Condizione 1: abbastanza interazioni
  if (delta.length < config.minInteractions) return false

  // Condizione 2: inattività
  const lastEventAt = Math.max(...delta.map(e => e.createdAt))
  const inactivityMs = Date.now() - lastEventAt
  if (inactivityMs < config.inactivitySeconds * 1000) return false

  // Condizione 3: cooldown
  const lastAnalysis = aiMemoryRepo.getMemoryValue('last_analysis_at')
  if (lastAnalysis) {
    const elapsed = Date.now() - Number(lastAnalysis)
    if (elapsed < config.cooldownAfterAnalysis * 1000) return false
  }

  // Condizione 4: delta significativo rispetto all'ultima snapshot
  const lastSnapshot = aiMemoryRepo.getStatsSnapshot()
  if (lastSnapshot) {
    const hasSignificantChange = checkSignificantDelta(
      lastSnapshot, currentStats, config.significantDelta
    )
    if (!hasSignificantChange) return false
  }

  return true
}

function checkSignificantDelta(oldStats, newStats, threshold) {
  // Confronta affinità per colore, stile, categoria
  for (const dimension of ['colorAffinity', 'styleAffinity', 'categoryAffinity']) {
    const oldDim = oldStats[dimension] || {}
    const newDim = newStats[dimension] || {}
    const allKeys = new Set([...Object.keys(oldDim), ...Object.keys(newDim)])
    for (const key of allKeys) {
      const diff = Math.abs((newDim[key] || 0) - (oldDim[key] || 0))
      if (diff > threshold) return true
    }
  }
  return false
}
```

---

## 13. Prompt Engineering

### 13.1 Strategia: Statistiche Aggregate, Non Catalogo

Il prompt non contiene il catalogo prodotti. Il LLM riceve solo statistiche aggregate di comportamento (~350 token di input) e produce pesi numerici per attributo (~300 token di output). Questo approccio:

- **Elimina la saturazione della context window** — il prompt totale è ~900 token vs ~1500-3000 della v3
- **Rende il LLM un profiler** — analizza pattern comportamentali e genera un modello dell'utente
- **Il ranking è deterministico** — il reranker applica i pesi al catalogo senza che il LLM debba conoscerlo

### 13.2 Struttura del prompt (~900 token totali)

```
SYSTEM (~150 token):
Sei un motore di profilazione utente per un e-commerce di scarpe.
Ricevi statistiche comportamentali aggregate e il tuo profilo precedente
dell'utente. Il tuo compito è produrre pesi numerici per colore, stile e
categoria che riflettano le preferenze osservate.
I pesi vanno da -1.0 (evita) a 1.0 (preferisce fortemente).
Se i dati recenti contraddicono il profilo precedente, aggiorna il profilo.
Rispondi SEMPRE e SOLO con un oggetto JSON valido. Nessun testo extra.

USER (~350 token per stats + ~100 per profilo + ~100 per schema):
Tuo profilo precedente dell'utente:
[getMemoryValue('user_profile') oppure "Nessuno, prima analisi"]

Statistiche comportamentali recenti:
Affinità colori: nero 8.3, rosso 4.1, blu 1.2
Affinità stili: casual 7.2, urban 5.0
Affinità categorie: sneaker 9.1, boot 3.2
Segnali negativi: scrollSkip su elegant, quickClose su sandalo
Sessioni totali: 3, Interazioni recenti: 47

Top prodotti interagiti:
- shoe_001 (sneaker, nero/bianco, casual) score: 12.4
- shoe_007 (boot, marrone, urban) score: 8.1
- shoe_015 (sneaker, rosso, sporty) score: 6.3

Schema risposta:
{
  "user_profile": "max 80 parole, appunto per il tuo io futuro",
  "color_weights": { "colore": peso_da_-1_a_1 },
  "style_weights": { "stile": peso_da_-1_a_1 },
  "category_weights": { "categoria": peso_da_-1_a_1 },
  "reasoning": "max 20 parole in italiano per l'utente"
}
```

### 13.3 Budget token

| Slot | Contenuto | Token stimati |
|---|---|---|
| System prompt | Istruzioni + formato output | ~150 |
| Profilo precedente | Testo qualitativo da `user_profile` | ~100 |
| Statistiche aggregate | Affinità + negativi + top prodotti da `statsAggregator` | ~350 |
| Schema risposta | Template JSON output | ~100 |
| **Input totale** | | **~700** |
| Risposta riservata | `max_tokens` | ~300 |
| **Totale** | | **~1000** |

Il prompt sta comodamente nella context window di Llama 3.2 1B (2048-4096 token) con ampio margine.

### 13.4 Gestione JSON malformato

`jsonParser.js` implementa parsing a cascata con fallback su `aiMemory.last_weights` nello store. L'utente vede sempre una PLP personalizzata anche se l'ultima inferenza fallisce.

---

## 14. Algoritmo di Re-ranking

### 14.1 Scoring con pesi continui

Il reranker riceve i pesi dal LLM (valori da -1.0 a 1.0 per colore, stile, categoria) e li applica a ogni prodotto del catalogo con moltiplicatori fissi per dimensione.

```js
// Moltiplicatori fissi per bilanciare l'importanza relativa delle dimensioni
const W_COLOR = 40
const W_STYLE = 20
const W_CATEGORY = 30
const W_STOCK = 5

function scoreProduct(product, weights) {
  const { color_weights, style_weights, category_weights } = weights

  // Colore: il peso più alto tra i colori del prodotto
  const colorScore = Math.max(
    ...product.variants.map(v => color_weights[v.color] ?? 0)
  )

  // Stile: media dei pesi degli stili del prodotto
  const styles = JSON.parse(product.styles || '[]')
  const styleScore = styles.length > 0
    ? styles.reduce((sum, s) => sum + (style_weights[s] ?? 0), 0) / styles.length
    : 0

  // Categoria: peso diretto
  const categoryScore = category_weights[product.category] ?? 0

  // Bonus disponibilità: se una variante con colore preferito (peso > 0) è in stock
  const hasPreferredInStock = product.variants.some(
    v => (color_weights[v.color] ?? 0) > 0 && v.inStock
  )
  const stockBonus = hasPreferredInStock ? 1 : 0

  return colorScore * W_COLOR
       + styleScore * W_STYLE
       + categoryScore * W_CATEGORY
       + stockBonus * W_STOCK
}
```

I pesi dal LLM vanno da -1.0 a 1.0, quindi il score di un prodotto può essere negativo (prodotto da penalizzare, finisce in fondo alla griglia).

### 14.2 Persistenza dell'ordine

Dopo il re-ranking, `productsRepo.updatePositions(orderedIds)` aggiorna il campo `position` nello store TinyBase. L'ordine della griglia è auto-persistito su IndexedDB: al prossimo avvio (anche offline), i prodotti si caricano già nell'ordine corretto senza attendere il LLM.

### 14.3 Pre-ranking all'avvio

All'avvio, se `last_weights` esiste in `aiMemory`, il reranker applica immediatamente quei pesi al catalogo. La griglia si carica già personalizzata prima che il LLM sia pronto. Quando il LLM produce nuovi pesi, il re-ranking avviene con animazione.

### 14.4 Prodotto attivo nel drawer

Il prodotto aperto nel drawer viene escluso dal riordinamento per la durata dell'apertura (ancorato per `productId`, non per posizione).

---

## 15. Pipeline Tracking → LLM → Ranking

### 15.1 Architettura della Pipeline

```
Interazioni utente
       │
       ▼
┌─────────────────┐
│ trackingEngine   │  Cattura hover, click, scroll, drawer...
│ (pesi fissi)     │  Scrive in trackingEvents (analyzed=0)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ statsAggregator  │  Aggrega eventi non analizzati
│                  │  → affinità colore/stile/categoria
│                  │  → top prodotti interagiti
│                  │  → segnali negativi
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ triggerEngine    │  Valuta soglie:
│                  │  - 10+ nuove interazioni
│                  │  - 8s inattività
│                  │  - cooldown 30s
│                  │  - delta significativo (>2 punti)
└────────┬────────┘
         │ (se trigger scatta)
         ▼
┌─────────────────┐
│ promptBuilder    │  ~900 token totali
│                  │  System (~150) + stats (~350)
│                  │  + profilo (~100) + schema (~100)
│                  │  Response budget: ~300 token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ WebLLM (Llama)   │  Inferenza in-browser via WebGPU
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ jsonParser       │  Parse risposta → fallback su last_weights
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ reranker         │  Per ogni prodotto:
│                  │  score = color_w × 40 + style_w × 20
│                  │        + category_w × 30 + stock × 5
│                  │  Ordina per score → updatePositions()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PLPGrid          │  Re-render con Framer Motion
└─────────────────┘
```

### 15.2 Differenze rispetto alla v3

| Componente | v3 | v4 |
|---|---|---|
| Input al LLM | Catalogo compresso + delta eventi (~1500-3000 token) | Solo stats aggregate + profilo (~900 token) |
| `budgetAllocator` | 4 livelli compressione catalogo | **Eliminato** — non necessario |
| `behaviorSnapshot` | Aggrega eventi raw per il LLM | Sostituito da `statsAggregator`: affinità per attributo |
| `memoryManager` | Astrae aiMemoryRepo | **Eliminato** — accesso diretto via repo |
| Output LLM | Colori/stili preferiti + boost product IDs (binario) | Pesi continui -1.0/1.0 per colore, stile, categoria |
| Reranker | Pesi fissi (+40/+30/+20/+5) su match binario | Pesi continui dal LLM × moltiplicatori per dimensione |
| Trigger | score ≥10, 3+ eventi, 8s inattività, 5s cooldown | 10+ interazioni, 8s inattività, 30s cooldown, **delta significativo** |
| `aiMemory` | user_profile + last_response + last_analysis_at | user_profile + **last_weights** + **last_stats_snapshot** + last_analysis_at |

---

## 16. Componenti UI

### 16.1 ModelLoader

Schermata di init con due fasi distinte: `"Inizializzazione store..."` e `"Download modello AI..."`. Progress bar separata per le due operazioni. Se lo store era già popolato (utente di ritorno), la prima fase è istantanea.

### 16.2 PLPGrid

Griglia CSS a 4 colonne con Framer Motion `layout`. L'ordine dei prodotti viene letto da `productsRepo.getProducts()` all'avvio. TinyBase offre hooks reattivi (`useTable`, listener) per aggiornamenti UI automatici quando lo store cambia.

### 16.3–16.7

ProductCard, ColorSwatch, ProductDrawer, AIReasoningPanel, Toggle AI On/Off — invariati rispetto alla v2.

### 16.8 OfflineIndicator (nuovo in v3)

Badge persistente nell'header con stato rete. Quando offline:
- Il badge cambia colore (rosso)
- Una nota spiega: *"Stai navigando offline — tutte le funzionalità sono disponibili"*

### 16.9 Export dati (nuovo in v3)

Bottone nel footer: "⬇ Esporta i tuoi dati". Genera il download di `plp_demo_export.json`. Accompagnato da una nota: *"Il file contiene il catalogo, le tue interazioni e il tuo profilo AI."*

---

## 17. Macchina a Stati dell'App

```
IDLE
  │  (app montata, WebGPU disponibile)
  ▼
STORE_INIT
  │  (TinyBase store creato, IndexedDB persister caricato)
  │
  ├─ store vuoto → SEEDING → MODEL_LOADING
  └─ store con dati → CHECK_MEMORY
                        │
                        ├─ last_weights esiste → PRELOADED (ranking da pesi salvati)
                        └─ no last_weights    → MODEL_LOADING

MODEL_LOADING
  │  (WebLLM download + init completato)
  ▼
BROWSING / BROWSING_WITH_CACHE  ←─────────────────────┐
  │  (triggerEngine scatta: 10+ interazioni,           │
  │   8s inattività, 30s cooldown, delta >2)           │
  ▼                                                     │
AGGREGATING                                            │
  │  (statsAggregator produce affinità)                │
  ▼                                                     │
ANALYZING                                              │
  │  (LLM produce pesi + profilo → salva in aiMemory)  │
  ▼                                                     │
PERSONALIZED ──── (cooldown scaduto) ──────────────────┘

ERRORE_WEBGPU    → messaggio statico + link Chrome
ERRORE_LLM       → fallback su last_weights nello store
```

---

## 18. Gestione Errori

| Scenario | Comportamento |
|---|---|
| WebGPU non disponibile | Schermata dedicata con spiegazione |
| IndexedDB non disponibile | Estremamente raro (solo navigazione privata su Safari vecchio). Store opera in-memory per la sessione |
| Download modello fallito | Retry automatico; se profilo in cache, PLP personalizzata resta visibile |
| JSON malformato da LLM | Parsing a cascata, fallback su `last_weights` nello store |
| Inferenza LLM > 15s | Timeout, nessun re-ranking, tracking continua |
| Errore nel tracking | Try/catch silenzioso, eventi persi non vengono scritti nello store |

---

## 19. Performance e Ottimizzazioni

| Ottimizzazione | Dettaglio |
|---|---|
| Zero overhead persistenza | TinyBase auto-save su IndexedDB, nessun codice manuale di persistenza |
| Prompt compatto (~900 token) | Statistiche aggregate senza catalogo — il prompt sta in qualsiasi context window |
| Trigger intelligente | Delta significativo evita chiamate LLM ridondanti |
| Cooldown post-analisi | 30 secondi tra chiamate LLM |
| Decadimento temporale | Half-life 120s, calcolato in `statsAggregator` |
| Re-ranking asincrono | Sort + `updatePositions()` in un tick separato |
| PLP pre-personalizzata | `last_weights` dallo store → ranking corretto prima del LLM |
| Service Worker | Asset statici cachati, second load istantaneo anche offline |
| Ordine persistito nello store | `position` aggiornato dopo ogni reranking, nessun ricalcolo all'avvio |
| Profilo compatto | Max 80 parole ≈ 100 token |

---

## 20. Fasi di Sviluppo

### Fase 1 — Fondamenta e store
- Scaffolding Vite + React + Tailwind
- `store.js` con TinyBase + IndexedDB persister + seed
- `productsRepo.js` con `getProducts()` e `updatePositions()`
- `PLPGrid` e `ProductCard` statici che leggono dallo store
- `ColorSwatch` con cambio variante attiva

### Fase 2 — Tracking su TinyBase
- `trackingConfig.js` con decay e soglie trigger
- `trackingRepo.js` con insert, getDelta, markAnalyzed
- `trackingEngine.js`
- Integrazione eventi in `ProductCard`

### Fase 3 — Drawer
- `ProductDrawer` con animazione slide-in
- `useDrawerTracker`
- Freeze del prodotto attivo

### Fase 4 — Pipeline AI (statsAggregator → trigger → LLM → reranker)
- `aiMemoryRepo.js` con get/set + shortcut per weights e stats snapshot
- `statsAggregator.js` — aggregazione affinità per colore/stile/categoria
- `triggerEngine.js` — valutazione condizioni di trigger (delta significativo)
- `useModelLoader` con progress
- `ModelLoader` UI con fase db + fase modello
- `promptBuilder` semplificato — stats + profilo, senza catalogo
- `jsonParser` con fallback su `last_weights`
- `reranker.js` con pesi continui × moltiplicatori fissi
- Prima chiamata LLM end-to-end

### Fase 5 — UI finale, offline e polish
- Animazioni Framer Motion con micro-preavviso
- `AIReasoningPanel`, badge `✦ AI Pick`
- Toggle AI on/off, reset preferenze
- `dbExporter.js`
- Service Worker con Workbox
- `OfflineIndicator`
- PLP pre-personalizzata da `last_weights` all'avvio

---

## 21. Estendibilità verso Full Local First

L'architettura è progettata per evolvere verso sync multi-device senza redesign:

| Feature futura | Come si innesta |
|---|---|
| **Sync multi-device** | TinyBase CRDT nativo via `createWsSynchronizer` — zero librerie aggiuntive |
| **CRDTs per merge** | `trackingEvents` è append-only per design — conflict-free by nature. TinyBase gestisce merge automatico |
| **Collaborazione** | `aiMemory` supporta CRDT LWW (Last Write Wins) nativamente in TinyBase |
| **Backup cloud opzionale** | `dbExporter.js` può diventare upload se l'utente lo consente esplicitamente |
| **PWA installabile** | Service Worker già presente, aggiungere `manifest.json` |

---

## 22. Glossario

| Termine | Definizione |
|---|---|
| **PLP** | Product Listing Page — la pagina griglia con la lista dei prodotti |
| **Local First** | Paradigma architetturale dove il dispositivo è la fonte di verità primaria e l'app funziona offline |
| **TinyBase** | Libreria reattiva (~10 KB) per store tabellari nel browser con persistenza e CRDT nativi |
| **Store** | L'istanza TinyBase che contiene tutte le tabelle dell'applicazione |
| **Persister** | Componente TinyBase che gestisce la sincronizzazione automatica tra store in-memory e IndexedDB |
| **CRDT** | Conflict-free Replicated Data Type — struttura dati per sync multi-device senza conflitti, nativa in TinyBase |
| **WebLLM** | Libreria MLC AI per eseguire LLM nel browser via WebGPU |
| **WebGPU** | API browser per accesso diretto alla GPU |
| **Repository** | Modulo che incapsula le operazioni TinyBase per una singola entità (products, tracking, aiMemory) |
| **Seed** | Popolamento iniziale dello store da products.json, eseguito una sola volta |
| **Stats Aggregator** | Modulo che aggrega gli eventi `analyzed = 0` in affinità per attributo (colore, stile, categoria) |
| **Trigger Engine** | Modulo che valuta le condizioni per invocare il LLM (interazioni, inattività, cooldown, delta significativo) |
| **Delta Significativo** | Cambio di >2 punti in almeno un attributo nell'aggregazione, rispetto all'ultima snapshot inviata al LLM |
| **User Profile** | Appunto in linguaggio naturale scritto dal modello, persistito in `aiMemory` |
| **Pesi Continui** | Valori da -1.0 a 1.0 prodotti dal LLM per ogni attributo (colore, stile, categoria), usati dal reranker |
| **Re-ranking** | Riordinamento della griglia: pesi LLM × moltiplicatori fissi → score → `position` aggiornato nello store |
| **Decay** | Decadimento temporale del peso degli eventi |
| **Service Worker** | Script che intercetta le richieste di rete per servire asset da cache quando offline |
| **Export dati** | Download di `plp_demo_export.json` — i dati dell'utente, in un formato aperto e interoperabile |

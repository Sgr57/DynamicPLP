# PRD — AI-Powered PLP Personalizzata
## In-Browser LLM per E-Commerce di Calzature — Architettura Local First

**Versione:** 3.0  
**Data:** Marzo 2026  
**Stato:** Draft definitivo  
**Tipo progetto:** Demo tecnica / Proof of Concept  
**Changelog v3:** Adozione del paradigma **Local First**. Il catalogo migra da JSON statico a SQLite in-browser via OPFS. Tutta la persistenza converge su un unico layer dati locale. L'app è progettata per funzionare completamente offline dopo il primo caricamento. Introdotti sync hooks e Service Worker per full offline capability.

---

## 1. Obiettivo e Vision

### 1.1 Problema

Le Product Listing Page (PLP) tradizionali sono statiche e cloud-dipendenti: mostrano i prodotti in un ordine fisso che non tiene conto del comportamento reale dell'utente, e richiedono connettività continua per funzionare. I sistemi di personalizzazione esistenti trasmettono dati comportamentali a server remoti, sottraendo all'utente il controllo sui propri dati.

### 1.2 Soluzione

Una PLP che si personalizza in tempo reale durante la navigazione, sfruttando un Large Language Model che gira **interamente nel browser dell'utente**, con tutti i dati — catalogo, preferenze, profilo comportamentale — persistiti **localmente nel dispositivo** via SQLite in-browser. L'app funziona completamente offline dopo il primo caricamento. Nessun dato lascia mai il dispositivo.

### 1.3 Il paradigma Local First

Il PoC è costruito attorno ai principi **Local First** di Ink & Switch:

| Principio | Implementazione |
|---|---|
| **Nessuna dipendenza dalla rete** | SQLite + WebLLM in OPFS, Service Worker per asset offline |
| **Il dispositivo è la fonte di verità** | SQLite è il sistema di record, non un cache di un backend |
| **Dati dell'utente sotto il suo controllo** | Export completo del db, reset locale, nessun cloud |
| **Latenza zero** | Tutte le operazioni sono locali, nessun round-trip |
| **Funziona offline** | After first load, zero network required |

### 1.4 Obiettivi del PoC

- Dimostrare la fattibilità tecnica di un LLM in-browser per un caso d'uso e-commerce reale
- Dimostrare un'architettura **interamente local first**: catalogo, comportamento, profilo AI — tutto su SQLite locale
- Creare un artefatto visivamente convincente e interattivo
- Costruire una base di codice estendibile verso sync multi-device (CRDTs, Electric SQL) senza redesign

---

## 2. Scope

### 2.1 In scope

- PLP di calzature con catalogo mock (30 prodotti) persistito in **SQLite in-browser (OPFS)**
- Tracking comportamentale con persistenza su SQLite
- Integrazione WebLLM con Llama 3.2 1B (pesi in IndexedDB, gestito da WebLLM)
- Sistema di memoria persistente (profilo utente LLM) su SQLite
- Context window adattiva con budget allocator automatico
- Product Drawer laterale con esplorazione varianti
- Re-ranking animato della griglia in tempo reale
- Pannello AI Reasoning visibile all'utente
- Schermata di caricamento con progress (modello + db seed)
- Toggle AI on/off per confronto before/after
- **Export del database locale** (SQLite file download)
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

### 3.2 Layer dati locale — SQLite in-browser

| Tecnologia | Versione | Motivazione |
|---|---|---|
| **sql.js** | 1.10.x | Compilazione WASM di SQLite. Matura, testata, zero dipendenze native |
| **OPFS** (Origin Private File System) | API Web nativa | File system privato per il browser, accessibile solo dall'origine. Permette a sql.js di scrivere il file `.db` su disco in modo persistente e performante |
| **sql.js-httpvfs** | — | Alternativa considerata (SQLite in read-only via HTTP range requests). Scartata: non adatta a un db scrivibile in locale |

**Perché SQLite e non IndexedDB?**

IndexedDB è un document store: ottimo per chiave-valore, ma scomodo per query relazionali (join tra prodotti e varianti, aggregazioni comportamentali, query full-text). SQLite permette di scrivere `SELECT * FROM products JOIN variants ON ...` ed estendere lo schema senza riscrivere la logica di accesso. Per un catalogo strutturato e un tracking che richiede aggregazioni, SQLite è la scelta corretta.

**Perché non localStorage per i dati AI?**

In v2 la memoria AI era su localStorage. In v3 tutto converge su SQLite: un unico sistema di record locale, queryabile, con schema versionato e migrazione. localStorage rimane solo come fallback se OPFS non è disponibile.

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
| OPFS | Chrome 102+, Safari 15.2+, Firefox 111+ |
| Service Worker | Tutti i browser moderni |

OPFS ha supporto più ampio di WebGPU. Se WebGPU non è disponibile, il demo mostra un messaggio chiaro. Se OPFS non è disponibile (raro), il db opera in-memory con fallback su localStorage per i dati AI.

---

## 4. Schema del Database SQLite

Tutte le entità del sistema risiedono nello stesso file `plp_demo.db` in OPFS.

### 4.1 Tabella `products`

```sql
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,       -- "shoe_001"
  name        TEXT NOT NULL,
  brand       TEXT NOT NULL,
  category    TEXT NOT NULL,          -- sneaker | boot | loafer | sandalo | mocassino
  price       INTEGER NOT NULL,
  gender      TEXT NOT NULL,          -- uomo | donna | unisex
  styles      TEXT NOT NULL,          -- JSON array: '["casual","urban"]'
  position    INTEGER NOT NULL        -- ordine corrente nella griglia (aggiornato dal reranker)
);
```

### 4.2 Tabella `variants`

```sql
CREATE TABLE IF NOT EXISTS variants (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  TEXT NOT NULL REFERENCES products(id),
  color       TEXT NOT NULL,          -- "red"
  hex         TEXT NOT NULL,          -- "#E53E3E"
  in_stock    INTEGER NOT NULL        -- 0 | 1
);
```

La relazione `products → variants` è 1:N. La separazione in tabella propria rende facili le query del tipo "tutti i prodotti disponibili in rosso".

### 4.3 Tabella `tracking_events`

```sql
CREATE TABLE IF NOT EXISTS tracking_events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type      TEXT NOT NULL,      -- "plp.cardClick", "drawer.variantClick"
  product_id      TEXT,
  color           TEXT,
  weight          REAL NOT NULL,
  analyzed        INTEGER DEFAULT 0,  -- 0 = nel buffer, 1 = già inviato al LLM
  created_at      INTEGER NOT NULL    -- UNIX timestamp ms
);
```

Il campo `analyzed` sostituisce il concetto di "event buffer" della v2: gli eventi non analizzati (`analyzed = 0`) costituiscono il behavioral delta. Dopo ogni chiamata LLM riuscita, vengono marcati `analyzed = 1`. Non vengono mai cancellati — questo permette future analisi storiche o visualizzazioni del journey.

### 4.4 Tabella `ai_memory`

```sql
CREATE TABLE IF NOT EXISTS ai_memory (
  key   TEXT PRIMARY KEY,   -- "user_profile" | "last_response" | "last_analysis_at"
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Chiave-valore per la memoria AI. Sostituisce le tre chiavi localStorage della v2 (`ai_user_profile`, `ai_last_response`, `ai_event_buffer`) con un'unica tabella versionata e queryabile.

### 4.5 Tabella `schema_migrations`

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     INTEGER PRIMARY KEY,
  applied_at  INTEGER NOT NULL,
  description TEXT
);
```

Ogni modifica allo schema è una migration numerata. All'avvio, il `dbManager` confronta le migration applicate con quelle nel codice ed esegue quelle mancanti. Questo permette di evolvere lo schema senza perdere i dati dell'utente.

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
    │   ├── useReranker.js         # Applica preferenze LLM al catalogo
    │   ├── useDrawerTracker.js    # Eventi specifici del drawer
    │   └── useOfflineStatus.js    # Monitora navigator.onLine
    │
    ├── db/
    │   ├── dbManager.js           # Init OPFS + sql.js, migrations, singleton
    │   ├── migrations/
    │   │   ├── 001_initial.js     # Schema completo (products, variants, tracking, ai_memory)
    │   │   └── 002_*.js           # Future migrations
    │   ├── seed.js                # Popola products + variants da products.json se db vuoto
    │   ├── productsRepo.js        # Query su products e variants
    │   ├── trackingRepo.js        # Insert eventi, query delta, mark analyzed
    │   └── aiMemoryRepo.js        # get/set per user_profile, last_response
    │
    ├── tracking/
    │   ├── trackingConfig.js      # Pesi, soglie, decay config
    │   ├── trackingEngine.js      # Processa eventi → trackingRepo → trigger LLM
    │   └── behaviorSnapshot.js    # Legge delta da trackingRepo, aggrega con decay
    │
    ├── memory/
    │   ├── memoryManager.js       # Astrae aiMemoryRepo (+ fallback localStorage se OPFS assente)
    │   └── budgetAllocator.js     # Partiziona context window, comprime catalogo e snapshot
    │
    ├── lib/
    │   ├── promptBuilder.js       # Costruisce prompt da profilo + delta + catalogo
    │   ├── reranker.js            # Scoring deterministico + aggiorna position in db
    │   ├── jsonParser.js          # Parse robusto risposta LLM con fallback
    │   └── dbExporter.js          # Genera il file .db per il download utente
    │
    └── data/
        ├── products.json          # Sorgente dati per il seed iniziale (non usato a runtime)
        └── modelConfig.js         # Config WebLLM + contextWindowSize
```

### 5.1 Il pattern Repository

Ogni tabella ha un proprio repository (`productsRepo`, `trackingRepo`, `aiMemoryRepo`). I componenti e gli hook non chiamano mai sql.js direttamente: accedono ai dati tramite i repository. Questo isola la logica SQL dalla UI e rende possibile sostituire il layer dati (es. con un ORM sync-ready come Electric SQL) senza toccare i componenti.

---

## 6. Layer Dati: dbManager

### 6.1 Inizializzazione

```js
// db/dbManager.js
import initSqlJs from 'sql.js'

let db = null

export async function initDb() {
  const SQL = await initSqlJs({ locateFile: f => `/wasm/${f}` })

  // Prova OPFS
  if ('storage' in navigator && 'getDirectory' in navigator.storage) {
    const root = await navigator.storage.getDirectory()
    const fileHandle = await root.getFileHandle('plp_demo.db', { create: true })
    const file = await fileHandle.getFile()
    const buffer = await file.arrayBuffer()
    db = new SQL.Database(new Uint8Array(buffer))
  } else {
    // Fallback in-memory
    db = new SQL.Database()
    console.warn('[DB] OPFS non disponibile, db in-memory')
  }

  await runMigrations(db)
  return db
}
```

### 6.2 Persistenza su OPFS

sql.js non scrive automaticamente su file: il db vive in memoria e deve essere esportato esplicitamente su OPFS. Il `dbManager` espone `persistDb()`:

```js
export async function persistDb() {
  if (!opfsAvailable) return
  const data = db.export()   // Uint8Array del file .db
  const root = await navigator.storage.getDirectory()
  const fh = await root.getFileHandle('plp_demo.db', { create: true })
  const writable = await fh.createWritable()
  await writable.write(data)
  await writable.close()
}
```

`persistDb()` viene chiamato:
- Dopo ogni write batch del tracking (debouncato a 2 secondi)
- Dopo ogni risposta LLM salvata
- Prima della chiusura della pagina (`beforeunload`)

### 6.3 Seed iniziale

Al primo avvio (db vuoto, tabella `products` vuota), `seed.js` importa `products.json` e popola `products` e `variants` via INSERT. Il seed avviene una sola volta. Dopo il seed, `products.json` non viene più letto — il catalogo vive nel db.

```js
export async function seedIfEmpty(db) {
  const { values } = db.exec('SELECT COUNT(*) FROM products')[0]
  if (values[0][0] > 0) return   // già popolato
  const products = await import('../data/products.json')
  // INSERT batch products + variants
}
```

---

## 7. Repository Pattern

### 7.1 productsRepo

```js
// Tutti i prodotti ordinati per position (ordine corrente griglia)
export function getProducts() {
  return db.exec(`
    SELECT p.*, 
           json_group_array(json_object(
             'color', v.color, 'hex', v.hex, 'in_stock', v.in_stock
           )) AS variants
    FROM products p
    JOIN variants v ON v.product_id = p.id
    GROUP BY p.id
    ORDER BY p.position ASC
  `)
}

// Aggiorna l'ordine della griglia dopo il re-ranking
export function updatePositions(orderedIds) {
  orderedIds.forEach((id, i) => {
    db.run('UPDATE products SET position = ? WHERE id = ?', [i, id])
  })
  persistDb()
}
```

### 7.2 trackingRepo

```js
// Inserisce un evento nel buffer (analyzed = 0)
export function insertEvent(event) {
  db.run(`
    INSERT INTO tracking_events (event_type, product_id, color, weight, analyzed, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `, [event.type, event.productId, event.color, event.weight, Date.now()])
}

// Legge il behavioral delta (solo eventi non analizzati)
export function getDelta() {
  return db.exec(`
    SELECT * FROM tracking_events 
    WHERE analyzed = 0 
    ORDER BY created_at ASC
  `)
}

// Marca come analizzati dopo una risposta LLM riuscita
export function markAnalyzed() {
  db.run('UPDATE tracking_events SET analyzed = 1 WHERE analyzed = 0')
  persistDb()
}

// Statistiche storiche (per future feature: "il tuo profilo di navigazione")
export function getSessionStats() {
  return db.exec(`
    SELECT event_type, COUNT(*) as count, AVG(weight) as avg_weight
    FROM tracking_events
    GROUP BY event_type
    ORDER BY count DESC
  `)
}
```

### 7.3 aiMemoryRepo

```js
export function getMemoryValue(key) {
  const res = db.exec('SELECT value FROM ai_memory WHERE key = ?', [key])
  return res[0]?.values[0]?.[0] ?? null
}

export function setMemoryValue(key, value) {
  db.run(`
    INSERT INTO ai_memory (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `, [key, value, Date.now()])
  persistDb()
}
```

---

## 8. Offline Capability

### 8.1 Service Worker

Workbox precача tutti gli asset statici (HTML, JS, CSS, WASM di sql.js) al primo caricamento. Dopo questo, l'app funziona completamente offline — SQLite è locale, WebLLM usa IndexedDB per i pesi.

```js
// sw.js (Workbox)
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)  // iniettato da Vite plugin

// Cache WASM sql.js con strategia CacheFirst
registerRoute(
  ({ url }) => url.pathname.endsWith('.wasm'),
  new CacheFirst({ cacheName: 'wasm-cache' })
)
```

### 8.2 Flusso al secondo accesso (offline)

```
Utente apre l'app senza rete
  │
  ├─ Service Worker serve HTML + JS + WASM da cache
  ├─ sql.js carica plp_demo.db da OPFS (locale)
  ├─ WebLLM carica pesi del modello da IndexedDB (locale)
  ├─ PLP si apre con l'ultimo reranking da ai_memory
  └─ Tutto funziona: tracking, LLM, re-ranking — zero rete
```

### 8.3 OfflineIndicator

Un badge discreto nell'header mostra lo stato di rete: `🟢 Online` / `🔴 Offline`. Quando offline, una nota contestuale informa che tutte le funzionalità continuano a funzionare normalmente.

---

## 9. Export dei Dati

### 9.1 Export del database

Il bottone "Esporta i tuoi dati" nel footer genera un download del file `plp_demo.db`. L'utente ottiene un file SQLite standard, apribile con qualsiasi client SQLite (DBeaver, TablePlus, sqlite3 CLI).

```js
// lib/dbExporter.js
export function exportDb() {
  const data = db.export()   // Uint8Array
  const blob = new Blob([data], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plp_demo.db'
  a.click()
}
```

Il file esportato contiene: catalogo prodotti, tutta la storia degli eventi comportamentali, il profilo AI, l'ultimo stato del re-ranking. L'utente può interrogarlo liberamente.

### 9.2 Reset dati

Il bottone "Resetta preferenze" cancella le tabelle `tracking_events` e `ai_memory`, e ripristina le posizioni dei prodotti all'ordine di default. Il catalogo non viene toccato. Il db viene persisto su OPFS dopo il reset.

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
max_tokens: 512
```

I pesi vengono gestiti da WebLLM in IndexedDB (comportamento nativo). Download una sola volta, disponibile offline.

---

## 11. Architettura della Memoria AI

### 11.1 Cosa viene salvato nel db

Tre righe nella tabella `ai_memory`, tre scopi diversi:

**`user_profile`** — Il profilo utente scritto dal modello in linguaggio naturale. Max 80 parole. Il modello scrive al suo io futuro.

**`last_response`** — L'ultimo JSON di risposta completo. Usato dal reranker deterministico come stato di partenza all'avvio.

**`last_analysis_at`** — Timestamp dell'ultima analisi. Usato per calcolare il cooldown e per il decadimento temporale degli eventi.

### 11.2 Ciclo di vita della memoria

Identico alla v2 ma mediato dal db:

```
Sessione 1 (primo accesso):
  db senza righe in ai_memory → profilo = null
  L'utente naviga → eventi in tracking_events (analyzed = 0)
  Trigger → LLM riceve delta (getDelta()) + profilo null
  LLM risponde → setMemoryValue('user_profile', ...) + setMemoryValue('last_response', ...)
  markAnalyzed() → tutti gli eventi diventano analyzed = 1

Sessione 2 (utente torna, anche offline):
  db ha profilo + last_response + eventi storici (analyzed = 1)
  PLP si apre già personalizzata da last_response
  Nuovi eventi → tracking_events (analyzed = 0)
  Trigger → LLM riceve solo il delta (analyzed = 0) + profilo precedente
```

---

## 12. Sistema di Tracking

### 12.1 Principi architetturali

1. **Configurazione separata dall'esecuzione** — `trackingConfig.js` è l'unica fonte di verità per pesi e soglie.
2. **Delta, non storia** — Il LLM riceve solo gli eventi `analyzed = 0` (dall'ultima analisi).
3. **Persistenza immediata** — Ogni evento è scritto in SQLite prima di essere processato. Nessun evento va perso.
4. **Storia completa queryabile** — Gli eventi `analyzed = 1` non vengono cancellati. Sono la base per future analisi e visualizzazioni.

### 12.2 trackingConfig.js

```js
export const TRACKING_CONFIG = {
  triggers: {
    minScoreToAnalyze: 10,
    inactivitySeconds: 8,
    minEventsToAnalyze: 3,
    cooldownAfterAnalysis: 5,
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

### 12.3 Behavioral Delta da SQLite

```js
// behaviorSnapshot.js
export function buildDelta() {
  const events = trackingRepo.getDelta()  // analyzed = 0
  const now = Date.now()
  const halfLife = TRACKING_CONFIG.decay.halfLifeSeconds * 1000

  // Applica decadimento e aggrega per colore e stile
  const colorAffinity = {}
  const styleAffinity = {}
  const interactions = {}

  for (const e of events) {
    const decayed = e.weight * Math.pow(0.5, (now - e.created_at) / halfLife)
    // ... aggregazione
  }

  return { colorAffinity, styleAffinity, interactions, eventsCount: events.length }
}
```

---

## 13. Prompt Engineering

### 13.1 Struttura del prompt

```
SYSTEM:
Sei un motore di personalizzazione per un e-commerce di scarpe.
Ricevi il tuo profilo precedente dell'utente (se esiste) e i nuovi
dati comportamentali. Il tuo compito è AGGIORNARE la tua comprensione
dell'utente e dedurre le sue preferenze attuali.
Se i dati recenti contraddicono il profilo precedente, aggiorna il profilo.
Rispondi SEMPRE e SOLO con un oggetto JSON valido. Nessun testo extra.

USER:
Catalogo disponibile:
[compresso dal budgetAllocator in base alla context window]

Tuo profilo precedente dell'utente:
[getMemoryValue('user_profile') oppure "Nessuno, prima analisi"]

Nuovi dati comportamentali:
[behavioral delta da buildDelta()]

Schema risposta:
{
  "preferred_colors": ["color1"],
  "preferred_styles": ["style1"],
  "boost_product_ids": ["id1"],
  "reasoning": "max 20 parole in italiano per l'utente",
  "user_profile": "max 80 parole in italiano, appunto interno"
}
```

### 13.2 Gestione JSON malformato

`jsonParser.js` implementa parsing a cascata con fallback su `ai_memory.last_response` nel db. L'utente vede sempre una PLP personalizzata anche se l'ultima inferenza fallisce.

---

## 14. Algoritmo di Re-ranking

### 14.1 Scoring

```js
function scoreProduct(product, preferences) {
  let score = 0
  if (product.variants.some(v => preferences.preferred_colors.includes(v.color))) score += 40
  if (preferences.boost_product_ids.includes(product.id)) score += 30
  const styleMatch = product.styles.filter(s => preferences.preferred_styles.includes(s))
  score += styleMatch.length * 20
  const inStockPreferred = product.variants.some(
    v => preferences.preferred_colors.includes(v.color) && v.in_stock
  )
  if (inStockPreferred) score += 5
  return score
}
```

### 14.2 Persistenza dell'ordine

Dopo il re-ranking, `productsRepo.updatePositions(orderedIds)` aggiorna il campo `position` in SQLite. L'ordine della griglia è persistito: al prossimo avvio (anche offline), i prodotti si caricano già nell'ordine corretto senza attendere il LLM.

### 14.3 Prodotto attivo nel drawer

Il prodotto aperto nel drawer viene escluso dal riordinamento per la durata dell'apertura (ancorato per `productId`, non per posizione). Invariato rispetto alla v2.

---

## 15. Context Window Adattiva

### 15.1 Budget Allocator

`budgetAllocator.js` partiziona la context window in slot:

| Slot | Contenuto | Priorità | Dimensione |
|---|---|---|---|
| 1 | System prompt + schema risposta | Massima | ~200 token (fisso) |
| 2 | Risposta riservata (max_tokens) | Massima | 512 token (fisso) |
| 3 | Profilo utente precedente | Alta | ~100 token |
| 4 | Catalogo prodotti | Media | Comprimibile |
| 5 | Behavioral delta | Media | Comprimibile |

### 15.2 Livelli di compressione catalogo

I dati arrivano da `productsRepo.getProducts()` e vengono compressi in base al budget:

| Livello | Condizione | Cosa include |
|---|---|---|
| 0 | CW ≥ 8192 | Tutti i campi di tutti i 30 prodotti |
| 1 | CW 4096–8191 | Solo id, category, colori, stili |
| 2 | CW 2048–4095 | Solo prodotti con cui l'utente ha interagito + 2-3 per categoria non esplorata (query su `tracking_events`) |
| 3 | CW < 2048 | Riassunto categorico, nessun id specifico |

Al livello 2, la selezione intelligente dei prodotti da includere avviene direttamente con una query SQL su `tracking_events`, rendendo il pre-filtering più preciso rispetto alla v2.

---

## 16. Componenti UI

### 16.1 ModelLoader

Schermata di init con due fasi distinte: `"Inizializzazione database..."` e `"Download modello AI..."`. Progress bar separata per le due operazioni. Se il db era già presente (utente di ritorno), la prima fase è istantanea.

### 16.2 PLPGrid

Griglia CSS a 4 colonne con Framer Motion `layout`. L'ordine dei prodotti viene letto da `productsRepo.getProducts()` all'avvio.

### 16.3–16.7

ProductCard, ColorSwatch, ProductDrawer, AIReasoningPanel, Toggle AI On/Off — invariati rispetto alla v2.

### 16.8 OfflineIndicator (nuovo in v3)

Badge persistente nell'header con stato rete. Quando offline:
- Il badge cambia colore (rosso)
- Una nota spiega: *"Stai navigando offline — tutte le funzionalità sono disponibili"*

### 16.9 Export dati (nuovo in v3)

Bottone nel footer: "⬇ Esporta i tuoi dati". Genera il download di `plp_demo.db`. Accompagnato da una nota: *"Il file contiene il catalogo, le tue interazioni e il tuo profilo AI."*

---

## 17. Macchina a Stati dell'App

```
IDLE
  │  (app montata, WebGPU disponibile)
  ▼
DB_INIT
  │  (OPFS aperto, migrations eseguite)
  │
  ├─ db vuoto → SEEDING → MODEL_LOADING
  └─ db con dati → CHECK_MEMORY
                      │
                      ├─ last_response esiste → PRELOADED
                      └─ no last_response   → MODEL_LOADING

MODEL_LOADING
  │  (WebLLM download + init completato)
  ▼
BROWSING / BROWSING_WITH_CACHE  ←─────────────────────┐
  │  (trigger scatta)                                   │
  ▼                                                     │
ANALYZING                                              │
  │  (risposta LLM salvata in ai_memory)               │
  ▼                                                     │
PERSONALIZED ──── (cooldown scaduto) ──────────────────┘

ERRORE_WEBGPU    → messaggio statico + link Chrome
ERRORE_LLM       → fallback su last_response nel db
ERRORE_OPFS      → db in-memory, tutto funziona in sessione
```

---

## 18. Gestione Errori

| Scenario | Comportamento |
|---|---|
| WebGPU non disponibile | Schermata dedicata con spiegazione |
| OPFS non disponibile | db in-memory automatico, nessun impatto UX in sessione |
| Download modello fallito | Retry automatico; se profilo in cache, PLP personalizzata resta visibile |
| JSON malformato da LLM | Parsing a cascata, fallback su `last_response` nel db |
| Inferenza LLM > 15s | Timeout, nessun re-ranking, tracking continua |
| Errore nel tracking | Try/catch silenzioso, eventi persi non vengono scritti nel db |
| db.persistDb() fallisce | Log warning, il db in-memory rimane coerente per la sessione |

---

## 19. Performance e Ottimizzazioni

| Ottimizzazione | Dettaglio |
|---|---|
| Persistenza debouncata | `persistDb()` sul tracking è debouncata a 2s per ridurre write su OPFS |
| Delta comportamentale | Query SQL su `analyzed = 0`, non scan di tutta la tabella |
| Profilo compatto | Max 80 parole ≈ 100 token |
| Budget allocator | Livello di compressione catalogo automatico |
| Cooldown post-analisi | 5 secondi tra chiamate LLM |
| Decadimento temporale | Half-life 120s, calcolato in `buildDelta()` |
| Re-ranking asincrono | Sort + `updatePositions()` in un tick separato |
| PLP pre-personalizzata | `last_response` da db → ordine corretto prima del LLM |
| Service Worker | Asset statici e WASM cachati, second load istantaneo anche offline |
| Ordine persistito nel db | `position` aggiornato dopo ogni reranking, nessun ricalcolo all'avvio |

---

## 20. Fasi di Sviluppo

### Fase 1 — Fondamenta e db
- Scaffolding Vite + React + Tailwind
- `dbManager.js` con OPFS, migrations, fallback in-memory
- `migrations/001_initial.js` con schema completo
- `seed.js` da `products.json`
- `productsRepo.js` con `getProducts()` e `updatePositions()`
- `PLPGrid` e `ProductCard` statici che leggono dal db
- `ColorSwatch` con cambio variante attiva

### Fase 2 — Tracking su SQLite
- `trackingConfig.js` con decay
- `trackingRepo.js` con insert, getDelta, markAnalyzed
- `trackingEngine.js`
- `behaviorSnapshot.js` con delta da SQL
- Integrazione eventi in `ProductCard`

### Fase 3 — Drawer
- `ProductDrawer` con animazione slide-in
- `useDrawerTracker`
- Freeze del prodotto attivo

### Fase 4 — LLM e memoria su db
- `aiMemoryRepo.js`
- `memoryManager.js` con fallback localStorage
- `budgetAllocator.js`
- `useModelLoader` con progress
- `ModelLoader` UI con fase db + fase modello
- `promptBuilder` con profilo da db + delta SQL
- `jsonParser` con fallback su db
- Prima chiamata LLM end-to-end

### Fase 5 — Re-ranking, offline e UI finale
- `reranker.js` con `updatePositions()` su db
- Animazioni Framer Motion con micro-preavviso
- `AIReasoningPanel`, badge `✦ AI Pick`
- Toggle AI on/off, reset preferenze
- `dbExporter.js`
- Service Worker con Workbox
- `OfflineIndicator`
- PLP pre-personalizzata da db all'avvio

---

## 21. Estendibilità verso Full Local First

L'architettura è progettata per evolvere verso sync multi-device senza redesign:

| Feature futura | Come si innesta |
|---|---|
| **Sync multi-device** | Electric SQL (Postgres → SQLite) sostituisce sql.js mantenendo lo stesso schema |
| **CRDTs per merge** | `tracking_events` è append-only per design — conflict-free by nature |
| **Collaborazione** | `ai_memory` può diventare CRDT LWW (Last Write Wins) per il profilo |
| **Backup cloud opzionale** | `dbExporter.js` può diventare upload se l'utente lo consente esplicitamente |
| **PWA installabile** | Service Worker già presente, aggiungere `manifest.json` |

---

## 22. Glossario

| Termine | Definizione |
|---|---|
| **PLP** | Product Listing Page — la pagina griglia con la lista dei prodotti |
| **Local First** | Paradigma architetturale dove il dispositivo è la fonte di verità primaria e l'app funziona offline |
| **OPFS** | Origin Private File System — API Web per file persistenti e privati per origine, accessibili solo dall'app stessa |
| **sql.js** | Compilazione WASM di SQLite che gira nel browser |
| **WebLLM** | Libreria MLC AI per eseguire LLM nel browser via WebGPU |
| **WebGPU** | API browser per accesso diretto alla GPU |
| **Repository** | Modulo che incapsula le query SQL per una singola entità (products, tracking, ai_memory) |
| **Migration** | Modifica versionata allo schema SQLite, applicata automaticamente all'avvio |
| **Seed** | Popolamento iniziale del db da products.json, eseguito una sola volta |
| **Behavioral Delta** | Aggregazione degli eventi `analyzed = 0` nel db, inviata al LLM come contesto recente |
| **User Profile** | Appunto in linguaggio naturale scritto dal modello, persistito in `ai_memory` |
| **Budget Allocator** | Partiziona la context window e sceglie il livello di compressione del catalogo |
| **Re-ranking** | Riordinamento della griglia, con `position` aggiornato in SQLite |
| **Decay** | Decadimento temporale del peso degli eventi |
| **Service Worker** | Script che intercetta le richieste di rete per servire asset da cache quando offline |
| **Export db** | Download del file `plp_demo.db` — i dati dell'utente, in un formato aperto e interoperabile |

# Prompt per Gemini: Generazione SVG Scarpe

Copia e incolla il seguente prompt in Gemini:

---

Crea un singolo file HTML autonomo che contenga SVG dettagliati e realistici di scarpe per un e-commerce. Il file deve essere una reference sheet organizzata e pronta per l'estrazione degli SVG.

## Categorie di scarpe (6 tipi)

Per ognuna delle seguenti categorie, crea un SVG distinto con una silhouette riconoscibile vista di profilo (lato destro):

1. **sneaker** — scarpa sportiva bassa, suola spessa, lacci visibili, design atletico moderno
2. **boot** — stivaletto alla caviglia, suola robusta, collo alto, look rugged
3. **loafer** — mocassino elegante senza lacci, profilo basso e arrotondato, cuciture decorative
4. **sandalo** — sandalo aperto con cinturini, suola piatta, dita visibili
5. **mocassino** — mocassino da guida, suola sottile con gommini, cuciture a mano visibili
6. **running** — scarpa da corsa tecnica, suola ammortizzata, mesh traspirante, profilo aerodinamico

## Stili (6 varianti di dettaglio)

Per ogni categoria, genera varianti che riflettano questi stili tramite differenze nei dettagli (non solo nel colore):

- **casual** — linee morbide, materiali rilassati, cuciture semplici
- **sporty** — linee dinamiche, accenti aerodinamici, suola prominente
- **urban** — design street-style, dettagli moderni, contrasti grafici
- **classic** — forme tradizionali, finiture pulite, proporzioni classiche
- **elegant** — silhouette affusolata, linee sottili, finiture premium
- **minimal** — design essenziale, nessun dettaglio superfluo, forme pure

## Colori (8 varianti)

Ogni SVG deve poter essere colorato facilmente. Usa queste classi CSS per i colori, applicati come variabili:

| Nome     | Hex       |
|----------|-----------|
| nero     | `#1A1A1A` |
| bianco   | `#F5F5F5` |
| blu      | `#3B82F6` |
| rosso    | `#E53E3E` |
| grigio   | `#6B7280` |
| verde    | `#10B981` |
| beige    | `#D4A574` |
| marrone  | `#92400E` |

## Specifiche tecniche SVG

- **ViewBox**: `0 0 200 140` per ogni scarpa (orientamento orizzontale)
- **Stile**: illustrazione flat design con leggere ombre/profondità (non fotorealistico)
- Usa `currentColor` o variabili CSS custom (`--shoe-primary`, `--shoe-accent`, `--shoe-sole`) per permettere la ricolorazione dinamica
- Ogni SVG deve avere un **id** con formato: `shoe-{categoria}-{stile}` (es. `shoe-sneaker-casual`, `shoe-boot-elegant`)
- Le parti della scarpa devono avere classi CSS semantiche: `.shoe-body`, `.shoe-sole`, `.shoe-accent`, `.shoe-laces`, `.shoe-stitching`
- Suola sempre leggermente più scura del corpo principale
- Includere piccoli dettagli che rendano ogni combinazione categoria+stile unica e riconoscibile

## Struttura del file HTML

```html
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <title>DynamicPLP — Shoe SVG Reference Sheet</title>
    <style>
        /* CSS custom properties per la ricolorazione */
        :root {
            --shoe-primary: #6B7280;
            --shoe-accent: #4B5563;
            --shoe-sole: #374151;
        }

        /* Classi colore per ogni variante */
        .color-nero    { --shoe-primary: #1A1A1A; --shoe-accent: #333333; --shoe-sole: #0D0D0D; }
        .color-bianco  { --shoe-primary: #F5F5F5; --shoe-accent: #E5E5E5; --shoe-sole: #D4D4D4; }
        .color-blu     { --shoe-primary: #3B82F6; --shoe-accent: #2563EB; --shoe-sole: #1D4ED8; }
        .color-rosso   { --shoe-primary: #E53E3E; --shoe-accent: #C53030; --shoe-sole: #9B2C2C; }
        .color-grigio  { --shoe-primary: #6B7280; --shoe-accent: #4B5563; --shoe-sole: #374151; }
        .color-verde   { --shoe-primary: #10B981; --shoe-accent: #059669; --shoe-sole: #047857; }
        .color-beige   { --shoe-primary: #D4A574; --shoe-accent: #B8895A; --shoe-sole: #92400E; }
        .color-marrone { --shoe-primary: #92400E; --shoe-accent: #78350F; --shoe-sole: #5C2D0E; }

        /* Layout griglia per la reference sheet */
        /* ... grid layout ... */
    </style>
</head>
<body>
    <h1>DynamicPLP — SVG Reference Sheet</h1>

    <!-- Per ogni categoria -->
    <section id="sneaker">
        <h2>Sneaker</h2>
        <!-- Per ogni stile -->
        <div class="style-row">
            <h3>Casual</h3>
            <!-- SVG con id="shoe-sneaker-casual" -->
            <!-- Mostra tutte le 8 varianti colore affiancate -->
        </div>
        <!-- ... altri stili ... -->
    </section>
    <!-- ... altre categorie ... -->
</body>
</html>
```

## Output atteso

- **6 categorie × 6 stili = 36 SVG unici** (silhouette diverse)
- Ogni SVG mostrato in **8 varianti colore** nella griglia = 288 anteprime totali
- Gli SVG devono essere **inline** nel file HTML (non file esterni)
- Il file deve essere **completamente autonomo** (nessuna dipendenza esterna)
- Aggiungi label sotto ogni SVG con: `{categoria} · {stile} · {colore}`

## Note per l'integrazione nel progetto

Questi SVG verranno usati in un progetto React (DynamicPLP) dove:
- Il componente `ProductCard` mostra la scarpa su sfondo gradient del colore attivo
- Il colore della scarpa cambia dinamicamente in base alla variante selezionata
- Serve che gli SVG funzionino bene sia su sfondo chiaro che scuro
- L'SVG corrente usa viewBox `0 0 64 40` — i nuovi SVG useranno `0 0 200 140` per più dettaglio
- I prodotti hanno proprietà `category` e `styles[]` che mapperanno direttamente agli id degli SVG

Genera il file HTML completo e funzionante.

---

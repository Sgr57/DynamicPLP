export const TRACKING_CONFIG = {
  triggers: {
    minInteractions: 5,           // eventi minimi prima di triggerare l'analisi
    cooldownAfterAnalysis: 5,     // secondi di attesa tra un'analisi e la successiva (0 = disabilitato)
    mouseThrottleMs: 500,         // throttle eventi mouse in ms
    reorderInactivitySeconds: 1,  // secondi di inattività prima di triggerare il reorder
  },
  plp: {
    cardHover:     { enabled: false, label: 'hover prodotto',   minDurationMs: 1500 }, // hover lungo sulla card
    cardHoverExit: { enabled: false, label: 'hover breve',      maxDurationMs: 400  }, // hover troppo breve (segnale negativo)
    swatchHover:   { enabled: false, label: 'hover colore',     minDurationMs: 500  }, // hover su swatch colore
    swatchClick:   { enabled: true,  label: 'click colore'                          }, // click su swatch colore
    cardClick:     { enabled: true,  label: 'aperto dettaglio'                      }, // click sulla card → apre drawer
    cardRevisit:   { enabled: false, label: 'rivisitato'                            }, // riapertura di un prodotto già visto
    scrollSkip:    { enabled: false, label: 'scrollato via'                         }, // prodotto scrollato via velocemente
  },
  colorPropagation: {
    familyFactor: 0.4,            // peso propagazione per famiglia colore (es. blu → azzurro)
    shadeFactor: 0.6,             // peso propagazione per tonalità simile
    adjacentFactor: 0.2,          // peso propagazione per colori adiacenti nella ruota
    minWeightToPropagate: 0.3,    // peso minimo per attivare la propagazione
    maxPropagatedWeight: 0.5,     // tetto massimo del peso propagato
  },
  drawer: {
    open:           { enabled: true,  label: 'aperto dettaglio'                      }, // apertura drawer dettaglio
    quickClose:     { enabled: true,  label: 'chiuso subito',    maxDurationMs: 1000 }, // chiuso entro 1s (segnale negativo)
    timeSpent:      { enabled: true,  label: 'tempo nel dettaglio', minDurationMs: 5000 }, // permanenza lunga nel drawer
    variantHover:   { enabled: false, label: 'hover variante',  minDurationMs: 500  }, // hover su variante nel drawer
    variantClick:   { enabled: true,  label: 'click variante'                       }, // click su variante nel drawer
    variantCycling: { enabled: false, label: 'esplorato varianti', minVariants: 2   }, // navigazione tra ≥2 varianti
    reopen:         { enabled: false, label: 'riaperto dettaglio'                    }, // riapertura dello stesso prodotto
  },
}
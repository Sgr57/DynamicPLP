export const TRACKING_CONFIG = {
  triggers: {
    minInteractions: 10,
    cooldownAfterAnalysis: 30,
    mouseThrottleMs: 500,
    reorderInactivitySeconds: 4,
  },
  plp: {
    cardHover:     { enabled: false, label: 'hover prodotto',   minDurationMs: 1500 },
    cardHoverExit: { enabled: false, label: 'hover breve',      maxDurationMs: 400  },
    swatchHover:   { enabled: false, label: 'hover colore',     minDurationMs: 500  },
    swatchClick:   { enabled: true,  label: 'click colore'                          },
    cardClick:     { enabled: true,  label: 'aperto dettaglio'                      },
    cardRevisit:   { enabled: false,  label: 'rivisitato'                            },
    scrollSkip:    { enabled: false,  label: 'scrollato via'                         },
  },
  colorPropagation: {
    familyFactor: 0.4,
    shadeFactor: 0.6,
    adjacentFactor: 0.2,
    minWeightToPropagate: 0.3,
    maxPropagatedWeight: 0.5,
  },
  drawer: {
    open:           { enabled: true,  label: 'aperto dettaglio'                      },
    quickClose:     { enabled: true,  label: 'chiuso subito',    maxDurationMs: 1000 },
    timeSpent:      { enabled: true,  label: 'tempo nel dettaglio', minDurationMs: 5000 },
    variantHover:   { enabled: false, label: 'hover variante',  minDurationMs: 500  },
    variantClick:   { enabled: true,  label: 'click variante'                       },
    variantCycling: { enabled: false,  label: 'esplorato varianti', minVariants: 2   },
    reopen:         { enabled: false,  label: 'riaperto dettaglio'                    },
  },
}

export const TRACKING_CONFIG = {
  triggers: {
    minInteractions: 10,
    cooldownAfterAnalysis: 30,
    significantDelta: 2,
    mouseThrottleMs: 500,
    reorderInactivitySeconds: 4,
  },
  decay: {
    enabled: true,
    halfLifeSeconds: 120,
    quantitative: {
      enabled: true,
      eventsPerDecayCycle: 15,
      decayFactor: 0.7,
    },
  },
  caps: {
    perProductTotal: 25,
    perProductColor: 12,
    perProductStyle: 10,
    perProductCategory: 15,
  },
  plp: {
    cardHover:     { enabled: false, weight: 2,  minDurationMs: 1500 },
    cardHoverExit: { enabled: false, weight: -1, maxDurationMs: 400  },
    swatchHover:   { enabled: false, weight: 3,  minDurationMs: 500  },
    swatchClick:   { enabled: true,  weight: 4                       },
    cardClick:     { enabled: true,  weight: 5                       },
    cardRevisit:   { enabled: true,  weight: 5                       },
    scrollSkip:    { enabled: true,  weight: -2                      },
  },
  colorPropagation: {
    familyFactor: 0.4,
    shadeFactor: 0.6,
    adjacentFactor: 0.2,
    minWeightToPropagate: 0.3,
    maxPropagatedWeight: 0.5,
  },
  drawer: {
    open:           { enabled: true,  weight: 3                       },
    quickClose:     { enabled: true,  weight: -3, maxDurationMs: 1000 },
    timeSpent:      { enabled: true,  weight: 3,  minDurationMs: 5000 },
    variantHover:   { enabled: false, weight: 4,  minDurationMs: 500  },
    variantClick:   { enabled: true,  weight: 6                       },
    variantCycling: { enabled: true,  weight: 2,  minVariants: 2      },
    reopen:         { enabled: true,  weight: 5                       },
  },
}

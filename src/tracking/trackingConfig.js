export const TRACKING_CONFIG = {
  triggers: {
    minInteractions: 10,
    inactivitySeconds: 8,
    cooldownAfterAnalysis: 30,
    significantDelta: 2,
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

# Scoring & Personalization Flow

## Overview

DynamicPLP personalizes product order in real-time through a pipeline that transforms user interactions into a ranked product list. The entire flow runs locally in the browser — no data leaves the device.

```
User Interaction
       |
       v
 [trackingEngine]          Capture hover, click, scroll events
       |                   Filter accidental interactions
       v
 [trackingRepo]            Store events in TinyBase (analyzed: 0)
       |
       v
 [statsAggregator]         Apply dual decay + caps
       |                   Aggregate into color/style/category affinities
       v
 [triggerEngine]           Check: 10+ events, 8s idle, 30s cooldown, delta > 2
       |
       v
 [promptBuilder]           Format stats normalized 0-100 + profile (~400 tokens)
       |
       v
 [WebLLM]                  Qwen 2.5 3B via WebGPU
       |                   Returns weights (-1.0 to 1.0) + evolving user profile
       v
 [jsonParser]              Balanced extraction + auto-repair + validation
       v
 [reranker]                Score products: color*40 + style*20 + category*30 + stock*5
       |
       v
 [PLPGrid]                 Re-render with Framer Motion animations
                           Preselect preferred color variant on each card
```

---

## Phase 1: Event Tracking

**Files:** `src/tracking/trackingEngine.js`, `src/tracking/trackingConfig.js`

### PLP Events

| Event | Weight | Condition | Purpose |
|-------|--------|-----------|---------|
| `cardHover` | +2 | hover >= 1500ms | Meaningful interest |
| `cardHoverExit` | -1 | hover < 400ms | Accidental bounce |
| `swatchHover` | +3 | hover >= 500ms | Color interest |
| `swatchClick` | +4 | click | Explicit color choice |
| `cardClick` | +5 | click | Product interest |
| `cardRevisit` | +5 | 2nd+ click in session | Strong interest |
| `scrollSkip` | -2 | visible < 2s, no interaction | Disinterest |

### Drawer Events

| Event | Weight | Condition | Purpose |
|-------|--------|-----------|---------|
| `open` | +3 | first open | Exploration |
| `quickClose` | -3 | closed < 1000ms | Negative signal |
| `timeSpent` | +3 | stayed >= 5000ms | Deep interest |
| `variantHover` | +4 | hover >= 500ms | Variant exploration |
| `variantClick` | +6 | click | Strongest signal |
| `variantCycling` | +2 | 2+ variants viewed | Comparison behavior |
| `reopen` | +5 | 2nd+ open | Very strong interest |

### Anti-Accidental Filters

- **Dead zone (400ms-1500ms)**: hover between these thresholds emits no event
- **Quick bounce detection**: hover < 400ms emits negative signal
- **Scroll skip suppression**: only fires if card wasn't interacted with (mouseenter/click suppresses it)
- **Swatch minimum duration**: 500ms threshold before swatch hover counts

---

## Phase 2: Stats Aggregation

**File:** `src/ai/statsAggregator.js`

### Dual Decay System

Each event's weight is decayed by two independent factors multiplied together:

```
finalWeight = rawWeight * temporalDecay * quantitativeDecay
```

**Temporal decay** (time-based):
```
temporalDecay = 0.5 ^ (eventAge / halfLife)
halfLife = 120 seconds
```
Events lose 50% of their weight every 2 minutes.

**Quantitative decay** (volume-based):
```
eventsAfter = totalEvents - 1 - eventIndex
cycles = floor(eventsAfter / 15)
quantitativeDecay = 0.7 ^ cycles
```
Every 15 newer events, older events lose 30% of their weight. After 30 new events, old scores are at ~49%. This handles rapid "change of mind" where the user switches interest quickly.

### Per-Product Caps

Prevents products with many variants from dominating affinities:

| Cap | Value | Purpose |
|-----|-------|---------|
| `perProductTotal` | 25 | Max total points one product can contribute |
| `perProductColor` | 12 | Max points from one product to a single color |
| `perProductStyle` | 10 | Max points from one product to a single style |
| `perProductCategory` | 15 | Max points from one product to a category |

Negative events are exempt from caps.

### Two Aggregation Modes

- **`aggregateStats()`** — only unanalyzed events (`analyzed = 0`). Used by the LLM trigger pipeline.
- **`aggregateAllStats()`** — all events. Used by the debug panel for a complete picture that persists after LLM analysis.

### Output

```js
{
  colorAffinity:    { "rosso": 8.5, "nero": 3.2, ... },
  styleAffinity:    { "casual": 6.1, "elegante": 2.0, ... },
  categoryAffinity: { "stivali": 10.3, "sneakers": 4.5, ... },
  negativeSignals:  { "shoe_005": -3.0, ... },
  topProducts:      [{ id, category, colors, styles, score }],
  totalInteractions: 42
}
```

---

## Phase 3: Trigger Conditions

**File:** `src/ai/triggerEngine.js`

All four conditions must be met simultaneously:

1. **Minimum interactions**: >= 10 unanalyzed events
2. **Inactivity**: user idle >= 8 seconds (avoids mid-browsing LLM calls)
3. **Cooldown**: >= 30 seconds since last analysis
4. **Significant delta**: any attribute changed > 2 points vs last snapshot (prevents redundant calls)

---

## Phase 4: LLM Prompt

**File:** `src/lib/promptBuilder.js`

### Model

**Qwen 2.5 3B Instruct** (q4f32_1 quantization) via WebGPU. Configured in `src/data/modelConfig.js` (temperature: 0.2, top_p: 0.9, max_tokens: 300). Model weights are cached in IndexedDB after first download (~2.5 GB).

### Structure (~400 tokens total)

```
System: Role (1 sentence) + profiling instructions
        - Update user_profile if previous exists, describe changes
        - Weights -1.0 to 1.0 based on interest scores
        - JSON only, no extra text

User:   Previous profile (with "AGGIORNA" instruction) or "nessuno"
        Affinities normalized to 0-100 scale (color, style, category)
        Few-shot example with concrete JSON values
        "Ora rispondi con JSON usando i dati reali sopra"
```

### Key design choices

- **No catalog in prompt**: LLM receives only aggregated behavioral statistics. Prompt size is constant regardless of catalog size.
- **Normalized 0-100 scale**: raw affinity scores are normalized to prevent the LLM from copying raw numbers into weights.
- **Few-shot example**: a concrete JSON example (with different data than the actual input) guides the model on format. Two examples: one for first analysis, one showing profile evolution.
- **Profile update instruction**: when a previous profile exists, the prompt explicitly asks the LLM to describe what changed.

### Expected Response

```json
{
  "user_profile": "Passato da sneakers casual a stivali neri eleganti. Preferisce nero e stile urban.",
  "color_weights": { "nero": 0.8, "rosso": 0.3, "bianco": -0.2 },
  "style_weights": { "urban": 0.6, "casual": 0.3 },
  "category_weights": { "hiking_boot": 0.7, "running": -0.3 },
  "reasoning": "Preferenza chiara per stivali scuri"
}
```

### JSON Parser

**File:** `src/lib/jsonParser.js`

The parser handles common LLM output issues with a 3-step approach:

1. **Balanced extraction**: counts `{}` depth to extract the first complete JSON object, ignoring trailing garbage text
2. **Auto-repair**: fixes unquoted property names (`roso:` → `"roso":`), missing closing quotes before colons (`"urban:` → `"urban":`), single quotes, and trailing commas
3. **Validation**: checks required fields (`color_weights`, `style_weights`, `category_weights`), clamps all weights to [-1.0, 1.0]

Falls back to previous weights if parsing fails completely.

---

## Phase 5: Reranking

**File:** `src/lib/reranker.js`

### Scoring Formula

```
score = colorScore * 40 + styleScore * 20 + categoryScore * 30 + stockBonus * 5
```

| Dimension | Multiplier | Calculation |
|-----------|-----------|-------------|
| Color | 40 | max(weight) across product's variant colors |
| Style | 20 | average(weight) across product's styles |
| Category | 30 | direct weight for product's category |
| Stock | 5 | 1 if any preferred color (weight > 0) is in stock |

Products are sorted by descending score. Positions updated in TinyBase.

### Color Preselection

**Files:** `src/App.jsx`, `src/components/ProductCard.jsx`

After reranking, each ProductCard receives `preferredColors` (colors sorted by weight, positive only). The card auto-selects the best matching variant instead of defaulting to the first one. This makes the personalization visually obvious.

---

## Phase 6: UI & Debug

**File:** `src/components/AIReasoningPanel.jsx`

### Status Bar (always visible)
- AI status: Disabled / Analyzing / Personalized / Waiting
- Event counts (total + unanalyzed)
- Reset button
- AI toggle

### Debug Panel (expandable)
- **Affinities**: real-time bars for color/style/category scores (uses `aggregateAllStats`)
- **LLM Weights**: bidirectional bars (-1.0 to +1.0) for each dimension
- **User Profile**: the structured profile text from the LLM

The debug panel polls every 3 seconds but only when expanded (performance optimization). It uses `aggregateAllStats()` to show the full picture including already-analyzed events.

---

## Configuration

All thresholds, weights, and decay parameters are centralized in `src/tracking/trackingConfig.js`. No code changes needed to tune the system.

The LLM model is configured in `src/data/modelConfig.js`. Changing the `model` string switches to a different WebLLM-compatible model (auto-downloads on first use).

/**
 * Extract the first balanced {...} block from text.
 * Handles nested braces correctly unlike greedy regex.
 */
function extractFirstJSON(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (ch === '\\') { escape = true; continue }
    if (ch === '"' && !escape) { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    if (ch === '}') { depth--; if (depth === 0) return text.substring(start, i + 1) }
  }
  return null
}

/**
 * Attempt to repair common LLM JSON issues:
 * - Unquoted property names
 * - Single-quoted strings
 * - Trailing commas
 */
function repairJSON(text) {
  let fixed = text
  // Fix missing closing quote before colon: "urban:0.8 → "urban":0.8
  fixed = fixed.replace(/"([a-zA-ZÀ-ÿ_][a-zA-ZÀ-ÿ0-9_ ]*):/g, '"$1":')
  // Fix unquoted property names: `  roso: 0.3` → `"roso": 0.3`
  fixed = fixed.replace(/([{,]\s*)([a-zA-ZÀ-ÿ_][a-zA-ZÀ-ÿ0-9_ ]*)\s*:/g, (_, prefix, key) => {
    return `${prefix}"${key.trim()}":`
  })
  // Fix single-quoted strings
  fixed = fixed.replace(/'([^']*)'/g, '"$1"')
  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([}\]])/g, '$1')
  return fixed
}

function tryParse(text) {
  try { return JSON.parse(text) } catch { return null }
}

export function parseLLMResponse(text, fallbackWeights) {
  if (!text) {
    console.warn('[DynamicPLP] Empty LLM output')
    return fallbackWeights || emptyWeights()
  }

  // Attempt 1: direct parse
  let parsed = tryParse(text)

  // Attempt 2: extract balanced JSON block
  if (!parsed) {
    const extracted = extractFirstJSON(text)
    if (extracted) {
      parsed = tryParse(extracted)

      // Attempt 3: repair and retry
      if (!parsed) {
        const repaired = repairJSON(extracted)
        parsed = tryParse(repaired)
        if (parsed) {
          console.log('[DynamicPLP] JSON parsed after repair')
        } else {
          console.warn('[DynamicPLP] JSON parse failed even after repair')
          console.warn('[DynamicPLP] Repaired text:', repaired.substring(0, 500))
        }
      }
    } else {
      console.warn('[DynamicPLP] No JSON block found in output')
    }
  }

  // Validate structure
  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed.color_weights &&
    parsed.style_weights &&
    parsed.category_weights
  ) {
    console.log('[DynamicPLP] Parsed LLM response OK:', {
      profile: parsed.user_profile?.substring(0, 60),
      colors: Object.keys(parsed.color_weights).length,
      styles: Object.keys(parsed.style_weights).length,
      categories: Object.keys(parsed.category_weights).length,
      reasoning: parsed.reasoning,
    })
    return {
      user_profile: parsed.user_profile || '',
      color_weights: sanitizeWeights(parsed.color_weights),
      style_weights: sanitizeWeights(parsed.style_weights),
      category_weights: sanitizeWeights(parsed.category_weights),
      reasoning: parsed.reasoning || '',
    }
  }

  if (parsed) {
    console.warn('[DynamicPLP] Parsed JSON but missing required fields:', Object.keys(parsed))
  }
  console.warn('[DynamicPLP] Using fallback weights')
  return fallbackWeights || emptyWeights()
}

function sanitizeWeights(weights) {
  const result = {}
  for (const [key, value] of Object.entries(weights)) {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      result[key] = Math.max(-1, Math.min(1, num))
    }
  }
  return result
}

function emptyWeights() {
  return { user_profile: '', color_weights: {}, style_weights: {}, category_weights: {}, reasoning: '' }
}

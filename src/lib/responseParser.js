/**
 * Line-based LLM response parser.
 * Expected format:
 *   PROFILE: <text>
 *   COLOR key=val, key=val, ...
 *   STYLE key=val, key=val, ...
 *   CATEGORY key=val, key=val, ...
 *   REASON: <text>
 *
 * Falls back to JSON parsing if line-based fails.
 */

const LINE_PREFIXES = {
  PROFILE: 'user_profile',
  COLOR: 'color_weights',
  STYLE: 'style_weights',
  CATEGORY: 'category_weights',
  REASON: 'reasoning',
}

function denormalizeKey(key) {
  return key.trim().replace(/_/g, ' ')
}

function parseWeightLine(line) {
  const weights = {}
  const pairs = line.split(',')
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const key = denormalizeKey(pair.substring(0, eqIdx))
    const val = parseFloat(pair.substring(eqIdx + 1))
    if (key && !isNaN(val)) {
      weights[key] = Math.max(-1, Math.min(1, val))
    }
  }
  return weights
}

function parseLineBased(text) {
  const result = {
    user_profile: '',
    color_weights: {},
    style_weights: {},
    category_weights: {},
    reasoning: '',
  }

  let found = 0
  const lines = text.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    for (const [prefix, field] of Object.entries(LINE_PREFIXES)) {
      if (!trimmed.toUpperCase().startsWith(prefix)) continue

      const rest = trimmed.substring(prefix.length).replace(/^[:\s]+/, '').trim()
      if (!rest) break

      if (field.endsWith('_weights')) {
        result[field] = parseWeightLine(rest)
      } else {
        result[field] = rest
      }
      found++
      break
    }
  }

  // Need at least one weight line to consider it valid
  const hasWeights = Object.keys(result.color_weights).length > 0 ||
    Object.keys(result.style_weights).length > 0 ||
    Object.keys(result.category_weights).length > 0

  return found >= 2 && hasWeights ? result : null
}

/** Fallback: try JSON parse (handles case where model generates JSON anyway) */
function tryJSONFallback(text) {
  try {
    // Extract first balanced {...} block
    const start = text.indexOf('{')
    if (start === -1) return null
    let depth = 0, inString = false, escape = false
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      if (escape) { escape = false; continue }
      if (ch === '\\') { escape = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      if (ch === '}') { depth--; if (depth === 0) {
        const parsed = JSON.parse(text.substring(start, i + 1))
        if (parsed.color_weights && parsed.style_weights && parsed.category_weights) {
          return {
            user_profile: parsed.user_profile || '',
            color_weights: sanitizeWeights(parsed.color_weights),
            style_weights: sanitizeWeights(parsed.style_weights),
            category_weights: sanitizeWeights(parsed.category_weights),
            reasoning: parsed.reasoning || '',
          }
        }
        return null
      }}
    }
  } catch { /* ignore */ }
  return null
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

export function parseResponse(text, fallbackWeights) {
  if (!text) {
    console.warn('[DynamicPLP] Empty LLM output')
    return fallbackWeights || emptyWeights()
  }

  // Attempt 1: line-based format
  const lineParsed = parseLineBased(text)
  if (lineParsed) {
    console.log('[DynamicPLP] Parsed line-based response OK:', {
      profile: lineParsed.user_profile?.substring(0, 60),
      colors: Object.keys(lineParsed.color_weights).length,
      styles: Object.keys(lineParsed.style_weights).length,
      categories: Object.keys(lineParsed.category_weights).length,
    })
    return lineParsed
  }

  // Attempt 2: JSON fallback
  const jsonParsed = tryJSONFallback(text)
  if (jsonParsed) {
    console.log('[DynamicPLP] Parsed JSON fallback response OK')
    return jsonParsed
  }

  console.warn('[DynamicPLP] Failed to parse LLM response, using fallback')
  return fallbackWeights || emptyWeights()
}

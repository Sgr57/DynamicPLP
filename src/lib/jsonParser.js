export function parseLLMResponse(text, fallbackWeights) {
  let parsed = null

  // Attempt 1: direct JSON parse
  try {
    parsed = JSON.parse(text)
  } catch {
    // Attempt 2: extract first { ... } block
    try {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) {
        parsed = JSON.parse(match[0])
      }
    } catch {
      // Both attempts failed
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
    return {
      user_profile: parsed.user_profile || '',
      color_weights: sanitizeWeights(parsed.color_weights),
      style_weights: sanitizeWeights(parsed.style_weights),
      category_weights: sanitizeWeights(parsed.category_weights),
      reasoning: parsed.reasoning || '',
    }
  }

  // Fallback
  if (fallbackWeights) {
    return fallbackWeights
  }

  return {
    user_profile: '',
    color_weights: {},
    style_weights: {},
    category_weights: {},
    reasoning: '',
  }
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

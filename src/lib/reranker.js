const W_COLOR = 40
const W_STYLE = 20
const W_CATEGORY = 30
const W_STOCK = 5

export function rankProducts(products, weights) {
  if (!weights || !products || products.length === 0) return products.map(p => p.id)

  const colorW = weights.color_weights || {}
  const styleW = weights.style_weights || {}
  const categoryW = weights.category_weights || {}

  const scored = products.map(product => {
    // Color score: max weight among product variant colors
    const variantColors = product.variants?.map(v => v.color) || []
    const colorScore = variantColors.length > 0
      ? Math.max(...variantColors.map(c => colorW[c] || 0))
      : 0

    // Style score: average of product style weights
    const styles = product.styles || []
    const styleScore = styles.length > 0
      ? styles.reduce((sum, s) => sum + (styleW[s] || 0), 0) / styles.length
      : 0

    // Category score: direct weight
    const categoryScore = categoryW[product.category] || 0

    // Stock bonus: 1 if a variant with a preferred color (weight > 0) is in stock
    const stockBonus = product.variants?.some(
      v => (colorW[v.color] || 0) > 0 && v.inStock === 1
    ) ? 1 : 0

    const score = colorScore * W_COLOR + styleScore * W_STYLE +
                  categoryScore * W_CATEGORY + stockBonus * W_STOCK

    return { id: product.id, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.id)
}

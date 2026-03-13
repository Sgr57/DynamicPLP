import { store } from './store'

export function getProducts() {
  const products = store.getTable('products')
  const variants = store.getTable('variants')

  return Object.entries(products)
    .map(([id, p]) => ({
      ...p,
      id,
      styles: typeof p.styles === 'string' ? JSON.parse(p.styles) : p.styles,
      variants: Object.values(variants).filter(v => v.productId === id),
    }))
    .sort((a, b) => a.position - b.position)
}

export function updatePositions(orderedIds) {
  orderedIds.forEach((id, i) => {
    store.setCell('products', id, 'position', i)
  })
}

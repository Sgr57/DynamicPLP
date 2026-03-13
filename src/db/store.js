import { createStore } from 'tinybase'
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db'
import catalog from '../data/products.json'

export const store = createStore()

let persister = null

function seedIfEmpty() {
  const products = store.getTable('products')
  if (Object.keys(products).length > 0) return

  catalog.forEach((product, index) => {
    const { variants, ...productData } = product
    store.setRow('products', product.id, {
      ...productData,
      styles: JSON.stringify(productData.styles),
      position: index,
    })

    variants.forEach((variant, vi) => {
      const variantId = `var_${product.id}_${vi}`
      store.setRow('variants', variantId, {
        ...variant,
        productId: product.id,
      })
    })
  })
}

export async function initStore() {
  persister = createIndexedDbPersister(store, 'plp_demo')
  await persister.startAutoLoad()
  await persister.startAutoSave()
  seedIfEmpty()
  return store
}

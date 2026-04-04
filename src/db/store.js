import { createStore } from 'tinybase'
import { createIndexedDbPersister } from 'tinybase/persisters/persister-indexed-db'
import catalog from '../data/products.json'

const CATALOG_VERSION = 5

export const store = createStore()

let persister = null

function seedProducts() {
  store.delTable('products')
  store.delTable('variants')

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

  store.setCell('aiMemory', 'catalog', 'version', CATALOG_VERSION)
}

function seedIfNeeded() {
  const storedVersion = store.getCell('aiMemory', 'catalog', 'version') || 0
  if (storedVersion < CATALOG_VERSION) {
    seedProducts()
  }
}

export async function initStore() {
  try {
    persister = createIndexedDbPersister(store, 'plp_demo')
    await persister.startAutoLoad()
    await persister.startAutoSave()
  } catch (err) {
    console.warn('[PLP] IndexedDB non disponibile, modalità in-memory:', err.message)
  }
  seedIfNeeded()
  return store
}

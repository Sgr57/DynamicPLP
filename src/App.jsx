import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { initStore, store } from './db/store'
import { getProducts, updatePositions } from './db/productsRepo'
import { getWeights } from './db/aiMemoryRepo'
import { rankProducts } from './lib/reranker'
import { useModelLoader } from './hooks/useModelLoader'
import { useReranker } from './hooks/useReranker'
import { exportData } from './lib/dbExporter'
import catalog from './data/products.json'
import PLPGrid from './components/PLPGrid'
import ProductDrawer from './components/ProductDrawer'
import ModelLoader from './components/ModelLoader'
import AIReasoningPanel from './components/AIReasoningPanel'
import OfflineIndicator from './components/OfflineIndicator'

export default function App() {
  const [appState, setAppState] = useState('loading')
  const [storeReady, setStoreReady] = useState(false)
  const [hasPreWeights, setHasPreWeights] = useState(false)
  const [drawerProduct, setDrawerProduct] = useState(null)
  const [aiEnabled, setAiEnabled] = useState(true)

  const { status: modelStatus, progress, generate } = useModelLoader()
  const engineReady = modelStatus === 'ready'

  const { isAnalyzing, lastReasoning, products, refreshProducts } = useReranker(
    aiEnabled ? generate : null,
    aiEnabled && engineReady,
    drawerProduct?.id
  )

  useEffect(() => {
    initStore().then(() => {
      const lastWeights = getWeights()
      if (lastWeights) {
        try {
          const currentProducts = getProducts()
          const orderedIds = rankProducts(currentProducts, lastWeights)
          updatePositions(orderedIds)
        } catch {
          // Silent fallback
        }
        setHasPreWeights(true)
      }
      setStoreReady(true)
      setAppState('model_loading')
    })

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  }, [])

  useEffect(() => {
    if (modelStatus === 'ready' || modelStatus === 'error') {
      setAppState('browsing')
    }
  }, [modelStatus])

  const handleToggleAI = useCallback(() => {
    setAiEnabled(prev => {
      const next = !prev
      if (!next) {
        const defaultOrder = catalog.map(p => p.id)
        updatePositions(defaultOrder)
        refreshProducts()
      } else {
        const lastWeights = getWeights()
        if (lastWeights) {
          try {
            const currentProducts = getProducts()
            const orderedIds = rankProducts(currentProducts, lastWeights)
            updatePositions(orderedIds)
            refreshProducts()
          } catch {
            // Silent fallback
          }
        }
      }
      return next
    })
  }, [refreshProducts])

  const resetPreferences = useCallback(() => {
    store.delTable('trackingEvents')
    store.delTable('aiMemory')
    const defaultOrder = catalog.map(p => p.id)
    updatePositions(defaultOrder)
    refreshProducts()
  }, [refreshProducts])

  const openDrawer = useCallback((product) => { setDrawerProduct(product) }, [])
  const closeDrawer = useCallback(() => { setDrawerProduct(null) }, [])

  if (appState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-lg text-gray-500">Inizializzazione store...</p>
      </div>
    )
  }

  if (appState === 'model_loading' && !hasPreWeights) {
    return <ModelLoader progress={progress} isOverlay={false} />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DynamicPLP</h1>
              <p className="text-sm text-gray-500">{products.length} prodotti</p>
            </div>
          </div>
        </div>
      </header>

      <AIReasoningPanel
        isAnalyzing={isAnalyzing}
        lastReasoning={lastReasoning}
        aiEnabled={aiEnabled}
        onToggleAI={handleToggleAI}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <PLPGrid products={products} onCardClick={openDrawer} />
      </main>

      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs">DynamicPLP — Demo PoC Local First</span>
          <div className="flex items-center gap-3">
            <button
              onClick={exportData}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors"
            >
              Esporta i tuoi dati
            </button>
            <button
              onClick={resetPreferences}
              className="text-xs bg-gray-800 hover:bg-red-900/60 text-gray-300 hover:text-red-300 px-3 py-1.5 rounded transition-colors"
            >
              Resetta preferenze
            </button>
          </div>
          <OfflineIndicator />
        </div>
      </footer>

      <AnimatePresence>
        {drawerProduct && (
          <ProductDrawer
            key={drawerProduct.id}
            product={drawerProduct}
            onClose={closeDrawer}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {appState === 'model_loading' && hasPreWeights && (
          <ModelLoader
            progress={progress}
            isOverlay={true}
            onSkip={() => setAppState('browsing')}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

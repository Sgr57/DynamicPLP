import { useState, useEffect, useRef, useCallback } from 'react'
import { MODEL_CONFIG } from '../data/modelConfig'
import { logger } from '../lib/logger'

let requestId = 0

export function useModelLoader() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ text: '', percentage: 0 })
  const workerRef = useRef(null)
  const pendingRef = useRef({})

  useEffect(() => {
    const worker = new Worker(
      new URL('../lib/modelWorker.js', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    setStatus('loading')
    logger.model('caricamento modello...')
    const loadT0 = performance.now()

    worker.onmessage = (e) => {
      const { type, id, output, message, progress: prog } = e.data

      if (type === 'progress') {
        setProgress(prog)
        return
      }

      if (type === 'ready') {
        const loadMs = Math.round(performance.now() - loadT0)
        logger.modelLoaded(loadMs)
        setStatus('ready')
        return
      }

      if (type === 'result') {
        pendingRef.current[id]?.resolve(output)
        delete pendingRef.current[id]
        return
      }

      if (type === 'error') {
        if (id != null) {
          pendingRef.current[id]?.reject(new Error(message))
          delete pendingRef.current[id]
        } else {
          logger.modelError(new Error(message))
          setStatus('error')
        }
      }
    }

    worker.onerror = (err) => {
      logger.modelError(err)
      setStatus('error')
    }

    worker.postMessage({ type: 'load' })

    return () => {
      for (const { reject } of Object.values(pendingRef.current)) {
        reject(new Error('Worker terminated'))
      }
      pendingRef.current = {}
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const generate = useCallback(async (messages) => {
    const worker = workerRef.current
    if (!worker) throw new Error('Engine not ready')

    const id = ++requestId

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM inference timeout')), MODEL_CONFIG.inferenceTimeout)
    )

    const inferencePromise = new Promise((resolve, reject) => {
      pendingRef.current[id] = { resolve, reject }
      worker.postMessage({ type: 'generate', id, data: { messages } })
    })

    return Promise.race([inferencePromise, timeoutPromise])
  }, [])

  return { status, progress, generate }
}

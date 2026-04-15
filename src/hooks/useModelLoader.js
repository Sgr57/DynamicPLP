import { useState, useEffect, useRef, useCallback } from 'react'
import { MODEL_CONFIG } from '../data/modelConfig'
import { logger } from '../lib/logger'
import { getDeviceCapabilities } from '../lib/deviceCapabilities'

let requestId = 0

export function useModelLoader() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ text: '', percentage: 0 })
  const workerRef = useRef(null)
  const pendingRef = useRef({})

  useEffect(() => {
    const caps = getDeviceCapabilities()
    if (!caps.canRunModel) {
      setStatus('unsupported')
      logger.model(`AI non disponibile: ${caps.reason}`)
      return
    }

    const MAX_RETRIES = 2
    let retryCount = 0
    let currentWorker = null
    let cancelled = false

    function startWorker() {
      if (cancelled) return

      // Keep new URL() inline inside new Worker() — Vite's static analysis
      // requires this exact pattern to detect and bundle the Worker script.
      const worker = new Worker(
        new URL('../lib/modelWorker.js', import.meta.url),
        { type: 'module' }
      )
      currentWorker = worker
      workerRef.current = worker

      setStatus('loading')
      logger.model(retryCount > 0
        ? `retry ${retryCount}/${MAX_RETRIES}...`
        : 'caricamento modello...'
      )
      const loadT0 = performance.now()

      worker.onmessage = (e) => {
        if (cancelled) return
        const { type, id, output, message, progress: prog } = e.data

        if (type === 'progress') {
          setProgress(prog)
          return
        }

        if (type === 'ready') {
          const loadMs = Math.round(performance.now() - loadT0)
          logger.modelLoaded(loadMs)
          retryCount = 0
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
            handleWorkerFailure(new Error(message))
          }
        }
      }

      worker.onerror = (err) => {
        // Worker onerror receives an Event, not an Error.
        // Extract whatever info is available for diagnostics.
        const info = err instanceof ErrorEvent
          ? `${err.message} (${err.filename}:${err.lineno})`
          : 'Opaque worker error — script may have failed to load or evaluate'
        handleWorkerFailure(new Error(info))
      }

      worker.postMessage({ type: 'load' })
    }

    function handleWorkerFailure(err) {
      if (cancelled) return
      logger.modelError(err)

      for (const { reject } of Object.values(pendingRef.current)) {
        reject(new Error('Worker failed'))
      }
      pendingRef.current = {}

      currentWorker?.terminate()

      if (retryCount < MAX_RETRIES) {
        retryCount++
        startWorker()
      } else {
        setStatus('error')
      }
    }

    startWorker()

    return () => {
      cancelled = true
      for (const { reject } of Object.values(pendingRef.current)) {
        reject(new Error('Worker terminated'))
      }
      pendingRef.current = {}
      currentWorker?.terminate()
      workerRef.current = null
    }
  }, [])

  const generate = useCallback(async (messages) => {
    const worker = workerRef.current
    if (!worker) throw new Error('Engine not ready')

    const id = ++requestId

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        delete pendingRef.current[id]
        worker.postMessage({ type: 'abort' })
        reject(new Error('LLM inference timeout'))
      }, MODEL_CONFIG.inferenceTimeout)

      pendingRef.current[id] = {
        resolve: (value) => { clearTimeout(timer); resolve(value) },
        reject: (err) => { clearTimeout(timer); reject(err) },
      }

      worker.postMessage({ type: 'generate', id, data: { messages } })
    })
  }, [])

  const cancel = useCallback(() => {
    for (const { reject } of Object.values(pendingRef.current)) {
      reject(new Error('Inference cancelled'))
    }
    pendingRef.current = {}
    workerRef.current?.postMessage({ type: 'abort' })
  }, [])

  return { status, progress, generate, cancel }
}

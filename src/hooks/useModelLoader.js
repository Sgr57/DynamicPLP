import { useState, useEffect, useRef, useCallback } from 'react'
import { createModelAdapter } from '../lib/modelAdapter'
import { MODEL_CONFIG } from '../data/modelConfig'
import { logger } from '../lib/logger'

export function useModelLoader() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ text: '', percentage: 0 })
  const adapterRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function loadModel() {
      setStatus('loading')
      try {
        const adapter = await createModelAdapter()
        await adapter.load((p) => {
          if (cancelled) return
          setProgress(p)
        })
        if (cancelled) {
          adapter.dispose()
          return
        }
        adapterRef.current = adapter
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        logger.modelError(err)
        setStatus('error')
      }
    }

    loadModel()
    return () => {
      cancelled = true
      adapterRef.current?.dispose()
    }
  }, [])

  const generate = useCallback(async (messages) => {
    if (!adapterRef.current) throw new Error('Engine not ready')

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM inference timeout')), MODEL_CONFIG.inferenceTimeout)
    )

    const inferencePromise = adapterRef.current.generate(messages)

    return Promise.race([inferencePromise, timeoutPromise])
  }, [])

  return { status, progress, generate }
}

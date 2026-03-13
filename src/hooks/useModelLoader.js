import { useState, useEffect, useRef, useCallback } from 'react'
import { CreateMLCEngine } from '@mlc-ai/web-llm'
import { MODEL_CONFIG } from '../data/modelConfig'

export function useModelLoader() {
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ text: '', percentage: 0 })
  const engineRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function loadModel() {
      setStatus('loading')
      try {
        const engine = await CreateMLCEngine(MODEL_CONFIG.model, {
          initProgressCallback: (p) => {
            if (cancelled) return
            setProgress({
              text: p.text || '',
              percentage: Math.round((p.progress || 0) * 100),
            })
          },
        })
        if (cancelled) return
        engineRef.current = engine
        setStatus('ready')
      } catch (err) {
        if (cancelled) return
        setStatus('error')
      }
    }

    loadModel()
    return () => { cancelled = true }
  }, [])

  const generate = useCallback(async (messages) => {
    if (!engineRef.current) throw new Error('Engine not ready')

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('LLM inference timeout')), 15000)
    )

    const inferencePromise = engineRef.current.chat.completions.create({
      messages,
      temperature: MODEL_CONFIG.temperature,
      top_p: MODEL_CONFIG.top_p,
      max_tokens: MODEL_CONFIG.max_tokens,
    })

    const reply = await Promise.race([inferencePromise, timeoutPromise])
    return reply.choices[0].message.content
  }, [])

  return { status, progress, engine: engineRef.current, generate }
}

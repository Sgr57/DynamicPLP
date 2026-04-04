let _cached = null

export function getDeviceCapabilities() {
  if (_cached) return _cached

  const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
  const canRunModel = hasWebGPU && hasSharedArrayBuffer

  _cached = {
    canRunModel,
    reason: !hasWebGPU
      ? 'WebGPU non disponibile'
      : !hasSharedArrayBuffer
        ? 'SharedArrayBuffer non supportato'
        : null,
  }

  return _cached
}

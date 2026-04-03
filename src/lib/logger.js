const PREFIX = '[PLP]'

const log = (phase, icon, ...args) =>
  console.log(`${PREFIX} ${phase.padEnd(8)} ${icon}`, ...args)

const group = (phase, icon, label, detail) => {
  console.groupCollapsed(`${PREFIX} ${phase.padEnd(8)} ${icon} ${label}`)
  typeof detail === 'string' ? console.log(detail) : console.dir(detail)
  console.groupEnd()
}

export const logger = {
  track:   ({ eventType, productId, color, duration }) => {
    const parts = [eventType, productId]
    if (color) parts.push(color)
    if (duration) parts.push(`${Math.round(duration / 1000)}s`)
    log('track', '\u2190', parts.join(' | '))
  },
  trigger: (pass, msg) => log('trigger', pass ? '\u2713' : '\u2717', msg),
  llmSend: (evtCount) => log('llm', '\u2192', `prompt (${evtCount} eventi)`),
  llmSendDetail: (messages) => group('llm', '\u2192', 'prompt completo',
    messages.map(m => `[${m.role}] ${m.content}`).join('\n\n')),
  llmRecv: (ms) => log('llm', '\u2190', `risposta ricevuta (${ms}ms)`),
  llmRecvDetail: (text) => group('llm', '\u2190', 'output raw', text),
  llmWeights: (weights) => group('llm', '\u2713', 'pesi salvati', weights),
  llmError: (err) => console.error(`${PREFIX} llm      \u2717`, err),
  parse:   (ok, msg) => log('parse', ok ? '\u2713' : '\u2717', msg),
  reorder: (msg) => log('reorder', '\u2713', msg),
  model:   (msg) => log('model', '\u2192', msg),
  modelError: (err) => console.error(`${PREFIX} model    \u2717`, err),
  warn:    (phase, msg) => console.warn(`${PREFIX} ${phase.padEnd(8)} \u26A0`, msg),
}

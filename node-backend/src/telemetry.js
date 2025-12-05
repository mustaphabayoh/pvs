// Telemetry helper (safe: will not throw if otel/prom-client packages are missing)
const promClient = (() => {
  try { return require('prom-client') } catch (e) { return null }
})()

let prometheus = null
if (promClient) {
  try {
    const collectDefaultMetrics = promClient.collectDefaultMetrics
    const register = promClient.register
    collectDefaultMetrics({ timeout: 5000 })
    prometheus = register
  } catch (e) {
    // If prom-client API differs, skip metrics but don't throw
    console.warn('prom-client init skipped:', e.message)
    prometheus = null
  }
}

async function initOpentelemetry() {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT && !process.env.OTEL_COLLECTOR_URL) return null
  try {
    const { NodeSDK } = require('@opentelemetry/sdk-node')
    const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node')

    // prefer OTLP HTTP exporter when available
    let exporter = null
    try {
      const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http')
      const url = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || process.env.OTEL_COLLECTOR_URL
      exporter = new OTLPTraceExporter({ url })
      console.info('Using OTLP HTTP exporter for OpenTelemetry')
    } catch (e) {
      console.warn('OTLP HTTP exporter not available, tracing will be limited')
    }

    const sdk = new NodeSDK({
      traceExporter: exporter || undefined,
      instrumentations: [getNodeAutoInstrumentations()]
    })
    await sdk.start()
    console.info('OpenTelemetry SDK started')
    return sdk
  } catch (e) {
    console.warn('OpenTelemetry init failed:', e && e.message ? e.message : e)
    return null
  }
}

module.exports = { prometheus, initOpentelemetry }

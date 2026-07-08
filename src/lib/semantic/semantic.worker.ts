/// <reference lib="webworker" />
/**
 * Semantic-embedding worker — runs MiniLM (all-MiniLM-L6-v2, int8 onnx) fully
 * on-device via transformers.js. EVERYTHING is self-hosted under /semantic/:
 * remote model loading is hard-disabled, so this feature can never violate the
 * zero-external-requests promise (and the production CSP `connect-src 'self'`
 * would refuse it anyway). Lives in a worker so a few seconds of wasm inference
 * never block typing.
 */
import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers'

declare const self: DedicatedWorkerGlobalScope

const ORIGIN = self.location.origin
env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = `${ORIGIN}/semantic/models/`
env.backends.onnx.wasm.wasmPaths = `${ORIGIN}/semantic/`
// No COEP on the app (not crossOriginIsolated) — stay on the single-thread build.
env.backends.onnx.wasm.numThreads = 1

let extractorP: Promise<FeatureExtractionPipeline> | null = null
function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorP) {
    extractorP = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
      progress_callback: (p: { status?: string; file?: string; progress?: number }) =>
        self.postMessage({ type: 'progress', status: p.status, file: p.file, progress: p.progress }),
    }).catch((e) => {
      extractorP = null // allow retry instead of caching the failure
      throw e
    }) as Promise<FeatureExtractionPipeline>
  }
  return extractorP
}

interface EmbedRequest {
  id: number
  texts: string[]
}

self.onmessage = async (e: MessageEvent<EmbedRequest>) => {
  const { id, texts } = e.data
  try {
    const extractor = await getExtractor()
    // Mean-pooled + L2-normalized → cosine similarity is a plain dot product.
    const out = await extractor(texts, { pooling: 'mean', normalize: true })
    const data = out.data as Float32Array
    self.postMessage({ id, ok: true, data, dims: out.dims }, [data.buffer])
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err instanceof Error ? err.message : err) })
  }
}

// Worker receives audio only; scripts/self-checks never leave the UI thread.
const base = new URL("./local-stt/", import.meta.url),
  originalFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
    throw Error("Only same-origin local transcription assets are allowed.");
  return originalFetch(input, options);
};
let transcriber;
self.onmessage = async (e) => {
  try {
    if (e.data.type === "load") {
      const { pipeline, env } = await import(
        "./local-stt/runtime/transformers.min.js"
      );
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      env.localModelPath = new URL("models/", base).href;
      env.useBrowserCache = false;
      if (globalThis.caches) {
        const cache = await caches.open("speech-studio-stt-3.8.1-tiny-en-v1");
        env.useCustomCache = true;
        env.customCache = {
          match: (url) => cache.match(url),
          put: () => Promise.resolve(),
        };
      }
      env.backends.onnx.wasm.wasmPaths = new URL("runtime/", base).href;
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      transcriber = await pipeline(
        "automatic-speech-recognition",
        "whisper-tiny.en",
        { device: "wasm", dtype: "q8" },
      );
      self.postMessage({ type: "ready" });
    } else if (e.data.type === "transcribe") {
      if (!transcriber) throw Error("Local model is not ready.");
      const audio = e.data.audio,
        rate = 16000,
        chunk = 25 * rate,
        words = [],
        texts = [];
      if (!(audio instanceof Float32Array) || audio.length > 1200 * rate)
        throw Error("Audio exceeds local analysis limits.");
      // Nonoverlapping bounded windows avoid duplicate evidence. Boundary words may
      // be truncated: this is explicit uncertain STT evidence, never omission proof.
      for (let offset = 0; offset < audio.length; offset += chunk) {
        const slice = audio.slice(
          offset,
          Math.min(audio.length, offset + chunk),
        );
        // Silence can provoke hallucinations. Do not manufacture text from silence.
        let energy = 0;
        for (const sample of slice) energy += sample * sample;
        if (Math.sqrt(energy / slice.length) > 0.0001) {
          const result = await transcriber(slice, {
            return_timestamps: "word",
            chunk_length_s: 25,
            stride_length_s: 0,
            force_full_sequences: false,
            max_new_tokens: 256,
          });
          texts.push(result.text);
          for (const w of result.chunks || []) {
            const start = w.timestamp?.[0],
              end = w.timestamp?.[1];
            if (Number.isFinite(start))
              words.push({
                text: w.text,
                timestamp: [
                  Math.min(audio.length / rate, start + offset / rate),
                  Number.isFinite(end)
                    ? Math.min(audio.length / rate, end + offset / rate)
                    : null,
                ],
              });
          }
        }
        self.postMessage({
          type: "status",
          text: `Local analysis: ${(Math.min(audio.length, offset + chunk) / rate) | 0} / ${(audio.length / rate) | 0} recorded seconds. You can cancel.`,
        });
      }
      audio.fill(0);
      self.postMessage({ type: "result", text: texts.join(" "), words });
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      text: error.message || "Local analysis failed.",
    });
  }
};

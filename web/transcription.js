const CACHE = "speech-studio-stt-3.8.1-tiny-en-v1";
export const MAX_AUDIO_SECONDS = 1200,
  MAX_AUDIO_BYTES = 100 * 1024 * 1024;
export async function decodeAudio(blob, signal) {
  if (blob.size > MAX_AUDIO_BYTES)
    throw Error("This recording exceeds the 100 MB local analysis limit.");
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context || !globalThis.OfflineAudioContext)
    throw Error("Audio decoding is unavailable in this browser.");
  const context = new Context();
  let decoded;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    throw Error(
      "This browser cannot decode audio from this recording format. Try microphone-only recording in a supported browser.",
    );
  } finally {
    await context.close();
  }
  signal?.throwIfAborted();
  if (!decoded.duration || decoded.duration > MAX_AUDIO_SECONDS)
    throw Error(
      "Local analysis supports up to 20 minutes. Use a shorter section take.",
    );
  const offline = new OfflineAudioContext(
      1,
      Math.ceil(decoded.duration * 16000),
      16000,
    ),
    source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const mono = (await offline.startRendering()).getChannelData(0);
  signal?.throwIfAborted();
  return mono;
}
export class LocalTranscriber {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.ready = false;
    this.worker = null;
    this.pending = null;
    this.controller = null;
    this.busy = false;
    this.generation = 0;
  }
  async load() {
    if (this.busy) throw Error("Local transcription is already busy.");
    this.busy = true;
    const generation = ++this.generation;
    this.controller = new AbortController();
    try {
      const signal = this.controller.signal,
        response = await fetch(new URL("./stt-assets.json", import.meta.url), {
          signal,
        });
      if (!response.ok) throw Error("Could not read the local asset manifest.");
      const manifest = await response.json(),
        total = manifest.files.reduce((n, f) => n + f.bytes, 0);
      let completed = 0;
      const cache = globalThis.caches ? await caches.open(CACHE) : null;
      this.onMessage({
        type: "status",
        text: `Downloading verified public assets from this host (${(total / 1000000).toFixed(1)} MB). No audio is uploaded.`,
      });
      for (const f of manifest.files) {
        const url = new URL(`./local-stt/${f.path}`, import.meta.url).href;
        let response = await cache?.match(url);
        if (!response) {
          response = await fetch(url, { signal });
          if (!response.ok)
            throw Error(
              "Optional local transcription assets are not installed on this host. Run the documented setup command locally.",
            );
        }
        const reader = response.body.getReader(),
          chunks = [];
        let loaded = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          signal.throwIfAborted();
          loaded += value.byteLength;
          if (loaded > f.bytes)
            throw Error("Unexpected transcription asset size.");
          chunks.push(value);
          this.onMessage({
            type: "progress",
            percent: ((completed + loaded) / total) * 100,
          });
        }
        const bytes = new Uint8Array(loaded);
        let offset = 0;
        for (const c of chunks) {
          bytes.set(c, offset);
          offset += c.length;
        }
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          (b) => b.toString(16).padStart(2, "0"),
        ).join("");
        if (loaded !== f.bytes || hash !== f.sha256) {
          await cache?.delete(url);
          throw Error("Transcription asset failed its integrity check.");
        }
        signal.throwIfAborted();
        if (cache) await cache.put(url, new Response(bytes));
        completed += loaded;
      }
      signal.throwIfAborted();
      this.worker = new Worker(
        new URL("./transcription-worker.js", import.meta.url),
        { type: "module" },
      );
      this.worker.onmessage = (e) => {
        const m = e.data;
        if (m.type === "result" || m.type === "ready") {
          this.pending?.resolve(m);
          this.pending = null;
        } else if (m.type === "error") {
          this.pending?.reject(Error(m.text));
          this.pending = null;
        } else this.onMessage(m);
      };
      this.worker.onerror = () => {
        this.pending?.reject(
          Error(
            "Local transcription worker could not start. Check the host setup and browser support.",
          ),
        );
        this.pending = null;
      };
      await this.request({ type: "load" });
      if (generation !== this.generation)
        throw new DOMException("Cancelled", "AbortError");
      this.ready = true;
    } catch (error) {
      this.worker?.terminate();
      this.worker = null;
      this.ready = false;
      throw error;
    } finally {
      if (generation === this.generation) this.busy = false;
    }
  }
  request(message, transfer = []) {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker.postMessage(message, transfer);
    });
  }
  async transcribe(blob, duration) {
    if (!this.ready || !this.worker)
      throw Error("Download the local model first.");
    if (this.busy) throw Error("Local transcription is already busy.");
    if (duration > MAX_AUDIO_SECONDS)
      throw Error(
        "Local analysis supports up to 20 minutes. Use a shorter section take.",
      );
    const generation = ++this.generation;
    this.busy = true;
    this.controller = new AbortController();
    try {
      this.onMessage({
        type: "status",
        text: "Decoding and resampling locally to 16 kHz mono…",
      });
      const audio = await decodeAudio(blob, this.controller.signal);
      this.controller.signal.throwIfAborted();
      this.onMessage({
        type: "status",
        text: "Transcribing locally in bounded chunks…",
      });
      return await this.request({ type: "transcribe", audio }, [audio.buffer]);
    } finally {
      if (generation === this.generation) this.busy = false;
    }
  }
  cancel() {
    ++this.generation;
    this.controller?.abort();
    this.pending?.reject(new DOMException("Cancelled", "AbortError"));
    this.pending = null;
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    this.busy = false;
  }
  async clear() {
    this.cancel();
    if (globalThis.caches) await caches.delete(CACHE);
  }
}

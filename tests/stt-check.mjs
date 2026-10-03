// Optional real-model test using generated NONPERSONAL speech only.
// SYNTHETIC_MEDIA_DIR must contain synthetic.wav/.webm/.mp4/.ogg.
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const dir = process.env.SYNTHETIC_MEDIA_DIR;
if (!dir)
  throw Error(
    "Set SYNTHETIC_MEDIA_DIR to the generated synthetic fixture directory.",
  );
const files = [];
for (const ext of ["wav", "webm", "mp4", "ogg"])
  files.push({ ext, bytes: [...(await readFile(`${dir}/synthetic.${ext}`))] });
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:8765";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
    : {}),
});
try {
  const page = await browser.newPage(),
    external = [],
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith(origin) && !r.url().startsWith("blob:"))
      external.push(r.url());
  });
  await page.goto(origin);
  const report = await page.evaluate(
    async ({ files, fullLengthEnabled }) => {
      const { LocalTranscriber, decodeAudio } = await import(
        "./transcription.js"
      );
      const t = new LocalTranscriber(() => {}),
        formats = [];
      for (const f of files) {
        const blob = new Blob([new Uint8Array(f.bytes)], {
          type:
            f.ext === "mp4"
              ? "video/mp4"
              : f.ext === "webm"
                ? "video/webm"
                : `audio/${f.ext}`,
        });
        try {
          const audio = await decodeAudio(blob);
          formats.push({
            format: f.ext,
            samples: audio.length,
            seconds: audio.length / 16000,
          });
        } catch (e) {
          formats.push({ format: f.ext, error: e.message });
        }
      }
      await t.load();
      const wav = new Blob([new Uint8Array(files[0].bytes)], {
          type: "audio/wav",
        }),
        audio = await decodeAudio(wav);
      const started = performance.now(),
        results = [];
      for (let i = 0; i < 2; i++) {
        const result = await t.transcribe(wav, audio.length / 16000);
        results.push({
          text: result.text,
          words: result.words.length,
          timestamps: result.words.map((w) => w.timestamp),
        });
      }
      // A take longer than one inference chunk. Repetition is deliberate synthetic speech.
      const long = new Float32Array(audio.length * 4);
      for (let i = 0; i < 4; i++) long.set(audio, i * audio.length);
      const longer = await t.request({ type: "transcribe", audio: long }, [
        long.buffer,
      ]);
      let fullLength = null;
      if (fullLengthEnabled) {
        const full = new Float32Array(1200 * 16000);
        for (let offset = 0; offset < full.length; offset += audio.length)
          full.set(
            audio.subarray(0, Math.min(audio.length, full.length - offset)),
            offset,
          );
        const output = await t.request({ type: "transcribe", audio: full }, [
          full.buffer,
        ]);
        fullLength = {
          seconds: 1200,
          words: output.words.length,
          lastWord: output.words.at(-1),
        };
      }
      // Exercise every bounded window of a 20-minute silence take without hallucinations.
      const silence = new Float32Array(1200 * 16000),
        silent = await t.request({ type: "transcribe", audio: silence }, [
          silence.buffer,
        ]);
      let limit;
      try {
        await t.transcribe(wav, 1201);
      } catch (e) {
        limit = e.message;
      }
      const pending = t.transcribe(wav, audio.length / 16000).then(
        () => false,
        (e) => e.name === "AbortError",
      );
      setTimeout(() => t.cancel(), 200);
      const cancelled = await pending;
      await t.load();
      const recovered = await t.transcribe(wav, audio.length / 16000);
      await t.clear();
      return {
        formats,
        results,
        fullLength,
        long: {
          seconds: (audio.length * 4) / 16000,
          text: longer.text,
          words: longer.words.length,
          timestamps: longer.words.map((w) => w.timestamp),
        },
        silence: {
          seconds: 1200,
          text: silent.text,
          words: silent.words.length,
        },
        limit,
        cancelled,
        recoveredWords: recovered.words.length,
        elapsedSeconds: (performance.now() - started) / 1000,
      };
    },
    { files, fullLengthEnabled: process.env.TEST_FULL_LENGTH === "1" },
  );
  for (const f of report.formats)
    assert.ok(f.samples > 0, `${f.format}: ${f.error}`);
  for (const r of [...report.results, report.long]) {
    assert.ok(r.words > 0);
    assert.match(r.text, /synthetic|rehearsal/i);
    assert.ok(
      r.timestamps.every(
        ([start, end]) => start >= 0 && (end === null || end >= start),
      ),
    );
  }
  if (process.env.TEST_FULL_LENGTH === "1") {
    assert.ok(report.fullLength.words > 2000);
    assert.ok(report.fullLength.lastWord.timestamp[0] > 1175);
  }
  assert.equal(report.silence.text, "");
  assert.equal(report.silence.words, 0);
  assert.match(report.limit, /20 minutes/);
  assert.equal(report.cancelled, true);
  assert.ok(report.recoveredWords > 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  if (process.env.STT_REPORT)
    await writeFile(
      process.env.STT_REPORT,
      JSON.stringify(
        {
          ...report,
          externalRequests: external.length,
          pageErrors: errors.length,
        },
        null,
        2,
      ),
    );
  console.log(
    JSON.stringify({
      ...report,
      results: report.results.map((r) => ({ text: r.text, words: r.words })),
      long: { seconds: report.long.seconds, words: report.long.words },
      externalRequests: external.length,
      pageErrors: errors.length,
    }),
  );
} finally {
  await browser.close();
}

// Optional integration suite: npm install --no-save playwright@1.56.1
// Serve web/ on localhost first. All content and media are synthetic.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)("playwright");
const evidence = process.env.EVIDENCE_DIR || "tmp/browser-evidence",
  origin = process.env.TEST_ORIGIN || "http://127.0.0.1:8765";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
    : {}),
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    ...(process.env.SYNTHETIC_WAV
      ? [`--use-file-for-fake-audio-capture=${process.env.SYNTHETIC_WAV}`]
      : []),
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  permissions: ["microphone", "camera"],
});
const page = await context.newPage(),
  errors = [],
  external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (
    !r.url().startsWith(origin) &&
    !r.url().startsWith("blob:") &&
    !r.url().startsWith("data:")
  )
    external.push(r.url());
});
try {
  await page.goto(origin);
  await page.locator("#studioNav").click();
  await page.locator("#slideCount").filter({ hasText: "6" }).waitFor();
  await page.locator("#learnTab").click();
  await page.locator(".prompt-options").evaluate((el) => (el.open = true));
  await page.locator("#startPractice").waitFor();
  await page.locator("#promptLevel").selectOption("3");
  await page.locator("#practiceScope").selectOption("section");
  await page.locator("#practiceSection").selectOption("section-2");
  await page.locator("#startPractice").click();
  await page.locator("#revealHelp").click();
  await page.locator("#hideHelp").click();
  await page.locator("#revealHelp").click();
  assert.match(await page.locator("#helpCount").innerText(), /2 Help/);
  await page.waitForTimeout(1100);
  await page.locator("#pausePractice").click();
  const frozen = await page.locator("#practiceTime").innerText();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator("#practiceTime").innerText(), frozen);
  await page.locator("#pausePractice").click();
  await page.locator("#markSection").click();
  await page.locator("#finishPractice").click();
  await page.locator("#selfChecks select").selectOption("needs-work");
  await page.locator("#saveSelfCheck").click();
  assert.match(await page.locator("#nextDrill").innerText(), /Two stages/);
  await page.screenshot({
    path: `${evidence}/learn-desktop.png`,
    fullPage: true,
  });
  await page.locator("#learnView").evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({
    path: `${evidence}/learn-overview.png`,
    fullPage: true,
  });
  // Explicit persistence and changed-plan association.
  assert.equal(
    await page.evaluate(() => localStorage.getItem("speech-studio-learn-v1")),
    null,
  );
  await page.locator(".learn-data summary").click();
  await page.locator("#saveProgress").click();
  assert.ok(
    await page.evaluate(() => localStorage.getItem("speech-studio-learn-v1")),
  );
  await page.locator(".learn-plan summary").click();
  await page.locator("#planTarget").fill("300");
  await page.locator("#planForm button[type=submit]").click();
  assert.match(
    await page.locator("#practiceHistory").innerText(),
    /previous plan/,
  );
  assert.equal(await page.locator("#timerTarget").innerText(), "/ 05:00");
  // Reader edits make the old plan stale until explicitly reviewed or rebuilt.
  await page.locator("#studioNav").click();
  await page.locator("#scriptTab").click();
  await page.locator("#editButton").click();
  await page
    .locator("#textEditor")
    .fill("Synthetic rehearsal. Keep 42 units. Optional story. Thank you.");
  await page.locator("#doneEditButton").click();
  await page.locator("#learnTab").click();
  await page.locator(".prompt-options").evaluate((el) => (el.open = true));
  assert.equal(await page.locator("#startPractice").isDisabled(), true);
  await page.locator("#rebuildPlan").click();
  await page.locator("#confirmYes").click();
  assert.equal(await page.locator("#practiceSection option").count(), 1);
  assert.equal(await page.locator("#startPractice").isDisabled(), false);
  const section = page.locator(".plan-section");
  await section.locator("[data-key=facts]").fill("42 units");
  await section.locator("[data-key=optional]").fill("Optional story.");
  await section.locator("[data-key=ending]").uncheck();
  await page.locator("#addSection").click();
  const ending = page.locator(".plan-section").nth(1);
  await ending.locator("[data-key=title]").fill("Synthetic ending");
  await ending.locator("[data-key=text]").fill("Thank you.");
  await ending.locator("[data-key=ending]").check();
  await page.locator("#planForm button[type=submit]").click();
  await page.locator(".route-options").evaluate((el) => (el.open = true));
  assert.match(
    await page.locator("#routeStatus").innerText(),
    /Optional story/,
  );
  await page.locator("#shortRoute").check();
  await page.locator("#promptLevel").selectOption("0");
  await page.locator("#practiceScope").selectOption("whole");
  await page.locator("#startPractice").click();
  assert.equal(
    (await page.locator("#practicePrompt").innerText()).includes(
      "Optional story.",
    ),
    false,
  );
  assert.ok(
    (await page.locator("#practicePrompt").innerText()).includes("42 units"),
  );
  await page.locator("#finishPractice").click();
  // Existing synthetic media recording: countdown, cancel, pause/resume, download.
  await page.locator("#practiceAgain").click();
  await page.locator("#openTools").click();
  await page.locator("#mediaMode").selectOption("audio");
  await page.locator("#enableButton").click();
  await page.locator("#recordPractice").click();
  await page.locator("#cancelCountdown").click();
  assert.equal(await page.locator("#finishPractice").isDisabled(), true);
  await page.locator("#recordPractice").click();
  await page.locator("#recordingBadge").waitFor();
  await page.waitForTimeout(process.env.SYNTHETIC_WAV ? 5100 : 1300);
  await page.locator("#pausePractice").click();
  await page.waitForTimeout(1000);
  await page.locator("#pausePractice").click();
  await page.waitForTimeout(process.env.SYNTHETIC_WAV ? 5100 : 1000);
  await page.locator("#finishPractice").click();
  await page.locator("#takeResult").waitFor();
  const download = page.waitForEvent("download");
  await page.locator("#downloadButton").click();
  assert.match((await download).suggestedFilename(), /\.webm$/);
  // Download cancellation, recovery, real WASM inference on synthetic recording.
  console.log(
    "Manual, plan versioning and synthetic recording checks passed; loading local STT.",
  );
  await page.locator("#transcriptionPanel summary").click();
  await page.locator("#loadTranscriber").click();
  await page.locator("#cancelTranscription").click();
  await page.locator("#loadTranscriber").waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.getElementById("loadTranscriber").disabled,
  );
  await page.locator("#loadTranscriber").click();
  await page.waitForFunction(
    () => !document.getElementById("transcribeTake").disabled,
    {},
    { timeout: 180000 },
  );
  await page.locator("#transcribeTake").click();
  await page.waitForFunction(
    () =>
      document
        .getElementById("transcriptionStatus")
        .textContent.includes("complete"),
    {},
    { timeout: 180000 },
  );
  assert.match(
    await page.locator("#transcriptEvidence").innerText(),
    /STT evidence for recorded plan/,
  );
  await page.locator("#transcriptText").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${evidence}/learn-transcript.png`,
    fullPage: true,
  });
  console.log(
    "Learn-linked local STT passed; testing unrelated recording attribution.",
  );
  // A later recording outside Learn must never inherit a previous plan.
  await page.locator("#studioNav").click();
  await page.locator("#scriptTab").click();
  await page.locator("#newTakeButton").click();
  await page.locator("#confirmYes").click();
  await page.locator("#recordButton").waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.getElementById("recordButton").disabled,
  );
  await page.locator("#recordButton").click();
  await page.locator("#recordingBadge").waitFor();
  await page.waitForTimeout(1200);
  await page.locator("#stopButton").click();
  await page.locator("#takeResult").waitFor();
  await page.locator("#learnTab").click();
  await page.locator(".prompt-options").evaluate((el) => (el.open = true));
  await page.locator("#loadTranscriber").click();
  await page.waitForFunction(
    () => !document.getElementById("transcribeTake").disabled,
    {},
    { timeout: 180000 },
  );
  await page.locator("#transcribeTake").click();
  await page.waitForFunction(
    () =>
      document
        .getElementById("transcriptionStatus")
        .textContent.includes("complete"),
    {},
    { timeout: 180000 },
  );
  assert.match(
    await page.locator("#transcriptEvidence").innerText(),
    /No Learn plan/,
  );
  await page.locator("#clearTranscription").click();
  await page.waitForFunction(() =>
    document
      .getElementById("transcriptionStatus")
      .textContent.includes("cache cleared"),
  );
  console.log(
    "Unrelated recording attribution passed; checking responsive layout and persistence.",
  );
  // Responsive layout / enlarged text checks with synthetic demo in a fresh tab.
  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(origin);
  await mobile.locator("#beginSmall").click();
  await mobile.locator("#openTools").click();
  await mobile.locator("#slideCanvas").waitFor({ state: "visible" });
  assert.ok(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  for (const width of [320, 720]) {
    await mobile.setViewportSize({ width, height: 844 });
    assert.ok(
      await mobile.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
  }
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.screenshot({
    path: `${evidence}/learn-mobile-workspace.png`,
    fullPage: false,
  });
  await mobile
    .locator(".script-panel")
    .evaluate((el) =>
      window.scrollTo(0, el.getBoundingClientRect().top + scrollY),
    );
  await mobile.screenshot({
    path: `${evidence}/learn-mobile.png`,
    fullPage: false,
  });
  await page.locator("#newTakeButton").click();
  await page.locator("#confirmYes").click();
  await page.locator("#cameraOffButton").waitFor({ state: "visible" });
  await page.locator("#cameraOffButton").click();
  // Camera-only remains usable, with transcription explicitly unavailable.
  await page.locator("#practiceAgain").click();
  await page.locator("#mediaMode").selectOption("video");
  await page.locator("#enableButton").click();
  // Chrome's synthetic device can report busy immediately after releasing another stream.
  await page.waitForFunction(
    () => !document.getElementById("enableButton").disabled,
  );
  if (await page.locator("#mediaError").isVisible()) {
    await page.waitForTimeout(1200);
    await page.locator("#enableButton").click();
  }
  await page.waitForFunction(
    () => !document.getElementById("recordPractice").disabled,
  );
  await page.locator("#recordPractice").click();
  await page.locator("#recordingBadge").waitFor();
  await page.waitForTimeout(1200);
  await page.locator("#finishPractice").click();
  await page.locator("#takeResult").waitFor();
  assert.equal(
    await page.evaluate(() => window.SpeechStudio.getTake().hasAudio),
    false,
  );
  assert.equal(await page.locator("#transcribeTake").isDisabled(), true);
  await page.locator("#newTakeButton").click();
  await page.locator("#confirmYes").click();
  await page.locator("#cameraOffButton").waitFor({ state: "visible" });
  await page.locator("#cameraOffButton").click();
  await page.locator(".learn-data").evaluate((el) => (el.open = true));
  await page.locator("#saveProgress").click();
  await page.reload();
  await page.locator("#beginSmall").click();
  await page.locator(".prompt-options").evaluate((el) => (el.open = true));
  assert.match(
    await page.locator("#progressStatus").textContent(),
    /Loaded explicitly/,
  );
  // Assets are optional: offline manual practice after this page loads.
  await context.setOffline(true);
  await page.locator("#startPractice").click();
  await page.locator("#finishPractice").click();
  await context.setOffline(false);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Browser checks passed: manual, pause, Help, marks, versioning, shortening, recording/download, cancellation, local WASM, responsive layout; zero external app requests.",
  );
} catch (error) {
  await page.screenshot({ path: `${evidence}/failure.png`, fullPage: true });
  console.error(
    await page.evaluate(() => ({
      transcription: document.getElementById("transcriptionStatus").textContent,
      progress: document.getElementById("progressStatus").textContent,
    })),
    errors,
  );
  throw error;
} finally {
  await browser.close();
}

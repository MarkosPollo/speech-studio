// Optional browser QA: synthetic content, fake devices, no physical permissions.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(import.meta.url)("playwright");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:8767";
const evidence = process.env.EVIDENCE_DIR || "tmp/monster-evidence";
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage(),
  errors = [],
  external = [],
  accessibility = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (
    !r.url().startsWith(origin) &&
    !r.url().startsWith("blob:") &&
    !r.url().startsWith("data:")
  )
    external.push(r.url());
});
let axe;
if (process.env.AXE_SOURCE)
  axe = await readFile(process.env.AXE_SOURCE, "utf8");
async function inspect(name) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    `${name}: overflow`,
  );
  if (axe) {
    await page.evaluate(axe);
    const r = await page.evaluate(
      async () =>
        await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        }),
    );
    accessibility.push({
      screen: name,
      violations: r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
  }
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: false });
  await writeFile(
    `${evidence}/redesign-report.json`,
    JSON.stringify({ errors, external, accessibility }, null, 2),
  );
}
try {
  await page.goto(origin);
  await page.locator("#homeTitle").waitFor();
  await page.waitForTimeout(800);
  assert.equal(await page.title(), "SpeechMonster");
  assert.equal(await page.locator("#workspace").isVisible(), false);
  assert.ok(
    await page
      .locator(".hero-art img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  );
  await inspect("home-desktop");
  await page.locator("#quietMode").click();
  assert.equal(await page.locator(".hero-art").isVisible(), false);
  await page.locator("#quietMode").click();
  await page.locator("#beginSmall").click();
  assert.equal(await page.locator("#practiceScope").inputValue(), "section");
  assert.equal(await page.locator("#practiceStage").isVisible(), false);
  await inspect("setup-desktop");
  await page.locator(".prompt-options summary").click();
  await page.locator("#promptLevel").selectOption("3");
  await page.locator("#practiceSection").selectOption("section-2");
  await page.locator("#startPractice").click();
  assert.equal(await page.locator("#learnSetup").isVisible(), false);
  assert.equal(await page.locator("#homeNav").isDisabled(), true);
  assert.equal(await page.locator("#practiceStage").isVisible(), true);
  await page.locator("#revealHelp").click();
  await page.locator("#hideHelp").click();
  await page.locator("#revealHelp").click();
  assert.match(await page.locator("#helpCount").innerText(), /2 Help/);
  await inspect("practice-desktop");
  await page.locator("#pausePractice").click();
  const paused = await page.locator("#practiceTime").innerText();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator("#practiceTime").innerText(), paused);
  await page.locator("#pauseMessage").waitFor();
  await inspect("pause-desktop");
  await page.locator("#pausePractice").click();
  await page.locator("#markSection").click();
  assert.match(await page.locator("#markedProgress").innerText(), /1 of 1/);
  await page.locator("#finishPractice").click();
  await page.locator("#selfChecks select").selectOption("needs-work");
  await page.locator("#saveSelfCheck").click();
  assert.match(await page.locator("#nextDrill").innerText(), /Two stages/);
  await inspect("finish-desktop");
  await page.locator("#useNextDrill").click();
  await page.locator("#startPractice").waitFor();
  assert.equal(
    await page.locator("#practiceSection").inputValue(),
    "section-2",
  );
  if (!(await page.locator(".learn-data").evaluate((el) => el.open)))
    await page.locator(".learn-data summary").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("speech-studio-learn-v1")),
    null,
  );
  await page.locator("#saveProgress").click();
  const saved = await page.evaluate(() =>
    localStorage.getItem("speech-studio-learn-v1"),
  );
  assert.ok(saved);
  assert.equal(JSON.parse(saved).history.length, 1);
  const exportEvent = page.waitForEvent("download");
  await page.locator("#exportProgress").click();
  assert.match((await exportEvent).suggestedFilename(), /\.json$/);
  await page.reload();
  await page.locator("#beginSmall").click();
  if (!(await page.locator(".learn-data").evaluate((el) => el.open)))
    await page.locator(".learn-data summary").click();
  assert.match(await page.locator("#practiceHistory").innerText(), /Plan v1/);
  await page.locator("#homeNav").click();
  await page.locator("#ownScript").click();
  await page
    .locator("#textEditor")
    .fill("Synthetic rehearsal. Keep 42 units. Optional story. Thank you.");
  await page.locator("#doneEditButton").click();
  await page.locator("#learnTab").click();
  assert.equal(await page.locator("#startPractice").isDisabled(), true);
  await page.locator(".learn-plan summary").click();
  await page.locator("#rebuildPlan").click();
  await page.locator("#confirmYes").click();
  assert.equal(await page.locator("#startPractice").isDisabled(), false);
  await page.locator("[data-key=facts]").fill("42 units");
  await page.locator("[data-key=optional]").fill("Optional story.");
  await page.locator("[data-key=ending]").uncheck();
  await page.locator("#addSection").click();
  const ending = page.locator(".plan-section").nth(1);
  await ending.locator("[data-key=title]").fill("Synthetic ending");
  await ending.locator("[data-key=text]").fill("Thank you.");
  await ending.locator("[data-key=ending]").check();
  await page.locator("#planTarget").fill("120");
  await page.locator("#planForm button[type=submit]").click();
  await page.locator(".route-options summary").click();
  await page.locator("#shortRoute").check();
  await page.locator("#practiceScope").selectOption("whole");
  await page.locator("#startPractice").click();
  assert.ok(
    (await page.locator("#practicePrompt").innerText()).includes("42 units"),
  );
  assert.equal(
    (await page.locator("#practicePrompt").innerText()).includes(
      "Optional story.",
    ),
    false,
  );
  await page.locator("#finishPractice").click();
  await page.locator("#practiceAgain").click();
  if (!(await page.locator(".learn-data").evaluate((el) => el.open)))
    await page.locator(".learn-data summary").click();
  assert.match(
    await page.locator("#practiceHistory").innerText(),
    /previous plan/,
  );
  await page.locator("#clearProgress").click();
  await page.locator("#confirmYes").click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("speech-studio-learn-v1")),
    null,
  );
  await page.locator("#homeNav").click();
  for (const width of [320, 390, 720]) {
    await page.setViewportSize({ width, height: 844 });
    await inspect(`home-${width}`);
    await page.locator("#beginSmall").click();
    await inspect(`setup-${width}`);
    await page.locator("#startPractice").click();
    await page.locator("#pausePractice").click();
    await inspect(`pause-${width}`);
    await page.locator("#finishPractice").click();
    await inspect(`finish-${width}`);
    await page.locator("#doneForNow").click();
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator("#studioNav").click();
  await page.locator("#slideCount").filter({ hasText: "6" }).waitFor();
  await page.locator("#workspaceLayout").selectOption("slides-focus");
  await inspect("studio-desktop");
  await page.locator("#workspaceLayout").selectOption("balanced");
  await page.locator("#homeNav").click();
  await page.locator("#beginSmall").click();
  await context.setOffline(true);
  await page.locator("#startPractice").click();
  await page.locator("#finishPractice").click();
  await context.setOffline(false);
  await page.locator("#doneForNow").click();
  await page.locator("#quietMode").click();
  await page.reload();
  assert.equal(
    await page.locator("#quietMode").getAttribute("aria-pressed"),
    "true",
  );
  await page.locator("#quietMode").click();
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement !== document.body),
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  await writeFile(
    `${evidence}/redesign-report.json`,
    JSON.stringify(
      {
        errors,
        external,
        accessibility,
        checks: [
          "focused manual flow",
          "pause/recovery",
          "help/marks",
          "self-check/one drill",
          "explicit save/export/reload/clear",
          "stale-script rebuild",
          "protected shorter route",
          "320/390/720 reflow",
          "Studio slides/layout",
          "offline manual",
          "quiet/reduced-motion",
          "keyboard focus",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      errors,
      external,
      accessibility,
      checks: "redesign end-to-end passed",
    }),
  );
  assert.ok(
    accessibility.every((s) => s.violations.length === 0),
    "Accessibility violations reported; inspect report and repair.",
  );
} finally {
  await browser.close();
}

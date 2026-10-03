import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import {
  createPlan,
  validatePlan,
  shorterRoute,
  selectSections,
  nextDrill,
  transcriptEvidence,
  validateProgress,
} from "../web/learn-core.js";
const context = { window: {} };
vm.runInNewContext(
  readFileSync(new URL("../web/content.js", import.meta.url), "utf8"),
  context,
);
const C = context.window.SPEECH_CONTENT;
const fixture = () => ({
  schema: 1,
  version: 1,
  sourceScript: "Synthetic launch talk",
  targetSeconds: 120,
  sections: [
    {
      id: "a",
      title: "Opening",
      text: "Two stages. Optional example. Keep 42 units.",
      ideas: ["Two stages"],
      facts: ["42 units"],
      optional: ["Optional example.", "42 units"],
      budget: 60,
      ending: false,
    },
    {
      id: "b",
      title: "Ending",
      text: "Final example. Thank you.",
      ideas: ["Thank you"],
      facts: [],
      optional: ["Final example."],
      budget: 60,
      ending: true,
    },
  ],
});
test("demo plan uses current script; custom script never inherits demo concepts", () => {
  assert.equal(createPlan(C.script, C).sections.length, 6);
  assert.equal(createPlan("Synthetic new talk", C).sections.length, 1);
  assert.equal(
    createPlan("Synthetic new talk", C).sections[0].text,
    "Synthetic new talk",
  );
});
test("shorter route drops only approved optional text, preserving facts and entire ending", () => {
  const p = fixture(),
    route = shorterRoute(p);
  assert.equal(route.dropped.length, 1);
  assert.ok(route.sections[0].text.includes("42 units"));
  assert.equal(route.sections[1].text, p.sections[1].text);
  assert.ok(p.sections[0].text.includes("Optional example."));
});
test("validation refuses absent facts, absent optional passages, invalid budgets and no ending", () => {
  for (const mutate of [
    (p) => p.sections[0].facts.push("Unknown fact"),
    (p) => p.sections[0].optional.push("Missing example"),
    (p) => (p.sections[0].budget = 0),
    (p) => (p.sections[1].ending = false),
    (p) => (p.targetSeconds = 0),
  ]) {
    const p = fixture();
    mutate(p);
    assert.throws(() => validatePlan(p));
  }
});
test("weak spot uses self-checks; one targeted next drill uses those checks or Help", () => {
  const p = fixture();
  assert.equal(
    selectSections(p, "weak", "a", { a: "recalled", b: "needs-work" })[0].id,
    "b",
  );
  const t = {
    sections: p.sections,
    level: 1,
    helpCount: 0,
    checks: { a: "recalled", b: "needs-work" },
  };
  assert.equal(nextDrill(t).sectionId, "b");
  t.checks.b = "recalled";
  assert.equal(nextDrill(t).level, 2);
  t.helpCount = 2;
  assert.equal(nextDrill(t).level, 1);
});
test("transcript evidence tolerates punctuation and case but never claims omission or semantics", () => {
  const s = fixture().sections;
  assert.match(
    transcriptEvidence(s, "Keep 42 units!")[0].status,
    /Found wording/,
  );
  assert.match(
    transcriptEvidence(s, "Keep forty two units")[0].status,
    /Not found.*not proof of omission/,
  );
  assert.match(transcriptEvidence(s, "142 units")[0].status, /Not found/);
});
test("saved results retain immutable old plan and reject misattributed versions", () => {
  const old = fixture(),
    t = {
      id: "synthetic-take",
      seconds: 120,
      helpCount: 1,
      level: 1,
      marks: [],
      checks: { a: "recalled" },
      sections: structuredClone(old.sections),
      plan: structuredClone(old),
      planVersion: 1,
    };
  const updated = fixture();
  updated.version = 2;
  updated.sections[0].text = "Changed script. Keep 42 units.";
  updated.sections[0].optional = [];
  assert.equal(
    validateProgress({ schema: 1, plan: updated, history: [t] }).history[0].plan
      .sections[0].text,
    old.sections[0].text,
  );
  assert.throws(() =>
    validateProgress({
      schema: 1,
      plan: updated,
      history: [{ ...t, planVersion: 2 }],
    }),
  );
});

test("licensed index mapping gives literal transcript evidence with punctuation and repetition", () => {
  const s = fixture().sections;
  assert.equal(
    transcriptEvidence(s, "142units, then 42 units.")[0].excerpt,
    "42 units",
  );
  assert.equal(transcriptEvidence(s, "42, units")[0].excerpt, "42, units");
});

test("section drills without the ending still round-trip through saved progress", () => {
  const plan = fixture(),
    take = {
      id: "synthetic-section",
      seconds: 20,
      helpCount: 0,
      level: 1,
      marks: [],
      checks: { a: "unsure" },
      sections: [structuredClone(plan.sections[0])],
      plan: structuredClone(plan),
      planVersion: 1,
    };
  assert.equal(
    validateProgress({ schema: 1, plan, history: [take] }).history[0].sections
      .length,
    1,
  );
});

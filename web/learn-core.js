import { buildNorm } from "./vendor/text-match/match.js";
// Pure local practice logic. Results always refer to an immutable plan snapshot.
export const LADDER = [
  "Full script",
  "Idea cues",
  "Slide / title",
  "No prompts",
];
export const timeLabel = (sec) =>
  `${String(Math.floor(Math.max(0, sec) / 60)).padStart(2, "0")}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, "0")}`;
export function createPlan(script, content, targetSeconds = 600) {
  const matches = content.sections.every((s) => script.includes(s.title));
  const sections = matches
    ? content.sections.map((s, i) => {
        const start = script.indexOf(s.title) + s.title.length,
          end =
            i + 1 < content.sections.length
              ? script.indexOf(content.sections[i + 1].title)
              : script.length;
        const text = script
          .slice(start, end)
          .trim()
          .replace(/^\d+:\d+ to \d+:\d+\s*/, "");
        return {
          id: `section-${i + 1}`,
          title: s.title,
          text,
          ideas: content.cards[i].body.split("\n").filter(Boolean),
          facts: [],
          optional: [],
          budget: Math.round(targetSeconds / content.sections.length),
          ending: i === content.sections.length - 1,
        };
      })
    : [
        {
          id: "section-1",
          title: "My speech",
          text: script,
          ideas: [],
          facts: [],
          optional: [],
          budget: targetSeconds,
          ending: true,
        },
      ];
  return {
    schema: 1,
    version: 1,
    sourceScript: script,
    targetSeconds,
    sections,
  };
}
export function validatePlan(plan, { requireEnding = true } = {}) {
  if (
    !plan ||
    plan.schema !== 1 ||
    !Number.isInteger(plan.version) ||
    plan.version < 1 ||
    typeof plan.sourceScript !== "string" ||
    plan.sourceScript.length > 100000 ||
    !Number.isFinite(plan.targetSeconds) ||
    plan.targetSeconds < 10 ||
    plan.targetSeconds > 7200 ||
    !Array.isArray(plan.sections) ||
    !plan.sections.length ||
    plan.sections.length > 40
  )
    throw Error(
      "Invalid practice plan. Use 1–40 sections and a target from 10 seconds to 2 hours.",
    );
  const ids = new Set();
  for (const s of plan.sections) {
    if (
      typeof s.id !== "string" ||
      ids.has(s.id) ||
      typeof s.title !== "string" ||
      !s.title.trim() ||
      typeof s.text !== "string" ||
      s.text.length > 100000 ||
      !Number.isFinite(s.budget) ||
      s.budget < 1 ||
      s.budget > 7200 ||
      typeof s.ending !== "boolean"
    )
      throw Error(
        "Each section needs a unique ID, title, text, and positive time budget.",
      );
    ids.add(s.id);
    for (const k of ["ideas", "facts", "optional"])
      if (
        !Array.isArray(s[k]) ||
        s[k].length > 100 ||
        s[k].some((t) => typeof t !== "string" || !t.trim() || t.length > 10000)
      )
        throw Error(
          "Ideas, facts and optional passages must be nonempty text lines.",
        );
    for (const fact of s.facts)
      if (!s.text.includes(fact))
        throw Error(
          `Protected exact fact must appear verbatim in “${s.title}”.`,
        );
    for (const optional of s.optional)
      if (!s.text.includes(optional))
        throw Error(`Optional passage must appear verbatim in “${s.title}”.`);
  }
  if (requireEnding && !plan.sections.some((s) => s.ending))
    throw Error("Keep at least one section marked as the ending.");
  return plan;
}
export function shorterRoute(plan) {
  validatePlan(plan);
  const sections = structuredClone(plan.sections);
  const dropped = [];
  for (const s of sections) {
    if (s.ending) continue;
    for (const passage of s.optional) {
      if (s.facts.some((f) => passage.includes(f) || f.includes(passage)))
        continue;
      const text = s.text.split(passage).join("");
      if (!s.facts.every((f) => text.includes(f))) continue;
      s.text = text;
      dropped.push({ section: s.id, passage });
    }
  }
  return { sections, dropped };
}
export function selectSections(plan, scope, sectionId, checks = {}) {
  if (scope === "whole") return plan.sections;
  if (scope === "weak")
    return [
      plan.sections.find((s) => checks[s.id] === "needs-work") ||
        plan.sections.find((s) => checks[s.id] !== "recalled") ||
        plan.sections[0],
    ];
  return [plan.sections.find((s) => s.id === sectionId) || plan.sections[0]];
}
export function nextDrill(take) {
  const weak =
    take.sections.find((s) => take.checks[s.id] === "needs-work") ||
    take.sections.find((s) => take.checks[s.id] !== "recalled");
  if (weak)
    return {
      sectionId: weak.id,
      level: 1,
      text: `Practice “${weak.title}” with idea cues for ${timeLabel(weak.budget)}. Check its protected facts and closing line yourself.`,
    };
  if (take.helpCount)
    return {
      sectionId: take.sections[0].id,
      level: Math.max(1, take.level),
      text: `Repeat “${take.sections[0].title}” with the same prompts; try recalling before using Help.`,
    };
  return {
    sectionId: take.sections[0].id,
    level: Math.min(3, take.level + 1),
    text: `Try “${take.sections[0].title}” with ${LADDER[Math.min(3, take.level + 1)].toLowerCase()}. Review the result yourself.`,
  };
}
const normalize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function transcriptEvidence(sections, text) {
  const normalized = ` ${normalize(text)} `,
    mapping = buildNorm(text);
  return sections.flatMap((s) =>
    s.facts.map((fact) => {
      const found = normalized.includes(` ${normalize(fact)} `),
        needle = buildNorm(fact).norm;
      let excerpt = "";
      if (found && needle) {
        let at = mapping.norm.indexOf(needle);
        while (at >= 0) {
          const start = mapping.normToOrig[at],
            end =
              mapping.normToOrig[at + needle.length - 1] +
              String.fromCodePoint(
                text.codePointAt(mapping.normToOrig[at + needle.length - 1]),
              ).length;
          const slice = text.slice(start, end),
            before = start ? text[start - 1] : " ",
            after = text[end] || " ";
          if (
            normalize(slice) === normalize(fact) &&
            !/[\p{L}\p{N}]/u.test(before) &&
            !/[\p{L}\p{N}]/u.test(after)
          ) {
            excerpt = slice;
            break;
          }
          at = mapping.norm.indexOf(needle, at + 1);
        }
      }
      return {
        sectionId: s.id,
        fact,
        excerpt,
        status: found
          ? "Found wording in transcript"
          : "Not found in transcript — check the recording; this is not proof of omission",
      };
    }),
  );
}
export function validateProgress(data) {
  if (
    data?.schema !== 1 ||
    !Array.isArray(data.history) ||
    data.history.length > 100
  )
    throw Error("Invalid progress file.");
  validatePlan(data.plan);
  for (const t of data.history) {
    if (
      typeof t.id !== "string" ||
      !Number.isFinite(t.seconds) ||
      t.seconds < 0 ||
      !Number.isInteger(t.helpCount) ||
      t.helpCount < 0 ||
      !Number.isInteger(t.level) ||
      t.level < 0 ||
      t.level > 3 ||
      !Array.isArray(t.marks) ||
      t.marks.length > 1000 ||
      !t.checks ||
      !Array.isArray(t.sections)
    )
      throw Error("Invalid take history.");
    validatePlan(t.plan);
    validatePlan(
      {
        ...t.plan,
        sections: t.sections.map((s) => ({ ...s, optional: [] })),
      },
      { requireEnding: false },
    );
    if (
      t.marks.some(
        (m) =>
          !t.sections.some((s) => s.id === m.sectionId) ||
          !Number.isFinite(m.seconds) ||
          m.seconds < 0 ||
          m.seconds > t.seconds + 1,
      )
    )
      throw Error("Invalid section marks.");
    if (
      t.planVersion !== t.plan.version ||
      t.sections.some((s) => !t.plan.sections.some((p) => p.id === s.id)) ||
      Object.values(t.checks).some(
        (c) => !["recalled", "needs-work", "unsure"].includes(c),
      )
    )
      throw Error("Invalid take version or self-check.");
  }
  return data;
}

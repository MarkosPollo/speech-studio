import {
  createPlan,
  validatePlan,
  shorterRoute,
  selectSections,
  nextDrill,
  validateProgress,
  LADDER,
  timeLabel,
  transcriptEvidence,
} from "./learn-core.js";
import { LocalTranscriber } from "./transcription.js";
const $ = (id) => document.getElementById(id),
  api = window.SpeechStudio;
const storageKey = "speech-studio-learn-v1";
let plan = createPlan(api.getScript(), window.SPEECH_CONTENT, api.getTarget()),
  history = [],
  active = null,
  review = null,
  drill = null,
  timer = 0,
  helpShown = false,
  draft = [];
try {
  const raw = localStorage.getItem(storageKey);
  if (raw) {
    const saved = validateProgress(JSON.parse(raw));
    plan = saved.plan;
    history = saved.history;
    api.setTarget(plan.targetSeconds);
    $("progressStatus").textContent = "Loaded explicitly saved progress";
  }
} catch {
  $("progressStatus").textContent =
    "Saved progress could not be read; export a backup before replacing it.";
}
const note = (id, text) => ($(id).textContent = text);
const samePlan = (t) => JSON.stringify(t.plan) === JSON.stringify(plan);
const latestChecks = () => history.find(samePlan)?.checks || {};
function chosenSections() {
  const base = $("shortRoute").checked
    ? { ...plan, sections: shorterRoute(plan).sections }
    : plan;
  return selectSections(
    base,
    $("practiceScope").value,
    $("practiceSection").value,
    latestChecks(),
  );
}
function budget() {
  return $("practiceScope").value === "whole"
    ? plan.targetSeconds
    : chosenSections()[0].budget;
}
function status() {
  const stale = plan.sourceScript !== api.getScript();
  note(
    "planStatus",
    `Plan v${plan.version} · ${plan.sections.length} sections${stale ? " · Reader script changed: rebuild or explicitly review this plan before practicing." : ""}`,
  );
  $("startPractice").disabled =
    !!active ||
    stale ||
    ["recording", "paused", "countdown", "stopping"].includes(api.getCapture());
  $("recordPractice").disabled =
    !!active || stale || api.getCapture() !== "ready";
  for (const id of [
    "practiceScope",
    "practiceSection",
    "promptLevel",
    "shortRoute",
    "rebuildPlan",
    "addSection",
  ])
    $(id).disabled = !!active;
  for (const input of $("planForm").elements) input.disabled = !!active;
  if (!active) {
    note(
      "practiceBudget",
      `${timeLabel(budget())} target · section budgets total ${timeLabel(plan.sections.reduce((n, s) => n + s.budget, 0))}. Timer never cuts you off.`,
    );
    note("practiceTarget", `/ ${timeLabel(budget())}`);
    renderPrompt();
  }
  const route = shorterRoute(plan);
  note(
    "routeStatus",
    route.dropped.length
      ? `Shorter route would omit only these optional passages; protected facts and ending stay:\n${route.dropped.map((d) => `${plan.sections.find((s) => s.id === d.section).title}: ${d.passage}`).join("\n")}`
      : "No removable optional passages. Add verbatim optional examples in the plan; ending and protected facts are always kept.",
  );
  $("shortRoute").disabled = !!active || !route.dropped.length;
  renderHistory();
  journey();
}
function journey() {
  const phase = active
    ? active.paused
      ? "paused"
      : "active"
    : review
      ? "review"
      : "setup";
  document.body.dataset.phase = phase;
  document.body.dataset.capture = api.getCapture();
  $("learnSetup").hidden = phase !== "setup";
  $("practiceStage").hidden = !active;
  $("pauseMessage").hidden = !active?.paused;
  note(
    "practiceState",
    active?.paused ? "Taking a pause" : "Your space to practice",
  );
  for (const [id, step] of [
    ["stepChoose", "setup"],
    ["stepPractice", "active"],
    ["stepReflect", "review"],
  ]) {
    if (phase === step || (step === "active" && phase === "paused"))
      $(id).setAttribute("aria-current", "step");
    else $(id).removeAttribute("aria-current");
  }
  const chosen = chosenSections();
  note(
    "chosenSectionTitle",
    $("practiceScope").value === "whole"
      ? "Your whole talk, at your pace."
      : chosen[0].title,
  );
  note(
    "chosenSupport",
    `${LADDER[Number($("promptLevel").value)]} · ${chosen.reduce((n, s) => n + s.facts.length, 0)} protected exact facts${chosen.some((s) => s.ending) ? " · ending kept" : ""}`,
  );
  $("sectionChoice").hidden = $("practiceScope").value !== "section";
  note(
    "markedProgress",
    active
      ? `${new Set(active.marks.map((m) => m.sectionId)).size} of ${active.sections.length} sections manually marked. Marks describe your actions, not mastery.`
      : "",
  );
  const locked =
    !!active ||
    ["recording", "paused", "countdown", "stopping"].includes(api.getCapture());
  for (const id of ["scriptTab", "cueTab", "learnTab"]) $(id).disabled = locked;
  document.dispatchEvent(
    new CustomEvent("studio:learn", {
      detail: {
        phase,
        locked,
        recorded: active?.recorded,
        sectionCount: plan.sections.length,
        target: timeLabel(plan.targetSeconds),
        version: plan.version,
        sample: api.getScript() === window.SPEECH_CONTENT.script,
      },
    }),
  );
}
function renderOptions() {
  const old = $("practiceSection").value;
  $("practiceSection").replaceChildren();
  for (const s of plan.sections) {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.title;
    $("practiceSection").append(option);
  }
  if (plan.sections.some((s) => s.id === old)) $("practiceSection").value = old;
}
function renderPrompt() {
  const sections = active ? active.sections : chosenSections(),
    level = active ? active.level : Number($("promptLevel").value),
    index = active ? Math.min(active.sectionIndex, sections.length - 1) : 0,
    s = sections[index];
  let text =
    level === 0
      ? s.text
      : level === 1
        ? s.ideas.join("\n") || "No idea cues added yet."
        : level === 2
          ? s.title
          : "Recall this section without prompts. Use your slides if you choose.";
  if (helpShown) text = s.text;
  note(
    "practicePrompt",
    `${level < 3 || helpShown ? s.title + "\n\n" : ""}${text}`,
  );
  note(
    "helpCount",
    `${active?.helpCount ?? review?.helpCount ?? 0} Help reveals`,
  );
  $("hideHelp").hidden = !helpShown;
}
function elapsed() {
  return active
    ? active.elapsed +
        (active.paused ? 0 : (performance.now() - active.started) / 1000)
    : 0;
}
function clock() {
  if (!active) return;
  const seconds = active.recorded
    ? (api.getTake()?.duration ?? elapsed())
    : elapsed();
  note("practiceTime", timeLabel(seconds));
  note(
    "practiceTarget",
    seconds > active.target
      ? `${timeLabel(seconds - active.target)} over target`
      : `/ ${timeLabel(active.target)}`,
  );
}
function begin(recorded = false) {
  if (active || plan.sourceScript !== api.getScript()) return;
  active = {
    id: crypto.randomUUID(),
    plan: structuredClone(plan),
    planVersion: plan.version,
    sections: structuredClone(chosenSections()),
    level: Number($("promptLevel").value),
    scope: $("practiceScope").value,
    shorter: $("shortRoute").checked,
    target: budget(),
    helpCount: 0,
    sectionIndex: 0,
    marks: [],
    checks: {},
    elapsed: 0,
    started: performance.now(),
    paused: false,
    recorded,
  };
  helpShown = false;
  review = null;
  $("selfReview").hidden = true;
  note("practiceMarks", "");
  note("practiceTime", "00:00");
  $("pausePractice").disabled = false;
  $("finishPractice").disabled = false;
  $("revealHelp").disabled = false;
  $("markSection").disabled = false;
  note("pausePractice", "Pause practice");
  status();
  renderPrompt();
  timer = setInterval(clock, 200);
  note("progressStatus", "Practice in this tab. Save or export to keep it.");
}
function finish() {
  if (!active) return;
  clearInterval(timer);
  active.seconds = elapsed();
  if (active.recorded && api.getTake()) active.seconds = api.getTake().duration;
  review = active;
  active = null;
  delete review.started;
  delete review.elapsed;
  delete review.paused;
  delete review.sectionIndex;
  helpShown = false;
  history.unshift(review);
  history = history.slice(0, 100);
  $("pausePractice").disabled = true;
  $("finishPractice").disabled = true;
  $("revealHelp").disabled = true;
  $("markSection").disabled = true;
  note(
    "reviewSummary",
    `${timeLabel(review.seconds)} / ${timeLabel(review.target)} · ${LADDER[review.level]} · ${review.helpCount} Help reveals · plan v${review.planVersion}${review.recorded ? " · recorded take" : " · manual timer"}`,
  );
  $("selfChecks").replaceChildren();
  for (const s of review.sections) {
    const row = document.createElement("div");
    row.className = "self-check";
    const label = document.createElement("label");
    label.textContent = s.title;
    const select = document.createElement("select");
    select.dataset.section = s.id;
    select.setAttribute("aria-label", `Self-check: ${s.title}`);
    for (const [value, text] of [
      ["unsure", "Not checked / unsure"],
      ["recalled", "I recalled the key ideas and facts"],
      ["needs-work", "I want to practice this section"],
    ]) {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = text;
      select.append(o);
    }
    label.append(select);
    row.append(label);
    const facts = document.createElement("p");
    facts.textContent = `${s.facts.length ? "Protected exact facts: " + s.facts.join(" · ") : "No protected exact facts specified."}${s.ending ? " Ending: verify your closing line." : ""}`;
    row.append(facts);
    $("selfChecks").append(row);
    review.checks[s.id] = "unsure";
  }
  note("nextDrill", "");
  $("useNextDrill").hidden = true;
  $("selfReview").hidden = false;
  status();
  note("practiceTime", timeLabel(review.seconds));
}
$("startPractice").onclick = () => begin();
$("recordPractice").onclick = () => {
  if ($("recordPractice").disabled) return;
  api.recordPractice(budget());
};
$("pausePractice").onclick = () => {
  if (!active) return;
  if (active.recorded) {
    api.pauseRecording();
    return;
  }
  if (active.paused) {
    active.started = performance.now();
    active.paused = false;
  } else {
    active.elapsed = elapsed();
    active.paused = true;
  }
  note("pausePractice", active.paused ? "Resume practice" : "Pause practice");
  clock();
  journey();
};
$("finishPractice").onclick = () => {
  if (active?.recorded) api.stopRecording();
  else finish();
};
$("revealHelp").onclick = () => {
  if (!active) return;
  active.helpCount++;
  helpShown = true;
  renderPrompt();
  journey();
};
$("hideHelp").onclick = () => {
  helpShown = false;
  renderPrompt();
};
$("markSection").onclick = () => {
  if (!active) return;
  const s =
    active.sections[Math.min(active.sectionIndex, active.sections.length - 1)];
  active.marks.push({ sectionId: s.id, seconds: elapsed() });
  note(
    "practiceMarks",
    active.marks
      .map(
        (m) =>
          `${active.sections.find((s) => s.id === m.sectionId).title} at ${timeLabel(m.seconds)}`,
      )
      .join(" · "),
  );
  active.sectionIndex = Math.min(
    active.sectionIndex + 1,
    active.sections.length - 1,
  );
  helpShown = false;
  renderPrompt();
  journey();
};
$("saveSelfCheck").onclick = () => {
  if (!review) return;
  for (const select of $("selfChecks").querySelectorAll("select"))
    review.checks[select.dataset.section] = select.value;
  drill = nextDrill(review);
  note("nextDrill", drill.text);
  $("useNextDrill").hidden = false;
  note(
    "progressStatus",
    "Self-check stored in this tab. Save or export to keep it.",
  );
  renderHistory();
  journey();
};
$("useNextDrill").onclick = () => {
  if (!drill || !review) return;
  if (!samePlan(review)) {
    note(
      "nextDrill",
      "This drill belongs to an older plan. Choose a current section explicitly.",
    );
    return;
  }
  $("practiceScope").value = "section";
  $("practiceSection").value = drill.sectionId;
  $("promptLevel").value = drill.level;
  review = null;
  $("selfReview").hidden = true;
  status();
  $("startPractice").focus();
};
$("practiceAgain").onclick = () => {
  review = null;
  $("selfReview").hidden = true;
  status();
  $("startPractice").focus();
};
document.addEventListener("monster:prepare", (e) => {
  if (active) return;
  review = null;
  $("selfReview").hidden = true;
  $("practiceScope").value = e.detail.scope;
  $("promptLevel").value = "0";
  helpShown = false;
  status();
});
for (const id of [
  "practiceScope",
  "practiceSection",
  "promptLevel",
  "shortRoute",
])
  $(id).onchange = () => {
    helpShown = false;
    status();
  };
function field(label, value, key, index, type = "textarea") {
  const l = document.createElement("label");
  l.textContent = label;
  const input = document.createElement(
    type === "textarea" ? "textarea" : "input",
  );
  input.dataset.key = key;
  input.dataset.index = index;
  if (type !== "textarea") input.type = type;
  if (type === "number") {
    input.min = 1;
    input.max = 7200;
    input.required = true;
  }
  if (type === "checkbox") {
    input.checked = value;
    l.className = "ending-label";
  } else input.value = value;
  if (key === "title") input.required = true;
  l.append(input);
  return l;
}
function renderEditor() {
  draft = structuredClone(plan.sections);
  drawEditor();
  $("planTarget").value = plan.targetSeconds;
}
function readDraft() {
  for (const input of $("planSections").querySelectorAll("input,textarea")) {
    const key = input.dataset.key,
      index = Number(input.dataset.index);
    draft[index][key] =
      input.type === "checkbox"
        ? input.checked
        : key === "budget"
          ? Number(input.value)
          : ["ideas", "facts", "optional"].includes(key)
            ? input.value
                .split("\n")
                .map((t) => t.trim())
                .filter(Boolean)
            : input.value;
  }
  return draft;
}
function drawEditor() {
  $("planSections").replaceChildren();
  draft.forEach((s, i) => {
    const box = document.createElement("div");
    box.className = "plan-section";
    for (const [label, key, type] of [
      ["Title", "title", "text"],
      ["Speech section", "text", "textarea"],
      ["Key ideas (one per line)", "ideas", "textarea"],
      ["Protected exact facts (verbatim, one per line)", "facts", "textarea"],
      ["Optional passages (verbatim, one per line)", "optional", "textarea"],
      ["Time budget (seconds)", "budget", "number"],
      ["Keep this ending in every route", "ending", "checkbox"],
    ])
      box.append(
        field(
          label,
          Array.isArray(s[key]) ? s[key].join("\n") : s[key],
          key,
          i,
          type,
        ),
      );
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button subtle";
    remove.textContent = "Remove section";
    remove.disabled = draft.length === 1;
    remove.onclick = () => {
      readDraft();
      draft.splice(i, 1);
      drawEditor();
    };
    box.append(remove);
    $("planSections").append(box);
  });
}
function apply(newPlan) {
  validatePlan(newPlan);
  plan = newPlan;
  review = null;
  drill = null;
  $("selfReview").hidden = true;
  $("shortRoute").checked = false;
  api.setTarget(plan.targetSeconds);
  renderOptions();
  renderEditor();
  status();
  note(
    "progressStatus",
    "Plan changed in this tab. Save or export to keep it.",
  );
}
$("addSection").onclick = () => {
  readDraft();
  if (draft.length >= 40) {
    note("planError", "Limit: 40 sections.");
    return;
  }
  draft.push({
    id: crypto.randomUUID(),
    title: "New section",
    text: "",
    ideas: [],
    facts: [],
    optional: [],
    budget: 60,
    ending: false,
  });
  drawEditor();
};
$("planForm").onsubmit = (e) => {
  e.preventDefault();
  try {
    apply({
      ...plan,
      version: plan.version + 1,
      sections: structuredClone(readDraft()),
      targetSeconds: Number($("planTarget").value),
      sourceScript: api.getScript(),
    });
    note("planError", "");
  } catch (error) {
    note("planError", error.message);
  }
};
$("rebuildPlan").onclick = async () => {
  if (
    await api.confirmAction(
      "Rebuild the practice plan?",
      "This replaces plan sections, ideas and protected facts using the current reader script. Existing results retain their original plan.",
      "Rebuild plan",
    )
  )
    apply({
      ...createPlan(api.getScript(), window.SPEECH_CONTENT, api.getTarget()),
      version: plan.version + 1,
    });
};
function renderHistory() {
  const root = $("practiceHistory");
  root.replaceChildren();
  for (const t of history) {
    const li = document.createElement("li");
    li.textContent = `Plan v${t.planVersion}${samePlan(t) ? " · current" : " · previous plan"} — ${timeLabel(t.seconds)}, ${t.helpCount} Help reveals, ${LADDER[t.level]}, ${Object.values(t.checks).filter((c) => c === "needs-work").length} sections marked for practice`;
    root.append(li);
  }
}
function progress() {
  return { schema: 1, plan, history };
}
$("saveProgress").onclick = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress()));
    note(
      "progressStatus",
      "Progress saved locally. Later changes need another Save.",
    );
  } catch {
    note(
      "progressStatus",
      "Browser storage unavailable. Export progress to keep it.",
    );
  }
};
$("exportProgress").onclick = () =>
  api.downloadBlob(
    new Blob([JSON.stringify(progress(), null, 2)], {
      type: "application/json",
    }),
    "speech-studio-progress.json",
  );
$("importProgress").onclick = () => $("progressFile").click();
$("progressFile").onchange = async () => {
  const file = $("progressFile").files[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024)
      throw Error("Progress file is larger than 2 MB.");
    const data = validateProgress(JSON.parse(await file.text()));
    if (active) throw Error("Finish the active practice first.");
    if (
      await api.confirmAction(
        "Replace Learn progress?",
        "The imported file replaces plan and history in this tab. Export your current progress first if you need it.",
        "Import progress",
      )
    ) {
      history = data.history;
      review = null;
      drill = null;
      $("selfReview").hidden = true;
      apply(data.plan);
      note(
        "progressStatus",
        "Imported into this tab. Save explicitly to keep it in this browser.",
      );
    }
  } catch (error) {
    note("progressStatus", error.message);
  }
  $("progressFile").value = "";
};
$("clearProgress").onclick = async () => {
  if (active) {
    note("progressStatus", "Finish practice before clearing progress.");
    return;
  }
  if (
    await api.confirmAction(
      "Clear Learn progress?",
      "Remove saved plan and practice history from this browser and tab. Reader script, slides and the recording stay available.",
      "Clear progress",
    )
  ) {
    localStorage.removeItem(storageKey);
    history = [];
    review = null;
    drill = null;
    $("selfReview").hidden = true;
    apply(createPlan(api.getScript(), window.SPEECH_CONTENT, api.getTarget()));
    note("practiceTime", "00:00");
    note("progressStatus", "Learn progress cleared.");
  }
};
document.addEventListener("studio:script", status);
document.addEventListener("monster:refresh", status);
document.addEventListener("studio:target", () => {
  if (!active)
    apply({
      ...plan,
      targetSeconds: api.getTarget(),
      version: plan.version + 1,
    });
});
document.addEventListener("studio:capture", (e) => {
  const s = e.detail;
  if (s.state === "recording" && !active && api.getMode() === "learn")
    begin(true);
  else if (active?.recorded) {
    if (s.state === "paused" && !active.paused) {
      active.elapsed = elapsed();
      active.paused = true;
    } else if (s.state === "recording" && active.paused) {
      active.started = performance.now();
      active.paused = false;
    } else if (["playback", "idle"].includes(s.state)) finish();
    note(
      "pausePractice",
      active?.paused ? "Resume practice" : "Pause practice",
    );
  }
  status();
});
window.addEventListener("pagehide", () => {
  clearInterval(timer);
  transcriber.cancel();
});
const transcriber = new LocalTranscriber((message) => {
  if (message.type === "progress") {
    $("modelProgress").hidden = false;
    $("modelProgress").value = message.percent;
  }
  if (message.type === "status") note("transcriptionStatus", message.text);
});
let sttBusy = false,
  transcriptTake = null,
  recordingSnapshot = null;
function sttControls() {
  const take = api.getTake();
  $("loadTranscriber").disabled = sttBusy || transcriber.ready;
  $("transcribeTake").disabled =
    sttBusy || !transcriber.ready || !take?.hasAudio;
  $("cancelTranscription").disabled = !sttBusy;
}
async function task(fn) {
  sttBusy = true;
  sttControls();
  try {
    await fn();
  } catch (error) {
    note(
      "transcriptionStatus",
      error.name === "AbortError"
        ? "Cancelled. Manual practice is available."
        : `${error.message} Manual practice is available.`,
    );
  } finally {
    sttBusy = false;
    $("modelProgress").hidden = true;
    sttControls();
  }
}
$("loadTranscriber").onclick = () =>
  task(async () => {
    await transcriber.load();
    note("transcriptionStatus", "Local model ready. Nothing is uploaded.");
  });
$("cancelTranscription").onclick = () => transcriber.cancel();
$("transcribeTake").onclick = () =>
  task(async () => {
    const take = api.getTake();
    if (!take?.hasAudio) throw Error("This take has no microphone audio.");
    const snapshot = transcriptTake ? structuredClone(transcriptTake) : null;
    const result = await transcriber.transcribe(take.blob, take.duration);
    note(
      "transcriptText",
      result.words
        .map((w) => `[${timeLabel(w.timestamp[0])}] ${w.text.trim()}`)
        .join(" ") || result.text,
    );
    const root = $("transcriptEvidence");
    root.replaceChildren();
    const p = document.createElement("p");
    p.textContent = snapshot
      ? `STT evidence for recorded plan v${snapshot.planVersion}. Self-check remains separate. Word timestamps use recorded time, excluding pauses.`
      : "Transcript of the latest take. No Learn plan was attached to this recording; no plan comparison is inferred.";
    root.append(p);
    if (snapshot)
      for (const e of transcriptEvidence(snapshot.sections, result.text)) {
        const row = document.createElement("p");
        row.textContent = `${e.fact}: ${e.status}${e.excerpt ? ` (“${e.excerpt}”)` : ""}`;
        root.append(row);
      }
    note(
      "transcriptionStatus",
      "Local transcription complete. Check words and timestamps against playback. Transcript remains in this tab only.",
    );
  });
$("clearTranscription").onclick = () =>
  task(async () => {
    await transcriber.clear();
    note("transcriptText", "");
    $("transcriptEvidence").replaceChildren();
    note(
      "transcriptionStatus",
      "Transcript and optional model cache cleared. Browser HTTP cache may still contain downloaded public assets.",
    );
  });
document.addEventListener("studio:take-cleared", () => {
  transcriber.cancel();
  transcriptTake = null;
  recordingSnapshot = null;
  note("transcriptText", "");
  $("transcriptEvidence").replaceChildren();
  sttControls();
});
document.addEventListener("studio:capture", (e) => {
  if (e.detail.state === "recording" && active?.recorded && !recordingSnapshot)
    recordingSnapshot = {
      planVersion: active.planVersion,
      sections: structuredClone(active.sections),
    };
  if (e.detail.state === "playback") transcriptTake = recordingSnapshot;
  sttControls();
});
renderOptions();
renderEditor();
status();
sttControls();

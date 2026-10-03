// Local navigation and disclosure. No analytics, network calls, or AI backend.
const $ = (id) => document.getElementById(id);
const body = document.body;
let locked = false;
const focusTitle = () => $("workspaceTitle").focus({ preventScroll: true });
function workspace(view, focus = false) {
  body.dataset.view = view;
  $("homeView").hidden = true;
  $("workspace").hidden = false;
  $("workspaceTitle").textContent =
    view === "learn" ? "One idea at a time." : "Your whole little studio.";
  $("workspaceEyebrow").textContent =
    view === "learn"
      ? "YOUR LITTLE PRACTICE SPACE"
      : "RECORD · READ · REHEARSE";
  $("openTools").hidden = view !== "learn";
  $("practiceNav").setAttribute(
    "aria-current",
    view === "learn" ? "page" : "false",
  );
  $("studioNav").setAttribute(
    "aria-current",
    view === "studio" ? "page" : "false",
  );
  document.querySelector(".skip-link").href = "#workspaceTitle";
  if (focus) {
    window.scrollTo(0, 0);
    focusTitle();
  }
}
function prepare(scope = "section") {
  if (locked) return;
  document.dispatchEvent(
    new CustomEvent("monster:prepare", { detail: { scope } }),
  );
  $("learnTab").click();
  workspace("learn", true);
}
function home() {
  if (locked) return;
  body.dataset.view = "home";
  $("homeView").hidden = false;
  $("workspace").hidden = true;
  $("practiceNav").setAttribute("aria-current", "false");
  $("studioNav").setAttribute("aria-current", "false");
  document.querySelector(".skip-link").href = "#homeTitle";
  window.scrollTo(0, 0);
  $("homeTitle").focus({ preventScroll: true });
}
$("beginSmall").onclick = () => prepare();
$("chooseSection").onclick = () => prepare();
$("chooseWhole").onclick = () => prepare("whole");
$("practiceNav").onclick = () => {
  if (!locked) {
    $("learnTab").click();
    workspace("learn", true);
  }
};
$("studioNav").onclick = () => {
  if (!locked) {
    $("scriptTab").click();
    workspace("studio", true);
  }
};
$("homeNav").onclick = home;
$("doneForNow").onclick = home;
function editScript() {
  if (locked) return;
  $("scriptTab").click();
  workspace("studio");
  $("editButton").click();
  $("textEditor").focus();
  window.scrollTo(0, 0);
}
$("ownScript").onclick = editScript;
$("editReaderScript").onclick = editScript;
$("homeProgress").onclick = () => {
  prepare();
  const panel = document.querySelector(".learn-data");
  panel.open = true;
  panel.scrollIntoView({ block: "start" });
  panel.querySelector("summary").focus({ preventScroll: true });
};
$("openTools").onclick = () => {
  const open = body.dataset.tools !== "open";
  body.dataset.tools = open ? "open" : "closed";
  $("openTools").setAttribute("aria-expanded", String(open));
  $("openTools").innerHTML =
    `Recording &amp; slides <span aria-hidden="true">${open ? "−" : "+"}</span>`;
};
try {
  body.classList.toggle(
    "quiet",
    localStorage.getItem("speech-monster-quiet-v1") === "true",
  );
} catch {}
$("quietMode").setAttribute(
  "aria-pressed",
  String(body.classList.contains("quiet")),
);
$("quietMode").onclick = () => {
  body.classList.toggle("quiet");
  const quiet = body.classList.contains("quiet");
  $("quietMode").setAttribute("aria-pressed", String(quiet));
  try {
    localStorage.setItem("speech-monster-quiet-v1", String(quiet));
  } catch {}
};
document.addEventListener("studio:mode", (e) =>
  workspace(e.detail === "learn" ? "learn" : "studio"),
);
document.addEventListener("studio:learn", (e) => {
  const state = e.detail;
  locked = state.locked;
  for (const id of [
    "homeNav",
    "practiceNav",
    "studioNav",
    "doneForNow",
    "editReaderScript",
  ])
    $(id).disabled = locked;
  $("homeSampleLabel").textContent = state.sample
    ? "SpaceX sample · educational demo"
    : "Your script · saved on this device";
  $("homeTalkTitle").textContent = state.sample
    ? "A big idea, in six little pieces."
    : "Your words. Your next small step.";
  $("homeTalkMeta").textContent =
    `${state.sectionCount} ${state.sectionCount === 1 ? "section" : "sections"} · ${state.target} target · plan v${state.version}`;
  $("learnSampleLabel").textContent = state.sample
    ? "SpaceX sample · educational demo"
    : "Your editable practice plan";
  if (state.recorded && state.locked) {
    body.dataset.tools = "open";
    $("openTools").setAttribute("aria-expanded", "true");
  }
});
document.dispatchEvent(new CustomEvent("monster:refresh"));

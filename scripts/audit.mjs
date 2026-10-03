import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(path.join(root, "scripts/vendor-hashes.json"), "utf8"),
);
const artManifest = JSON.parse(
  readFileSync(path.join(root, "scripts/art-hashes.json"), "utf8"),
);
// This public utility contains generic patterns only. Source-specific privacy
// comparisons belong in a separate private release review, never in this repo.
const patterns = [
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\bAKIA[A-Z0-9]{16}\b/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{25,}\b/,
  /[?&](?:sig|access_token|api_key)=[A-Za-z0-9%+_/-]{20,}/,
];
const privatePatterns = [
  /appgprj_[a-f0-9]{32}/i,
  /https?:\/\/[^\s"'<>]+\.chatgpt\.site\b/i,
  /\/(?:Users|workspace\/scratch)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+/,
];
const errors = [];
function scan(bytes, label, upstream = false) {
  const text = bytes.toString("utf8");
  for (const p of privatePatterns)
    if (p.test(text)) errors.push(`${label}: private metadata pattern`);
  for (const p of patterns)
    if (p.test(text)) errors.push(`${label}: credential pattern`);
}
function walk(dir, optional = false) {
  return readdirSync(dir)
    .filter(
      (n) => !(dir === root && [".git", "node_modules", "tmp"].includes(n)),
    )
    .flatMap((n) => {
      const full = path.join(dir, n),
        s = lstatSync(full);
      if (s.isSymbolicLink()) throw new Error("Symlinks are not allowed");
      if (!optional && full === path.join(root, "web/local-stt")) return [];
      return s.isDirectory() ? walk(full, optional) : [full];
    });
}
const files = walk(root);
// Optional installation is verified against its public pinned manifest, never
// scanned with source-specific identifiers or committed to history.
const stt = JSON.parse(
  readFileSync(path.join(root, "web/stt-assets.json"), "utf8"),
);
const optionalRoot = path.join(root, "web/local-stt");
try {
  for (const full of walk(optionalRoot, true)) {
    const rel = path.relative(optionalRoot, full).replaceAll(path.sep, "/"),
      asset = stt.files.find((f) => f.path === rel),
      bytes = readFileSync(full);
    if (
      !asset ||
      bytes.length !== asset.bytes ||
      asset.sha256 !== createHash("sha256").update(bytes).digest("hex")
    )
      errors.push(`optional asset ${rel}: integrity mismatch`);
  }
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
for (const full of files) {
  const rel = path.relative(root, full).replaceAll(path.sep, "/"),
    bytes = readFileSync(full),
    vendor = rel.startsWith("web/vendor/");
  if (
    /(?:^|\/)(?:\.env[^/]*|private[^/]*|recordings?|\.openai|\.sites-runtime)(?:\/|$)|\.(?:zip|mp4|mov|webm|m4a|pptx?|key)$/i.test(
      rel,
    )
  )
    errors.push(`${rel}: disallowed artifact`);
  scan(bytes, rel, vendor);
  if (vendor) {
    if (manifest[rel] !== createHash("sha256").update(bytes).digest("hex"))
      errors.push(`${rel}: unverified vendor asset`);
  } else if (rel.startsWith("web/assets/monsters/")) {
    if (
      artManifest[rel]?.sha256 !==
        createHash("sha256").update(bytes).digest("hex") ||
      artManifest[rel]?.bytes !== bytes.length
    )
      errors.push(`${rel}: unverified original art`);
  } else if (
    !/\.(?:md|html|css|js|mjs|json|txt|py|yml|pdf)$/.test(rel) &&
    !["LICENSE", ".gitignore", "web/_headers", "web/.nojekyll"].includes(rel)
  )
    errors.push(`${rel}: unexpected file`);
}
for (const name of Object.keys(manifest))
  if (!files.includes(path.join(root, name)))
    errors.push(`${name}: missing vendor asset`);
for (const name of Object.keys(artManifest))
  if (!files.includes(path.join(root, name)))
    errors.push(`${name}: missing original art`);
const tracked = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .trim()
  .split("\n");
for (const name of tracked)
  if (/^(?:web\/local-stt\/|tmp\/|node_modules\/)/.test(name))
    errors.push(`${name}: optional/generated artifact must not be tracked`);
let commits = [];
try {
  commits = execFileSync("git", ["rev-list", "--all"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  })
    .trim()
    .split("\n")
    .filter(Boolean);
} catch {}
for (const sha of commits) {
  scan(
    execFileSync("git", ["show", "-s", "--format=fuller", sha], { cwd: root }),
    `commit ${sha}`,
  );
  const entries = execFileSync(
    "git",
    ["ls-tree", "-r", "--format=%(objectname) %(path)", sha],
    { cwd: root, encoding: "utf8" },
  )
    .trim()
    .split("\n");
  for (const entry of entries) {
    const [object, ...rest] = entry.split(" "),
      name = rest.join(" ");
    if (/^(?:web\/local-stt\/|tmp\/|node_modules\/)/.test(name))
      errors.push(`history ${sha}:${name}: generated artifact`);
    const bytes = execFileSync("git", ["cat-file", "blob", object], {
      cwd: root,
      maxBuffer: 15 * 1024 * 1024,
    });
    scan(bytes, `history ${sha}:${name}`, name.startsWith("web/vendor/"));
  }
}
if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log(
  `Audit passed: ${files.length} files, ${Object.keys(manifest).length} verified vendor assets, ${commits.length} history commits; no denied private data or credential patterns.`,
);

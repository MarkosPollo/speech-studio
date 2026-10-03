// Opt-in developer download of pinned PUBLIC assets only. No speech inputs.
import { readFile, mkdir, writeFile, rename, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../web/", import.meta.url),
  manifest = JSON.parse(
    await readFile(new URL("stt-assets.json", root), "utf8"),
  );
for (const f of manifest.files) {
  if (!/^[\w./-]+$/.test(f.path) || f.path.includes(".."))
    throw Error("Invalid manifest path");
  const target = new URL(`local-stt/${f.path}`, root),
    dir = new URL("./", target);
  // Refuse symlinks even if an existing local installation has been changed.
  let current = new URL("local-stt/", root);
  for (const part of f.path.split("/").slice(0, -1)) {
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw Error("Symlink in optional asset path");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    current = new URL(`${part}/`, current);
  }
  try {
    if ((await lstat(target)).isSymbolicLink())
      throw Error("Symlink in optional asset path");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  try {
    const b = await readFile(target);
    if (
      b.length === f.bytes &&
      createHash("sha256").update(b).digest("hex") === f.sha256
    ) {
      console.log(`Verified ${f.path}`);
      continue;
    }
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const response = await fetch(f.url);
  if (!response.ok)
    throw Error(`Download failed (${response.status}): ${f.path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.length !== f.bytes ||
    createHash("sha256").update(bytes).digest("hex") !== f.sha256
  )
    throw Error(`Integrity failed: ${f.path}`);
  await mkdir(dir, { recursive: true });
  const temp = new URL(`${target.href}.partial`);
  await writeFile(temp, bytes);
  await rename(temp, target);
  console.log(`Installed ${f.path} (${bytes.length} bytes)`);
}
console.log(
  `Optional local STT ready: ${manifest.files.reduce((n, f) => n + f.bytes, 0)} bytes. Serve web/; no CDN or remote model requests are enabled in the app.`,
);

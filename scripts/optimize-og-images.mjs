#!/usr/bin/env node
/**
 * Regenerate optimized OG images.
 *
 * For every source image in `public/og/source/` (PNG/JPG/JPEG, 1200x640 ideally),
 * this script produces two artifacts in `public/og/`:
 *   - `<name>.jpg`  — compressed JPEG fallback (every social scraper supports it)
 *   - `<name>.webp` — modern WebP variant referenced by SEO.tsx
 *
 * If a source folder is empty / missing, the script falls back to recompressing
 * the existing `public/og/*.jpg` files in place and (re)generating their WebP
 * siblings — so it's safe to run any time the JPGs have been replaced manually.
 *
 * Requirements (system binaries):
 *   - `cwebp`            (libwebp)
 *   - `magick` or `convert` (ImageMagick)  — only needed for JPG recompression
 *
 * Usage:
 *   node scripts/optimize-og-images.mjs                 # regenerate all
 *   node scripts/optimize-og-images.mjs --quality=82    # override quality
 *   node scripts/optimize-og-images.mjs moving-help     # only this slug
 *   npm run og:optimize                                 # via package.json
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, parse, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "og");
const SRC_DIR = join(OUT_DIR, "source");

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const opts = { jpegQuality: 78, webpQuality: 80, slugs: [] };
for (const a of args) {
  if (a.startsWith("--quality=")) {
    const v = Number(a.split("=")[1]);
    if (Number.isFinite(v)) {
      opts.jpegQuality = v;
      opts.webpQuality = v;
    }
  } else if (a.startsWith("--jpeg-quality=")) {
    opts.jpegQuality = Number(a.split("=")[1]);
  } else if (a.startsWith("--webp-quality=")) {
    opts.webpQuality = Number(a.split("=")[1]);
  } else if (!a.startsWith("--")) {
    opts.slugs.push(a.replace(/\.(jpe?g|png|webp)$/i, ""));
  }
}

// ---- binary discovery -----------------------------------------------------
const which = (bin) => {
  try {
    return execSync(`command -v ${bin}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

const CWEBP = which("cwebp");
const MAGICK = which("magick") || which("convert");

if (!CWEBP) {
  console.error(
    "[og] cwebp not found in PATH. Install it (e.g. `brew install webp`, `apt install webp`)."
  );
  process.exit(1);
}

// ---- helpers --------------------------------------------------------------
const human = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const sizeOf = (p) => (existsSync(p) ? statSync(p).size : 0);

const recompressJpeg = (input, output) => {
  if (!MAGICK) {
    // No ImageMagick: just copy original so WebP step still runs.
    if (input !== output) execFileSync("cp", [input, output]);
    return;
  }
  // Strip metadata, progressive, 4:2:0 chroma, configurable quality.
  execFileSync(MAGICK, [
    input,
    "-strip",
    "-interlace",
    "Plane",
    "-sampling-factor",
    "4:2:0",
    "-quality",
    String(opts.jpegQuality),
    output,
  ]);
};

const encodeWebp = (input, output) => {
  execFileSync(CWEBP, ["-q", String(opts.webpQuality), "-m", "6", "-mt", input, "-o", output], {
    stdio: ["ignore", "ignore", "ignore"],
  });
};

// ---- discover sources -----------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });

let sources = [];
if (existsSync(SRC_DIR)) {
  sources = readdirSync(SRC_DIR)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => ({ slug: parse(f).name, src: join(SRC_DIR, f), fromSource: true }));
}

if (sources.length === 0) {
  // Fallback: re-process existing JPGs in /public/og/.
  sources = readdirSync(OUT_DIR)
    .filter((f) => /\.jpe?g$/i.test(f))
    .map((f) => ({ slug: parse(f).name, src: join(OUT_DIR, f), fromSource: false }));
}

if (opts.slugs.length > 0) {
  sources = sources.filter((s) => opts.slugs.includes(s.slug));
}

if (sources.length === 0) {
  console.error("[og] No source images found in public/og/source/ or public/og/.");
  process.exit(1);
}

// ---- run ------------------------------------------------------------------
console.log(
  `[og] Optimizing ${sources.length} image(s) — JPEG q=${opts.jpegQuality}, WebP q=${opts.webpQuality}`
);
if (!MAGICK) {
  console.warn("[og] ImageMagick not found — JPEG recompression skipped, WebP still generated.");
}

let totalBefore = 0;
let totalAfter = 0;

for (const { slug, src, fromSource } of sources) {
  const jpgOut = join(OUT_DIR, `${slug}.jpg`);
  const webpOut = join(OUT_DIR, `${slug}.webp`);

  const beforeJpg = sizeOf(jpgOut);
  const beforeWebp = sizeOf(webpOut);

  // 1) JPG: from source folder always recompress; in fallback mode recompress in place.
  if (fromSource || MAGICK) {
    recompressJpeg(src, jpgOut);
  }

  // 2) WebP from the (now optimized) JPG.
  encodeWebp(jpgOut, webpOut);

  const afterJpg = sizeOf(jpgOut);
  const afterWebp = sizeOf(webpOut);

  totalBefore += beforeJpg + beforeWebp;
  totalAfter += afterJpg + afterWebp;

  console.log(
    `  ✓ ${slug.padEnd(24)} jpg ${human(afterJpg).padStart(9)}   webp ${human(afterWebp).padStart(9)}`
  );
}

const delta = totalBefore - totalAfter;
if (totalBefore > 0) {
  const pct = ((delta / totalBefore) * 100).toFixed(1);
  console.log(
    `[og] Done. ${human(totalBefore)} → ${human(totalAfter)} (${delta >= 0 ? "-" : "+"}${human(Math.abs(delta))}, ${pct}%)`
  );
} else {
  console.log(`[og] Done. Output total: ${human(totalAfter)}`);
}

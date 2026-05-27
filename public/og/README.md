# OG / Social Preview Images

These 1200×640 images are referenced from `src/data/services.ts` and emitted as
`og:image` / `twitter:image` tags by `src/components/SEO.tsx`.

For every service we ship two formats:

- `*.jpg`  — universal fallback used as the primary `og:image`.
- `*.webp` — optimized variant exposed as a secondary `og:image` and preloaded
  in modern browsers.

## Regenerating

To rebuild the optimized JPG + WebP pair from the current sources, run:

```bash
npm run og:optimize
```

The script lives at `scripts/optimize-og-images.mjs` and is fully reproducible:

1. If `public/og/source/` exists with `<slug>.{jpg,jpeg,png}` files, those are
   treated as canonical sources — they get recompressed into `<slug>.jpg` and
   re-encoded into `<slug>.webp`.
2. Otherwise the script falls back to recompressing the existing
   `public/og/<slug>.jpg` files in place and regenerating their `.webp`
   siblings.

### Options

```bash
npm run og:optimize -- --quality=82          # set both JPEG and WebP quality
npm run og:optimize -- --jpeg-quality=80     # JPEG only
npm run og:optimize -- --webp-quality=78     # WebP only
npm run og:optimize -- moving-help delivery  # process only specific slugs
```

### System requirements

- [`cwebp`](https://developers.google.com/speed/webp/download) (libwebp) — required
- [`magick`](https://imagemagick.org) or `convert` (ImageMagick) — required to
  recompress JPGs; if missing, WebP is still generated from the existing JPG.

Install on macOS: `brew install webp imagemagick`
Install on Debian/Ubuntu: `apt install webp imagemagick`

## Adding a new service image

1. Drop `public/og/source/<slug>.png` (or `.jpg`) at 1200×640.
2. Run `npm run og:optimize`.
3. Reference the slug from `src/data/services.ts` in the `social` block.

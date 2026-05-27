import { useEffect } from "react";

interface SEOProps {
  title: string;
  description: string;
  canonical: string;
  keywords?: string;
  /** Override OG/Twitter title (defaults to `title`) */
  ogTitle?: string;
  /** Override OG/Twitter description (defaults to `description`) */
  ogDescription?: string;
  /** Absolute URL or root-relative path. Will be made absolute against canonical origin. */
  image?: string;
  /** Optional optimized WebP variant. Used as a secondary og:image and preloaded for modern browsers. */
  imageWebp?: string;
  imageAlt?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const upsertMeta = (selector: string, attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const toAbsoluteUrl = (maybeUrl: string, base: string): string => {
  try {
    return new URL(maybeUrl, base).toString();
  } catch {
    return maybeUrl;
  }
};

/**
 * Manage a secondary og:image entry (and its mime type) for the optimized variant.
 * Open Graph allows multiple og:image tags; scrapers that understand the modern
 * format will pick it, others fall back to the JPG above.
 */
const upsertSecondaryOgImage = (absUrl: string | null, mime: string | null) => {
  document.head
    .querySelectorAll('meta[data-seo-og-image-alt="true"]')
    .forEach((el) => el.remove());
  if (!absUrl) return;
  const img = document.createElement("meta");
  img.setAttribute("property", "og:image");
  img.setAttribute("content", absUrl);
  img.dataset.seoOgImageAlt = "true";
  document.head.appendChild(img);
  if (mime) {
    const type = document.createElement("meta");
    type.setAttribute("property", "og:image:type");
    type.setAttribute("content", mime);
    type.dataset.seoOgImageAlt = "true";
    document.head.appendChild(type);
  }
};

const upsertImagePreload = (absUrl: string | null, mime: string | null) => {
  document.head
    .querySelectorAll('link[data-seo-img-preload="true"]')
    .forEach((el) => el.remove());
  if (!absUrl) return;
  const link = document.createElement("link");
  link.setAttribute("rel", "preload");
  link.setAttribute("as", "image");
  link.setAttribute("href", absUrl);
  if (mime) link.setAttribute("type", mime);
  link.dataset.seoImgPreload = "true";
  document.head.appendChild(link);
};

const SEO = ({
  title,
  description,
  canonical,
  keywords,
  ogTitle,
  ogDescription,
  image,
  imageWebp,
  imageAlt,
  jsonLd,
}: SEOProps) => {
  useEffect(() => {
    document.title = title;

    upsertMeta('meta[name="description"]', "name", "description", description);
    if (keywords) upsertMeta('meta[name="keywords"]', "name", "keywords", keywords);

    const finalOgTitle = ogTitle ?? title;
    const finalOgDescription = ogDescription ?? description;

    upsertMeta('meta[property="og:title"]', "property", "og:title", finalOgTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", finalOgDescription);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", finalOgTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", finalOgDescription);

    if (image) {
      const absImage = toAbsoluteUrl(image, canonical);
      // Primary og:image — JPG fallback, the format every scraper supports.
      upsertMeta('meta[property="og:image"]', "property", "og:image", absImage);
      upsertMeta('meta[property="og:image:type"]', "property", "og:image:type", "image/jpeg");
      upsertMeta('meta[property="og:image:width"]', "property", "og:image:width", "1200");
      upsertMeta('meta[property="og:image:height"]', "property", "og:image:height", "640");
      upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", absImage);
      upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
      if (imageAlt) {
        upsertMeta('meta[property="og:image:alt"]', "property", "og:image:alt", imageAlt);
        upsertMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", imageAlt);
      }

      // Secondary optimized variant + browser preload.
      const absWebp = imageWebp ? toAbsoluteUrl(imageWebp, canonical) : null;
      upsertSecondaryOgImage(absWebp, absWebp ? "image/webp" : null);
      upsertImagePreload(absWebp ?? absImage, absWebp ? "image/webp" : "image/jpeg");
    } else {
      upsertSecondaryOgImage(null, null);
      upsertImagePreload(null, null);
    }

    upsertLink("canonical", canonical);

    let ld: HTMLScriptElement | null = document.head.querySelector(
      'script[data-seo-jsonld="true"]',
    );
    if (jsonLd) {
      if (!ld) {
        ld = document.createElement("script");
        ld.type = "application/ld+json";
        ld.dataset.seoJsonld = "true";
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify(jsonLd);
    } else if (ld) {
      ld.remove();
    }
  }, [title, description, canonical, keywords, ogTitle, ogDescription, image, imageWebp, imageAlt, jsonLd]);

  return null;
};

export default SEO;

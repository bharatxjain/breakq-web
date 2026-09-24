// Lightweight document-head manager for the public marketing site.
//
// This is a client-rendered SPA (Vite, no SSR/prerendering), so these tags
// land in <head> only after React mounts and this effect runs. Googlebot
// executes JavaScript and indexes the result correctly, but crawlers that
// don't run JS (most social-preview unfurlers - WhatsApp, Slack, older
// bots - and link-preview tools) only ever see index.html's static <head>.
// That's why index.html itself also carries a solid set of default tags:
// this hook overrides them per route for engines that render JS, index.html
// is the fallback for everything else.
import { useEffect } from "react";

export const SITE_URL = "https://breakq.app";
export const SITE_NAME = "BreakQ";
// TODO: swap for a real 1200x630 branded social-preview image once one
// exists - this is the best on-brand asset currently in /public.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/Breakq_QR.png`;

function upsertMeta(attr, value, content) {
  if (content == null) return;
  let el = document.head.querySelector(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href) {
  if (!href) return;
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function upsertJsonLd(data) {
  const id = "seo-jsonld";
  let el = document.getElementById(id);
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Sets title, meta description/robots, the canonical link, Open Graph +
 * Twitter Card tags, and (optionally) one JSON-LD block for the page this
 * is called from. Call once near the top of each public page component.
 *
 * `jsonLd`, if passed, should be a stable reference (module-level constant)
 * - an inline object literal would re-run the effect on every render.
 */
export function useSeo({
  title,
  description,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  jsonLd = null,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const url = `${SITE_URL}${path}`;

    document.title = fullTitle;
    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow",
    );
    upsertCanonical(url);

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:locale", "en_IN");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    upsertJsonLd(jsonLd);

    return () => upsertJsonLd(null);
  }, [title, description, path, image, type, noindex, jsonLd]);
}

// Used by the admin shell (never linked publicly, blocked in robots.txt) as
// a second, independent guarantee that it can't end up indexed even if a
// crawler ignores the Disallow rule.
export function setNoindex(noindex) {
  upsertMeta(
    "name",
    "robots",
    noindex ? "noindex, nofollow" : "index, follow",
  );
}

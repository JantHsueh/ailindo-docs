import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { i18n } from '@/lib/i18n';
import { baseUrl, htmlLang } from '@/lib/metadata';
import { getLocalePath } from '@/lib/i18n';

/**
 * Generate sitemap with:
 * - Only URLs that return 200 (no `/{lang}` roots, which redirect to `/{lang}/docs`)
 * - Multi-language alternates (hreflang) for SEO
 * - Actual lastModified dates from page data
 * - Proper priority hierarchy
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const url = baseUrl.origin;

  function toDate(input: unknown): Date | null {
    if (!input) return null;
    if (input instanceof Date)
      return Number.isNaN(input.getTime()) ? null : input;
    const d = new Date(String(input));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function docsPathForSlug(slugKey: string): string {
    return slugKey ? `docs/${slugKey}` : 'docs';
  }

  // Helper to generate hreflang alternates for a path, only for existing languages.
  function generateAlternates(
    langs: string[],
    path: string
  ): Record<string, string> {
    const alternates: Record<string, string> = {};
    for (const lang of langs) {
      alternates[htmlLang[lang] ?? lang] = `${url}${getLocalePath(lang, path)}`;
    }
    const defaultLang = langs.includes(i18n.defaultLanguage)
      ? i18n.defaultLanguage
      : langs[0];
    if (defaultLang) {
      alternates['x-default'] = `${url}${getLocalePath(defaultLang, path)}`;
    }
    return alternates;
  }

  // Create a map to group pages by slug across languages
  const pagesBySlug = new Map<
    string,
    { lang: string; page: ReturnType<typeof source.getPages>[number] }[]
  >();

  // Collect all pages grouped by slug
  for (const lang of i18n.languages) {
    const pages = source.getPages(lang);
    for (const page of pages) {
      const slugKey = page.slugs.join('/');
      if (!pagesBySlug.has(slugKey)) {
        pagesBySlug.set(slugKey, []);
      }
      pagesBySlug.get(slugKey)!.push({ lang, page });
    }
  }

  // Add docs pages with proper alternates and lastModified
  for (const [slugKey, langPages] of pagesBySlug) {
    const availableLangs = langPages.map((p) => p.lang);
    const docsPath = docsPathForSlug(slugKey);

    for (const { lang, page } of langPages) {
      // Each language version should use its own lastModified.
      const lastModified = toDate(page.data.lastModified);

      // Determine priority based on page depth
      const depth = page.slugs.length;
      let priority: number;
      if (depth === 0) {
        priority = 1.0; // Docs home (also served at `/`)
      } else if (depth === 1) {
        priority = 0.9; // Top-level pages (e.g., /docs/guide)
      } else if (depth === 2) {
        priority = 0.8; // Second-level pages
      } else {
        priority = 0.7; // Deeper pages
      }

      // Determine change frequency based on page type
      const isApiPage = page.slugs[0] === 'api';
      const changeFrequency: 'daily' | 'weekly' | 'monthly' = isApiPage
        ? 'monthly'
        : 'weekly';

      entries.push({
        url: `${url}${getLocalePath(lang, docsPath)}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency,
        priority,
        alternates: {
          languages: generateAlternates(availableLangs, docsPath),
        },
      });
    }
  }

  return entries;
}

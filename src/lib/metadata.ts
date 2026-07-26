import type { Metadata } from 'next';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    icons: {
      icon: '/assets/logo.webp',
      shortcut: '/assets/logo.webp',
      apple: '/assets/logo.webp',
    },
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: baseUrl.origin,
      images: '/assets/logo.webp',
      siteName: 'AI 灵动',
      type: 'website',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/assets/logo.webp',
      ...override.twitter,
    },
  };
}

// Canonical, absolute origin of the docs site.
// Consumed by robots.txt, sitemap.xml and every page's `metadataBase`
// (canonical + Open Graph URLs), so in production it MUST be the real public
// origin — never `localhost`, otherwise search engines index unreachable URLs
// and the ranking signals get split across domains.
//
// Resolution order:
//   1. NEXT_PUBLIC_SITE_URL          — explicit override (any deploy target)
//   2. VERCEL_PROJECT_PRODUCTION_URL — injected automatically on Vercel
//   3. https://docs.ailindo.com      — self-hosted production default (this repo)
//   4. http://localhost:3000         — local development
function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000';
  return 'https://docs.ailindo.com';
}

export const baseUrl = new URL(resolveSiteUrl());

import type { MetadataRoute } from 'next';
import { baseUrl } from '@/lib/metadata';

export default function robots(): MetadataRoute.Robots {
  const origin = baseUrl.origin;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/'
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    // robots.txt spec: Host should contain only the hostname (no scheme)
    host: baseUrl.hostname,
  };
}

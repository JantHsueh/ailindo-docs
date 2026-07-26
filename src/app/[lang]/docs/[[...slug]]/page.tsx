import { getPageImage, source } from '@/lib/source';
import { i18n, getLocalePath } from '@/lib/i18n';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/mdx-components';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { LLMCopyButton, ViewOptions } from '@/components/page-actions';

export default async function Page(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { slug, lang } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body as any;
  const lastModified = page.data.lastModified;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      lastUpdate={lastModified ? new Date(lastModified) : undefined}
      tableOfContent={{
        style: 'clerk',
        // Disable TOC in 'full' mode (OpenAPI page) to enable two-column layout
        enabled: !page.data.full,
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-2">
        {page.data.description}
      </DocsDescription>
      <div className="mb-6 flex flex-row flex-wrap items-center gap-2 border-b pb-6">
        <LLMCopyButton
          markdownUrl={`/${lang}/llms.mdx/${page.slugs.join('/')}`}
          lang={lang}
        />
        <ViewOptions
          markdownUrl={`/${lang}/llms.mdx/${page.slugs.join('/')}`}
          lang={lang}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page) as any,
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { slug, lang } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();

  // Self-referencing canonical + hreflang so search engines consolidate
  // ranking on a single URL per language instead of treating locale variants
  // as duplicate content.
  const docsPath = slug?.length ? `docs/${slug.join('/')}` : 'docs';
  const canonical = getLocalePath(lang, docsPath);

  const languages: Record<string, string> = {};
  for (const l of i18n.languages) {
    if (source.getPage(slug, l)) languages[l] = getLocalePath(l, docsPath);
  }
  languages['x-default'] = languages[i18n.defaultLanguage] ?? canonical;

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical, languages },
    openGraph: { url: canonical, images: getPageImage(page).url },
  };
}

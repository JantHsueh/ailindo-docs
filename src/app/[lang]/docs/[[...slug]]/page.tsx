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
import { baseUrl, htmlLang, siteMeta } from '@/lib/metadata';

const SITE_NAME = 'AI 灵动';

// 大部分 API 页（由 OpenAPI 生成）没有 frontmatter description。
// 这里按语言给出兜底文案，避免搜索结果摘要随机截取正文；
// 不改生成产物，也就不用重跑 generate:openapi。
function describe(
  page: NonNullable<ReturnType<typeof source.getPage>>,
  lang: string
): string {
  if (page.data.description) return page.data.description;
  const title = page.data.title;
  const isApi = page.slugs[0] === 'api';
  if (lang === 'en') {
    return isApi
      ? `${title} API reference for ${SITE_NAME}: request parameters, response format and code examples, compatible with the OpenAI API.`
      : `${title} - ${SITE_NAME} documentation and tutorials.`;
  }
  if (lang === 'ja') {
    return isApi
      ? `${SITE_NAME} ${title} API リファレンス：リクエストパラメータ、レスポンス形式、呼び出し例。OpenAI API 互換。`
      : `${title} - ${SITE_NAME} ドキュメントとチュートリアル。`;
  }
  return isApi
    ? `${SITE_NAME} ${title} 接口文档：请求参数、响应格式与调用示例，兼容 OpenAI API 格式。`
    : `${title} - ${SITE_NAME} 使用文档与教程。`;
}

function docsUrl(lang: string, slugs: string[]): string {
  return `${baseUrl.origin}${getLocalePath(lang, slugs.length ? `docs/${slugs.join('/')}` : 'docs')}`;
}

function buildJsonLd(
  page: NonNullable<ReturnType<typeof source.getPage>>,
  lang: string
) {
  const url = docsUrl(lang, page.slugs);
  const graph: Record<string, unknown>[] = [];

  // Breadcrumb: docs home plus every ancestor that has its own page.
  const crumbs: { name: string; url: string }[] = [];
  const home = source.getPage([], lang);
  if (home) crumbs.push({ name: home.data.title, url: docsUrl(lang, []) });
  for (let i = 1; i <= page.slugs.length; i++) {
    const p = source.getPage(page.slugs.slice(0, i), lang);
    if (p) crumbs.push({ name: p.data.title, url: docsUrl(lang, p.slugs) });
  }
  if (crumbs.length > 1) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: c.name,
        item: c.url,
      })),
    });
  }

  const lastModified = page.data.lastModified
    ? new Date(page.data.lastModified)
    : undefined;
  graph.push({
    '@type': 'TechArticle',
    headline: page.data.title,
    description: describe(page, lang),
    url,
    inLanguage: htmlLang[lang] ?? lang,
    ...(lastModified && !Number.isNaN(lastModified.getTime())
      ? { dateModified: lastModified.toISOString() }
      : {}),
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: `${baseUrl.origin}/assets/logo.webp`,
    },
  });

  if (page.slugs.length === 0) {
    graph.push(
      {
        '@type': 'WebSite',
        name: SITE_NAME,
        url,
        inLanguage: htmlLang[lang] ?? lang,
      },
      {
        '@type': 'Organization',
        name: SITE_NAME,
        url: baseUrl.origin,
        logo: `${baseUrl.origin}/assets/logo.webp`,
      }
    );
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

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
      <script
        type="application/ld+json"
        // JSON.stringify 不转义 `<`，手动转义防止内容里出现 </script> 提前闭合标签。
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(page, lang)).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
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
    if (source.getPage(slug, l))
      languages[htmlLang[l] ?? l] = getLocalePath(l, docsPath);
  }
  languages['x-default'] =
    languages[htmlLang[i18n.defaultLanguage]] ?? canonical;

  const description = describe(page, lang);
  const image = getPageImage(page).url;
  // 文档首页（也是 `/`）沿用 layout 里带关键词的站点标题，其他页用 "页面标题 | AI 灵动"。
  const title = page.slugs.length === 0 ? undefined : page.data.title;
  const fullTitle = title
    ? `${title} | ${SITE_NAME}`
    : (siteMeta[lang] ?? siteMeta.zh).default;

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical, languages },
    openGraph: {
      title: fullTitle,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: page.slugs.length === 0 ? 'website' : 'article',
      locale: htmlLang[lang] ?? lang,
      images: image,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: image,
    },
  };
}

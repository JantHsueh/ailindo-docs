import { i18n } from '@/lib/i18n';
import { getLLMText, source } from '@/lib/source';

const defaultLanguage = i18n.defaultLanguage;

function toAbsoluteUrl(origin: string, path: string): string {
  return new URL(path, origin).toString();
}

export async function generateLLMsFullText(
  lang: string = defaultLanguage
): Promise<string> {
  const scan = source.getPages(lang).map(getLLMText);
  const scanned = await Promise.all(scan);

  return scanned.join('\n\n');
}

export function generateLLMsText(
  origin: string,
  lang: string = defaultLanguage
): string {
  const pages = source
    .getPages(lang)
    .map((page) => {
      const slug = page.slugs.join('/');
      const docsPath = slug ? `/${lang}/docs/${slug}` : `/${lang}/docs`;
      const markdownPath = slug
        ? `/${lang}/llms.mdx/${slug}`
        : `/${lang}/llms.mdx`;

      return {
        title: page.data.title,
        docsUrl: toAbsoluteUrl(origin, docsPath),
        markdownUrl: toAbsoluteUrl(origin, markdownPath),
      };
    })
    .sort((a, b) => a.docsUrl.localeCompare(b.docsUrl));

  const lines = [
    `# AI 灵动 Docs (${lang})`,
    '',
    '> LLM-friendly index for AI 灵动 documentation.',
    '',
    '## Preferred Sources',
    `- [Full Documentation](${toAbsoluteUrl(origin, `/${lang}/llms-full.txt`)}): Full corpus in one file.`,
    '',
    '## Pages',
    ...pages.map(
      ({ title, markdownUrl, docsUrl }) =>
        `- [${title}](${markdownUrl}): Canonical page ${docsUrl}`
    ),
  ];

  return lines.join('\n');
}

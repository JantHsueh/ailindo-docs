import { redirect } from 'next/navigation';
import { getLocalePath, i18n } from '@/lib/i18n';
import { notFound } from 'next/navigation';

export default async function LangIndexPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  // Guard against invalid language codes.
  if (!i18n.languages.includes(lang as (typeof i18n.languages)[number])) {
    notFound();
  }

  // This is a docs-only site: send the language root straight to the docs.
  redirect(getLocalePath(lang, 'docs'));
}

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

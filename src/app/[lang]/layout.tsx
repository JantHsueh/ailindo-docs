import { defineI18nUI } from 'fumadocs-ui/i18n';
import { GoogleAnalytics } from '@next/third-parties/google';
import { i18n } from '@/lib/i18n';
import { Provider } from '@/components/provider';
import '../global.css';
import type { Metadata, Viewport } from 'next';
import { createMetadata, baseUrl, htmlLang, siteMeta } from '@/lib/metadata';
import { notFound } from 'next/navigation';

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: 'English',
    },
    zh: {
      displayName: '简体中文',
      search: '搜索文档',
      searchNoResult: '没有结果',
      toc: '目录',
      lastUpdate: '最后更新于',
      chooseTheme: '选择主题',
      chooseLanguage: '选择语言',
      nextPage: '下一页',
      previousPage: '上一页',
      tocNoHeadings: '目录为空',
    },
    ja: {
      displayName: '日本語',
      search: 'ドキュメントを検索',
      searchNoResult: '結果が見つかりません',
      toc: '目次',
      lastUpdate: '最終更新',
      chooseTheme: 'テーマを選択',
      chooseLanguage: '言語を選択',
      nextPage: '次のページ',
      previousPage: '前のページ',
      tocNoHeadings: '見出しがありません',
    },
  },
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const lang = (await params).lang;
  const meta = siteMeta[lang] || siteMeta.zh;

  return {
    ...createMetadata({
      title: {
        default: meta.default,
        template: meta.template,
      },
      description: meta.description,
      keywords: meta.keywords,
      authors: [{ name: 'AI 灵动' }],
      creator: 'AI 灵动',
      openGraph: {
        type: 'website',
        locale: htmlLang[lang] ?? lang,
        title: meta.default,
        description: meta.description,
        siteName: 'AI 灵动',
      },
      twitter: {
        card: 'summary_large_image',
        title: meta.default,
        description: meta.description,
      },
    }),
    metadataBase: baseUrl,
    other: {
      // 百度站长平台的 meta 验证码。必须走 Metadata API：手写在 <head> 里的
      // <meta name="..."> 会被 React/Next 的 metadata 提升机制吞掉。
      'baidu-site-verification': 'codeva-7jrCZp2xus',
    },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
    { media: '(prefers-color-scheme: light)', color: '#fff' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export async function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

// 这是站点的根布局（没有 app/layout.tsx），这样 <html lang> 能按语言输出。
// 百度不执行 JS，只能靠 lang 和内容判断页面语言。
export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: React.ReactNode;
}) {
  const lang = (await params).lang;

  // Check if the language is valid, prevent invalid language codes (e.g. 'api') from causing errors
  if (!i18n.languages.includes(lang as (typeof i18n.languages)[number])) {
    notFound();
  }

  return (
    <html lang={htmlLang[lang] ?? lang} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <Provider i18n={provider(lang)} lang={lang}>
          {children}
        </Provider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
